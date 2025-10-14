// scriptLogin.js
console.log("../USER_INTERFAZ/script.js cargado correctamente");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ Tu configuración de Firebase
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD7_sQySsUWBu9byuno2e8R3Gpzop5DQgo",
  authDomain: "into-the-world-db.firebaseapp.com",
  projectId: "into-the-world-db",
  storageBucket: "into-the-world-db.firebasestorage.app",
  messagingSenderId: "212497407719",
  appId: "1:212497407719:web:a7241cb9bb8dea08ca4c42",
  measurementId: "G-K03N1YM4RG"
};

// 🔥 Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🎯 Lógica de login
document.querySelector("form").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Login exitoso
      console.log("Login correcto:", userCredential.user);
      window.location.href = "../USER_INTERFAZ/user.html"; // Redirigir
    })
    .catch((error) => {
      console.error("Error en login:", error);
      alert("Correo o contraseña incorrectos.");
    });
});
