// ========================================
// EnrollX – Firebase Configuration
// ========================================

// IMPORTANT: Replace with your own Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDpRQuiE8gyedqe8ghKA59occUPL07RnIs",
  authDomain: "enrollx-c17aa.firebaseapp.com",
  projectId: "enrollx-c17aa",
  storageBucket: "enrollx-c17aa.firebasestorage.app",
  messagingSenderId: "241438793032",
  appId: "1:241438793032:web:ff8d9280d4dadbbd32e77d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence().catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not available in this browser');
  }
});

console.log('🔥 Firebase initialized successfully');
