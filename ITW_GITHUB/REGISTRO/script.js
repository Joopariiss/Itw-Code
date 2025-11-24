import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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
const popupText = document.getElementById("popup-text");
const popupClose = document.getElementById("popup-close");

function showPopup(mensaje, esExito = false) {
  popupText.textContent = mensaje;
  popupMessage.style.border = esExito ? "3px solid #4CAF50" : "3px solid #f44336";
  popupOverlay.style.display = "block";
  popupMessage.style.display = "block";
}

function closePopup() {
  popupOverlay.style.display = "none";
  popupMessage.style.display = "none";
}

popupClose.addEventListener("click", closePopup);
popupOverlay.addEventListener("click", closePopup);

// === CARGAR PAÍSES ===
fetch("paises.txt")
  .then(response => response.text())
  .then(data => {
    const paises = data.split("\n").map(p => p.trim()).filter(p => p);
    const select = document.getElementById("pais");
    paises.forEach(pais => {
      const option = document.createElement("option");
      option.value = pais;
      option.textContent = pais;
      select.appendChild(option);
    });
  })
  .catch(() => showPopup("⚠️ Error al cargar los países.", false));

// === Calcular edad ===
function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  const fechaNac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
  return edad;
}

// === REGISTRO ===
document.getElementById("registerForm").addEventListener("submit", async (e) => {
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

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

    localStorage.setItem("usuarioNombre", nombre);
    showPopup(`✅ Registro exitoso. ¡Bienvenido, ${nombre}!`, true);

    // Redirige después de unos segundos
    setTimeout(() => window.location.href = "../CARPETAS/carpetas.html", 2500);

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
    showPopup("❌ " + mensaje);
  }
});
