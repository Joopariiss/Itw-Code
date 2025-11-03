/* ============================
   Travel Planner - planner.js
   ============================ */

// FIRESTORE DATABASE:
import { db } from "../firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// === NUEVAS FUNCIONES PARA FIRESTORE ===

// Guardar calendario + itinerario en subcolecciones
async function saveItineraryToFirestore() {
  try {
    if (!window.folderId) return console.warn("❌ No hay folderId activo");
    const folderRef = doc(db, "carpetas", window.folderId);

    const start = tripDays.length ? tripDays[0].date : null;
    const end = tripDays.length ? tripDays[tripDays.length - 1].date : null;

    // 🔹 Guardar calendario en subcolección
    const calendarioRef = doc(collection(folderRef, "calendario"), "info");
    await setDoc(calendarioRef, {
      fechaInicio: start,
      fechaFin: end
    });

    // 🔹 Guardar cada día del itinerario como documento en subcolección
    const itinerarioRef = collection(folderRef, "itinerario");
    for (const day of tripDays) {
      const dayDoc = doc(itinerarioRef, day.date);
      await setDoc(dayDoc, { date: day.date, activities: day.activities || [] });
    }

    console.log("✅ Itinerario y calendario guardados en subcolecciones Firestore");
  } catch (err) {
    console.error("Error guardando itinerario:", err);
  }
}
// Cargar itinerario desde Firestore
// Cargar calendario + itinerario desde subcolecciones
async function loadItineraryFromFirestore() {
  try {
    if (!window.folderId) return;
    const folderRef = doc(db, "carpetas", window.folderId);

    // 🔹 Cargar calendario
    const calendarioRef = doc(collection(folderRef, "calendario"), "info");
    const calSnap = await getDoc(calendarioRef);

    if (!calSnap.exists()) {
      renderItinerary();
      return;
    }

    const calendarioData = calSnap.data();
    const startDateString = calendarioData.fechaInicio + "T12:00:00";
    const endDateString = calendarioData.fechaFin + "T12:00:00";

    tripDays = generateDaysBetween(new Date(startDateString), new Date(endDateString));

    // 🔹 Cargar itinerario (cada día desde subcolección)
    const itinerarioRef = collection(folderRef, "itinerario");
    const daysSnap = await getDocs(itinerarioRef);

    daysSnap.forEach(docSnap => {
      const dayData = docSnap.data();
      const day = tripDays.find(d => d.date === dayData.date);
      if (day) day.activities = dayData.activities || [];
    });

    // 🔹 Bloquear calendario al cargar
    calendarLocked = true;
    lockBtn.style.display = "none";
    unlockBtn.style.display = "block";

    if (calendarPicker) {
      calendarPicker.setDate(
        [calendarioData.fechaInicio, calendarioData.fechaFin],
        true
      );
      calendarPicker.input.disabled = true;
      const calendarElement = document.querySelector(".flatpickr-calendar");
      if (calendarElement) calendarElement.classList.add("calendar-locked");
    }

    renderItinerary();
    console.log("📅 Itinerario cargado desde subcolecciones Firestore");
  } catch (err) {
    console.error("Error cargando itinerario:", err);
  }
}



let tripDays = [];
let editingActivity = null;
let editingDay = null;
let calendarLocked = false;

// Elementos del DOM
const itinerarySection = document.getElementById('itinerary-section');
const activityModal = document.getElementById('activity-modal');
const activityTimeInput = document.getElementById('activity-time');
const activityDescInput = document.getElementById('activity-desc');
const saveActivityBtn = document.getElementById('save-activity-btn');
const cancelActivityBtn = document.getElementById('cancel-activity-btn');
const modalTitle = document.getElementById('modal-title');
const calendarSection = document.getElementById('calendar-section');

// Crear contenedor de botones al lado del calendario
const calendarActions = document.createElement('div');
calendarActions.style.display = "flex";
calendarActions.style.flexDirection = "column";
calendarActions.style.gap = "0.5rem";
calendarActions.style.marginTop = "1rem";
calendarActions.innerHTML = `
  <button id="lock-calendar-btn" class="btn btn-primary">🔒 Establecer fechas</button>
  <button id="unlock-calendar-btn" class="btn btn-secondary" style="display:none;">✏️ Editar fechas</button>
`;
calendarSection.appendChild(calendarActions);

const lockBtn = document.getElementById("lock-calendar-btn");
const unlockBtn = document.getElementById("unlock-calendar-btn");

// Modal de confirmación
const confirmModal = document.createElement("div");
confirmModal.className = "modal hidden";
confirmModal.innerHTML = `
  <div class="modal-content">
    <h3 id="confirm-message"></h3>
    <div class="modal-buttons">
      <button id="confirm-yes">Aceptar</button>
      <button id="confirm-no">Cancelar</button>
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

  confirmYes.onclick = () => {
    callback(true);
    confirmModal.classList.add("hidden");
  };
  confirmNo.onclick = () => {
    callback(false);
    confirmModal.classList.add("hidden");
  };
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
  title.style.color = "#2e2e2e";
  title.style.fontWeight = "600";
  itinerarySection.appendChild(title);

  // 🔹 No mostrar días si el calendario no está bloqueado todavía
  if (!calendarLocked) {
    const msg = document.createElement('p');
    msg.style.color = 'var(--muted-foreground)';
    msg.style.textAlign = 'center';
    msg.textContent = 'Selecciona y establece un rango en el calendario para generar el itinerario.';
    itinerarySection.appendChild(msg);
    return; // ⛔ No mostrar los días hasta que se bloquee el calendario
  }


  if (!tripDays.length) {
    const msg = document.createElement('p');
    msg.style.color = 'var(--muted-foreground)';
    msg.style.textAlign = 'center';
    msg.textContent = 'Selecciona un rango en el calendario para generar el itinerario.';
    itinerarySection.appendChild(msg);
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
    const activitiesContainer = document.createElement('div');
    activitiesContainer.className = 'activities';

    const activities = Array.isArray(day.activities) ? day.activities : [];
    if (activities.length > 0) {
      activities.forEach(act => {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity';
        activityDiv.innerHTML = `
          <span class="desc">${act.time} - ${act.description}</span>
          <div>
            <button class="edit-btn">✏️</button>
            <button class="delete-btn">🗑️</button>
          </div>
        `;

        activityDiv.querySelector('.edit-btn').addEventListener('click', () => {
          showConfirm("¿Deseas editar esta actividad?", ok => {
            if (ok) openModal(day, act);
          });
        });

        activityDiv.querySelector('.delete-btn').addEventListener('click', () => {
          showConfirm("¿Seguro que quieres eliminar esta actividad?", ok => {
            if (ok) {
              day.activities = day.activities.filter(a => a.id !== act.id);
              renderItinerary();
              saveItineraryToFirestore();
            }
          });
        });

        activitiesContainer.appendChild(activityDiv);
      });
    } else {
      const empty = document.createElement('p');
      empty.textContent = 'No hay actividades.';
      empty.style.color = 'var(--muted-foreground)';
      activitiesContainer.appendChild(empty);
    }

    body.appendChild(activitiesContainer);
    dayCard.appendChild(trigger);
    dayCard.appendChild(body);
    itinerarySection.appendChild(dayCard);

    trigger.addEventListener('click', e => {
      if (e.target.classList.contains('add-activity-btn')) return;
      body.style.display = body.style.display === 'block' ? 'none' : 'block';
    });

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
}

saveActivityBtn.addEventListener('click', () => {
  const desc = activityDescInput.value.trim();
  const time = activityTimeInput.value;

  if (!desc) return alert('Por favor ingresa una descripción.');

  if (editingActivity) {
    editingActivity.time = time;
    editingActivity.description = desc;
  } else if (editingDay) {
    editingDay.activities.push({ id: Date.now(), time, description: desc });
  }

  editingDay.activities.sort((a, b) => a.time.localeCompare(b.time));

  activityModal.classList.add('hidden');
  renderItinerary();
  saveItineraryToFirestore();

  const dayCards = document.querySelectorAll('.day-card');
  dayCards.forEach(card => {
    const dayTitle = card.querySelector('small');
    if (dayTitle && dayTitle.textContent.includes(formatDate(editingDay.date))) {
      const body = card.querySelector('.day-body');
      if (body) body.style.display = 'block';
    }
  });
});

cancelActivityBtn.addEventListener('click', () => {
  activityModal.classList.add('hidden');
});

/* ------------------------
   Utilidades
   ------------------------ */
function createSafeDate(dateStr) {
  if (!dateStr || dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T12:00:00');
}

function formatDate(dateStr) {
  const date = createSafeDate(dateStr);
  return date.toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getWeekday(dateStr) {
  return createSafeDate(dateStr).toLocaleDateString('es-ES', { weekday: 'long' });
}

/* ------------------------
   Rango de fechas
   ------------------------ */
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
  loopEndDate.setDate(loopEndDate.getDate() + 1);

  while (d < loopEndDate) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    arr.push({ date: dateString, activities: [] });
    d.setDate(d.getDate() + 1);
  }
  return arr;
}

/* ------------------------
   Bloquear/Desbloquear Calendario
   ------------------------ */
lockBtn.addEventListener("click", () => {
  if (tripDays.length === 0) {
    showPopup("⚠️ No puedes establecer fechas sin haber seleccionado un rango en el calendario.", "error");
    return; // 🚫 detenemos aquí si no hay rango
  }

  // ✅ Si sí hay fechas, bloqueamos calendario y renderizamos
  calendarLocked = true;
  lockBtn.style.display = "none";
  unlockBtn.style.display = "block";

  const calendarElement = document.querySelector(".flatpickr-calendar");
  if (calendarElement) calendarElement.classList.add("calendar-locked");

  // 🔹 Deshabilitar interacción
  calendarPicker.input.disabled = true;
  calendarPicker.close(); // cerrar calendario si estaba abierto

  showPopup("✅ Fechas establecidas correctamente.", "success");

  // 🔹 Guardar en Firestore y mostrar itinerario
  saveItineraryToFirestore();
  renderItinerary(); // 👈 AHORA se ejecuta correctamente
});

unlockBtn.addEventListener("click", () => {
  showConfirm("¿Deseas cambiar las fechas del viaje?", ok => {
    if (ok) {
      calendarLocked = false;
      lockBtn.style.display = "block";
      unlockBtn.style.display = "none";

      const calendarElement = document.querySelector(".flatpickr-calendar");
      if (calendarElement) calendarElement.classList.remove("calendar-locked");

      // 🔹 Habilitar interacción de nuevo
      calendarPicker.input.disabled = false;
      alert("Ahora puedes editar las fechas 🗓️");
    }
  });
});


// Popup simple
function showPopup(message, type = "info") {
  const existing = document.querySelector(".popup-alert");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.className = "popup-alert";
  popup.textContent = message;
  document.body.appendChild(popup);

  popup.style.position = "fixed";
  popup.style.top = "20px";
  popup.style.left = "50%";
  popup.style.transform = "translateX(-50%)";
  popup.style.padding = "10px 20px";
  popup.style.borderRadius = "10px";
  popup.style.color = "white";
  popup.style.fontWeight = "500";
  popup.style.zIndex = "9999";
  popup.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  popup.style.transition = "opacity 0.4s ease";
  popup.style.opacity = "1";
  popup.style.background =
    type === "error" ? "#d32f2f" : type === "success" ? "#2e7d32" : "#333";

  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 500);
  }, 2500);
}

document.addEventListener("DOMContentLoaded", () => {
  renderItinerary();
  loadItineraryFromFirestore();
});
