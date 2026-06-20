/* ============================================================
   DentalVBES - Firebase configuration
   ------------------------------------------------------------
   Replace the values below with YOUR project's config from:
   Firebase console -> Project settings (gear icon) -> "Your apps"
   -> Web app -> "SDK setup and configuration" -> Config.

   NOTE: these values are NOT secret. The apiKey is a public
   identifier - it is safe to ship in client code. Your data is
   protected by Firestore Security Rules (see firestore.rules),
   NOT by hiding this config.
   ============================================================ */
var firebaseConfig = {
  apiKey: "AIzaSyC7uI1isuNib65icl7LXzlciCy0QJmxsDo",
  authDomain: "dentalvbes.firebaseapp.com",
  projectId: "dentalvbes",
  storageBucket: "dentalvbes.firebasestorage.app",
  messagingSenderId: "564573215407",
  appId: "1:564573215407:web:d3da75ca70edc12574d25a",
  measurementId: "G-RK4CBQGWDY"
};

firebase.initializeApp(firebaseConfig);
