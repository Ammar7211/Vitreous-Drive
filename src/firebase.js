import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // 👈 1. You MUST import this

const firebaseConfig = {
    apiKey: "AIzaSyC8jfFSOVSwNvooi_sUTg3TgbUi6sHVEw4",
  authDomain: "vitreous-drive.firebaseapp.com",
  projectId: "vitreous-drive",
  storageBucket: "vitreous-drive.firebasestorage.app",
  messagingSenderId: "697176078326",
  appId: "1:697176078326:web:d4802844e3e353d4ba39d7",
  measurementId: "G-68N3B9R9VK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 👈 2. You MUST initialize and export 'auth' here
export const auth = getAuth(app);