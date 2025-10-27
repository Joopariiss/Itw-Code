// ================================
// 🔥 Inicialización de Firebase
// ================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"; 
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// ================================
// 📌 Mostrar datos del usuario logeado
// ================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuario logeado:", user.uid);
    document.getElementById("perfil-container").style.display = "block";

    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("Datos del usuario:", data);

      // Calcular edad si hay fecha de nacimiento
      let fechaNacimientoTexto = "No registrada";
      if (data.fechaNacimiento) {
        const fechaNac = data.fechaNacimiento.toDate
          ? data.fechaNacimiento.toDate() // Firestore Timestamp
          : new Date(data.fechaNacimiento); // Si es string/Date normal

        // Calcular edad
        const hoy = new Date();
        let edad = hoy.getFullYear() - fechaNac.getFullYear();
        const mes = hoy.getMonth() - fechaNac.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
          edad--;
        }

        // Mostrar fecha y edad
        const fechaFormateada = fechaNac.toLocaleDateString("es-ES");
        fechaNacimientoTexto = `${edad} años`;
      }

      // Rellenar campos de perfil
      document.getElementById("nombre").textContent = data.nombre || "";
      document.getElementById("apellido").textContent = data.apellido || "";
      document.getElementById("pais").textContent = data.pais || "";
      document.getElementById("fechaNacimiento").textContent = fechaNacimientoTexto;
      document.getElementById("email").textContent = data.email || "";
      document.getElementById("fechaRegistro").textContent = data.fechaRegistro
        ? new Date(data.fechaRegistro).toLocaleDateString("es-ES")
        : "No registrada";

      document.getElementById("saludo").textContent = `Hola, ${data.nombre}! 👋`;
    } else {
      console.warn("No se encontraron datos del usuario en Firestore.");
    }
  } else {
    console.log("No hay usuario logeado.");
    window.location.href = "../LOGIN/login.html";
  }
});

// ================================
// 📂 Ir a la sección de Carpetas
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("carpetasBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "../CARPETAS/carpetas.html";
    });
  }
});

// ================================
// 🎛️ Abrir y cerrar el sidebar derecho
// ================================
const toggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

if (toggle && sidebar) {
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });
}

// ================================
// 🚪 Cerrar sesión (opcional)
// ================================
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    console.log("Sesión cerrada.");
    window.location.href = "../LOGIN/login.html";
  });
}
