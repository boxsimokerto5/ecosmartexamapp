import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqa8O-nzpgYY14EEqs9s1eMH3ocGVmXJ0",
  authDomain: "gen-lang-client-0549649164.firebaseapp.com",
  projectId: "gen-lang-client-0549649164",
  storageBucket: "gen-lang-client-0549649164.firebasestorage.app",
  messagingSenderId: "109276852918",
  appId: "1:109276852918:web:9d74dd96aef4f948e42c17"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID specified in firebase-applet-config.json
export const db = getFirestore(app, "ai-studio-ujianonline-217077e5-3015-4e78-9e75-0a0b0ab6ab1a");
