import { db } from "../../../firebase.js";
import { 
    doc, 
    setDoc, 
    deleteDoc, 
    onSnapshot, 
    collection 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const onlineBadge = document.getElementById('online-users-badge');
const onlineCount = document.getElementById('online-count');

export async function initPresence() {
    const folderId = window.folderId;
    const currentUserId = localStorage.getItem("currentUserId");

    if (!folderId || !currentUserId) return;

    // Referencia a MI documento de presencia
    const myPresenceRef = doc(db, "carpetas", folderId, "presencia", currentUserId);

    // ============================================================
    // 1. SISTEMA DE LATIDO (HEARTBEAT) ❤️
    // ============================================================
    // Función que actualiza "lastSeen" (visto por última vez)
    const sendHeartbeat = async () => {
        try {
            await setDoc(myPresenceRef, {
                userId: currentUserId,
                device: navigator.userAgent,
                lastSeen: Date.now() // Actualizamos la hora actual
            }, { merge: true }); // merge para no borrar otros datos si los hubiera
        } catch (e) {
            console.error("Error enviando latido:", e);
        }
    };

    // A. Enviamos el primer latido al entrar
    sendHeartbeat();

    // B. Configuramos un reloj para enviar latido cada 10 segundos
    const heartbeatInterval = setInterval(sendHeartbeat, 10000);


    // ============================================================
    // 2. ESCUCHAR Y FILTRAR FANTASMAS 👻
    // ============================================================
    const presenceColl = collection(db, "carpetas", folderId, "presencia");
    
    onSnapshot(presenceColl, (snapshot) => {
        const now = Date.now();
        let activeUsers = 0;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // ¿Hace cuánto fue la última vez que este usuario dio señales de vida?
            // Si no tiene 'lastSeen', usamos 'onlineAt' (compatibilidad) o asumimos 0
            const lastSeenTime = data.lastSeen || data.onlineAt || 0;
            const timeDiff = now - lastSeenTime;

            // CRITERIO: Consideramos "Online" solo si se reportó hace menos de 60 segundos
            if (timeDiff < 60000) { 
                activeUsers++;
            } else {
                // ES UN FANTASMA (Lleva más de 1 min inactivo)
                // Opcional: Si lleva MUCHO tiempo (ej. 5 min) muerto, lo limpiamos de la BD
                if (timeDiff > 300000) { 
                   deleteDoc(docSnap.ref).catch(e => console.log("Limpieza auto:", e));
                }
            }
        });

        // Actualizamos la UI con el número REAL de usuarios activos
        updateBadge(activeUsers);
    });

    // ============================================================
    // 3. LIMPIEZA AL SALIR (Voluntaria)
    // ============================================================
    const cleanup = () => {
        clearInterval(heartbeatInterval); // Detener el reloj interno
        deleteDoc(myPresenceRef); // Intentar borrar mi doc
    };

    window.addEventListener('beforeunload', cleanup);
}

function updateBadge(count) {
    if (!onlineBadge || !onlineCount) return;
    
    // Mínimo mostrar 1 si el usuario está viendo la página (por si hay lag en la red)
    const displayCount = count < 1 ? 1 : count;

    onlineCount.textContent = displayCount;
    
    if (displayCount > 1) {
        onlineBadge.classList.add('active');
    } else {
        onlineBadge.classList.remove('active');
    }
}