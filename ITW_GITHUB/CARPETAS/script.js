import { auth } from "../firebase.js";
import { 
  createFolder, 
  getUserFolders, 
  getInvitedFolders, 
  acceptInvitation, 
  rejectInvitation, 
  deleteFolder, 
  updateFolder, 
  getFolderDates,
  getOwnerName 
} from "./db.js";

// ✅ IMPORTAR la función desde global.js
import { setCurrentUserId } from "../DASHBOARD/assets/scripts/global.js";

const tripList = document.getElementById('tripList');
const modal = document.getElementById('modal');
const addFolderBtn = document.getElementById('addFolder');
const editFolderBtn = document.getElementById('editFolder');
const deleteFolderBtn = document.getElementById('deleteFolder');
const addTripBtn = document.getElementById('addTripBtn');
const cancelBtn = document.getElementById('cancelBtn');
const tripNameInput = document.getElementById('tripName');

// 🔹 Popup General
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

function showPopup(message) {
  popupMessage.textContent = message;
  popup.style.display = "flex";
}
popupClose.addEventListener("click", () => popup.style.display = "none");
window.addEventListener("click", e => {
  if (e.target === popup) popup.style.display = "none";
});


// 🔹 Modal de Confirmación Personalizado
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Función para cerrar el modal de confirmación
function closeConfirmModal() {
    confirmModal.style.display = 'none';
    confirmDeleteBtn.onclick = null; // Limpiar evento para evitar duplicados
}

// Evento para cerrar con el botón cancelar
cancelDeleteBtn.addEventListener('click', closeConfirmModal);

// Cerrar si se hace clic fuera del modal
window.addEventListener('click', e => {
    if (e.target === confirmModal) closeConfirmModal();
});

let userId = null;
let selectedFolderId = null;
let selectedFolderDiv = null;
let currentMode = null;

// === UNSPLASH ===
async function getUnsplashImage(folderName) {
  const apiUrl = `https://api.unsplash.com/search/photos?query=${
    encodeURIComponent(folderName + " landmark tourism beautiful scenic travel attraction")
  }&orientation=landscape&per_page=20&client_id=pQOas4zYY4iWrx2AcbDhu4SchgJSRqCTfelsWFNBW0k`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"; 
    }
    const randomImg = data.results[Math.floor(Math.random() * data.results.length)];
    return randomImg.urls.regular;
  } catch (error) {
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e";
  }
}

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

if (editFolderBtn) {
  editFolderBtn.addEventListener('click', () => {
    setMode("modificar");
    showPopup("Selecciona una carpeta para modificar");
  });
}

if (deleteFolderBtn) {
  deleteFolderBtn.addEventListener('click', () => {
    setMode("eliminar");
    showPopup("Selecciona una carpeta para eliminar");
  });
}

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
  localStorage.setItem("currentUserId", userId); 
  await cargarCarpetas();
});


// ---------- CARGAR CARPETAS (CON ORDENAMIENTO) ----------
async function cargarCarpetas() {
  tripList.innerHTML = "";

  // 1. Obtener carpetas
  const myFolders = await getUserFolders(userId);
  const invitedFolders = await getInvitedFolders(userId);

  // 2. Unificar y ordenar por FECHA (createdAt) descendente (más nuevo primero)
  // Si una carpeta antigua no tiene 'createdAt', se asume 0 (va al final)
  const allFolders = [...myFolders, ...invitedFolders].sort((a, b) => {
    const dateA = a.createdAt || 0;
    const dateB = b.createdAt || 0;
    return dateB - dateA; // De mayor a menor (Más nuevo arriba)
  });

  // 3. Renderizar en orden
  for (const folder of allFolders) {
    // Determinar estatus para la función render
    let status = "propia";
    if (folder.status) status = folder.status; // si viene de invitedFolders tiene status
    
    await renderFolder(folder, status);
  }
}

// ---------- FUNCIÓN EXTRAÍDA: MOSTRAR POPUP INVITACIÓN ----------
function triggerInvitePopup(folder) {
  // Borrar popup anterior si existe para evitar superposiciones
  const existingPopup = document.querySelector(".invite-popup");
  if (existingPopup) existingPopup.remove();

  const confirmOverlay = document.createElement("div");
  confirmOverlay.classList.add("invite-popup");
  confirmOverlay.innerHTML = `
    <div class="popup-content">
      <h3>📩 Invitación a carpeta</h3>
      <p>Has sido invitado a la carpeta <b>${folder.name}</b>.</p>
      <div style="display:flex; justify-content:space-around; margin-top:15px;">
        <button id="acceptInvite" style="background:#4CAF50; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer;">Aceptar</button>
        <button id="rejectInvite" style="background:#d9534f; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer;">Rechazar</button>
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
}


// ---------- RENDERIZAR UNA CARPETA ----------
async function renderFolder(folder, status = "propia") {

  const fechas = await getFolderDates(folder.id);
  const startDate = fechas?.fechaInicio || "Sin fecha";
  const endDate   = fechas?.fechaFin || "Sin fecha";

  let ownerName;
  if (folder.userId === userId) {
      ownerName = "Tú"; 
  } else {
      ownerName = await getOwnerName(folder.userId); 
  }

  const card = document.createElement("div");
  card.className = "trip-card";
  card.dataset.id = folder.id;

  const imageUrl = await getUnsplashImage(folder.name);

  card.innerHTML = `
    <img src="${imageUrl}" alt="${folder.name}" class="trip-image" />
    <div class="trip-header">
      <div class="trip-title">${folder.name}</div>
      <div class="trip-date">
        <svg class="calendar-icon" viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/></svg>
        <span>${startDate} - ${endDate}</span>
      </div>
      <div class="trip-type">
        Tipo: <b>${folder.invitadosAceptados && folder.invitadosAceptados.length > 0 ? "Grupal" : "Personal"}</b>
      </div>
      <div class="trip-owner">
        Creador: <b>${ownerName}</b>
      </div>
    </div>
    <div class="trip-content">
      Tu carpeta de viaje personalizada. Haz clic para ver los detalles.
    </div>
  `;

  // ==========================================
  // 🔥 LOGICA DE AUTO-POPUP (NUEVO)
  // ==========================================
  if (status === "pendiente") {
    // Mostrar automáticamente si no hay otro popup abierto
    if (!document.querySelector(".invite-popup")) {
       triggerInvitePopup(folder);
    }
  }

  // Click en la tarjeta
  card.addEventListener("click", async () => {
    // Si está pendiente, mostramos el popup (reutilizando la función)
    if (status === "pendiente") {
      triggerInvitePopup(folder);
      return;
    }

    // Bloqueo invitados
    if (status !== "propia") {
      if (currentMode === "modificar") {
        showPopup("Solo el dueño puede modificar esta carpeta.");
        return;
      }
      if (currentMode === "eliminar") {
        showPopup("Solo el dueño puede eliminar esta carpeta.");
        return;
      }
    }

    // Modos normales
    if (currentMode === "modificar") {
      selectedFolderId = folder.id;
      selectedFolderDiv = card;
      modal.style.display = 'flex';
      tripNameInput.value = folder.name;
      addTripBtn.textContent = "Guardar cambios";
    } 
    else if (currentMode === "eliminar") {
      // Abrimos el modal personalizado
      confirmMessage.textContent = `¿Seguro que quieres eliminar la carpeta "${folder.name}"? Esta acción no se puede deshacer.`;
      confirmModal.style.display = 'flex';

      // Definimos qué pasa cuando dicen "Sí"
      confirmDeleteBtn.onclick = async () => {
          confirmModal.style.display = 'none'; // Cerrar modal inmediatamente
          await deleteFolder(folder.id);       // Lógica original de DB
          await cargarCarpetas();              // Recargar UI
          showPopup(`Carpeta "${folder.name}" eliminada`); // Tu popup de éxito original
      };
    }
    else {
      window.location.href = `../DASHBOARD/index.html?id=${folder.id}`;
    }
  });

  tripList.appendChild(card);

  // Menú contextual (Click derecho)
  card.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    if (status !== "propia") return;

    document.querySelectorAll(".context-menu").forEach(menu => menu.remove());

    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `
      <button class="edit-folder">✏️ Modificar</button>
      <button class="delete-folder">🗑 Eliminar</button>
    `;
    document.body.appendChild(menu);

    menu.style.top  = `${e.pageY}px`;
    menu.style.left = `${e.pageX}px`;
    menu.style.display = "block";

    menu.querySelector(".edit-folder").onclick = () => {
      selectedFolderId = folder.id;
      selectedFolderDiv = card;
      modal.style.display = 'flex';
      tripNameInput.value = folder.name;
      addTripBtn.textContent = "Guardar cambios";
      setMode("modificar");
      menu.remove();
    };

    menu.querySelector(".delete-folder").onclick = () => {
      menu.remove(); // Quitamos el menú contextual primero

      // Abrimos el modal personalizado
      confirmMessage.textContent = `¿Seguro que quieres eliminar la carpeta "${folder.name}"?`;
      confirmModal.style.display = 'flex';

      // Definimos qué pasa cuando dicen "Sí"
      confirmDeleteBtn.onclick = async () => {
          confirmModal.style.display = 'none';
          await deleteFolder(folder.id);
          await cargarCarpetas(); 
          showPopup(`Carpeta "${folder.name}" eliminada`);
      };
    };

    document.addEventListener("click", () => menu.remove(), { once: true });
  });
}

// ---------- AGREGAR o MODIFICAR ----------
addTripBtn.addEventListener('click', async () => {
  const name = tripNameInput.value.trim();
  if (!name) return showPopup('Ingresa un nombre');

  if (currentMode === "modificar" && selectedFolderId) {
    await updateFolder(selectedFolderId, name);
    // Recargar todo para re-ordenar si fuera necesario (aunque modificar nombre no cambia fecha)
    // Pero para simplificar, podemos solo actualizar el DOM si queremos rapidez
    selectedFolderDiv.querySelector(".trip-title").textContent = name;
    const newImageUrl = await getUnsplashImage(name);
    selectedFolderDiv.querySelector(".trip-image").src = newImageUrl;
    showPopup("Carpeta modificada correctamente");
  }

  else if (currentMode === "agregar") {
    await createFolder(name, userId);
    // Recargar todo para que la nueva carpeta salga PRIMERA
    await cargarCarpetas();
    showPopup("Carpeta creada correctamente");
  }

  closeModal();
});