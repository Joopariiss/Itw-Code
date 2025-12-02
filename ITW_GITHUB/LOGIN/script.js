import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,           // <--- NUEVO
  browserLocalPersistence,  // <--- NUEVO (Para "Recuérdame" activado)
  browserSessionPersistence // <--- NUEVO (Para "Recuérdame" desactivado)
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD7_sQySsUWBu9byuno2e8R3Gpzop5DQgo",
  authDomain: "into-the-world-db.firebaseapp.com",
  projectId: "into-the-world-db",
  storageBucket: "into-the-world-db.firebasestorage.app",
  messagingSenderId: "212497407719",
  appId: "1:212497407719:web:a7241cb9bb8dea08ca4c42",
  measurementId: "G-K03N1YM4RG",
};


// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🎯 Elementos del popup
const popupOverlay = document.getElementById("popup-overlay");
const popupMessage = document.getElementById("popup-message");
const popupText = document.getElementById("popup-text");
const popupClose = document.getElementById("popup-close");

// Funciones del popup
function showPopup(message, redirect = false) {
  popupText.textContent = message;
  popupOverlay.style.display = "block";
  popupMessage.style.display = "block";

  popupClose.onclick = () => {
    popupOverlay.style.display = "none";
    popupMessage.style.display = "none";
    if (redirect) window.location.href = "../CARPETAS/carpetas.html";
  };
}

popupOverlay.addEventListener("click", () => {
  popupOverlay.style.display = "none";
  popupMessage.style.display = "none";
});

// 🧾 Login Actualizado
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const rememberMe = document.getElementById("rememberMe").checked; // <--- Verificamos el checkbox

  if (!email || !password) {
    showPopup("⚠️ Por favor, completa todos los campos.");
    return;
  }

  // Definimos el tipo de persistencia según el checkbox
  const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;

  // 1. Primero configuramos la persistencia
  setPersistence(auth, persistenceType)
    .then(() => {
      // 2. Luego hacemos el login
      return signInWithEmailAndPassword(auth, email, password);
    })
    .then((userCredential) => {
      console.log("Login correcto:", userCredential.user);
      console.log("Modo de sesión:", rememberMe ? "Persistente (Local)" : "Temporal (Sesión)");
      showPopup(`✅ Bienvenido de nuevo, ${email.split("@")[0]}!`, true);
    })
    .catch((error) => {
      console.error("Error en login:", error);
      // Manejo de errores comunes para dar mensajes más claros
      let msg = "❌ Correo o contraseña incorrectos.";
      if (error.code === 'auth/too-many-requests') msg = "⚠️ Demasiados intentos fallidos. Intenta más tarde.";
      showPopup(msg);
    });
});