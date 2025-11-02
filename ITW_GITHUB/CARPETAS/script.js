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

// 🔹 Popup
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

// Funciones del popup
function showPopup(message) {
  popupMessage.textContent = message;
  popup.style.display = "flex";
}
popupClose.addEventListener("click", () => popup.style.display = "none");
window.addEventListener("click", e => {
  if (e.target === popup) popup.style.display = "none";
});

let userId = null;
let selectedFolderId = null;
let selectedFolderDiv = null;
let currentMode = null;

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
  showPopup("Selecciona una carpeta para modificar");
});

deleteFolderBtn.addEventListener('click', () => {
  setMode("eliminar");
  showPopup("Selecciona una carpeta para eliminar");
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

  div.addEventListener('click', async () => {
    if (currentMode === "modificar") {
      selectedFolderId = folder.id;
      selectedFolderDiv = div;
      modal.style.display = 'flex';
      tripNameInput.value = folder.name;
      addTripBtn.textContent = "Guardar cambios";
    }
    else if (currentMode === "eliminar") {
      const confirmDiv = document.createElement("div");
      confirmDiv.innerHTML = `
        <div class="popup-content">
          <p>¿Eliminar carpeta "${folder.name}"?</p>
          <div style="display:flex; justify-content:space-around; margin-top:15px;">
            <button id="confirmDelete" style="background:#d9534f; color:white; border:none; padding:8px 16px; border-radius:8px;">Eliminar</button>
            <button id="cancelDelete" style="background:#ccc; border:none; padding:8px 16px; border-radius:8px;">Cancelar</button>
          </div>
        </div>
      `;
      popup.innerHTML = confirmDiv.innerHTML;
      popup.style.display = "flex";

      document.getElementById("confirmDelete").onclick = async () => {
        await deleteFolder(folder.id);
        div.remove();
        popup.style.display = "none";
        showPopup(`Carpeta "${folder.name}" eliminada correctamente`);
        setMode(null);
      };
      document.getElementById("cancelDelete").onclick = () => {
        popup.style.display = "none";
        setMode(null);
      };
    }
    else {
      window.location.href = `../DASHBOARD/index.html?id=${folder.id}`;
    }
  });

  tripList.appendChild(div);
}

// ---------- AGREGAR o MODIFICAR ----------
addTripBtn.addEventListener('click', async () => {
  const name = tripNameInput.value.trim();
  if (!name) return showPopup('Ingresa un nombre');

  if (currentMode === "modificar" && selectedFolderId) {
    await updateFolder(selectedFolderId, name);
    selectedFolderDiv.textContent = name;
    showPopup("Carpeta modificada correctamente");
  } 
  else if (currentMode === "agregar") {
    const folder = await createFolder(name, userId);
    renderFolder(folder);
    showPopup("Carpeta creada correctamente");
  }

  closeModal();
});