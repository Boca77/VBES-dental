/* ============================================================
   DentalVBES - admin auth gate (Netlify Identity)
   Keeps the admin panel behind a login. The page markup starts
   with <body class="gated">, which hides the admin UI and shows
   the login overlay. We only drop the "gated" class once Netlify
   Identity confirms a logged-in user.

   NOTE: this is a client-side login gate, not a security boundary.
   The appointment data lives in localStorage and is readable in
   the browser. For real protection the data needs a backend.
   ============================================================ */
(function () {
  var identity = window.netlifyIdentity;
  if (!identity) {
    // Widget failed to load (offline / blocked). Fail closed: stay gated
    // but let the user know rather than showing a blank screen.
    var msg = document.getElementById("authMsg");
    if (msg) msg.textContent = "Could not load the login service. Check your connection and reload.";
    return;
  }

  function showApp() { document.body.classList.remove("gated"); }
  function showLogin() { document.body.classList.add("gated"); }

  // Attach button handlers immediately, regardless of whether the widget's
  // "init" event ever fires (it won't if the Identity instance is unreachable).
  var loginBtn = document.getElementById("authLoginBtn");
  if (loginBtn) loginBtn.addEventListener("click", function () { identity.open("login"); });

  var logoutBtn = document.getElementById("authLogout");
  if (logoutBtn) logoutBtn.addEventListener("click", function () { identity.logout(); });

  identity.on("init", function (user) {
    if (user) showApp(); else showLogin();
  });

  // Reload after login so admin.js re-renders with the panel visible.
  identity.on("login", function () { identity.close(); location.reload(); });
  identity.on("logout", function () { showLogin(); });

  identity.init();
})();
