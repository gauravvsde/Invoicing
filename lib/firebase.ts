import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app"
import { getFirestore, Firestore } from "firebase/firestore"
import { getAnalytics, isSupported, Analytics } from "firebase/analytics"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmklhcidolblWPbSPIeeiuw0xfCj0MurA",
  authDomain: "invoicingpro-67b60.firebaseapp.com",
  projectId: "invoicingpro-67b60",
  storageBucket: "invoicingpro-67b60.firebasestorage.app",
  messagingSenderId: "483570704184",
  appId: "1:483570704184:web:6850aea1aae8fec17febcd",
  measurementId: "G-EV50D5R6YQ"
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let analytics: Analytics | undefined;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  console.log('Firebase initialized successfully');
  
  // Initialize Analytics only in client-side and if supported
  if (typeof window !== 'undefined') {
    isSupported().then(yes => { 
      if (yes) {
        analytics = getAnalytics(app);
        console.log('Firebase Analytics initialized');
      }
    }).catch(error => {
      console.warn('Firebase Analytics initialization failed:', error);
    });
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase');
}

export { db, analytics }