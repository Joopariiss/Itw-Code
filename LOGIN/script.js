import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔥 Misma configuración (o importar de firebase.js si lo usaras centralizado)
const firebaseConfig = {
  apiKey: "AIzaSyD7_sQySsUWBu9byuno2e8R3Gpzop5DQgo",
  authDomain: "into-the-world-db.firebaseapp.com",
  projectId: "into-the-world-db",
  storageBucket: "into-the-world-db.firebasestorage.app",
  messagingSenderId: "212497407719",
  appId: "1:212497407719:web:a7241cb9bb8dea08ca4c42",
  measurementId: "G-K03N1YM4RG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// === POPUP (Reutilizando la lógica si existe en tu HTML de Login) ===
const popupOverlay = document.getElementById("popup-overlay");
const popupMessage = document.getElementById("popup-message");
const popupText = document.getElementById("popup-text");
const popupClose = document.getElementById("popup-close");

function showPopup(mensaje) {
  if (popupText && popupOverlay) {
    popupText.textContent = mensaje;
    popupOverlay.style.display = "block";
    popupMessage.style.display = "block";
  } else {
    // Fallback si no hay popup en el HTML
    alert(mensaje);
  }
}

if (popupClose) {
    popupClose.addEventListener("click", () => {
        popupOverlay.style.display = "none";
        popupMessage.style.display = "none";
    });
}

// === LOGIN ===
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("username").value; // En tu HTML el ID es username
    const password = document.getElementById("password").value;

    try {
      // 1. Intentamos loguear
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. VERIFICACIÓN DE EMAIL (NUEVO)
      if (user.emailVerified) {
        // A. Si verificó, entra
        window.location.href = "../CARPETAS/carpetas.html";
      } else {
        // B. Si no verificó, cerramos sesión y avisamos
        await signOut(auth);
        showPopup("⚠️ Tu cuenta aún no ha sido verificada. Por favor revisa tu correo electrónico.");
      }

    } catch (error) {
      console.error(error);
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
         showPopup("❌ Correo o contraseña incorrectos.");
      } else if (error.code === "auth/too-many-requests") {
         showPopup("❌ Demasiados intentos. Espera un momento.");
      } else {
         showPopup("❌ Error: " + error.message);
      }
    }
  });
}

// ==========================================
// 👁️ LÓGICA MOSTRAR / OCULTAR CONTRASEÑA
// ==========================================
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

if (togglePassword && passwordInput) {
  togglePassword.addEventListener('click', function () {
    // 1. Alternar el tipo de input (password <-> text)
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    // 2. Alternar el icono (ojo abierto <-> ojo cerrado)
    // 'bxs-hide' es el ojo tachado/cerrado
    // 'bxs-show' es el ojo abierto
    this.classList.toggle('bxs-hide');
    this.classList.toggle('bxs-show');
  });
}