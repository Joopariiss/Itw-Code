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


// ---------- RENDERIZAR UNA CARPETA (OPTIMIZADO) ----------
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
  
  // AGREGA ESTO: Un tooltip nativo que aparece al dejar el mouse encima
  card.title = "Click derecho para opciones";

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

  // LOGICA DE AUTO-POPUP
  if (status === "pendiente") {
    if (!document.querySelector(".invite-popup")) {
       triggerInvitePopup(folder);
    }
  }

  // === EVENTO CLICK EN TARJETA ===
  card.addEventListener("click", async () => {
    if (status === "pendiente") {
      triggerInvitePopup(folder);
      return;
    }

    if (status !== "propia") {
      if (currentMode === "modificar") return showPopup("Solo el dueño puede modificar esta carpeta.");
      if (currentMode === "eliminar") return showPopup("Solo el dueño puede eliminar esta carpeta.");
    }

    if (currentMode === "modificar") {
      selectedFolderId = folder.id;
      selectedFolderDiv = card;
      modal.style.display = 'flex';
      tripNameInput.value = folder.name;
      addTripBtn.textContent = "Guardar cambios";
    } 
    else if (currentMode === "eliminar") {
      // --- LÓGICA DE ELIMINAR (OPTIMIZADA) ---
      confirmMessage.textContent = `¿Seguro que quieres eliminar la carpeta "${folder.name}"?`;
      confirmModal.style.display = 'flex';

      confirmDeleteBtn.onclick = async () => {
          // 1. Cerrar modal visualmente YA
          confirmModal.style.display = 'none'; 
          
          // 2. 🔥 UI OPTIMISTA: Borrar tarjeta del DOM inmediatamente
          card.style.transition = "transform 0.3s, opacity 0.3s";
          card.style.transform = "scale(0.8)";
          card.style.opacity = "0";
          setTimeout(() => card.remove(), 300); // Quitar del HTML tras animación

          // 3. Mostrar mensaje de éxito YA
          showPopup(`Carpeta "${folder.name}" eliminada`); 

          // 4. Borrar en Firebase en segundo plano (sin await que bloquee la UI)
          try {
             await deleteFolder(folder.id);
             // ¡OJO! NO llamamos a cargarCarpetas() aquí. No hace falta.
          } catch (error) {
             console.error("Error eliminando:", error);
             showPopup("Error al eliminar en la nube.");
             // Si falla, aquí sí recargaríamos para recuperar la carpeta
             cargarCarpetas(); 
          }
      };
    }
    else {
      window.location.href = `../DASHBOARD/index.html?id=${folder.id}`;
    }
  });

  tripList.appendChild(card);

  // === MENÚ CONTEXTUAL (CLICK DERECHO) ===
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
      menu.remove(); 

      // --- LÓGICA DE ELIMINAR CONTEXTUAL (OPTIMIZADA) ---
      confirmMessage.textContent = `¿Seguro que quieres eliminar la carpeta "${folder.name}"?`;
      confirmModal.style.display = 'flex';

      confirmDeleteBtn.onclick = async () => {
          // 1. Cerrar modal YA
          confirmModal.style.display = 'none';

          // 2. 🔥 UI OPTIMISTA: Borrar visualmente YA
          card.style.transition = "transform 0.3s, opacity 0.3s";
          card.style.transform = "scale(0.8)";
          card.style.opacity = "0";
          setTimeout(() => card.remove(), 300);

          // 3. Feedback YA
          showPopup(`Carpeta "${folder.name}" eliminada`);

          // 4. Backend en segundo plano
          try {
             await deleteFolder(folder.id);
          } catch (error) {
             console.error("Error eliminando:", error);
             cargarCarpetas(); 
          }
      };
    };

    document.addEventListener("click", () => menu.remove(), { once: true });
  });
}
// ---------- AGREGAR o MODIFICAR (OPTIMIZADO) ----------
addTripBtn.addEventListener('click', async () => {
  const name = tripNameInput.value.trim();
  if (!name) return showPopup('Ingresa un nombre');

  // 1. BLOQUEO DE BOTÓN (Evita duplicados)
  const originalBtnText = addTripBtn.textContent;
  addTripBtn.disabled = true;
  addTripBtn.textContent = originalBtnText === "Agregar" ? "Creando..." : "Guardando...";
  addTripBtn.style.opacity = "0.7";
  addTripBtn.style.cursor = "not-allowed";

  try {
    if (currentMode === "modificar" && selectedFolderId) {
      // --- LÓGICA DE MODIFICAR ---
      await updateFolder(selectedFolderId, name);
      
      // Actualización visual directa (sin recargar todo)
      if (selectedFolderDiv) {
        selectedFolderDiv.querySelector(".trip-title").textContent = name;
        // Opcional: Actualizar imagen si quieres que cambie con el nombre
        const newImageUrl = await getUnsplashImage(name);
        selectedFolderDiv.querySelector(".trip-image").src = newImageUrl;
      }
      showPopup("Carpeta modificada correctamente");

    } else if (currentMode === "agregar") {
      // --- LÓGICA DE AGREGAR (OPTIMIZADA) ---
      
      // 1. Crear en Firebase
      const newFolderData = await createFolder(name, userId);
      
      // 2. Renderizar SOLO esta tarjeta nueva
      // Pasamos status "propia" porque acabamos de crearla
      await renderFolder(newFolderData, "propia");

      // 3. Truco visual: Mover la nueva tarjeta al principio
      // Como renderFolder usa appendChild (la pone al final), la movemos al inicio
      const newCard = tripList.lastElementChild;
      if (newCard) {
        tripList.prepend(newCard);
        
        // Pequeña animación para que se note que apareció
        newCard.style.animation = "fadeIn 0.5s ease-out";
      }

      showPopup("Carpeta creada correctamente");
    }

    closeModal();

  } catch (error) {
    console.error("Error:", error);
    showPopup("Hubo un error al procesar la solicitud.");
  } finally {
    // 4. DESBLOQUEO DE BOTÓN (Siempre se ejecuta, haya error o no)
    addTripBtn.disabled = false;
    addTripBtn.textContent = originalBtnText; // Restauramos texto original
    addTripBtn.style.opacity = "1";
    addTripBtn.style.cursor = "pointer";
  }
});