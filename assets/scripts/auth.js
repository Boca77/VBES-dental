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
    var m = document.getElementById("authMsg");
    if (m) m.textContent = "Could not load Firebase. Check assets/scripts/firebase-config.js and your connection.";
    return;
  }
  var auth = firebase.auth();

  function showApp() { document.body.classList.remove("gated"); }
  function showLogin() { document.body.classList.add("gated"); }

  var form = document.getElementById("authForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (document.getElementById("authEmail").value || "").trim();
      var pass = document.getElementById("authPassword").value || "";
      var msg = document.getElementById("authMsg");
      if (msg) msg.textContent = "";
      auth.signInWithEmailAndPassword(email, pass).catch(function (err) {
        if (msg) msg.textContent = err && err.message ? err.message : "Login failed.";
      });
    });
  }

  var logoutBtn = document.getElementById("authLogout");
  if (logoutBtn) logoutBtn.addEventListener("click", function () { auth.signOut(); });

  auth.onAuthStateChanged(function (user) {
    if (user) showApp(); else showLogin();
  });
})();
