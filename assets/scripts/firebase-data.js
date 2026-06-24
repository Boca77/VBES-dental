/* ============================================================
   DentalVBES - Firestore data layer (shared by site + admin)
   ------------------------------------------------------------
   Appointments live in the Firestore "appointments" collection,
   one document per booking (document id = ref, e.g. "VB-AB12CD").

   The UI keeps calling the synchronous loadAppts() / saveAppts()
   helpers; we back them with an in-memory CACHE that a realtime
   listener keeps in sync. The listener only runs for a signed-in
   admin (email/password). Public visitors are signed in
   anonymously so their booking requests can be rate-limited, but
   they cannot read appointments (see the Firestore Security Rules
   in the Firebase console).
   ============================================================ */
(function () {
  var COLLECTION = "appointments";
  var THROTTLE = "throttles";
  var AVAIL = "availability";          // public, PII-free booked-slot index
  var cache = [];
  var avail = {};                      // { "YYYY-MM-DD": ["11:00", ...] }
  var availLoaded = false;             // first availability snapshot has arrived
  var unsub = null;
  var availUnsub = null;
  var currentUser = null;

  function db() { return firebase.firestore(); }
  function col() { return db().collection(COLLECTION); }
  function availCol() { return db().collection(AVAIL); }
  function notify() { document.dispatchEvent(new CustomEvent("dvbes:data")); }

  /* a real admin = signed in with email/password (not an anonymous visitor) */
  function isAdmin() { return !!currentUser && !currentUser.isAnonymous; }

  /* start/stop the realtime listener (admin only) */
  function connect() {
    if (unsub) return;
    unsub = col().onSnapshot(
      function (snap) {
        cache = snap.docs.map(function (d) { return d.data(); });
        reconcileAvailability();
        notify();
      },
      function (err) { console.warn("Firestore listen failed:", err && err.message); }
    );
  }

  /* Keep the public availability index in sync with the real appointments
     (admin only). Backfills dates that predate this index and self-heals any
     drift; only writes when a date's set of taken times actually differs. */
  function reconcileAvailability() {
    if (!isAdmin() || !availLoaded) return;
    var desired = {};
    cache.forEach(function (a) {
      if (!a.date || !a.time) return;
      if (!desired[a.date]) desired[a.date] = [];
      if (desired[a.date].indexOf(a.time) === -1) desired[a.date].push(a.time);
    });
    Object.keys(desired).forEach(function (date) {
      var have = (avail[date] || []).slice().sort().join(",");
      var want = desired[date].slice().sort().join(",");
      if (have !== want) {
        availCol().doc(date).set({ date: date, times: desired[date] })
          .catch(function (e) { console.warn("availability backfill failed:", e && e.message); });
      }
    });
    Object.keys(avail).forEach(function (date) {
      if (!desired[date] && (avail[date] || []).length) {
        availCol().doc(date).delete()
          .catch(function (e) { console.warn("availability cleanup failed:", e && e.message); });
      }
    });
  }
  function disconnect() {
    if (unsub) { unsub(); unsub = null; }
    cache = [];
    notify();
  }

  /* Public availability index: anyone (anon visitor or admin) may read it -
     it holds only dates + booked times, never patient data. Keeps the booking
     calendar's taken/free slots in sync in real time. */
  function connectAvailability() {
    if (availUnsub) return;
    availUnsub = availCol().onSnapshot(
      function (snap) {
        var m = {};
        snap.docs.forEach(function (d) {
          var data = d.data() || {};
          m[d.id] = Array.isArray(data.times) ? data.times : [];
        });
        avail = m;
        availLoaded = true;
        reconcileAvailability();
        notify();
      },
      function (err) { console.warn("Availability listen failed:", err && err.message); }
    );
  }

  function load() { return cache.slice(); }

  /* { "YYYY-MM-DD": ["11:00", ...] } of times that are already taken. */
  function loadAvailability() { return avail; }

  /* Submit a public booking request: the appointment doc and the visitor's
     throttle doc are written in one atomic batch. Firestore rules reject the
     throttle write if the cooldown hasn't elapsed, which rolls back the
     booking too - that is the rate cap. */
  function submitRequest(a) {
    if (!currentUser) return Promise.reject(new Error("not-signed-in"));
    cache = cache.concat([a]);                       // optimistic
    var data = Object.assign({}, a, { createdBy: currentUser.uid });
    var batch = db().batch();
    batch.set(col().doc(a.ref), data);
    batch.set(db().collection(THROTTLE).doc(currentUser.uid),
      { last: firebase.firestore.FieldValue.serverTimestamp() });
    // block the slot for other visitors right away (PII-free, publicly readable)
    batch.set(availCol().doc(a.date),
      { date: a.date, times: firebase.firestore.FieldValue.arrayUnion(a.time) },
      { merge: true });
    return batch.commit().catch(function (e) {
      cache = cache.filter(function (x) { return x.ref !== a.ref; });   // roll back
      notify();
      throw e;                                        // let the UI react
    });
  }

  /* Returns a Promise that resolves when the write(s) commit and rejects on
     failure (e.g. the rate-limit rule), so the booking UI can react. */
  function save(newList) {
    var prev = cache;
    var prevByRef = {}; prev.forEach(function (a) { prevByRef[a.ref] = a; });
    var newByRef = {};  newList.forEach(function (a) { newByRef[a.ref] = a; });

    if (!isAdmin()) {
      /* Public: only brand-new pending requests are accepted, rate-limited. */
      var reqs = newList.filter(function (a) { return !prevByRef[a.ref] && a.status === "pending"; });
      notify();
      return Promise.all(reqs.map(submitRequest));
    }

    /* Signed-in admin: full upsert + delete. */
    cache = newList.slice();
    var ops = [];
    newList.forEach(function (a) {
      var p = prevByRef[a.ref];
      if (!p || JSON.stringify(p) !== JSON.stringify(a)) {
        ops.push(col().doc(a.ref).set(a).catch(function (e) { console.warn("save failed:", e && e.message); }));
      }
    });
    prev.forEach(function (a) {
      if (!newByRef[a.ref]) {
        ops.push(col().doc(a.ref).delete().catch(function (e) { console.warn("delete failed:", e && e.message); }));
      }
    });

    /* Rebuild the public availability index for every date that changed, so the
       booking calendar reflects added/approved/deleted/rejected appointments. */
    var dates = {};
    newList.forEach(function (a) { dates[a.date] = true; });
    prev.forEach(function (a) { dates[a.date] = true; });
    Object.keys(dates).forEach(function (date) {
      var times = [];
      newList.forEach(function (a) {
        if (a.date === date && times.indexOf(a.time) === -1) times.push(a.time);
      });
      var ref = availCol().doc(date);
      var op = times.length ? ref.set({ date: date, times: times }) : ref.delete();
      ops.push(op.catch(function (e) { console.warn("availability sync failed:", e && e.message); }));
    });

    notify();
    return Promise.all(ops);
  }

  window.DVBES_DB = {
    load: load, save: save, connect: connect, disconnect: disconnect,
    availability: loadAvailability
  };

  /* Track auth; only a real admin gets the full appointments listener, but
     everyone (incl. anonymous visitors) reads the PII-free availability index. */
  firebase.auth().onAuthStateChanged(function (user) {
    currentUser = user || null;
    if (user && !user.isAnonymous) connect(); else disconnect();
    if (user) connectAvailability();
  });
})();
