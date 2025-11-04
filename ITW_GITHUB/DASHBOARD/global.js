// Control simple de tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');


let currentUserId = localStorage.getItem("currentUserId") || null;

export function setCurrentUserId(uid) {
  currentUserId = uid;
}


tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    // Cambiar estado activo en botones
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Mostrar solo la sección activa
    tabContents.forEach(sec => {
      sec.classList.remove('active');
      if (sec.id === target) sec.classList.add('active');
    });
  });
});


// ============================
// INVITAR USUARIOS - POPUP + FIRESTORE
// ============================
import { db } from "../firebase.js";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  collection,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// importar funciones que acabamos de exportar
import { getInventoryData } from "../DASHBOARD/inventory.js";
import { getPlannerData }   from "../DASHBOARD/planner.js";
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";


// Referencias al DOM
const inviteBtn = document.getElementById("invite-btn");
const inviteModal = document.getElementById("invite-modal");
const sendInviteBtn = document.getElementById("send-invite-btn");
const closeInviteBtn = document.getElementById("close-invite-btn");
const inviteEmailInput = document.getElementById("invite-email");
const inviteStatus = document.getElementById("invite-status");

// Mostrar el popup
inviteBtn?.addEventListener("click", () => {
  inviteModal.classList.remove("hidden");
  inviteStatus.textContent = "";
  inviteEmailInput.value = "";
});

// Cerrar el popup
closeInviteBtn?.addEventListener("click", () => {
  inviteModal.classList.add("hidden");
});

// Enviar invitación
sendInviteBtn?.addEventListener("click", async () => {
  const email = inviteEmailInput.value.trim();
  if (!email) {
    inviteStatus.textContent = "Por favor ingresa un correo.";
    inviteStatus.style.color = "red";
    return;
  }

  try {
    // 🔹 Esperar que currentUserId esté definido
    if (!currentUserId) {
      inviteStatus.textContent = "Error: usuario no autenticado aún.";
      inviteStatus.style.color = "red";
      return;
    }

    // Buscar usuario por email
    const usersRef = collection(db, "usuarios");
    const q = query(usersRef, where("email", "==", email));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      inviteStatus.textContent = "No se encontró ningún usuario con ese correo.";
      inviteStatus.style.color = "red";
      return;
    }

    const invitedDoc = querySnap.docs[0];
    const invitedUid = invitedDoc.id;

    // 🔹 Bloquear autoinvitación
    if (invitedUid === currentUserId) {
      inviteStatus.textContent = "No puedes invitarte a ti mismo.";
      inviteStatus.style.color = "red";
      return;
    }

    const folderRef = doc(db, "carpetas", window.folderId);

    await updateDoc(folderRef, {
      invitadosPendientes: arrayUnion(invitedUid)
    });

    inviteStatus.textContent = `✅ Invitación enviada a ${email}`;
    inviteStatus.style.color = "green";

    setTimeout(() => {
      inviteModal.classList.add("hidden");
    }, 1500);

  } catch (error) {
    console.error("Error al invitar usuario:", error);
    inviteStatus.textContent = "Error al enviar invitación.";
    inviteStatus.style.color = "red";
  }
});

// === DESCARGAR TODO (Inventario + Itinerario/Calendario) ===
const downloadBtn = document.getElementById("download-btn");

downloadBtn?.addEventListener("click", async () => {
  try {
    // 🔹 Traer datos
    const inventario = await getInventoryData(); // array de items
    const plannerData = await getPlannerData();  // { calendario, dias }

    // 🔹 Crear workbook
    const wb = XLSX.utils.book_new();

    // === Hoja 1: Inventario ===
    const invSheet = XLSX.utils.json_to_sheet(inventario || []);
    XLSX.utils.book_append_sheet(wb, invSheet, "Inventario");

    // === Hoja 2: Itinerario + Calendario ===
    const dias = (plannerData.dias || []).map(d => {
      const acts = Array.isArray(d.activities) ? d.activities : [];
      const actsText = acts.length
        ? acts.map(a => `${a.time || ""} ${a.description || ""}`.trim()).join(" | ")
        : "";
      return {
        Fecha: d.date,
        Día: new Date(d.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long" }),
        Actividades: actsText
      };
    });

    // 🔹 Agregar rango del viaje en la parte superior
    const plannerRows = [];
    if (plannerData.calendario && plannerData.calendario.fechaInicio) {
      plannerRows.push({
        "Inicio Viaje": plannerData.calendario.fechaInicio,
        "Fin Viaje": plannerData.calendario.fechaFin
      });
      plannerRows.push({}); // fila vacía de separación
    }

    // 🔹 Agregar los días del itinerario
    plannerRows.push(...dias);

    // 🔹 Crear hoja de itinerario
    const plannerSheet = XLSX.utils.json_to_sheet(plannerRows);

    // === Ajustar ancho de columnas automáticamente ===
    const allRows = plannerRows;
    const colWidths = [];
    Object.keys(allRows[0] || {}).forEach(key => {
      const maxLen = Math.max(
        key.length,
        ...allRows.map(r => (r[key] ? String(r[key]).length : 0))
      );
      colWidths.push({ wch: maxLen + 2 });
    });
    plannerSheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, plannerSheet, "Itinerario_Calendario");

    // === Guardar archivo ===
    const folderLabel =
      document
        .getElementById("current-folder-name")
        ?.textContent?.replace(/\s+/g, "_") || "viaje";
    const filename = `${folderLabel}_viaje_completo.xlsx`;

    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error("Error generando Excel:", err);
    alert("Error al generar el archivo Excel. Revisa la consola.");
  }
});
