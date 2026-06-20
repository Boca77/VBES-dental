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
   they cannot read appointments (see firestore.rules).
   ============================================================ */
(function () {
  var COLLECTION = "appointments";
  var THROTTLE = "throttles";
  var cache = [];
  var unsub = null;
  var currentUser = null;

  function db() { return firebase.firestore(); }
  function col() { return db().collection(COLLECTION); }
  function notify() { document.dispatchEvent(new CustomEvent("dvbes:data")); }

  /* a real admin = signed in with email/password (not an anonymous visitor) */
  function isAdmin() { return !!currentUser && !currentUser.isAnonymous; }

  /* start/stop the realtime listener (admin only) */
  function connect() {
    if (unsub) return;
    unsub = col().onSnapshot(
      function (snap) {
        cache = snap.docs.map(function (d) { return d.data(); });
        notify();
      },
      function (err) { console.warn("Firestore listen failed:", err && err.message); }
    );
  }
  function disconnect() {
    if (unsub) { unsub(); unsub = null; }
    cache = [];
    notify();
  }

  function load() { return cache.slice(); }

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
    notify();
    return Promise.all(ops);
  }

  window.DVBES_DB = { load: load, save: save, connect: connect, disconnect: disconnect };

  /* Track auth; only a real admin gets the live listener. */
  firebase.auth().onAuthStateChanged(function (user) {
    currentUser = user || null;
    if (user && !user.isAnonymous) connect(); else disconnect();
  });
})();
