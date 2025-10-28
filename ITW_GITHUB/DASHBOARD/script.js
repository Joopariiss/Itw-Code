/* ------------------------
   TAB SWITCH
------------------------ */
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

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
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';
    dayCard.style.border = '1px solid var(--border)';
    dayCard.style.borderRadius = 'var(--radius)';
    dayCard.style.padding = '0.75rem';
    dayCard.style.marginBottom = '0.75rem';
    dayCard.style.background = 'var(--card)';

    const dayTitle = document.createElement('h3');
    dayTitle.textContent = day.date;
    dayTitle.style.margin = '0 0 0.5rem 0';
    dayCard.appendChild(dayTitle);

    // Activities
    const activitiesList = document.createElement('ul');
    activitiesList.style.listStyle = 'none';
    activitiesList.style.padding = '0';
    activitiesList.style.margin = '0 0 0.5rem 0';

    day.activities.forEach(act => {
      const li = document.createElement('li');
      li.className = 'activity-item';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.padding = '0.4rem';
      li.style.marginBottom = '0.4rem';
      li.style.borderRadius = 'var(--radius)';
      li.style.background = 'var(--secondary)';

      const text = document.createElement('span');
      text.textContent = `${act.time} - ${act.description}`;
      li.appendChild(text);

      const btns = document.createElement('div');

      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️';
      editBtn.style.marginRight = '0.4rem';
      editBtn.addEventListener('click', () => openModal(day, act));

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.addEventListener('click', () => {
        day.activities = day.activities.filter(a => a.id !== act.id);
        renderItinerary();
      });

      btns.appendChild(editBtn);
      btns.appendChild(deleteBtn);
      li.appendChild(btns);
      activitiesList.appendChild(li);
    });

    dayCard.appendChild(activitiesList);

    // Add activity button
    const addActBtn = document.createElement('button');
    addActBtn.textContent = 'Add Activity';
    addActBtn.addEventListener('click', () => openModal(day));
    dayCard.appendChild(addActBtn);

    itinerarySection.appendChild(dayCard);
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
  // Si flatpickr no existe, mostramos mensaje en interfaz
  if (itinerarySection) itinerarySection.innerHTML = '<p style="color:var(--muted-foreground)">El calendario no está disponible (flatpickr no cargado).</p>';
}

/* ------------------------
   Render inicial (sin días)
   ------------------------ */
renderItinerary();

/* ------------------------
   PACKING LIST (tab vacío por ahora)
------------------------ */
const packingContainer = document.getElementById('packing-list');
packingContainer.innerHTML = '<p>En construcción...</p>';
