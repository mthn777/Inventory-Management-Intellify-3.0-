// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBS70ifrXPZ29dHq9QkhOyPad9VLkUt4EI",
  authDomain: "project-3-1cf82.firebaseapp.com",
  projectId: "project-3-1cf82",
  storageBucket: "project-3-1cf82.appspot.com",
  messagingSenderId: "821065331351",
  appId: "1:821065331351:web:39ab987bc41e9941b4afd2",
  measurementId: "G-LQWC3B1TPH",
  databaseURL: "https://project-3-1cf82-default-rtdb.firebaseio.com"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);