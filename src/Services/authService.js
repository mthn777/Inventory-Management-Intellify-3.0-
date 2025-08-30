// src/services/authService.js
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function registerUser(email, password, role) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;
  await setDoc(doc(db, "users", uid), { email, role });
  return uid;
}

export async function loginUser(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function getUserRole(uid) {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data().role : null;
}

export async function logoutUser() {
  return await signOut(auth);
}
