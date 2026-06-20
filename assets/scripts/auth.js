/* ============================================================
   DentalVBES - admin auth gate (Firebase Auth)
   The page starts as <body class="gated">, which hides the admin
   UI and shows the login form. We drop the "gated" class only when
   Firebase reports a signed-in user.

   Unlike the old localStorage version, this is backed by real
   security: the appointment data lives in Firestore and the rules
   only return it to an authenticated admin. So even if someone
   removes the "gated" class by hand, there is no data to show.
   ============================================================ */
(function () {
  if (!window.firebase || !firebase.auth) {
    document.body.classList.remove("auth-loading");   // don't get stuck on the spinner
    var m = document.getElementById("authMsg");
    if (m) m.textContent = "Could not load Firebase. Check assets/scripts/firebase-config.js and your connection.";
    return;
  }
  var auth = firebase.auth();

  function showApp() { document.body.classList.remove("gated"); }
  function showLogin() { document.body.classList.add("gated"); }

  /* When not signed in, physically remove the dashboard markup from the
     page (not just hide it), so editing CSS/classes can't reveal it.
     The data is already protected by Firestore rules; this just stops the
     empty shell from being shown. After a successful login we reload, so
     the dashboard DOM is rebuilt with the admin authenticated. */
  function stripAdmin() {
    var body = document.querySelector(".admin-body");
    if (body) body.remove();
    var modal = document.getElementById("addModal");
    if (modal) modal.remove();
    var add = document.querySelector(".admin-top .js-add");
    if (add) add.remove();
  }

  var form = document.getElementById("authForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (document.getElementById("authEmail").value || "").trim();
      var pass = document.getElementById("authPassword").value || "";
      var msg = document.getElementById("authMsg");
      if (msg) msg.textContent = "";
      auth.signInWithEmailAndPassword(email, pass)
        .then(function () { location.reload(); })   // rebuild the dashboard DOM, now authenticated
        .catch(function (err) {
          if (msg) msg.textContent = err && err.message ? err.message : "Login failed.";
        });
    });
  }

  var logoutBtn = document.getElementById("authLogout");
  if (logoutBtn) logoutBtn.addEventListener("click", function () { auth.signOut(); });

  auth.onAuthStateChanged(function (user) {
    document.body.classList.remove("auth-loading");   // session resolved
    if (user) {
      showApp();
    } else {
      showLogin();
      stripAdmin();
    }
  });
})();
