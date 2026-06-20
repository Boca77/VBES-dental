/* ============================================================
   DentalVBES - Firestore data layer (shared by site + admin)
   ------------------------------------------------------------
   Replaces the old localStorage store. Appointments live in the
   Firestore "appointments" collection, one document per booking
   (document id = appointment ref, e.g. "VB-AB12CD").

   The rest of the app still calls the synchronous loadAppts() /
   saveAppts() helpers. To keep that working we hold an in-memory
   CACHE that a realtime listener keeps in sync. The listener only
   runs while an admin is signed in (the public site cannot read
   appointments - see firestore.rules), so on the public site the
   cache stays empty and only booking *writes* go through.
   ============================================================ */
(function () {
  var COLLECTION = "appointments";
  var cache = [];
  var unsub = null;
  var currentUser = null;

  function col() { return firebase.firestore().collection(COLLECTION); }
  function notify() { document.dispatchEvent(new CustomEvent("dvbes:data")); }

  /* start/stop the realtime listener (admin, after login) */
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

  /* synchronous read used everywhere in the UI */
  function load() { return cache.slice(); }

  /* diff the incoming whole-list against the cache and apply the
     minimal set of Firestore writes/deletes. Document id = ref. */
  function save(newList) {
    var prev = cache;
    var prevByRef = {}; prev.forEach(function (a) { prevByRef[a.ref] = a; });
    var newByRef = {};  newList.forEach(function (a) { newByRef[a.ref] = a; });

    if (!currentUser) {
      /* Not signed in. The only write the server will accept is a brand-new
         public booking REQUEST (a new doc with status "pending"). Ignore
         everything else so the admin UI never reflects a change the rules
         would reject (e.g. someone editing the page after removing "gated"). */
      var requests = newList.filter(function (a) {
        return !prevByRef[a.ref] && a.status === "pending";
      });
      requests.forEach(function (a) {
        cache = cache.concat([a]);                 // optimistic
        col().doc(a.ref).set(a).catch(function (e) {
          cache = cache.filter(function (x) { return x.ref !== a.ref; });  // roll back on reject
          notify();
          console.warn("save failed:", e && e.message);
        });
      });
      notify();
      return;
    }

    /* Signed-in admin: full upsert + delete. */
    cache = newList.slice();                        // optimistic local update
    newList.forEach(function (a) {
      var p = prevByRef[a.ref];
      if (!p || JSON.stringify(p) !== JSON.stringify(a)) {
        col().doc(a.ref).set(a).catch(function (e) { console.warn("save failed:", e && e.message); });
      }
    });
    prev.forEach(function (a) {
      if (!newByRef[a.ref]) {
        col().doc(a.ref).delete().catch(function (e) { console.warn("delete failed:", e && e.message); });
      }
    });
    notify();
  }

  window.DVBES_DB = { load: load, save: save, connect: connect, disconnect: disconnect };

  /* Track auth and connect the live listener only while an admin is signed in. */
  firebase.auth().onAuthStateChanged(function (user) {
    currentUser = user || null;
    if (user) connect(); else disconnect();
  });
})();
