import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

// Firebase web config is meant to be public; access is controlled by
// Firestore rules + sign-in, not by hiding these values.
const firebaseConfig = {
  apiKey: "AIzaSyCHCBHSY3ERBcg2pz8lCD8I2myGHe5t-0I",
  authDomain: "chatbot-foodtrack.firebaseapp.com",
  projectId: "chatbot-foodtrack",
  storageBucket: "chatbot-foodtrack.firebasestorage.app",
  messagingSenderId: "152874993082",
  appId: "1:152874993082:web:27456814ba9bee0e940983",
  measurementId: "G-BRDWK9BKTE"
};

const app = initializeApp(firebaseConfig);
isSupported().then(ok => ok && getAnalytics(app)).catch(() => {});

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// AI calls go through Cloud Functions so the Anthropic key never reaches the browser
const functions = getFunctions(app, "asia-south1");
export const nutritionFn = httpsCallable(functions, "nutrition");
export const planTomorrowFn = httpsCallable(functions, "planTomorrow", { timeout: 120000 });
