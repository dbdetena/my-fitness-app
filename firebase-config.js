// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBEZWyPXgYIGGb9-YwZOMvjk4NIYny_rTM",
  authDomain: "fitnesspersonaldbdt.firebaseapp.com",
  projectId: "fitnesspersonaldbdt",
  storageBucket: "fitnesspersonaldbdt.firebasestorage.app",
  messagingSenderId: "94418034031",
  appId: "1:94418034031:web:9a34851f8cc0921fd21c9a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
