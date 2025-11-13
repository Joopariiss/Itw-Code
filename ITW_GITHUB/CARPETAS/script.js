import { auth } from "../firebase.js";
import { createFolder, getUserFolders, getInvitedFolders, acceptInvitation, rejectInvitation, deleteFolder, updateFolder } from "./db.js";

// ✅ IMPORTAR la función desde global.js
import { setCurrentUserId } from "../DASHBOARD/global.js"; // Ajusta ruta según tu estructura de carpetas

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
    setCurrentUserId(userId);
    localStorage.setItem("currentUserId", userId); // 🔹 persistir para otras páginas
    await cargarCarpetas();
  });


// ---------- CARGAR CARPETAS ----------
async function cargarCarpetas() {
  tripList.innerHTML = "";

  // Carpetas propias
  const folders = await getUserFolders(userId);
  folders.forEach(folder => renderFolder(folder, "propia"));

  // Carpetas compartidas (donde estoy invitado)
  const invitedFolders = await getInvitedFolders(userId);
  invitedFolders.forEach(folder => renderFolder(folder, folder.status));
}

// ---------- RENDERIZAR UNA CARPETA ----------
function renderFolder(folder, status = "propia") {
  const card = document.createElement("div");
  card.className = "trip-card";
  card.dataset.id = folder.id;

  const imageUrl = `https://loremflickr.com/600/400/${encodeURIComponent(folder.name)}`;
  const startDate = "2025-02-09"; // opcional: si agregas fechas reales luego
  const endDate = "2025-02-19";

  card.innerHTML = `
    <img src="${imageUrl}" alt="${folder.name}" class="trip-image" />
    <div class="trip-header">
      <div class="trip-title">${folder.name}</div>
      <div class="trip-date">
        <svg class="calendar-icon" viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/></svg>
        <span>${startDate} - ${endDate}</span>
      </div>
    </div>
    <div class="trip-content">
      Tu carpeta de viaje personalizada. Haz clic para ver los detalles.
    </div>
  `;

  // === comportamiento al hacer clic ===
  card.addEventListener("click", async () => {
    if (status === "pendiente") {
      // manejar invitaciones igual que antes
      const confirmOverlay = document.createElement("div");
      confirmOverlay.classList.add("invite-popup");
      confirmOverlay.innerHTML = `
        <div class="popup-content">
          <h3>📩 Invitación a carpeta</h3>
          <p>Has sido invitado a la carpeta <b>${folder.name}</b>.</p>
          <div style="display:flex; justify-content:space-around; margin-top:15px;">
            <button id="acceptInvite" style="background:#4CAF50; color:white; border:none; padding:8px 16px; border-radius:8px;">Aceptar</button>
            <button id="rejectInvite" style="background:#d9534f; color:white; border:none; padding:8px 16px; border-radius:8px;">Rechazar</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmOverlay);

      confirmOverlay.querySelector("#acceptInvite").onclick = async () => {
        await acceptInvitation(folder.id, userId);
        document.body.removeChild(confirmOverlay);
        showPopup(`Has aceptado la invitación a "${folder.name}"`);
        await cargarCarpetas();
      };

      confirmOverlay.querySelector("#rejectInvite").onclick = async () => {
        await rejectInvitation(folder.id, userId);
        document.body.removeChild(confirmOverlay);
        showPopup(`Has rechazado la invitación a "${folder.name}"`);
        await cargarCarpetas();
      };
      return;
    }

    if (currentMode === "modificar") {
      selectedFolderId = folder.id;
      selectedFolderDiv = card;
      modal.style.display = 'flex';
      tripNameInput.value = folder.name;
      addTripBtn.textContent = "Guardar cambios";
    } 
    else if (currentMode === "eliminar") {
      if (!confirm(`¿Seguro que quieres eliminar la carpeta "${folder.name}"?`)) return;
      await deleteFolder(folder.id);
      tripList.removeChild(card);
      showPopup(`Carpeta "${folder.name}" eliminada`);
    } 
    else {
      window.location.href = `../DASHBOARD/index.html?id=${folder.id}`;
    }
  });

  tripList.appendChild(card);
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