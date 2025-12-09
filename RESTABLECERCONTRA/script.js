import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ Configuración Firebase (la misma que en tu proyecto)
const firebaseConfig = {
  apiKey: "AIzaSyD7_sQySsUWBu9byuno2e8R3Gpzop5DQgo",
  authDomain: "into-the-world-db.firebaseapp.com",
  projectId: "into-the-world-db",
  storageBucket: "into-the-world-db.firebasestorage.app",
  messagingSenderId: "212497407719",
  appId: "1:212497407719:web:a7241cb9bb8dea08ca4c42",
  measurementId: "G-K03N1YM4RG"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Formulario de restablecimiento
const form = document.getElementById("reset-password-form");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();

  message.style.color = "#fff"; // color inicial
  message.textContent = "Enviando correo...";

  try {
    await sendPasswordResetEmail(auth, email);
    message.style.color = "lightgreen";
    message.textContent = "✅ Se ha enviado un enlace de restablecimiento a tu correo por Spam.";
  } catch (error) {
    console.error(error);
    message.style.color = "salmon";
    switch (error.code) {
      case "auth/user-not-found":
        message.textContent = "⚠️ No existe ninguna cuenta con ese correo.";
        break;
      case "auth/invalid-email":
        message.textContent = "⚠️ El formato del correo no es válido.";
        break;
      default:
        message.textContent = "❌ Error: " + error.message;
    }
  }
});
