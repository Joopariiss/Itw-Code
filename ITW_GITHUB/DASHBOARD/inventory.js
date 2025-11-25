// script.js
// Trip Wallet — JS puro adaptado al HTML/CSS que compartiste

// --- Importar Firebase ---
import { db } from "../firebase.js";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- Obtener el ID de la carpeta activa desde index.html ---
const folderId = window.folderId;

// ---------- Estado ----------
let items = [];
let initialBudget = 0;

// ---------- Referencias DOM (Movidar arriba para usarlas en las funciones) ----------
const budgetScreen = document.getElementById('budget-screen');
const budgetForm = document.getElementById('budget-form');
const budgetInput = document.getElementById('budget-input');

const initialBudgetEl = document.getElementById('initial-budget');
const totalSpentEl = document.getElementById('total-spent');
const remainingBudgetEl = document.getElementById('remaining-budget');
const remainingCard = document.getElementById('remaining-card');

const addItemForm = document.getElementById('add-item-form');
const itemNameInput = document.getElementById('item-name');
const itemCategorySelect = document.getElementById('item-category');
const itemCostInput = document.getElementById('item-cost');
const itemQuantityInput = document.getElementById('item-quantity');

const itemsContainer = document.getElementById('items-container');
const suggestionsContainer = document.getElementById('suggestions');


// ---------- Funciones Principales ----------

async function cargarPresupuestoInicial() {
  if (!folderId) return;

  const folderRef = doc(db, "carpetas", folderId);
  const folderSnap = await getDoc(folderRef);

  if (folderSnap.exists()) {
    const data = folderSnap.data();
    initialBudget = data.presupuestoInicial || 0;

    // CORRECCIÓN AQUÍ: Usamos la clase 'hidden'
    if (initialBudget > 0) {
      // Si ya tiene presupuesto, aseguramos que esté oculto
      if (budgetScreen) budgetScreen.classList.add('hidden');
    } else {
      // Si el presupuesto es 0, mostramos el popup (quitando hidden)
      if (budgetScreen) budgetScreen.classList.remove('hidden');
    }

    updateBudgetDisplay();
  } else {
    // Si no existe la carpeta, mostramos el popup
    if (budgetScreen) budgetScreen.classList.remove('hidden');
  }
}

async function guardarPresupuestoInicial() {
  if (!folderId) return;
  const folderRef = doc(db, "carpetas", folderId);
  await updateDoc(folderRef, { presupuestoInicial: initialBudget });
  console.log("✅ Presupuesto inicial guardado correctamente en Firestore");
}

// ---------- Utilidades ----------
function formatCurrency(amount) {
  // Configuración para Chile (es-CL), Peso Chileno (CLP), sin decimales
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function computeTotals() {
  const total = items.reduce((s, it) => s + it.cost * it.quantity, 0);
  const remaining = initialBudget - total;
  return { total, remaining };
}

function updateBudgetDisplay() {
  const { total, remaining } = computeTotals();
  if (initialBudgetEl) initialBudgetEl.textContent = formatCurrency(initialBudget);
  if (totalSpentEl) totalSpentEl.textContent = formatCurrency(total);
  if (remainingBudgetEl) remainingBudgetEl.textContent = formatCurrency(remaining);

  if (remainingBudgetEl && remainingCard) {
    if (remaining < 0) {
      remainingBudgetEl.classList.add('negative');
      remainingCard.classList.add('negative');
    } else {
      remainingBudgetEl.classList.remove('negative');
      remainingCard.classList.remove('negative');
    }
  }
}

// ---------- Renderizado de items ----------
function renderEmptyState() {
  itemsContainer.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = `
    <p>No hay artículos añadidos todavía.</p>
    <p class="muted">¡Utilice el formulario para comenzar!</p>
  `;
  itemsContainer.appendChild(empty);
}

function renderItems() {
  itemsContainer.innerHTML = '';

  if (!items.length) {
    renderEmptyState();
    return;
  }

  // Encabezado con cantidad
  const header = document.createElement('div');
  header.className = 'item-header';
  header.innerHTML = `
    <div class="col-number">Nro</div>
    <div class="col-name">Item</div>
    <div class="col-category">Categoría</div>
    <div class="col-cost">Costo</div>
    <div class="col-quantity">Cantidad</div>
    <div class="col-total">Costo Total</div>
    <div class="col-action">Acción</div>
  `;
  itemsContainer.appendChild(header);

  const fragment = document.createDocumentFragment();
  items.forEach((it, index) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.id = it.id;
    
    const totalCost = it.cost * it.quantity;

    row.innerHTML = `
      <div class="col-number">${index + 1}</div>
      <div class="col-name">${escapeHtml(it.name)}</div>
      <div class="col-category">${escapeHtml(it.category || "Otros")}</div>
      <div class="col-cost">${formatCurrency(it.cost)}</div>
      <div class="col-quantity">${it.quantity}</div>
      <div class="col-total">${formatCurrency(totalCost)}</div>
      <div class="col-action">
        <button class="icon-btn edit-btn" data-id="${it.id}" aria-label="Editar ${escapeHtml(it.name)}">✏️</button>
        <button class="icon-btn delete-btn" data-id="${it.id}" aria-label="Eliminar ${escapeHtml(it.name)}">🗑</button>
      </div>
    `;
    fragment.appendChild(row);
  });

  itemsContainer.appendChild(fragment);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- Operaciones ----------
async function addItem(name, cost, quantity, category) {
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36);
  const newItem = {
    id,
    name: String(name).trim(),
    category: category || "Otros",
    cost: Number(cost || 0),
    quantity: Number(quantity || 1)
  };

  items.unshift(newItem);
  renderItems();
  updateBudgetDisplay();

  if (folderId) {
    const inventoryRef = collection(db, "carpetas", folderId, "inventario");
    await setDoc(doc(inventoryRef, id), newItem);
  }
}

async function deleteItemById(id) {
  items = items.filter(i => i.id !== id);
  renderItems();
  updateBudgetDisplay();

  if (folderId) {
    const itemRef = doc(db, "carpetas", folderId, "inventario", id);
    await deleteDoc(itemRef);
  }
}

function showEditPopup(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  const existingPopup = document.querySelector('.modal'); // Usamos la clase modal genérica
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement('div');
  popup.className = 'modal'; // Clase CSS global para fondo oscuro y centrado
  
  // HTML estructurado igual que el Planner
  popup.innerHTML = `
    <div class="modal-content">
      <h3 class="mb-2">Editar Item</h3>
      
      <div class="mb-2">
        <label class="mb-1 d-block">Nombre:</label>
        <input type="text" class="edit-name" value="${escapeHtml(item.name)}" />
      </div>

      <div class="mb-2" style="display: flex; gap: 10px;">
         <div style="flex: 1;">
            <label class="mb-1 d-block">Costo:</label>
            <input type="number" class="edit-cost" value="${item.cost}" />
         </div>
         <div style="flex: 1;">
            <label class="mb-1 d-block">Cantidad:</label>
            <input type="number" class="edit-quantity" value="${item.quantity}" />
         </div>
      </div>

      <div class="mb-2">
        <label class="mb-1 d-block">Categoría:</label>
        <select class="edit-category">
          <option value="">Seleccionar...</option>
          <option value="Alojamiento">Alojamiento</option>
          <option value="Transporte">Transporte</option>
          <option value="Comida">Comida</option>
          <option value="Entretenimiento">Entretenimiento</option>
          <option value="Salud e Higiene">Salud e Higiene</option>
          <option value="Ropa y Accesorios">Ropa y Accesorios</option>
          <option value="Tecnología">Tecnología</option>
          <option value="Documentos">Documentos</option>
          <option value="Otros">Otros</option>
        </select>
      </div>

      <div class="modal-buttons">
        <button class="btn btn-primary edit-accept">Guardar</button>
        <button class="btn btn-secondary edit-cancel">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Lógica de llenado inicial
  const categorySelect = popup.querySelector('.edit-category');
  categorySelect.value = item.category || "Otros";

  const nameInput = popup.querySelector('.edit-name');
  const costInput = popup.querySelector('.edit-cost');
  const quantityInput = popup.querySelector('.edit-quantity');
  
  // Foco al abrir
  nameInput.focus(); 

  // --- EVENTOS DEL POPUP ---
  popup.querySelector('.edit-accept').addEventListener('click', async () => {
    item.name = nameInput.value.trim() || item.name;
    item.cost = parseFloat(costInput.value) || 0; // Corrección para evitar NaN si borran todo
    item.quantity = parseInt(quantityInput.value) || 1;
    item.category = categorySelect.value || item.category;
    
    renderItems();
    updateBudgetDisplay();
    popup.remove();

    if (window.folderId && item.id) { // Usar window.folderId por seguridad
      const itemRef = doc(db, "carpetas", window.folderId, "inventario", item.id);
      await updateDoc(itemRef, {
        name: item.name,
        cost: item.cost,
        quantity: item.quantity,
        category: item.category
      });
    }
  });

  popup.querySelector('.edit-cancel').addEventListener('click', () => popup.remove());
  
  // Cerrar al hacer clic fuera
  popup.addEventListener('click', (e) => {
    if (e.target === popup) popup.remove();
  });
}

// ---------- Sugerencias ----------
const SUGGESTIONS = [
  'Carpa', 'Saco de Dormir', 'Kit Primeros Auxilios',
  'Cargador Portatil', 'Chaqueta GTX', 'Articulo Aseo', 'Botella de Agua'
];

function renderSuggestions() {
  if (!suggestionsContainer) return;
  suggestionsContainer.innerHTML = '';
  SUGGESTIONS.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'suggestion';
    btn.textContent = s;
    btn.addEventListener('click', () => {
      itemNameInput.value = s;
      itemCostInput.value = '0';
      itemQuantityInput.value = '1';
      itemCostInput.focus();
      itemCostInput.select();
    });
    suggestionsContainer.appendChild(btn);
  });
}

// ---------- Eventos ----------
if (budgetForm) {
  budgetForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const val = parseFloat(budgetInput.value);
    if (!isNaN(val) && val >= 0) {
      initialBudget = val;
      await guardarPresupuestoInicial(); 
      
      // CORRECCIÓN AQUÍ: Ocultar agregando la clase 'hidden'
      if (budgetScreen) budgetScreen.classList.add('hidden');
      
      updateBudgetDisplay();
      renderItems();
    } else budgetInput.focus();
  });
}


if (addItemForm) {
  addItemForm.addEventListener('submit', (ev) => {
    ev.preventDefault();

    const name = itemNameInput.value.trim();
    const category = itemCategorySelect.value;
    const cost = parseFloat(itemCostInput.value) || 0;
    const quantity = parseInt(itemQuantityInput.value) || 1;

    if (!name) return alert("Ingresa un nombre");
    if (cost < 0 || quantity < 1) return alert("Valores inválidos");
    if (!category) return alert("Selecciona una categoría");

    addItem(name, cost, quantity, category);

    addItemForm.reset();
    itemNameInput.focus();
  });
}


// Delegación de botones
if (itemsContainer) {
  itemsContainer.addEventListener('click', (ev) => {
    const editBtn = ev.target.closest('.edit-btn');
    if (editBtn) { const id = editBtn.dataset.id; if(id) showEditPopup(id); return; }

    const deleteBtn = ev.target.closest('.delete-btn');
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (!id) return;

      const existingPopup = document.querySelector('.confirm-popup');
      if (existingPopup) existingPopup.remove();

      const popup = document.createElement('div');
      popup.className = 'confirm-popup';
      popup.innerHTML = `
        <p>¿Seguro que quieres eliminar este item?</p>
        <div class="popup-buttons">
          <button class="confirm-yes">Sí</button>
          <button class="confirm-no">No</button>
        </div>
      `;
      // (Estilos de posición similar al edit popup...)
      const rect = deleteBtn.getBoundingClientRect();
      const popupWidth = 220;
      popup.style.position = 'absolute';
      popup.style.top = `${rect.top + window.scrollY - 10}px`;
      if (rect.right + popupWidth + 20 < window.innerWidth) {
         popup.style.left = `${rect.right + 10}px`;
      } else {
         popup.style.left = `${rect.left - popupWidth - 10}px`;
      }

      document.body.appendChild(popup);

      popup.querySelector('.confirm-yes').addEventListener('click', () => {
        deleteItemById(id);
        popup.remove();
      });
      popup.querySelector('.confirm-no').addEventListener('click', () => popup.remove());

      setTimeout(() => {
        document.addEventListener('click', function handler(e) {
          if (!popup.contains(e.target) && e.target !== deleteBtn) {
            popup.remove();
            document.removeEventListener('click', handler);
          }
        });
      }, 50);
    }
  });
}

// Listener tiempo real
function listenInventory() {
  if (!folderId) return;

  const inventoryRef = collection(db, "carpetas", folderId, "inventario");

  onSnapshot(inventoryRef, (snapshot) => {
    items = snapshot.docs.map(doc => doc.data());
    renderItems();
    updateBudgetDisplay();
  });
}


const editBudgetBtn = document.getElementById('edit-budget-btn');

if (editBudgetBtn) {
  editBudgetBtn.addEventListener('click', () => {
    // Verificar si ya hay un modal abierto para no duplicar
    const existing = document.querySelector('.modal.budget-edit');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'modal budget-edit'; // Usamos la clase base 'modal'
    
    popup.innerHTML = `
      <div class="modal-content">
        <h3 class="mb-2">Editar Presupuesto Inicial</h3>
        <div class="input-with-prefix mb-2">
            <span class="prefix" style="left: 10px; top: 50%; transform: translateY(-50%); position: absolute; color: gray;">$</span>
            <input type="number" id="new-budget-input" value="${initialBudget}" min="0" style="padding-left: 25px;" />
        </div>
        
        <div class="modal-buttons">
          <button id="save-budget" class="btn btn-primary">Guardar</button>
          <button id="cancel-budget" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    // Foco en el input
    const inputEl = document.getElementById('new-budget-input');
    inputEl.focus();
    inputEl.select();

    document.getElementById('save-budget').addEventListener('click', async () => {
      const newVal = parseFloat(inputEl.value);
      if (!isNaN(newVal) && newVal >= 0) {
        initialBudget = newVal;
        await guardarPresupuestoInicial();
        updateBudgetDisplay();
        popup.remove();
      }
    });

    document.getElementById('cancel-budget').addEventListener('click', () => popup.remove());
    
    // Cerrar al hacer clic fuera del contenido
    popup.addEventListener('click', (e) => {
      if (e.target === popup) popup.remove();
    });
  });
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  renderSuggestions();
  updateBudgetDisplay();
  await cargarPresupuestoInicial();
  listenInventory();
});

// === EXPORT PARA DESCARGAS (INVENTARIO) ===
export async function getInventoryData() {
  if (!folderId) return [];
  const inventoryRef = collection(db, "carpetas", folderId, "inventario");
  const snapshot = await getDocs(inventoryRef);
  return snapshot.docs.map(d => d.data());
}

// ---------- BARRA DE BÚSQUEDA ----------
const searchInput = document.getElementById('search-input');

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const filteredItems = items.filter(it => {
      return it.name.toLowerCase().includes(query) ||
             (it.category && it.category.toLowerCase().includes(query));
    });
    renderFilteredItems(filteredItems);
  });
}

function renderFilteredItems(filtered) {
  itemsContainer.innerHTML = '';

  if (!filtered.length) {
    renderEmptyState();
    return;
  }

  const header = document.createElement('div');
  header.className = 'item-header';
  header.innerHTML = `
    <div class="col-number">Nro</div>
    <div class="col-name">Item</div>
    <div class="col-category">Categoría</div>
    <div class="col-cost">Costo</div>
    <div class="col-quantity">Cantidad</div>
    <div class="col-total">Costo Total</div>
    <div class="col-action">Acción</div>
  `;
  itemsContainer.appendChild(header);

  const fragment = document.createDocumentFragment();
  filtered.forEach((it, index) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.id = it.id;
    const totalCost = it.cost * it.quantity;

    row.innerHTML = `
      <div class="col-number">${index + 1}</div>
      <div class="col-name">${escapeHtml(it.name)}</div>
      <div class="col-category">${escapeHtml(it.category || "Otros")}</div>
      <div class="col-cost">${formatCurrency(it.cost)}</div>
      <div class="col-quantity">${it.quantity}</div>
      <div class="col-total">${formatCurrency(totalCost)}</div>
      <div class="col-action">
        <button class="icon-btn edit-btn" data-id="${it.id}" aria-label="Editar ${escapeHtml(it.name)}">✏️</button>
        <button class="icon-btn delete-btn" data-id="${it.id}" aria-label="Eliminar ${escapeHtml(it.name)}">🗑</button>
      </div>
    `;
    fragment.appendChild(row);
  });
  itemsContainer.appendChild(fragment);
}