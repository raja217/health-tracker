// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCHCBHSY3ERBcg2pz8lCD8I2myGHe5t-0I",
  authDomain: "chatbot-foodtrack.firebaseapp.com",
  projectId: "chatbot-foodtrack",
  storageBucket: "chatbot-foodtrack.firebasestorage.app",
  messagingSenderId: "152874993082",
  appId: "1:152874993082:web:27456814ba9bee0e940983",
  measurementId: "G-BRDWK9BKTE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);