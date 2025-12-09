// ================================
// 🔥 Inicialización de Firebase
// ================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"; 
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"; // Agregado updateDoc

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================================
// 🐾 Lista de Avatares (URLs Públicas)
// ================================
// Estas son imágenes de uso libre para demostración.
const ANIMAL_AVATARS = [
    "https://cdn-icons-png.flaticon.com/512/616/616408.png", // Gato
    "https://cdn-icons-png.flaticon.com/512/616/616430.png", // Perro
    "https://cdn-icons-png.flaticon.com/512/616/616554.png", // Zorro
    "https://cdn-icons-png.flaticon.com/512/616/616412.png", // Oso
    "https://cdn-icons-png.flaticon.com/512/616/616494.png"  // Panda
];

// ================================
// 📌 Lógica Principal
// ================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuario logeado:", user.uid);
    document.getElementById("perfil-container").style.display = "flex"; // Asegurar display flex por el CSS nuevo

    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // 1. Cargar Datos de Texto
      loadUserData(data);

      // 2. Cargar Avatar (Imagen o Iniciales)
      renderAvatar(data);

      // 3. Configurar el Modal de Selección
      setupAvatarSelector(user.uid);

    } else {
      console.warn("No se encontraron datos del usuario.");
    }
  } else {
    window.location.href = "../LOGIN/login.html";
  }
});

// --- Función para cargar textos ---
function loadUserData(data) {
    // Calcular edad
    let fechaNacimientoTexto = "No registrada";
    if (data.fechaNacimiento) {
        const fechaNac = data.fechaNacimiento.toDate ? data.fechaNacimiento.toDate() : new Date(data.fechaNacimiento);
        const hoy = new Date();
        let edad = hoy.getFullYear() - fechaNac.getFullYear();
        const mes = hoy.getMonth() - fechaNac.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
        fechaNacimientoTexto = `${edad} años`;
    }

    // Rellenar campos
    document.getElementById("nombre").textContent = data.nombre || "";
    document.getElementById("apellido").textContent = data.apellido || "";
    document.getElementById("pais").textContent = data.pais || "";
    document.getElementById("fechaNacimiento").textContent = fechaNacimientoTexto;
    document.getElementById("email").textContent = data.email || "";
    document.getElementById("fechaRegistro").textContent = data.fechaRegistro
        ? new Date(data.fechaRegistro).toLocaleDateString("es-ES")
        : "No registrada";
    
    document.getElementById("profile-name").textContent = `${data.nombre} ${data.apellido}`;
    document.getElementById("saludo").textContent = `Hola, ${data.nombre}! 👋`;
}

// --- Función para Renderizar el Avatar actual ---
function renderAvatar(data) {
    const avatarContainer = document.getElementById("avatar");
    const initialsSpan = document.getElementById("avatar-initials");
    
    // Limpiar imágenes previas si existen para no acumular
    const existingImg = avatarContainer.querySelector("img");
    if (existingImg) existingImg.remove();

    if (data.avatarUrl) {
        // SI TIENE IMAGEN: Crear tag img y ocultar iniciales
        const img = document.createElement("img");
        img.src = data.avatarUrl;
        img.alt = "Avatar";
        avatarContainer.appendChild(img);
        
        avatarContainer.classList.add("has-image"); // Clase para CSS
        initialsSpan.style.display = "none";
    } else {
        // SI NO TIENE IMAGEN: Mostrar iniciales
        avatarContainer.classList.remove("has-image");
        initialsSpan.style.display = "block";
        
        const nombre = data.nombre || "";
        const apellido = data.apellido || "";
        const iniciales = (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();
        initialsSpan.textContent = iniciales;
    }
}

// --- Configuración del Modal de Selección ---
function setupAvatarSelector(uid) {
    const editBtn = document.querySelector(".edit-profile-btn");
    const modal = document.getElementById("avatar-modal");
    const closeBtn = document.getElementById("close-avatar-modal");
    const container = document.getElementById("avatar-options-container");

    // Abrir Modal
    editBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
    });

    // Cerrar Modal
    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Generar las 5 opciones de animales si está vacío
    if (container.children.length === 0) {
        ANIMAL_AVATARS.forEach(url => {
            const div = document.createElement("div");
            div.className = "avatar-option";
            div.innerHTML = `<img src="${url}" alt="Animal Avatar">`;
            
            // Evento al seleccionar un animal
            div.addEventListener("click", async () => {
                await saveAvatar(uid, url);
                modal.classList.add("hidden");
            });

            container.appendChild(div);
        });
    }
}

// --- Guardar en Firebase y Actualizar UI ---
async function saveAvatar(uid, url) {
    try {
        const userRef = doc(db, "usuarios", uid);
        
        // 1. Actualizar Firestore
        await updateDoc(userRef, {
            avatarUrl: url
        });

        // 2. Actualizar UI inmediatamente sin recargar
        renderAvatar({ avatarUrl: url }); // Pasamos un objeto simulado con la nueva URL
        
        console.log("✅ Avatar actualizado correctamente");
    } catch (error) {
        console.error("Error actualizando avatar:", error);
        alert("Hubo un error al guardar tu avatar.");
    }
}

// ================================
// 📂 Navegación y Logout
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const carpetasBtn = document.getElementById("carpetasBtn");
  if (carpetasBtn) {
    carpetasBtn.addEventListener("click", () => {
      window.location.href = "../CARPETAS/carpetas.html";
    });
  }
});

// NUEVA NAVEGACIÓN
const foldersBtn = document.getElementById("foldersButton");
if (foldersBtn) {
  foldersBtn.addEventListener("click", () => {
    window.location.href = "../CARPETAS/carpetas.html";
  });
}

const logoutBtn = document.getElementById("logoutButton");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../LOGIN/login.html";
  });
}