
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTfaTMIFjWWusLHV0IjqHq81Rco3A66Gk",
  authDomain: "envisionai-cdd6d.firebaseapp.com",
  databaseURL: "https://envisionai-cdd6d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "envisionai-cdd6d",
  storageBucket: "envisionai-cdd6d.firebasestorage.app",
  messagingSenderId: "415804872244",
  appId: "1:415804872244:web:d0da95d4e386eee9e7dc61"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, push, onValue, remove, update };
