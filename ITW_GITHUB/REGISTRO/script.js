import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Configuración Firebase
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

// Función para calcular edad (por si la necesitas en el perfil)
function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  const fechaNac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }
  return edad;
}

// Registro
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const apellido = document.getElementById("apellido").value;
  const pais = document.getElementById("pais").value;
  const fechaNacimiento = document.getElementById("fechaNacimiento").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Validaciones básicas
  if (password !== confirmPassword) {
    alert("⚠️ Las contraseñas no coinciden.");
    return;
  }

  if (!fechaNacimiento) {
    alert("⚠️ Debes ingresar tu fecha de nacimiento.");
    return;
  }

  try {
    // Crear usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Guardar datos adicionales en Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      nombre,
      apellido,
      pais,
      fechaNacimiento,
      email,
      uid: user.uid,
      fechaRegistro: new Date().toISOString()
    });

    // Guardar nombre localmente para mostrar luego
    localStorage.setItem("usuarioNombre", nombre);

    alert("✅ Registro exitoso. ¡Bienvenido " + nombre + "!");
    window.location.href = "../PERFIL/perfil.html";
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
        mensaje = "La contraseña es demasiado débil.";
        break;
      default:
        mensaje = "Error desconocido: " + error.message;
    }
    alert("❌ " + mensaje);
  }
});
