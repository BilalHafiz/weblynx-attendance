import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCkfXlY27IKg3MtZ9QgXISRg0nGbtSN2y8",
  authDomain: "attandance-system-ad8ec.firebaseapp.com",
  projectId: "attandance-system-ad8ec",
  storageBucket: "attandance-system-ad8ec.firebasestorage.app",
  messagingSenderId: "18906048242",
  appId: "1:18906048242:web:b68d205dc9c51c923f126b",
  measurementId: "G-PRVN4Z020D"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
