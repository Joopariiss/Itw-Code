import { auth } from "../firebase.js";
import { createFolder, getUserFolders, deleteFolder, updateFolder } from "./db.js";

const tripList = document.getElementById('tripList');
const modal = document.getElementById('modal');
const addFolderBtn = document.getElementById('addFolder');
const editFolderBtn = document.getElementById('editFolder');
const deleteFolderBtn = document.getElementById('deleteFolder');
const addTripBtn = document.getElementById('addTripBtn');
const cancelBtn = document.getElementById('cancelBtn');
const tripNameInput = document.getElementById('tripName');

let userId = null;
let selectedFolderId = null;
let selectedFolderDiv = null;
let currentMode = null; // "agregar", "modificar", "eliminar" o null

// ---------- MODO ----------
function setMode(mode) {
  currentMode = mode;
  document.body.dataset.mode = mode || "";
}

// ---------- MODAL ----------
addFolderBtn.addEventListener('click', () => {
  setMode("agregar");
  modal.style.display = 'flex';
  tripNameInput.placeholder = "Nombre de la carpeta";
  tripNameInput.value = "";
  tripNameInput.focus();
  addTripBtn.textContent = "Agregar";
});

editFolderBtn.addEventListener('click', () => {
  setMode("modificar");
  alert("Selecciona una carpeta para modificar");
});

deleteFolderBtn.addEventListener('click', () => {
  setMode("eliminar");
  alert("Selecciona una carpeta para eliminar");
});

cancelBtn.addEventListener('click', () => closeModal());
window.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

function closeModal() {
  modal.style.display = 'none';
  tripNameInput.value = '';
  setMode(null);
}

// ---------- FIREBASE AUTH ----------
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  userId = user.uid;
  console.log("Usuario logueado:", userId);
  await cargarCarpetas();
});

// ---------- CARGAR CARPETAS ----------
async function cargarCarpetas() {
  tripList.innerHTML = "";
  const folders = await getUserFolders(userId);

  folders.forEach(folder => renderFolder(folder));
}

// ---------- RENDERIZAR UNA CARPETA ----------
function renderFolder(folder) {
  const div = document.createElement('div');
  div.classList.add('trip');
  div.textContent = folder.name;
  div.dataset.id = folder.id;

  // Clic en carpeta según el modo
  div.addEventListener('click', async () => {
    if (currentMode === "modificar") {
      selectedFolderId = folder.id;
      selectedFolderDiv = div;
      modal.style.display = 'flex';
      tripNameInput.value = folder.name;
      addTripBtn.textContent = "Guardar cambios";
    }
    else if (currentMode === "eliminar") {
      const currentName = div.textContent;
      const confirmar = confirm(`¿Eliminar carpeta "${currentName}"?`);
      if (confirmar) {
        await deleteFolder(folder.id);
        div.remove();
        alert(`Carpeta "${currentName}" eliminada correctamente`);
      }
      setMode(null);
    }
    else {
      // 🚀 Redirige a otra página si no hay modo activo
      window.location.href = `carpeta.html?id=${folder.id}`;
    }
  });

  tripList.appendChild(div);
}

// ---------- AGREGAR o MODIFICAR ----------
addTripBtn.addEventListener('click', async () => {
  const name = tripNameInput.value.trim();
  if (!name) return alert('Ingresa un nombre');

  if (currentMode === "modificar" && selectedFolderId) {
    await updateFolder(selectedFolderId, name);
    selectedFolderDiv.textContent = name;
    alert("Carpeta modificada correctamente");
  } 
  else if (currentMode === "agregar") {
    const folder = await createFolder(name, userId);
    renderFolder(folder); // 👈 importante: usamos la misma función
    alert("Carpeta creada correctamente");
  }

  closeModal();
});
