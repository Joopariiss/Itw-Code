/* ============================
   Travel Planner - planner.js (Versión Real-Time Optimizada)
   ============================ */

import { db } from "../../../firebase.js";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot // Importante para el tiempo real
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// 1. VARIABLES DE ESTADO
// ==========================================
let tripDays = [];
let editingActivity = null;
let editingDay = null;
let calendarLocked = false;

// ==========================================
// 2. REFERENCIAS AL DOM
// ==========================================
const itinerarySection = document.getElementById('itinerary-section');
const activityModal = document.getElementById('activity-modal');
const activityTimeInput = document.getElementById('activity-time');
const activityDescInput = document.getElementById('activity-desc');
const saveActivityBtn = document.getElementById('save-activity-btn');
const cancelActivityBtn = document.getElementById('cancel-activity-btn');
const modalTitle = document.getElementById('modal-title');
const calendarSection = document.getElementById('calendar-section');

// Botones del Calendario
const calendarActions = document.createElement('div');
calendarActions.style.display = "flex";
calendarActions.style.flexDirection = "column";
calendarActions.style.gap = "0.5rem";
calendarActions.style.marginTop = "1rem";
calendarActions.innerHTML = `
  <button id="lock-calendar-btn" class="btn btn-shiny-action">🔒 Establecer fechas</button>
  
  <button id="unlock-calendar-btn" class="btn btn-secondary" style="display:none; width: 100%; margin-top: 15px;">✏️ Editar fechas</button>
`;
calendarSection.appendChild(calendarActions);

const lockBtn = document.getElementById("lock-calendar-btn");
const unlockBtn = document.getElementById("unlock-calendar-btn");

// Modal de Confirmación Genérico
const confirmModal = document.createElement("div");
confirmModal.className = "modal hidden";
confirmModal.innerHTML = `
  <div class="modal-content">
    <h3 id="confirm-message" style="margin-bottom: 1.5rem; text-align: center;"></h3>
    <div class="modal-buttons" style="justify-content: center;">
      <button id="confirm-yes" class="btn btn-primary">Aceptar</button>
      <button id="confirm-no" class="btn btn-secondary">Cancelar</button>
    </div>
  </div>
`;
document.body.appendChild(confirmModal);

const confirmMessage = document.getElementById("confirm-message");
const confirmYes = document.getElementById("confirm-yes");
const confirmNo = document.getElementById("confirm-no");

function showConfirm(message, callback) {
  confirmMessage.textContent = message;
  confirmModal.classList.remove("hidden");
  confirmYes.onclick = () => { callback(true); confirmModal.classList.add("hidden"); };
  confirmNo.onclick = () => { callback(false); confirmModal.classList.add("hidden"); };
}


// ==========================================
// 3. LÓGICA DE TIEMPO REAL (CORE)
// ==========================================

function initPlannerRealTime() {
  if (!window.folderId) return;
  const folderRef = doc(db, "carpetas", window.folderId);

  // A) ESCUCHAR CALENDARIO (Fechas)
  const calendarioRef = doc(collection(folderRef, "calendario"), "info");
  
  onSnapshot(calendarioRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const newStart = data.fechaInicio;
      const newEnd = data.fechaFin;

      // Actualizar UI del calendario
      calendarLocked = true;
      if(lockBtn) lockBtn.style.display = "none";
      if(unlockBtn) unlockBtn.style.display = "block";

      if (calendarPicker) {
        calendarPicker.setDate([newStart, newEnd], true);
        calendarPicker.input.disabled = true;
        document.querySelector(".flatpickr-calendar")?.classList.add("calendar-locked");
      }

      // Si es la primera carga o cambiaron las fechas drásticamente, regeneramos estructura base
      if (tripDays.length === 0 || tripDays[0].date !== newStart || tripDays[tripDays.length-1].date !== newEnd) {
         tripDays = generateDaysBetween(new Date(newStart + "T12:00:00"), new Date(newEnd + "T12:00:00"));
         renderItinerary(); 
      }
    }
  });

  // B) ESCUCHAR ITINERARIO (Actividades)
  const itinerarioRef = collection(folderRef, "itinerario");

  onSnapshot(itinerarioRef, (snapshot) => {
    let needsRender = false;

    snapshot.docChanges().forEach((change) => {
      const dayData = change.doc.data();
      // Buscar el día correspondiente en nuestro array local
      const dayIndex = tripDays.findIndex(d => d.date === dayData.date);
      
      if (dayIndex !== -1) {
        if (change.type === "added" || change.type === "modified") {
          tripDays[dayIndex].activities = dayData.activities || [];
          needsRender = true;
        } 
      }
    });
    
    if (needsRender || snapshot.size === 0) {
        renderItinerary();
    }
  });
}

// ==========================================
// 4. FUNCIONES DE GUARDADO (OPTIMIZADAS)
// ==========================================

// A) Guardar TODO (Solo se usa al cambiar fechas)
async function saveFullItineraryToFirestore() {
  try {
    if (!window.folderId) return;
    const folderRef = doc(db, "carpetas", window.folderId);

    const start = tripDays.length ? tripDays[0].date : null;
    const end = tripDays.length ? tripDays[tripDays.length - 1].date : null;

    // 1. Guardar info de fechas
    await setDoc(doc(collection(folderRef, "calendario"), "info"), {
      fechaInicio: start,
      fechaFin: end
    });

    // 2. Limpiar itinerario viejo y guardar nuevo
    const itinerarioRef = collection(folderRef, "itinerario");
    const oldDays = await getDocs(itinerarioRef);
    const deleteOps = oldDays.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deleteOps);

    // 3. Crear documentos vacíos para los días
    for (const day of tripDays) {
      await setDoc(doc(itinerarioRef, day.date), { date: day.date, activities: [] });
    }
    console.log("✅ Calendario reiniciado y guardado.");
  } catch (err) { console.error("Error guardando fechas:", err); }
}

// B) Guardar SOLO UN DÍA (Se usa al agregar/editar/borrar actividades)
async function saveDayToFirestore(dayObj) {
    if (!window.folderId || !dayObj) return;
    try {
        const dayRef = doc(db, "carpetas", window.folderId, "itinerario", dayObj.date);
        await setDoc(dayRef, { 
            date: dayObj.date, 
            activities: dayObj.activities || [] 
        }, { merge: true });
    } catch (e) { console.error("Error guardando día:", e); }
}


/* ------------------------
   Renderizar Itinerario
   ------------------------ */
function renderItinerary() {
  itinerarySection.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = "Itinerario del Viaje";
  title.style.marginTop = "0";
  title.style.marginBottom = "1rem";
  title.style.textAlign = "center";
  title.style.fontWeight = "600";
  itinerarySection.appendChild(title);

  if (!calendarLocked) {
    const msg = document.createElement('p');
    msg.style.color = 'var(--muted-foreground)';
    msg.style.textAlign = 'center';
    msg.textContent = 'Selecciona y establece un rango en el calendario para generar el itinerario.';
    itinerarySection.appendChild(msg);
    return;
  }

  if (!tripDays.length) {
    itinerarySection.innerHTML += '<p class="text-center text-muted">Cargando días...</p>';
    return;
  }

  tripDays.forEach(day => {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';

    const trigger = document.createElement('div');
    trigger.className = 'day-trigger';
    trigger.innerHTML = `
      <div>
        <h3 style="margin:0">${getWeekday(day.date)}</h3>
        <small>${formatDate(day.date)}</small>
      </div>
      <button class="add-activity-btn">Agregar actividad</button>
    `;

    const body = document.createElement('div');
    body.className = 'day-body';
    // Si hay actividades, mantenemos abierto el día (opcional, mejora UX)
    if(day.activities && day.activities.length > 0) {
        // body.style.display = 'block'; // Descomentar si quieres que se abran solos
    }

    const activitiesContainer = document.createElement('div');
    activitiesContainer.className = 'activities';

    const activities = Array.isArray(day.activities) ? day.activities : [];
    
    // Ordenar actividades por hora
    activities.sort((a, b) => a.time.localeCompare(b.time));

    if (activities.length > 0) {
      activities.forEach(act => {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity';
        activityDiv.innerHTML = `
          <span class="desc"><strong>${act.time}</strong> - ${act.description}</span>
          <div>
            <button class="edit-btn">🖊️</button>
            <button class="delete-btn">🗑</button>
          </div>
        `;

        // Editar
        activityDiv.querySelector('.edit-btn').addEventListener('click', () => {
             openModal(day, act);
        });

        // Eliminar
        activityDiv.querySelector('.delete-btn').addEventListener('click', () => {
          showConfirm("¿Eliminar actividad?", ok => {
            if (ok) {
              day.activities = day.activities.filter(a => a.id !== act.id);
              // Guardamos cambios -> onSnapshot actualizará la vista
              saveDayToFirestore(day);
            }
          });
        });

        activitiesContainer.appendChild(activityDiv);
      });
    } else {
      const empty = document.createElement('p');
      empty.textContent = 'No hay actividades.';
      empty.style.color = 'var(--muted-foreground)';
      empty.style.fontStyle = 'italic';
      activitiesContainer.appendChild(empty);
    }

    body.appendChild(activitiesContainer);
    dayCard.appendChild(trigger);
    dayCard.appendChild(body);
    itinerarySection.appendChild(dayCard);

    // Acordeón
    trigger.addEventListener('click', e => {
      if (e.target.classList.contains('add-activity-btn')) return;
      body.style.display = body.style.display === 'block' ? 'none' : 'block';
    });

    // Botón Agregar
    trigger.querySelector('.add-activity-btn').addEventListener('click', e => {
      e.stopPropagation();
      openModal(day);
    });
  });
}

/* ------------------------
   Modal Actividad
   ------------------------ */
function openModal(day, activity = null) {
  editingDay = day;
  editingActivity = activity;
  modalTitle.textContent = activity ? 'Editar Actividad' : 'Agregar Actividad';
  activityTimeInput.value = activity ? activity.time : '12:00';
  activityDescInput.value = activity ? activity.description : '';
  activityModal.classList.remove('hidden');
  activityDescInput.focus();
}

saveActivityBtn.addEventListener('click', () => {
  const desc = activityDescInput.value.trim();
  const time = activityTimeInput.value;

  // CAMBIO 1: Usar showPopup en vez de alert si falta descripción
  if (!desc) {
     showPopup('⚠️ Por favor ingresa una descripción.', "error");
     return;
  }
  // Validación de duplicados
  const isDuplicate = editingDay.activities.some(a =>
    a.time === time && (!editingActivity || a.id !== editingActivity.id)
  );

  if (isDuplicate) {
    // CAMBIO 2: Aquí estaba el problema del "pop up feo"
    // Reemplazamos alert() por showPopup()
    showPopup("⚠️ Ya existe una actividad a esa hora.", "error"); 
    return;
  }

  // Editar o Crear
  if (editingActivity) {
    editingActivity.time = time;
    editingActivity.description = desc;
  } else if (editingDay) {
    editingDay.activities.push({ id: Date.now(), time, description: desc });
  }

  // Cerrar modal
  activityModal.classList.add('hidden');
  
  // Guardamos SOLO el día afectado -> onSnapshot hará el render
  saveDayToFirestore(editingDay);
});

cancelActivityBtn.addEventListener('click', () => {
  activityModal.classList.add('hidden');
});

/* ------------------------
   Utilidades y Flatpickr
   ------------------------ */
function createSafeDate(dateStr) {
  if (!dateStr || dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T12:00:00');
}

function formatDate(dateStr) {
  const date = createSafeDate(dateStr);
  return date.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' });
}

function getWeekday(dateStr) {
  const date = createSafeDate(dateStr);
  return date.toLocaleDateString('es-ES', { weekday: 'long' });
}

const calendarPicker = flatpickr('#trip-calendar', {
  mode: 'range',
  dateFormat: 'Y-m-d',
  inline: true,
  locale: { firstDayOfWeek: 1 },
  onChange: selectedDates => {
    if (calendarLocked) return;
    if (selectedDates.length === 2) {
      tripDays = generateDaysBetween(selectedDates[0], selectedDates[1]);
    } else {
      tripDays = [];
    }
    renderItinerary();
  }
});

function generateDaysBetween(startDate, endDate) {
  const arr = [];
  const d = new Date(startDate);
  d.setHours(12, 0, 0, 0);
  const loopEndDate = new Date(endDate);
  loopEndDate.setDate(loopEndDate.getDate() + 1); // Incluir último día

  while (d < loopEndDate) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    arr.push({ date: `${year}-${month}-${day}`, activities: [] });
    d.setDate(d.getDate() + 1);
  }
  return arr;
}

/* ------------------------
   Bloquear/Desbloquear
   ------------------------ */
lockBtn.addEventListener("click", () => {
  if (tripDays.length === 0) {
    showPopup("⚠️ Selecciona un rango de fechas primero.", "error");
    return;
  }
  // Al bloquear fechas, guardamos la estructura completa
  saveFullItineraryToFirestore();
  // El onSnapshot se encargará de actualizar la UI
});

unlockBtn.addEventListener("click", () => {
  showConfirm("¿Cambiar fechas borrará el itinerario actual. ¿Seguro?", ok => {
    if (ok) {
      calendarLocked = false;
      lockBtn.style.display = "block";
      unlockBtn.style.display = "none";
      document.querySelector(".flatpickr-calendar")?.classList.remove("calendar-locked");
      calendarPicker.input.disabled = false;
      renderItinerary();
    }
  });
});

function showPopup(message, type = "info") {
  const existing = document.querySelector(".popup-alert");
  if (existing) existing.remove();
  const popup = document.createElement("div");
  popup.className = "popup-alert";
  popup.textContent = message;
  document.body.appendChild(popup);
  popup.style.position = "fixed"; popup.style.top = "20px"; popup.style.left = "50%";
  popup.style.transform = "translateX(-50%)"; popup.style.padding = "10px 20px";
  popup.style.borderRadius = "10px"; popup.style.color = "white"; popup.style.fontWeight = "500";
  popup.style.zIndex = "9999"; popup.style.background = type === "error" ? "#d32f2f" : "#2e7d32";
  setTimeout(() => { popup.style.opacity = "0"; setTimeout(() => popup.remove(), 500); }, 2500);
}

// === INICIALIZACIÓN ===
document.addEventListener("DOMContentLoaded", () => {
  renderItinerary();
  initPlannerRealTime(); // Iniciamos el listener
});

// === EXPORT PARA EXCEL ===
export async function getPlannerData() {
  if (!window.folderId) return { calendario: null, dias: [] };
  const folderRef = doc(db, "carpetas", window.folderId);
  
  // Info calendario
  const calSnap = await getDoc(doc(collection(folderRef, "calendario"), "info"));
  const calendario = calSnap.exists() ? calSnap.data() : null;

  // Días con actividades
  const daysSnap = await getDocs(collection(folderRef, "itinerario"));
  const dias = daysSnap.docs
    .map(d => d.data())
    .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

  return { calendario, dias };
}