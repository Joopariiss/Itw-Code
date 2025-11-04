// ============================
// DASHBOARD.JS
// Funcionalidades exclusivas del DASHBOARD
// ============================

// Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
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
import { doc, updateDoc, arrayUnion, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Funciones del dashboard
import { getInventoryData } from "./inventory.js";
import { getPlannerData } from "./planner.js";
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";

// DOM para invitaciones
const inviteBtn = document.getElementById("invite-btn");
const inviteModal = document.getElementById("invite-modal");
const sendInviteBtn = document.getElementById("send-invite-btn");
const closeInviteBtn = document.getElementById("close-invite-btn");
const inviteEmailInput = document.getElementById("invite-email");
const inviteStatus = document.getElementById("invite-status");

// Mostrar/ocultar popup
inviteBtn?.addEventListener("click", () => {
  inviteModal.classList.remove("hidden");
  inviteStatus.textContent = "";
  inviteEmailInput.value = "";
});
closeInviteBtn?.addEventListener("click", () => inviteModal.classList.add("hidden"));

// Enviar invitación
sendInviteBtn?.addEventListener("click", async () => {
  const email = inviteEmailInput.value.trim();
  if (!email) return showInviteError("Por favor ingresa un correo.");

  try {
    const currentUserId = localStorage.getItem("currentUserId");
    if (!currentUserId) return showInviteError("Error: usuario no autenticado aún.");

    const usersRef = collection(db, "usuarios");
    const q = query(usersRef, where("email", "==", email));
    const querySnap = await getDocs(q);

    if (querySnap.empty) return showInviteError("No se encontró ningún usuario con ese correo.");

    const invitedUid = querySnap.docs[0].id;

    if (invitedUid === currentUserId) return showInviteError("No puedes invitarte a ti mismo.");

    const folderRef = doc(db, "carpetas", window.folderId);
    await updateDoc(folderRef, { invitadosPendientes: arrayUnion(invitedUid) });

    inviteStatus.textContent = `✅ Invitación enviada a ${email}`;
    inviteStatus.style.color = "green";
    setTimeout(() => inviteModal.classList.add("hidden"), 1500);

  } catch (error) {
    console.error("Error al invitar usuario:", error);
    showInviteError("Error al enviar invitación.");
  }
});

function showInviteError(msg) {
  inviteStatus.textContent = msg;
  inviteStatus.style.color = "red";
}

// ============================
// DESCARGAR INVENTARIO + ITINERARIO
// ============================
const downloadBtn = document.getElementById("download-btn");

downloadBtn?.addEventListener("click", async () => {
  try {
    const inventario = await getInventoryData();
    const plannerData = await getPlannerData();

    const wb = XLSX.utils.book_new();

    // Inventario
    let totalGasto = 0;
    const invClean = (inventario || []).map(item => {
      const precio = Number(item.price) || 0;
      totalGasto += precio;
      return {
        Nombre: item.name || "",
        Categoría: item.category || "",
        Cantidad: item.quantity || "",
        Precio: precio.toLocaleString("es-CL", { style: "currency", currency: "CLP" }),
        Notas: item.notes || ""
      };
    });
    invClean.push({}, { Nombre: "TOTAL", Precio: totalGasto.toLocaleString("es-CL", { style: "currency", currency: "CLP" }) });
    const invSheet = XLSX.utils.json_to_sheet(invClean);
    invSheet["!cols"] = Object.keys(invClean[0] || {}).map(key => ({ wch: Math.max(key.length, ...invClean.map(r => (r[key] ? String(r[key]).length : 0))) + 2 }));
    XLSX.utils.book_append_sheet(wb, invSheet, "Inventario");

    // Itinerario
    const dias = (plannerData.dias || []).map(d => {
      const actsText = (d.activities || []).map(a => `${a.time || ""} ${a.description || ""}`.trim()).join(" | ");
      return { Fecha: d.date, Día: new Date(d.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long" }), Actividades: actsText };
    });

    const plannerRows = [];
    if (plannerData.calendario?.fechaInicio) {
      plannerRows.push({ "Inicio Viaje": plannerData.calendario.fechaInicio, "Fin Viaje": plannerData.calendario.fechaFin }, {});
    }
    plannerRows.push(...dias);

    const plannerSheet = XLSX.utils.json_to_sheet(plannerRows);
    plannerSheet["!cols"] = Object.keys(plannerRows[0] || {}).map(key => ({ wch: Math.max(key.length, ...plannerRows.map(r => (r[key] ? String(r[key]).length : 0))) + 2 }));
    XLSX.utils.book_append_sheet(wb, plannerSheet, "Itinerario_Calendario");

    const folderLabel = document.getElementById("current-folder-name")?.textContent?.replace(/\s+/g, "_") || "viaje";
    XLSX.writeFile(wb, `${folderLabel}_viaje_completo.xlsx`);

  } catch (err) {
    console.error("Error generando Excel:", err);
    alert("Error al generar el archivo Excel. Revisa la consola.");
  }
});
