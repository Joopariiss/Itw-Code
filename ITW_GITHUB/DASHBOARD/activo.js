import { db } from "../firebase.js";
import { 
    doc, 
    setDoc, 
    deleteDoc, 
    onSnapshot, 
    collection 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Referencias HTML (esto está bien afuera porque el DOM ya existe al cargar el script al final del body)
const onlineBadge = document.getElementById('online-users-badge');
const onlineCount = document.getElementById('online-count');

export async function initPresence() {
    // 🔥 CORRECCIÓN CRÍTICA:
    // Obtenemos las variables AQUÍ dentro, justo cuando se llama la función.
    // Así nos aseguramos de que window.folderId ya tenga valor.
    const folderId = window.folderId;
    const currentUserId = localStorage.getItem("currentUserId");

    console.log("Iniciando presencia...", { folderId, currentUserId }); // Debug para ver si llegan datos

    if (!folderId || !currentUserId) {
        console.error("❌ Faltan datos para iniciar presencia.");
        return;
    }

    // Referencia a MI documento
    const myPresenceRef = doc(db, "carpetas", folderId, "presencia", currentUserId);

    // 1. ME AGREGO A LA LISTA
    try {
        await setDoc(myPresenceRef, {
            userId: currentUserId,
            onlineAt: Date.now(),
            device: navigator.userAgent
        });
        console.log("✅ Presencia marcada en Firestore");
    } catch (e) {
        console.error("❌ Error al marcar presencia (Revisa reglas de Firestore):", e);
    }

    // 2. ESCUCHAR CAMBIOS
    const presenceColl = collection(db, "carpetas", folderId, "presencia");
    
    onSnapshot(presenceColl, (snapshot) => {
        const count = snapshot.size;
        console.log(`📡 Cambios detectados. Usuarios online: ${count}`); // Debug
        updateBadge(count);
    });

    // 3. LIMPIEZA AL SALIR
    const cleanup = () => {
        deleteDoc(myPresenceRef).catch(err => console.error("Error al salir", err));
    };

    window.addEventListener('beforeunload', cleanup);
    // window.addEventListener('unload', cleanup); // A veces unload da problemas en módulos, beforeunload es estándar
}

function updateBadge(count) {
    if (!onlineBadge || !onlineCount) return;
    
    onlineCount.textContent = count;
    
    if (count > 1) {
        onlineBadge.classList.add('active');
    } else {
        onlineBadge.classList.remove('active');
    }
}