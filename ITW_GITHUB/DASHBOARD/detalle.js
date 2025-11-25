import { db } from "../firebase.js";
// 🔥 IMPORTANTE: Agregamos 'arrayRemove' a los imports
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getInventoryData } from "./inventory.js";
import { getPlannerData } from "./planner.js";
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";

const folderId = window.folderId;
const participantsList = document.getElementById('participants-list');
const currentUserId = localStorage.getItem("currentUserId"); // Obtenemos el ID del usuario actual

// ==========================================
// 1. CARGAR USUARIOS
// ==========================================
async function loadParticipants() {
    if (!folderId) return;
    participantsList.innerHTML = '<p class="text-muted">Cargando...</p>';

    try {
        const folderRef = doc(db, "carpetas", folderId);
        const snap = await getDoc(folderRef);
        
        if (!snap.exists()) return;
        const data = snap.data();
        
        // Determinar si YO soy el dueño para saber si puedo mostrar botones de borrar
        const amIOwner = data.userId === currentUserId;

        participantsList.innerHTML = ''; // Limpiar lista

        // A) DUEÑO (Owner) - A este nunca se le puede borrar
        if (data.userId) {
            const userDoc = await getDoc(doc(db, "usuarios", data.userId));
            const userData = userDoc.exists() ? userDoc.data() : { email: "Dueño Desconocido" };
            // Pasamos isOwner=false porque nadie puede borrar al dueño
            renderUserRow(userData.email || "Dueño", "👑 Dueño", "status-owner", data.userId, null, false);
        }

        // B) INVITADOS PENDIENTES
        if (data.invitadosPendientes && data.invitadosPendientes.length > 0) {
            for (const uid of data.invitadosPendientes) {
                const userDoc = await getDoc(doc(db, "usuarios", uid));
                const email = userDoc.exists() ? userDoc.data().email : "Usuario";
                // Pasamos la lista 'invitadosPendientes' para saber de dónde borrar
                renderUserRow(email, "⏳ Pendiente", "status-pending", uid, "invitadosPendientes", amIOwner);
            }
        }

        // C) INVITADOS ACEPTADOS
        if (data.invitadosAceptados && data.invitadosAceptados.length > 0) {
            for (const uid of data.invitadosAceptados) {
                if (uid === data.userId) continue; // Saltar al dueño

                const userDoc = await getDoc(doc(db, "usuarios", uid));
                const email = userDoc.exists() ? userDoc.data().email : "Colaborador";
                
                // Pasamos la lista 'invitadosAceptados' para saber de dónde borrar
                renderUserRow(email, "🤝 Colaborador", "status-accepted", uid, "invitadosAceptados", amIOwner);
            }
        }

    } catch (error) {
        console.error("Error cargando participantes:", error);
        participantsList.innerHTML = '<p class="negative">Error al cargar lista.</p>';
    }
}

// 🔥 FUNCIÓN ACTUALIZADA: Ahora recibe ID, lista y permisos
function renderUserRow(email, label, statusClass, uid, listType, showDeleteBtn) {
    const letter = email.charAt(0).toUpperCase();
    const row = document.createElement('div');
    row.className = 'user-row';
    
    // HTML base
    let html = `
        <div class="user-info">
            <div class="user-avatar">${letter}</div>
            <span>${email}</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
            <span class="user-status ${statusClass}">${label}</span>
    `;

    // 🔥 Agregamos el botón SOLO si soy el dueño y hay una lista de donde borrar
    if (showDeleteBtn && listType) {
        html += `
            <button class="btn-delete-user" title="Expulsar usuario" style="background:none; border:none; cursor:pointer; font-size:1.1rem;">
                ❌
            </button>
        `;
    }

    html += `</div>`; // Cerrar el div contenedor derecho
    row.innerHTML = html;

    // 🔥 Evento Click para borrar
    if (showDeleteBtn && listType) {
        const deleteBtn = row.querySelector('.btn-delete-user');
        deleteBtn.addEventListener('click', () => removeUser(uid, listType, email));
    }

    participantsList.appendChild(row);
}

// 🔥 NUEVA FUNCIÓN: Eliminar usuario de Firestore
async function removeUser(uidToDelete, listName, email) {
    const confirmMsg = `¿Seguro que quieres expulsar a ${email}?`;
    if (!confirm(confirmMsg)) return;

    try {
        const folderRef = doc(db, "carpetas", folderId);
        
        // Usamos arrayRemove para sacar el ID del array específico
        await updateDoc(folderRef, {
            [listName]: arrayRemove(uidToDelete)
        });

        alert(`Usuario eliminado correctamente.`);
        loadParticipants(); // Recargar la lista visualmente

    } catch (error) {
        console.error("Error eliminando usuario:", error);
        alert("Hubo un error al intentar eliminar al usuario.");
    }
}

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => {
        t.addEventListener('click', () => {
            if (t.dataset.tab === 'details') {
                loadParticipants();
            }
        });
    });
    if(document.querySelector('.tab-btn[data-tab="details"]')?.classList.contains('active')){
        loadParticipants();
    }
});


// ============================
// 2. LÓGICA DE BOTONES (Invitación y Descarga)
// ... (El resto del código se mantiene IGUAL que antes) ...
// ============================

const inviteBtn = document.getElementById("details-invite-btn"); 
const downloadBtn = document.getElementById("details-download-btn");

const inviteModal = document.getElementById("invite-modal");
const sendInviteBtn = document.getElementById("send-invite-btn");
const closeInviteBtn = document.getElementById("close-invite-btn");
const inviteEmailInput = document.getElementById("invite-email");
const inviteStatus = document.getElementById("invite-status");

async function checkInvitePermissions() {
  if (!currentUserId) return;
  const folderRef = doc(db, "carpetas", window.folderId);
  const snap = await getDoc(folderRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const isOwner = data.userId === currentUserId;

  if (!isOwner) {
    if (inviteBtn) inviteBtn.style.display = "none";
    window.USER_IS_OWNER = false;
  } else {
    window.USER_IS_OWNER = true;
  }
}
checkInvitePermissions();

inviteBtn?.addEventListener("click", () => {
  inviteModal.classList.remove("hidden");
  inviteStatus.textContent = "";
  inviteEmailInput.value = "";
});
closeInviteBtn?.addEventListener("click", () => inviteModal.classList.add("hidden"));

sendInviteBtn?.addEventListener("click", async () => {
  if (window.USER_IS_OWNER === false) return showInviteError("Solo el dueño puede invitar.");
  const email = inviteEmailInput.value.trim();
  if (!email) return showInviteError("Por favor ingresa un correo.");

  try {
    const usersRef = collection(db, "usuarios");
    const q = query(usersRef, where("email", "==", email));
    const querySnap = await getDocs(q);

    if (querySnap.empty) return showInviteError("Usuario no encontrado.");
    const invitedUid = querySnap.docs[0].id;
    if (invitedUid === currentUserId) return showInviteError("No puedes invitarte a ti mismo.");

    const folderRef = doc(db, "carpetas", window.folderId);
    await updateDoc(folderRef, { invitadosPendientes: arrayUnion(invitedUid) });

    inviteStatus.textContent = `✅ Invitación enviada a ${email}`;
    inviteStatus.style.color = "green";
    
    setTimeout(() => {
        inviteModal.classList.add("hidden");
        loadParticipants(); 
    }, 1500);

  } catch (error) {
    console.error("Error al invitar:", error);
    showInviteError("Error al enviar invitación.");
  }
});

function showInviteError(msg) {
  inviteStatus.textContent = msg;
  inviteStatus.style.color = "red";
}

downloadBtn?.addEventListener("click", async () => {
  try {
    const inventario = await getInventoryData();
    const plannerData = await getPlannerData();
    const wb = XLSX.utils.book_new();

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

    const days = plannerData.dias || [];
    const maxActs = Math.max(...days.map(d => (d.activities ? d.activities.length : 0)), 0);
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
    plannerSheet["!cols"] = Object.keys(plannerRows[0] || {}).map(k => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, plannerSheet, "Itinerario");

    const folderLabel = document.getElementById("current-folder-name")?.textContent?.replace(/\s+/g, "_") || "viaje";
    XLSX.writeFile(wb, `${folderLabel}_viaje_completo.xlsx`);

  } catch (err) {
    console.error("Error Excel:", err);
    alert("Error al descargar Excel.");
  }
});