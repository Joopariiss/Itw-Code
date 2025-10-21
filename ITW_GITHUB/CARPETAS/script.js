import { auth } from "../firebase.js";
import { createFolder, getUserFolders } from "./db.js";

const tripList = document.getElementById('tripList');
const modal = document.getElementById('modal');
const menuToggle = document.getElementById('menu-toggle');
const addTripBtn = document.getElementById('addTripBtn');
const cancelBtn = document.getElementById('cancelBtn');
const tripNameInput = document.getElementById('tripName');

// Modal básico
menuToggle.addEventListener('click', () => { modal.style.display = 'flex'; tripNameInput.focus(); });
cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; tripNameInput.value = ''; });
window.addEventListener('click', e => { if(e.target === modal){ modal.style.display='none'; tripNameInput.value=''; } });

// Detectar usuario logueado
auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  console.log("Usuario logueado:", user.uid);

  // Mostrar carpetas existentes
  const folders = await getUserFolders(user.uid);
  folders.forEach(folder => {
    const div = document.createElement('div');
    div.classList.add('trip');
    div.textContent = folder.name;
    tripList.appendChild(div);
  });

  // Crear nueva carpeta
  addTripBtn.addEventListener('click', async () => {
    const name = tripNameInput.value.trim();
    if(!name) return alert('Ingresa un nombre');
    const folder = await createFolder(name, user.uid);
    if(folder){
      const div = document.createElement('div');
      div.classList.add('trip');
      div.textContent = folder.name;
      tripList.appendChild(div);
      tripNameInput.value = '';
      modal.style.display='none';
    }
  });
});
