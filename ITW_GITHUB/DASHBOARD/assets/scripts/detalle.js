import { db } from "../../../firebase.js";
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    arrayUnion, 
    arrayRemove 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { getInventoryData } from "./inventory.js";
import { getPlannerData } from "./planner.js";
// Agregar a tus imports existentes:
import { getChecklistData } from "./checkList.js";
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";

const folderId = window.folderId;
const participantsList = document.getElementById('participants-list');
const currentUserId = localStorage.getItem("currentUserId"); 

// ==========================================
// 0. LÓGICA DEL MODAL DE EXPULSIÓN (NUEVO)
// ==========================================
// Variables para recordar a quién vamos a borrar mientras el modal está abierto
let userToDeleteId = null;
let listToDeleteFrom = null; // 'invitadosPendientes' o 'invitadosAceptados'

// Referencias al DOM del Modal
const expelModal = document.getElementById("delete-user-modal");
const confirmExpelBtn = document.getElementById("confirm-expel-btn");
const cancelExpelBtn = document.getElementById("cancel-expel-btn");
const expelMsg = document.getElementById("delete-user-msg");
// ... tus referencias existentes ...
const leaveBtn = document.getElementById("details-leave-btn"); // <--- NUEVO
const leaveModal = document.getElementById("leave-modal");     // <--- NUEVO
const confirmLeaveBtn = document.getElementById("confirm-leave-btn"); // <--- NUEVO
const cancelLeaveBtn = document.getElementById("cancel-leave-btn");   // <--- NUEVO

// Función para abrir el modal (reemplaza al antiguo alert)
function openExpelModal(uid, listName, email) {
    userToDeleteId = uid;
    listToDeleteFrom = listName;
    
    // Actualizamos el mensaje del modal
    if(expelMsg) {
        expelMsg.innerHTML = `¿Seguro que quieres expulsar a <br><b style="color:white">${email}</b>?`;
    }
    
    // Mostramos el modal
    if(expelModal) expelModal.classList.remove("hidden");
}

// Evento: Clic en "Cancelar"
if (cancelExpelBtn) {
    cancelExpelBtn.addEventListener("click", () => {
        if(expelModal) expelModal.classList.add("hidden");
        userToDeleteId = null;
        listToDeleteFrom = null;
    });
}

// Evento: Clic en "Expulsar" (Acción Real)
if (confirmExpelBtn) {
    confirmExpelBtn.addEventListener("click", async () => {
        if (!userToDeleteId || !listToDeleteFrom || !folderId) return;

        try {
            const folderRef = doc(db, "carpetas", folderId);
            
            // Borramos el ID de la lista correspondiente
            await updateDoc(folderRef, {
                [listToDeleteFrom]: arrayRemove(userToDeleteId)
            });

            // Cerrar modal y limpiar
            expelModal.classList.add("hidden");
            userToDeleteId = null;
            listToDeleteFrom = null;

            // Recargar la lista visualmente
            loadParticipants(); 

        } catch (error) {
            console.error("Error eliminando usuario:", error);
            alert("Error al expulsar usuario (Revisa la consola).");
        }
    });
}


// ==========================================
// 1. CARGAR USUARIOS
// ==========================================
async function loadParticipants() {
    if (!folderId) return;
    if (participantsList) participantsList.innerHTML = '<p class="text-muted">Cargando...</p>';

    try {
        const folderRef = doc(db, "carpetas", folderId);
        const snap = await getDoc(folderRef);
        
        if (!snap.exists()) return;
        const data = snap.data();
        
        // Determinar si YO soy el dueño
        const amIOwner = data.userId === currentUserId;

        if (participantsList) participantsList.innerHTML = ''; 

        // A) DUEÑO
        if (data.userId) {
            // Intentamos cargar nombre/email, si falla mostramos genérico
            let ownerEmail = "Dueño";
            try {
                const userDoc = await getDoc(doc(db, "usuarios", data.userId));
                if (userDoc.exists()) ownerEmail = userDoc.data().email;
            } catch (e) { console.log("Error cargando dueño", e); }
            
            renderUserRow(ownerEmail, "👑 Dueño", "status-owner", data.userId, null, false);
        }

        // B) INVITADOS PENDIENTES
        if (data.invitadosPendientes && data.invitadosPendientes.length > 0) {
            for (const uid of data.invitadosPendientes) {
                let email = "Usuario Pendiente";
                try {
                    const userDoc = await getDoc(doc(db, "usuarios", uid));
                    if (userDoc.exists()) email = userDoc.data().email;
                } catch (e) {}
                
                renderUserRow(email, "⏳ Pendiente", "status-pending", uid, "invitadosPendientes", amIOwner);
            }
        }

        // C) INVITADOS ACEPTADOS
        if (data.invitadosAceptados && data.invitadosAceptados.length > 0) {
            for (const uid of data.invitadosAceptados) {
                if (uid === data.userId) continue; 

                let email = "Colaborador";
                try {
                    const userDoc = await getDoc(doc(db, "usuarios", uid));
                    if (userDoc.exists()) email = userDoc.data().email;
                } catch (e) {}
                
                renderUserRow(email, "🤝 Colaborador", "status-accepted", uid, "invitadosAceptados", amIOwner);
            }
        }

    } catch (error) {
        console.error("Error cargando participantes:", error);
        if (participantsList) participantsList.innerHTML = '<p class="negative">Error al cargar lista.</p>';
    }
}

// Función renderUserRow actualizada para usar openExpelModal
function renderUserRow(email, label, statusClass, uid, listType, showDeleteBtn) {
    if (!participantsList) return;

    const letter = email ? email.charAt(0).toUpperCase() : "?";
    const row = document.createElement('div');
    row.className = 'user-row';
    
    // HTML base
    let html = `
        <div class="user-info">
            <div class="user-avatar">${letter}</div>
            <span style="word-break: break-all;">${email}</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
            <span class="user-status ${statusClass}">${label}</span>
    `;

    // Botón borrar solo si corresponde
    if (showDeleteBtn && listType) {
        html += `
            <button class="btn-delete-user" title="Expulsar usuario" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color: var(--destructive);">
                ❌
            </button>
        `;
    }

    html += `</div>`; 
    row.innerHTML = html;

    // Asignar evento al botón de eliminar
    if (showDeleteBtn && listType) {
        const deleteBtn = row.querySelector('.btn-delete-user');
        deleteBtn.addEventListener('click', () => {
            // AQUÍ LLAMAMOS AL NUEVO MODAL
            openExpelModal(uid, listType, email);
        });
    }

    participantsList.appendChild(row);
}


// ============================
// 2. RESTO DE LÓGICA (INVITACIÓN, EXCEL, ETC)
// ============================

const inviteBtn = document.getElementById("details-invite-btn"); 
const downloadBtn = document.getElementById("details-download-btn");

const inviteModal = document.getElementById("invite-modal");
const sendInviteBtn = document.getElementById("send-invite-btn");
const closeInviteBtn = document.getElementById("close-invite-btn");
const inviteEmailInput = document.getElementById("invite-email");
const inviteStatus = document.getElementById("invite-status");

async function checkInvitePermissions() {
  if (!currentUserId || !window.folderId) return;
  try {
      const folderRef = doc(db, "carpetas", window.folderId);
      const snap = await getDoc(folderRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const isOwner = data.userId === currentUserId;

      if (isOwner) {
        // SOY DUEÑO: Puedo invitar, pero NO salir (debo borrar la carpeta si quiero irme)
        window.USER_IS_OWNER = true;
        if (inviteBtn) inviteBtn.style.display = "inline-flex";
        if (leaveBtn) leaveBtn.style.display = "none"; 
      } else {
        // SOY INVITADO: NO puedo invitar, pero SÍ puedo salir
        window.USER_IS_OWNER = false;
        if (inviteBtn) inviteBtn.style.display = "none";
        if (leaveBtn) leaveBtn.style.display = "inline-flex"; 
      }
  } catch(e) { console.error(e); }
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    // Verificar permisos
    checkInvitePermissions();

    // Tabs listener para cargar lista al entrar en Detalles
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => {
        t.addEventListener('click', () => {
            if (t.dataset.tab === 'details') {
                loadParticipants();
            }
        });
    });

    // Si ya estamos en detalles al cargar (raro, pero posible)
    if(document.querySelector('.tab-btn[data-tab="details"]')?.classList.contains('active')){
        loadParticipants();
    }
});

// ================================================================
// LÓGICA DE INVITACIÓN (OPTIMIZADA Y BLINDADA)
// ================================================================

// Listener para abrir el modal (este se mantiene igual, solo para contexto)
inviteBtn?.addEventListener("click", () => {
  if (inviteModal) {
      inviteModal.classList.remove("hidden");
      if (inviteStatus) inviteStatus.textContent = "";
      if (inviteEmailInput) {
          inviteEmailInput.value = "";
          inviteEmailInput.focus(); // Pequeño detalle UX: pone el cursor listo para escribir
      }
  }
});

closeInviteBtn?.addEventListener("click", () => inviteModal?.classList.add("hidden"));

// --- AQUÍ ESTÁ LA LÓGICA CORREGIDA (VISUALMENTE PERFECTA) ---
sendInviteBtn?.addEventListener("click", async () => {
  // 1. Validaciones iniciales
  if (window.USER_IS_OWNER === false) return showInviteError("Solo el dueño puede invitar.");
  const email = inviteEmailInput.value.trim();
  if (!email) return showInviteError("Por favor ingresa un correo.");

  // 2. BLOQUEO DEL BOTÓN
  const originalText = "Invitar"; // Texto base
  sendInviteBtn.disabled = true;
  sendInviteBtn.textContent = "Enviando...";
  sendInviteBtn.style.cursor = "not-allowed";
  sendInviteBtn.style.opacity = "0.7";

  // Limpiamos mensajes previos
  if (inviteStatus) inviteStatus.textContent = "";

  try {
    // 3. Buscar si el usuario existe
    const usersRef = collection(db, "usuarios");
    const q = query(usersRef, where("email", "==", email));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
        throw new Error("No existe ningún usuario con este correo en la App.");
    }
    
    const invitedUid = querySnap.docs[0].id;
    
    if (invitedUid === currentUserId) {
        throw new Error("No puedes invitarte a ti mismo.");
    }

    // 4. Actualizar Base de Datos
    const folderRef = doc(db, "carpetas", window.folderId);
    await updateDoc(folderRef, { invitadosPendientes: arrayUnion(invitedUid) });

    // 5. ÉXITO VISUAL
    if (inviteStatus) {
        inviteStatus.textContent = `✅ Invitación enviada a ${email}`;
        inviteStatus.style.color = "#4ade80"; 
    }
    
    // 6. ACTUALIZAR LISTA DE FONDO
    await loadParticipants(); 

    // 7. CERRAR MODAL (Y AQUÍ DESBLOQUEAMOS)
    setTimeout(() => {
        inviteModal.classList.add("hidden");
        
        // REINICIAMOS EL ESTADO PARA LA PRÓXIMA VEZ (Invisible al usuario porque ya se cerró)
        inviteEmailInput.value = "";
        inviteStatus.textContent = "";
        
        sendInviteBtn.disabled = false;
        sendInviteBtn.textContent = originalText;
        sendInviteBtn.style.cursor = "pointer";
        sendInviteBtn.style.opacity = "1";
    }, 1200); // Esperamos 1.2 segundos con el botón AÚN BLOQUEADO

  } catch (error) {
    console.error("Error al invitar:", error);
    const msg = error.message.includes("No existe") || error.message.includes("mismo") 
                ? error.message 
                : "Ocurrió un error al enviar la invitación.";
    showInviteError(msg);

    // 8. SI HAY ERROR: DESBLOQUEAMOS INMEDIATAMENTE
    // Para que el usuario pueda corregir y volver a intentar
    sendInviteBtn.disabled = false;
    sendInviteBtn.textContent = originalText;
    sendInviteBtn.style.cursor = "pointer";
    sendInviteBtn.style.opacity = "1";
  }
});

function showInviteError(msg) {
  if (inviteStatus) {
      inviteStatus.textContent = msg;
      inviteStatus.style.color = "#ef4444"; // Rojo alerta
  }
}
// Lógica de descarga Excel
downloadBtn?.addEventListener("click", async () => {
  try {
    // 1. OBTENER DATOS (Incluyendo Checklist)
    const inventario = await getInventoryData();
    const plannerData = await getPlannerData();
    const checklistData = await getChecklistData(); // <--- NUEVO

    const wb = XLSX.utils.book_new();

    // ==========================================
    // HOJA 1: INVENTARIO
    // ==========================================
    let totalGasto = 0;
    const invClean = (inventario || []).map(item => {
      const costo = Number(item.cost) || 0;
      const cant = Number(item.quantity) || 1;
      const total = costo * cant;
      totalGasto += total;
      return {
        Nombre: item.name || "",
        Categoría: item.category || "",
        Cantidad: cant,
        "Costo Unitario": costo.toLocaleString("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }),
        "Costo Total": total.toLocaleString("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }),
      };
    });

    invClean.push({}, { 
        Nombre: "TOTAL", 
        "Costo Total": totalGasto.toLocaleString("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }) 
    });

    const invSheet = XLSX.utils.json_to_sheet(invClean);
    invSheet["!cols"] = Object.keys(invClean[0] || {}).map(k => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, invSheet, "Inventario");

    // ==========================================
    // HOJA 2: ITINERARIO
    // ==========================================
    const days = plannerData.dias || [];
    const plannerRows = [];

    const firstRow = {
      "Inicio Viaje": plannerData.calendario?.fechaInicio || "",
      "Fin Viaje": plannerData.calendario?.fechaFin || "",
      " ": "", 
      Fecha: days.length > 0 ? days[0].date : "",
      Día: days.length > 0 ? new Date(days[0].date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long" }) : ""
    };
    
    if (days.length > 0) {
        (days[0].activities || []).forEach((a, i) => firstRow[`Actividad ${i+1}`] = `${a.time} - ${a.description}`);
    }
    plannerRows.push(firstRow);

    for (let i = 1; i < days.length; i++) {
        const d = days[i];
        const row = { "Inicio Viaje": "", "Fin Viaje": "", " ": "", Fecha: d.date, Día: new Date(d.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long" }) };
        (d.activities || []).forEach((a, idx) => row[`Actividad ${idx+1}`] = `${a.time} - ${a.description}`);
        plannerRows.push(row);
    }

    const plannerSheet = XLSX.utils.json_to_sheet(plannerRows);
    plannerSheet["!cols"] = Object.keys(plannerRows[0] || {}).map(k => ({ wch: 25 }));
    XLSX.utils.book_append_sheet(wb, plannerSheet, "Itinerario");

    // ==========================================
        // HOJA 3: CHECKLIST
        // ==========================================
        if (checklistData && checklistData.length > 0) {
            const checkRows = checklistData.map(item => ({
                // AQUÍ ESTÁ EL CAMBIO: Solo dejamos el icono
                "Estado": item.packed ? "✅" : "❌", 
                "Categoría": item.category || "Varios",
                "Item": item.name
            }));
            
            const checkSheet = XLSX.utils.json_to_sheet(checkRows);
            
            // Ajustamos un poco el ancho porque ahora la columna Estado es más corta
            checkSheet["!cols"] = [{ wch: 8 }, { wch: 20 }, { wch: 40 }];
            
            XLSX.utils.book_append_sheet(wb, checkSheet, "Checklist");
        }

    // ==========================================
    // GUARDAR ARCHIVO
    // ==========================================
    const folderLabel = document.getElementById("current-folder-name")?.textContent?.replace(/\s+/g, "_") || "viaje";
    XLSX.writeFile(wb, `${folderLabel}_viaje_completo.xlsx`);

  } catch (err) {
    console.error("Error Excel:", err);
    alert("Error al descargar Excel.");
  }
});

// ==========================================
// LÓGICA DE SALIR DEL VIAJE (INVITADOS)
// ==========================================

// 1. Abrir Modal
if (leaveBtn) {
    leaveBtn.addEventListener("click", () => {
        if (leaveModal) leaveModal.classList.remove("hidden");
    });
}

// 2. Cancelar
if (cancelLeaveBtn) {
    cancelLeaveBtn.addEventListener("click", () => {
        if (leaveModal) leaveModal.classList.add("hidden");
    });
}

// 3. Confirmar Salida
if (confirmLeaveBtn) {
    confirmLeaveBtn.addEventListener("click", async () => {
        if (!window.folderId || !currentUserId) return;

        // Bloqueo visual del botón para evitar doble clic
        const originalText = confirmLeaveBtn.textContent;
        confirmLeaveBtn.disabled = true;
        confirmLeaveBtn.textContent = "Saliendo...";

        try {
            const folderRef = doc(db, "carpetas", window.folderId);

            // Borramos al usuario de la lista de aceptados
            await updateDoc(folderRef, {
                invitadosAceptados: arrayRemove(currentUserId)
            });

            // Redirigir a la pantalla de carpetas
            window.location.href = "../CARPETAS/carpetas.html";

        } catch (error) {
            console.error("Error al salir:", error);
            alert("Hubo un error al intentar salir del viaje.");
            
            // Restaurar botón si falló
            confirmLeaveBtn.disabled = false;
            confirmLeaveBtn.textContent = originalText;
            leaveModal.classList.add("hidden");
        }
    });
}