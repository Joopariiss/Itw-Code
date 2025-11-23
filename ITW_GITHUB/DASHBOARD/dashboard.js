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
import { doc, updateDoc, arrayUnion, getDocs, collection, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// ============================
// VALIDAR PERMISOS DEL DUEÑO
// ============================
async function checkInvitePermissions() {
  const currentUserId = localStorage.getItem("currentUserId");
  if (!currentUserId) return;

  const folderRef = doc(db, "carpetas", window.folderId);
  const snap = await getDoc(folderRef);
  if (!snap.exists()) return;

  const data = snap.data();

  // El dueño está en data.userId
  const isOwner = data.userId === currentUserId;

  if (!isOwner) {
    // Ocultar botón
    const btn = document.getElementById("invite-btn");
    if (btn) btn.style.display = "none";
    window.USER_IS_OWNER = false;
  } else {
    window.USER_IS_OWNER = true;
  }
}

// Ejecutar una vez cargado el dashboard
checkInvitePermissions();



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
  // BLOQUEO PARA INVITADOS → esta parte te faltaba
  if (window.USER_IS_OWNER === false) {
    return showInviteError("Solo el dueño puede invitar.");
  }

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
// DESCARGAR INVENTARIO + ITINERARIO (VERSIÓN C: COLUMNAS DINÁMICAS)
// ============================
const downloadBtn = document.getElementById("download-btn");

downloadBtn?.addEventListener("click", async () => {
  try {
    const inventario = await getInventoryData();
    const plannerData = await getPlannerData();

    const wb = XLSX.utils.book_new();

    // ============================
    // INVENTARIO
    // ============================
    let totalGasto = 0;
    const invClean = (inventario || []).map(item => {
      const costoUnitario = Number(item.cost) || 0;
      const cantidad = Number(item.quantity) || 1;
      const costoTotalItem = costoUnitario * cantidad;
      totalGasto += costoTotalItem;

      return {
        Nombre: item.name || "",
        Categoría: item.category || "",
        Cantidad: cantidad,
        "Costo Unitario": costoUnitario.toLocaleString("es-CL", { style: "currency", currency: "CLP" }),
        "Costo Total": costoTotalItem.toLocaleString("es-CL", { style: "currency", currency: "CLP" }),
      };
    });

    invClean.push(
      {},
      { Nombre: "TOTAL", "Costo Total": totalGasto.toLocaleString("es-CL", { style: "currency", currency: "CLP" }) }
    );

    const invSheet = XLSX.utils.json_to_sheet(invClean);
    invSheet["!cols"] = Object.keys(invClean[0] || {}).map(key => ({
      wch: Math.max(key.length, ...invClean.map(r => (r[key] ? String(r[key]).length : 0))) + 2
    }));
    XLSX.utils.book_append_sheet(wb, invSheet, "Inventario");

    // ============================
    // ITINERARIO 
    // ============================

    const days = plannerData.dias || [];

    // 1) Calcular máximo de actividades
    const maxActivities = Math.max(
      ...days.map(d => (d.activities ? d.activities.length : 0)),
      0
    );

    // Columnas dinámicas
    const activityCols = Array.from({ length: maxActivities }, (_, i) => `Actividad ${i + 1}`);

    const plannerRows = [];

    // ============================
    // Fila 1: Inicio / Fin + columna vacía
    // ============================
    plannerRows.push({
      "Inicio Viaje": plannerData.calendario?.fechaInicio || "",
      "Fin Viaje": plannerData.calendario?.fechaFin || "",
      " ": "", // ← ← ← COLUMNA VACÍA
      Fecha: days.length > 0 ? days[0].date : "",
      Día: new Date(days[0].date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long" }),
      ...(() => {
        const base = {};
        (days[0].activities || []).forEach((a, idx) => {
          base[`Actividad ${idx + 1}`] = `${a.time ?? ""} — ${a.description ?? ""}`;
        });
        for (let i = (days[0].activities?.length || 0); i < maxActivities; i++) {
          base[`Actividad ${i + 1}`] = "";
        }
        return base;
      })()
    });

    // ============================
    // Filas siguientes
    // ============================
    for (let i = 1; i < days.length; i++) {
      const d = days[i];
      const weekday = new Date(d.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long" });

      const row = {
        "Inicio Viaje": "",
        "Fin Viaje": "",
        " ": "",
        Fecha: d.date,
        Día: weekday
      };

      (d.activities || []).forEach((a, index) => {
        row[`Actividad ${index + 1}`] = `${a.time ?? ""} — ${a.description ?? ""}`;
      });

      for (let j = (d.activities?.length || 0); j < maxActivities; j++) {
        row[`Actividad ${j + 1}`] = "";
      }

      plannerRows.push(row);
    }

    const plannerSheet = XLSX.utils.json_to_sheet(plannerRows);

    plannerSheet["!cols"] = Object.keys(plannerRows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...plannerRows.map(r => (r[key] ? String(r[key]).length : 0))) + 2
    }));

    XLSX.utils.book_append_sheet(wb, plannerSheet, "Itinerario");


    // ============================
    // GUARDAR ARCHIVO
    // ============================
    const folderLabel =
      document.getElementById("current-folder-name")?.textContent?.replace(/\s+/g, "_") || "viaje";

    XLSX.writeFile(wb, `${folderLabel}_viaje_completo.xlsx`);

  } catch (err) {
    console.error("Error generando Excel:", err);
    alert("Error al generar el archivo Excel. Revisa la consola.");
  }
});
