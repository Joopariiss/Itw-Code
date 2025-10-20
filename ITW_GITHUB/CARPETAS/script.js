const menuToggle = document.getElementById('menu-toggle');
const modal = document.getElementById('modal');
const cancelBtn = document.getElementById('cancelBtn');
const addTripBtn = document.getElementById('addTripBtn');
const tripList = document.getElementById('tripList');
const tripNameInput = document.getElementById('tripName');

// Abrir modal al hacer click en el botón
menuToggle.addEventListener('click', () => {
  modal.style.display = 'flex'; // 🔹 mostrar el modal
  tripNameInput.focus();         // opcional: enfoca el input
});

// Cerrar modal al presionar cancelar
cancelBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  tripNameInput.value = '';
});

// Agregar nueva "carpeta" y cerrar modal
addTripBtn.addEventListener('click', () => {
  const name = tripNameInput.value.trim();
  if(name) {
    const tripDiv = document.createElement('div');
    tripDiv.classList.add('trip');
    tripDiv.textContent = name;
    tripList.appendChild(tripDiv);
    tripNameInput.value = '';
    modal.style.display = 'none';
  } else {
    alert('Por favor ingresa un nombre para el viaje.');
  }
});

// Cerrar modal al hacer click fuera del contenido
window.addEventListener('click', (e) => {
  if(e.target === modal) {
    modal.style.display = 'none';
    tripNameInput.value = '';
  }
});