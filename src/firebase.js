// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBBOgkcqPF1SxHiznl_zPSuAwpli1xbdqo",
  authDomain: "lolopopo-b824d.firebaseapp.com",
  projectId: "lolopopo-b824d",
  storageBucket: "lolopopo-b824d.firebasestorage.app",
  messagingSenderId: "808576798168",
  appId: "1:808576798168:web:8db1a56546a1ca333af6ad",
  measurementId: "G-R7ZVG9WYXN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);