/* ============================
   Travel Planner - script.js
   ============================ */

let tripDays = [];
let editingActivity = null;
let editingDay = null;

/* ------------------------
   Elementos del DOM
   ------------------------ */
const itinerarySection = document.getElementById('itinerary-section');

// Modal & botones (comprobamos que existan)
const activityModal = document.getElementById('activity-modal');
const activityTimeInput = document.getElementById('activity-time');
const activityDescInput = document.getElementById('activity-desc');
const saveActivityBtn = document.getElementById('save-activity-btn');
const cancelActivityBtn = document.getElementById('cancel-activity-btn');
const modalTitle = document.getElementById('modal-title');

/* ------------------------
   Funciones de itinerario
   ------------------------ */
function renderItinerary() {
  if (!itinerarySection) return;
  itinerarySection.innerHTML = '';

  if (!tripDays.length) {
    itinerarySection.innerHTML = '<p style="color:var(--muted-foreground)">Selecciona un rango en el calendario para generar el itinerario.</p>';
    return;
  }

  tripDays.forEach(day => {
    // Contenedor de día
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';
    dayCard.style.border = '1px solid var(--border)';
    dayCard.style.borderRadius = 'var(--radius)';
    dayCard.style.padding = '0.75rem';
    dayCard.style.marginBottom = '0.75rem';
    dayCard.style.background = 'var(--card)';

    // Trigger (encabezado)
    const trigger = document.createElement('div');
    trigger.className = 'day-trigger';
    trigger.style.display = 'flex';
    trigger.style.justifyContent = 'space-between';
    trigger.style.alignItems = 'center';
    trigger.style.cursor = 'pointer';
    trigger.style.marginBottom = '0.5rem';

    // Span para la fecha
    const dateSpan = document.createElement('span');
    dateSpan.textContent = formatDateHuman(day.date);
    dateSpan.style.fontWeight = '700';

    // Botón Add Activity
    const addBtn = document.createElement('button');
    addBtn.className = 'add-activity-btn';
    addBtn.textContent = 'Add Activity';
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(day);
    });

    trigger.appendChild(dateSpan);
    trigger.appendChild(addBtn);

    // Body (lista de actividades)
    const body = document.createElement('div');
    body.className = 'day-body';
    body.style.display = 'none'; // oculto inicialmente

    const activitiesContainer = document.createElement('div');
    activitiesContainer.className = 'activities';

    if (day.activities.length) {
      day.activities.forEach(act => {
        const actDiv = document.createElement('div');
        actDiv.className = 'activity';
        actDiv.style.display = 'flex';
        actDiv.style.justifyContent = 'space-between';
        actDiv.style.alignItems = 'center';
        actDiv.style.padding = '0.4rem';
        actDiv.style.marginBottom = '0.4rem';
        actDiv.style.borderRadius = 'var(--radius)';
        actDiv.style.background = 'var(--secondary)';

        const descSpan = document.createElement('span');
        descSpan.className = 'desc';
        descSpan.textContent = `${act.time} - ${act.description}`;
        actDiv.appendChild(descSpan);

        const btnsDiv = document.createElement('div');

        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️';
        editBtn.style.marginRight = '0.3rem';
        editBtn.addEventListener('click', () => openModal(day, act));

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', () => {
          day.activities = day.activities.filter(a => a.id !== act.id);
          renderItinerary();
        });

        btnsDiv.appendChild(editBtn);
        btnsDiv.appendChild(deleteBtn);
        actDiv.appendChild(btnsDiv);

        activitiesContainer.appendChild(actDiv);
      });
    } else {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'No activities planned.';
      emptyMsg.style.color = 'var(--muted-foreground)';
      activitiesContainer.appendChild(emptyMsg);
    }

    body.appendChild(activitiesContainer);
    dayCard.appendChild(trigger);
    dayCard.appendChild(body);

    // Toggle body on header click
    trigger.addEventListener('click', () => {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

    itinerarySection.appendChild(dayCard);
  });
}

/* ------------------------
   Formato de fecha humano
   ------------------------ */
function formatDateHuman(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/* ------------------------
   Modal (abrir/guardar/cancelar)
   ------------------------ */
function openModal(day, activity = null) {
  editingDay = day;
  editingActivity = activity;

  if (modalTitle) modalTitle.textContent = activity ? 'Edit Activity' : 'Add Activity';
  if (activityTimeInput) activityTimeInput.value = activity ? activity.time : '12:00';
  if (activityDescInput) activityDescInput.value = activity ? activity.description : '';
  if (activityModal) activityModal.classList.remove('hidden');
}

if (saveActivityBtn) {
  saveActivityBtn.addEventListener('click', () => {
    const desc = activityDescInput ? activityDescInput.value.trim() : '';
    const time = activityTimeInput ? activityTimeInput.value : '12:00';
    if (!desc) return alert('Description required');

    if (editingActivity) {
      editingActivity.time = time;
      editingActivity.description = desc;
    } else if (editingDay) {
      editingDay.activities.push({ id: Date.now(), time, description: desc });
    }

    if (activityModal) activityModal.classList.add('hidden');
    renderItinerary();
  });
}

if (cancelActivityBtn) {
  cancelActivityBtn.addEventListener('click', () => {
    if (activityModal) activityModal.classList.add('hidden');
  });
}

/* ------------------------
   Util: genera array de días entre dos fechas
   ------------------------ */
function generateDaysBetween(startDate, endDate) {
  const arr = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const iso = new Date(d).toISOString().split('T')[0];
    arr.push({ date: iso, activities: [] });
  }
  return arr;
}

/* ------------------------
   Inicializar Flatpickr y ligar con el itinerario
   ------------------------ */
if (typeof flatpickr === 'function') {
  flatpickr("#trip-calendar", {
    mode: "range",
    dateFormat: "Y-m-d",
    inline: true,
    defaultDate: [],
    locale: {
      firstDayOfWeek: 1
    },
    onChange: function(selectedDates) {
      if (selectedDates.length === 2) {
        const start = selectedDates[0];
        const end = selectedDates[1];
        tripDays = generateDaysBetween(start, end);
        renderItinerary();
      } else {
        // si limpiaron la selección, reseteamos
        tripDays = [];
        renderItinerary();
      }
    }
  });
} else {
  console.warn('flatpickr no está cargado. Asegúrate de incluir <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script> antes de script.js');
  if (itinerarySection) itinerarySection.innerHTML = '<p style="color:var(--muted-foreground)">El calendario no está disponible (flatpickr no cargado).</p>';
}

/* ------------------------
   Render inicial (sin días)
   ------------------------ */
renderItinerary();
