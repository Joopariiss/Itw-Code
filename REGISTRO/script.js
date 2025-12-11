import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 Configuración Firebase
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
const db = getFirestore(app);

// === POPUP ===
const popupOverlay = document.getElementById("popup-overlay");
const popupMessage = document.getElementById("popup-message");
const popupTitle = document.getElementById("popup-title"); // Agregué esto según tu HTML
const popupText = document.getElementById("popup-text");
const popupClose = document.getElementById("popup-close");

function showPopup(mensaje, esExito = false, titulo = "") {
  if(popupTitle) popupTitle.textContent = titulo || (esExito ? "¡Éxito!" : "Atención");
  popupText.textContent = mensaje;
  // Cambiamos el borde o color del título según sea éxito o error
  if(popupTitle) popupTitle.style.color = esExito ? "#4CAF50" : "#f44336";
  
  popupOverlay.style.display = "block";
  popupMessage.style.display = "block";
}

function closePopup() {
  popupOverlay.style.display = "none";
  popupMessage.style.display = "none";
}

if(popupClose) popupClose.addEventListener("click", closePopup);
if(popupOverlay) popupOverlay.addEventListener("click", closePopup);

// === CARGAR PAÍSES ===
fetch("paises.txt")
  .then(response => response.text())
  .then(data => {
    const paises = data.split("\n").map(p => p.trim()).filter(p => p);
    const select = document.getElementById("pais");
    if(select) {
        paises.forEach(pais => {
        const option = document.createElement("option");
        option.value = pais;
        option.textContent = pais;
        select.appendChild(option);
        });
    }
  })
  .catch(() => console.error("Error cargando países"));

// === Calcular edad ===
function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  const fechaNac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
  return edad;
}

// === REGISTRO CON VERIFICACIÓN ===
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = document.getElementById("nombre").value.trim();
      const apellido = document.getElementById("apellido").value.trim();
      const pais = document.getElementById("pais").value;
      const fechaNacimiento = document.getElementById("fechaNacimiento").value;
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      // Validaciones básicas
      if (!nombre || !apellido || !pais || !fechaNacimiento || !email || !password || !confirmPassword) {
        showPopup("⚠️ Por favor, completa todos los campos.");
        return;
      }

      if (password !== confirmPassword) {
        showPopup("⚠️ Las contraseñas no coinciden.");
        return;
      }

      const edad = calcularEdad(fechaNacimiento);
      if (edad < 13) {
        showPopup("⚠️ Debes tener al menos 13 años para registrarte.");
        return;
      }

      try {
        // 1. Crear usuario
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Enviar correo de verificación (NUEVO)
        await sendEmailVerification(user);

        // 3. Guardar en Firestore
        await setDoc(doc(db, "usuarios", user.uid), {
          nombre,
          apellido,
          pais,
          fechaNacimiento,
          edad,
          email,
          uid: user.uid,
          fechaRegistro: new Date().toISOString()
        });

        // 4. Cerrar sesión inmediatamente (IMPORTANTE)
        // Esto evita que entre directo sin verificar
        await signOut(auth);

        // 5. Avisar y redirigir al Login (no a Carpetas)
        showPopup(`Hemos enviado un enlace de confirmación a ${email}. Por favor revísalo para activar tu cuenta.`, true, "¡Casi listo!");

        // Damos tiempo para leer el mensaje antes de ir al login
        setTimeout(() => window.location.href = "../LOGIN/login.html", 4000);

      } catch (error) {
        let mensaje = "";
        switch (error.code) {
          case "auth/email-already-in-use":
            mensaje = "El correo ya está registrado.";
            break;
          case "auth/invalid-email":
            mensaje = "El formato del correo no es válido.";
            break;
          case "auth/weak-password":
            mensaje = "La contraseña es demasiado débil (mínimo 6 caracteres).";
            break;
          default:
            mensaje = "Error: " + error.message;
        }
        showPopup(mensaje, false);
      }
    });
}