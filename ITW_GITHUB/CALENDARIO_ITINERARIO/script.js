let tripDays = [];
let editingActivity = null;
let editingDay = null;

// DOM elements
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const generateDaysBtn = document.getElementById('generate-days-btn');
const itinerarySection = document.getElementById('itinerary-section');

// Modal
const activityModal = document.getElementById('activity-modal');
const activityTimeInput = document.getElementById('activity-time');
const activityDescInput = document.getElementById('activity-desc');
const saveActivityBtn = document.getElementById('save-activity-btn');
const cancelActivityBtn = document.getElementById('cancel-activity-btn');
const modalTitle = document.getElementById('modal-title');

// ----------------- ITINERARY -----------------
generateDaysBtn.addEventListener('click', () => {
  const start = new Date(startDateInput.value);
  const end = new Date(endDateInput.value);
  if (!start || !end || end < start) return alert('Invalid dates');

  tripDays = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() +1)) {
    const dateStr = d.toISOString().split('T')[0];
    tripDays.push({ date: dateStr, activities: [] });
  }
  renderItinerary();
});

function renderItinerary() {
  itinerarySection.innerHTML = '';
  tripDays.forEach(day => {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';
    const dayTitle = document.createElement('h3');
    dayTitle.textContent = day.date;
    dayCard.appendChild(dayTitle);

    // Activities
    const activitiesList = document.createElement('ul');
    day.activities.forEach(act => {
      const li = document.createElement('li');
      li.className = 'activity-item';
      li.textContent = `${act.time} - ${act.description}`;

      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => openModal(day, act));

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.addEventListener('click', () => {
        day.activities = day.activities.filter(a => a.id !== act.id);
        renderItinerary();
      });

      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
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

// ----------------- MODAL -----------------
function openModal(day, activity=null) {
  editingDay = day;
  editingActivity = activity;
  modalTitle.textContent = activity ? 'Edit Activity' : 'Add Activity';
  activityTimeInput.value = activity ? activity.time : '12:00';
  activityDescInput.value = activity ? activity.description : '';
  activityModal.classList.remove('hidden');
}

saveActivityBtn.addEventListener('click', () => {
  const desc = activityDescInput.value.trim();
  const time = activityTimeInput.value;
  if (!desc) return alert('Description required');

  if (editingActivity) {
    editingActivity.time = time;
    editingActivity.description = desc;
  } else {
    editingDay.activities.push({ id: Date.now(), time, description: desc });
  }

  activityModal.classList.add('hidden');
  renderItinerary();
});

cancelActivityBtn.addEventListener('click', () => {
  activityModal.classList.add('hidden');
});