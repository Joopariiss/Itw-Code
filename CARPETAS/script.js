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
  getOwnerName,
  listenToInvitations // <--- AGREGAR ESTO AQUÍ
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

// 👇 ¡ESTAS SON LAS QUE FALTABAN! AGREGALAS:
let originalFolderName = ""; 
let originalFolderImage = null;

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

// ---------- FIREBASE AUTH & REALTIME LISTENERS ----------
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  userId = user.uid;
  setCurrentUserId(userId);
  localStorage.setItem("currentUserId", userId); 
  
  // 1. Carga inicial de carpetas (para ver las que ya tengo)
  await cargarCarpetas();

  // 2. 🔥 ACTIVAR ESCUCHA DE INVITACIONES (NUEVO)
  listenToInvitations(userId, (newFolder) => {
      console.log("🔔 ¡Invitación detectada en tiempo real!", newFolder.name);
      
      // A. Disparamos el popup visualmente
      triggerInvitePopup(newFolder);
      
      // B. Recargamos la lista de fondo suavemente para que aparezca la carpeta gris
      // (Opcional, pero recomendado para que el usuario vea la carpeta 'pendiente' detrás del popup)
      cargarCarpetas();
  });
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
  // ... después de obtener allFolders ...

  if (allFolders.length === 0) {
      tripList.innerHTML = `
          <div id="emptyState" style="text-align:center; color:#ccc; width:100%; grid-column: 1 / -1; margin-top: 50px;">
              <i class='bx bx-map-alt' style="font-size: 3rem; margin-bottom: 10px;"></i>
              <h3>No tienes viajes aún</h3>
              <p>¡Crea tu primera carpeta para empezar la aventura!</p>
          </div>
      `;
      return;
  }
  // ... si hay carpetas, sigue el for loop ...

  // 3. Renderizar en orden
  for (const folder of allFolders) {
    // Determinar estatus para la función render
    let status = "propia";
    if (folder.status) status = folder.status; // si viene de invitedFolders tiene status
    
    await renderFolder(folder, status);
  }
}

// ---------- FUNCIÓN EXTRAÍDA: MOSTRAR POPUP INVITACIÓN ----------
// ---------- FUNCIÓN EXTRAÍDA: MOSTRAR POPUP INVITACIÓN (MEJORADA) ----------
async function triggerInvitePopup(folder) {
  // 1. Evitar duplicados
  const existingPopup = document.querySelector(".invite-popup");
  if (existingPopup) existingPopup.remove();

  // 2. Obtener el nombre de quien invita (El dueño de la carpeta)
  // Usamos la función que ya tienes importada de db.js
  let inviterName = "Alguien";
  try {
      if (folder.userId) {
          inviterName = await getOwnerName(folder.userId);
      }
  } catch (error) {
      console.error("No se pudo obtener nombre del dueño", error);
  }

  // 3. Crear el HTML con el nombre incluido
  const confirmOverlay = document.createElement("div");
  confirmOverlay.classList.add("invite-popup");
  confirmOverlay.innerHTML = `
    <div class="popup-content">
      <h3>📩 Invitación a carpeta</h3>
      <p>
        <b>${inviterName}</b> te ha invitado a colaborar en el viaje: <br>
        <span style="font-size: 1.1rem; color: #548A5E;">"${folder.name}"</span>
      </p>
      <div style="display:flex; justify-content:space-around; margin-top:15px;">
        <button id="acceptInvite" style="background:#4CAF50; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer;">Aceptar</button>
        <button id="rejectInvite" style="background:#d9534f; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer;">Rechazar</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmOverlay);

  // 4. Eventos de los botones
  confirmOverlay.querySelector("#acceptInvite").onclick = async () => {
    // Feedback visual inmediato
    const btn = confirmOverlay.querySelector("#acceptInvite");
    btn.textContent = "Uniéndose...";
    btn.disabled = true;

    await acceptInvitation(folder.id, userId);
    document.body.removeChild(confirmOverlay);
    showPopup(`Has aceptado la invitación a "${folder.name}"`);
    await cargarCarpetas();
  };

  confirmOverlay.querySelector("#rejectInvite").onclick = async () => {
    const btn = confirmOverlay.querySelector("#rejectInvite");
    btn.textContent = "Rechazando...";
    btn.disabled = true;

    await rejectInvitation(folder.id, userId);
    document.body.removeChild(confirmOverlay);
    showPopup(`Has rechazado la invitación a "${folder.name}"`);
    await cargarCarpetas();
  };
}

// ---------- RENDERIZAR UNA CARPETA (OPTIMIZADO) ----------
// ---------- RENDERIZAR UNA CARPETA (PC + MÓVIL) ----------
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
  
  // Tooltip dinámico
  if (status === "propia") {
      card.title = "Click derecho (o mantener presionado) para opciones";
  } else {
      card.title = "Carpeta compartida";
  }

  // === 🚀 OPTIMIZACIÓN DE IMAGEN ===
  let imageUrl;
  if (folder.imageUrl) {
      imageUrl = folder.imageUrl;
  } else {
      imageUrl = await getUnsplashImage(folder.name);
  }

  card.innerHTML = `
    <img src="${imageUrl}" alt="${folder.name}" class="trip-image" loading="lazy" />
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

  // LOGICA DE AUTO-POPUP (INVITACIONES)
  if (status === "pendiente") {
    if (!document.querySelector(".invite-popup")) {
       triggerInvitePopup(folder);
    }
  }

  // === FUNCIÓN AUXILIAR: MOSTRAR MENÚ ===
  const showCustomMenu = (x, y) => {
    
    // 🔒 SEGURIDAD: Si no es propia, NO hacemos nada (ni en PC ni en Móvil)
    if (status !== "propia") return;

    // 1. Limpiar menús previos
    document.querySelectorAll(".context-menu").forEach(menu => menu.remove());

    // 2. Crear menú (SOLO MODIFICAR Y ELIMINAR)
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `
      <button class="edit-folder">✏️ Modificar</button>
      <button class="delete-folder">🗑 Eliminar</button>
    `;
    document.body.appendChild(menu);

    // 3. Posicionar menú
    menu.style.top  = `${y}px`;
    menu.style.left = `${x}px`;
    menu.style.display = "block";

    // 4. Asignar eventos
    
    // -- MODIFICAR --
    menu.querySelector(".edit-folder").onclick = () => {
      selectedFolderId = folder.id;
      selectedFolderDiv = card;
      
      // Guardamos valores para la edición inteligente
      originalFolderName = folder.name; 
      originalFolderImage = folder.imageUrl;

      modal.style.display = 'flex';
      tripNameInput.value = folder.name;
      addTripBtn.textContent = "Guardar cambios";
      setMode("modificar");
      menu.remove();
    };

    // -- ELIMINAR --
    menu.querySelector(".delete-folder").onclick = () => {
      menu.remove(); 
      confirmMessage.textContent = `¿Seguro que quieres eliminar la carpeta "${folder.name}"?`;
      confirmModal.style.display = 'flex';

      // En script.js -> renderFolder() -> menu.querySelector(".delete-folder").onclick...

      confirmDeleteBtn.onclick = async () => {
          confirmModal.style.display = 'none';
          
          // UI Optimista
          card.style.transition = "transform 0.3s, opacity 0.3s";
          card.style.transform = "scale(0.8)";
          card.style.opacity = "0";

          // === AQUÍ ESTÁ LA MAGIA ===
          setTimeout(() => {
              card.remove(); // 1. Eliminamos la tarjeta del DOM

              // 2. Verificamos cuántas tarjetas quedan
              const remainingCards = tripList.querySelectorAll('.trip-card');

              // 3. Si ya no quedan tarjetas (es decir, length es 0), mostramos el mensaje de vacío
              if (remainingCards.length === 0) {
                  tripList.innerHTML = `
                      <div id="emptyState" style="text-align:center; color:#ccc; width:100%; grid-column: 1 / -1; margin-top: 50px;">
                          <i class='bx bx-map-alt' style="font-size: 3rem; margin-bottom: 10px;"></i>
                          <h3>No tienes viajes aún</h3>
                          <p>¡Crea tu primera carpeta para empezar la aventura!</p>
                      </div>
                  `;
              }
          }, 300);
          // ==========================
          
          showPopup(`Carpeta "${folder.name}" eliminada`);
          try { await deleteFolder(folder.id); } 
          catch (error) { cargarCarpetas(); }
      };
    };

    // Cerrar menú al hacer clic fuera o hacer scroll
    setTimeout(() => {
        const closeMenu = () => menu.remove();
        document.addEventListener("click", closeMenu, { once: true });
        document.addEventListener("scroll", closeMenu, { once: true });
    }, 10);
  };

  // === EVENTO CLICK IZQUIERDO (ENTRAR A LA CARPETA) ===
  card.addEventListener("click", async () => {
    if (status === "pendiente") {
      triggerInvitePopup(folder);
      return;
    }
    // Entrar al dashboard
    if (!currentMode || currentMode === "agregar") {
       window.location.href = `../DASHBOARD/dashBoard.html?id=${folder.id}`;
    }
  });

  // === EVENTO CLICK DERECHO (PC) ===
  card.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showCustomMenu(e.pageX, e.pageY);
  });

  // === EVENTO MANTENER PRESIONADO (MÓVIL) ===
  let touchTimer;
  const longPressDuration = 600; // 0.6 segundos

  card.addEventListener("touchstart", (e) => {
      // Solo iniciamos el timer si es carpeta propia
      if (status === "propia") {
          touchTimer = setTimeout(() => {
              const touch = e.touches[0];
              showCustomMenu(touch.pageX, touch.pageY);
              
              // Vibración suave
              if (navigator.vibrate) navigator.vibrate(50);
          }, longPressDuration);
      }
  }, { passive: true });

  card.addEventListener("touchend", () => clearTimeout(touchTimer));
  card.addEventListener("touchmove", () => clearTimeout(touchTimer));

  tripList.appendChild(card);
}



// ---------- AGREGAR o MODIFICAR (OPTIMIZADO) ----------
// script.js

addTripBtn.addEventListener('click', async () => {
  const name = tripNameInput.value.trim();
  if (!name) return showPopup('Ingresa un nombre');

  const originalBtnText = addTripBtn.textContent;
  addTripBtn.disabled = true;
  addTripBtn.textContent = originalBtnText === "Agregar" ? "Creando..." : "Guardando...";
  addTripBtn.style.opacity = "0.7";
  addTripBtn.style.cursor = "not-allowed";

  try {
    // 1. Buscamos la imagen ANTES de guardar nada
    // Esto asegura que guardemos la URL en Firebase
    const fetchedImageUrl = await getUnsplashImage(name);

    if (currentMode === "modificar" && selectedFolderId) {
      // --- MODIFICAR ---
      await updateFolder(selectedFolderId, name);
      
      // Actualizamos visualmente
      if (selectedFolderDiv) {
        selectedFolderDiv.querySelector(".trip-title").textContent = name;
        // Opcional: Si quieres que al cambiar nombre cambie la foto, descomenta:
        // selectedFolderDiv.querySelector(".trip-image").src = fetchedImageUrl;
      }
      showPopup("Carpeta modificada correctamente");

    } else if (currentMode === "agregar") {
      // --- AGREGAR (OPTIMIZADO) ---
      
      // 2. Pasamos la URL a la función de crear
      const newFolderData = await createFolder(name, userId, fetchedImageUrl);

      // Verificamos si existe el "Estado Vacío" y lo eliminamos del DOM
      const emptyState = document.getElementById("emptyState");
      if (emptyState) {
          emptyState.remove();
      }
      
      // 3. Renderizamos usando los datos que ya tenemos (sin volver a llamar a API)
      await renderFolder(newFolderData, "propia");

      // Truco visual para moverla al inicio
      const newCard = tripList.lastElementChild;
      if (newCard) {
        tripList.prepend(newCard);
        newCard.style.animation = "fadeIn 0.5s ease-out";
      }

      showPopup("Carpeta creada correctamente");
    }

    closeModal();

  } catch (error) {
    console.error("Error:", error);
    showPopup("Hubo un error al procesar la solicitud.");
  } finally {
    addTripBtn.disabled = false;
    addTripBtn.textContent = originalBtnText;
    addTripBtn.style.opacity = "1";
    addTripBtn.style.cursor = "pointer";
  }
});