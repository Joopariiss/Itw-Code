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
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- Obtener el ID de la carpeta activa desde index.html ---
const folderId = window.folderId;

// ---------- Estado ----------
let items = [];
let initialBudget = 0;

async function cargarPresupuestoInicial() {
  if (!folderId) return;

  const folderRef = doc(db, "carpetas", folderId);
  const folderSnap = await getDoc(folderRef);

  if (folderSnap.exists()) {
    const data = folderSnap.data();
    initialBudget = data.presupuestoInicial || 0;

    if (initialBudget > 0) {
      if (budgetScreen) budgetScreen.classList.remove('visible');
    } else {
      if (budgetScreen) budgetScreen.classList.add('visible');
    }


    updateBudgetDisplay();
  } else {
    console.warn("⚠️ No se encontró la carpeta o no tiene presupuesto.");
    // Si la carpeta no existe (raro), mostramos el popup por seguridad
    if (budgetScreen) budgetScreen.classList.add('visible');
  }
}


async function guardarPresupuestoInicial() {
  if (!folderId) return;
  const folderRef = doc(db, "carpetas", folderId);
  await updateDoc(folderRef, { presupuestoInicial: initialBudget });
  console.log("✅ Presupuesto inicial guardado correctamente en Firestore");
}


// ---------- Referencias DOM ----------
const budgetScreen = document.getElementById('budget-screen');
const budgetForm = document.getElementById('budget-form');
const budgetInput = document.getElementById('budget-input');

const initialBudgetEl = document.getElementById('initial-budget');
const totalSpentEl = document.getElementById('total-spent');
const remainingBudgetEl = document.getElementById('remaining-budget');
const remainingCard = document.getElementById('remaining-card');

const addItemForm = document.getElementById('add-item-form');
const itemNameInput = document.getElementById('item-name');
const itemCostInput = document.getElementById('item-cost');
const itemQuantityInput = document.getElementById('item-quantity'); // NUEVO

const itemsContainer = document.getElementById('items-container');
const suggestionsContainer = document.getElementById('suggestions');

// ---------- Utilidades ----------
function formatCurrency(amount) {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0
  }).format(amount);
}

function computeTotals() {
  const total = items.reduce((s, it) => s + it.cost * it.quantity, 0);
  const remaining = initialBudget - total;
  return { total, remaining };
}

function updateBudgetDisplay() {
  const { total, remaining } = computeTotals();
  initialBudgetEl.textContent = formatCurrency(initialBudget);
  totalSpentEl.textContent = formatCurrency(total);
  remainingBudgetEl.textContent = formatCurrency(remaining);

  if (remaining < 0) {
    remainingBudgetEl.classList.add('negative');
    remainingCard.classList.add('negative');
  } else {
    remainingBudgetEl.classList.remove('negative');
    remainingCard.classList.remove('negative');
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
    
    const totalCost = it.cost * it.quantity; // <<< ESTO ERA LO QUE FALTABA

    row.innerHTML = `
      <div class="col-number">${index + 1}</div>
      <div class="col-name">${escapeHtml(it.name)}</div>
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
async function addItem(name, cost, quantity) {
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36);
  const newItem = {
    id,
    name: String(name).trim(),
    cost: Number(cost || 0),
    quantity: Number(quantity || 1)
  };

  items.unshift(newItem);
  renderItems();
  updateBudgetDisplay();

  // 🔥 Guardar en Firestore (subcolección de la carpeta)
  if (folderId) {
    const inventoryRef = collection(db, "carpetas", folderId, "inventario");
    await setDoc(doc(inventoryRef, id), newItem);
    console.log("🟢 Item guardado en Firestore:", newItem);
  }
}


async function deleteItemById(id) {
  items = items.filter(i => i.id !== id);
  renderItems();
  updateBudgetDisplay();

  if (folderId) {
    const itemRef = doc(db, "carpetas", folderId, "inventario", id);
    await deleteDoc(itemRef);
    console.log("🗑️ Item eliminado de Firestore:", id);
  }
}


function showEditPopup(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  const existingPopup = document.querySelector('.edit-popup');
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement('div');
  popup.className = 'edit-popup';
  popup.innerHTML = `
    <p>Editar item</p>
    <input type="text" class="edit-name" value="${escapeHtml(item.name)}" placeholder="Nombre del item" />
    <input type="number" class="edit-cost" value="${item.cost}" placeholder="Costo" />
    <input type="number" class="edit-quantity" value="${item.quantity}" placeholder="Cantidad" />
    <div class="popup-buttons">
      <button class="edit-accept">Aceptar</button>
      <button class="edit-cancel">Cancelar</button>
    </div>
  `;

  const btn = document.querySelector(`.edit-btn[data-id="${id}"]`);
  const rect = btn.getBoundingClientRect();
  const popupWidth = 220;
  const spaceRight = window.innerWidth - rect.right;
  const spaceLeft = rect.left;

  popup.style.position = 'absolute';
  popup.style.top = `${rect.top + window.scrollY - 10}px`;
  if (spaceRight > popupWidth + 20) {
    popup.style.left = `${rect.right + 10}px`;
  } else if (spaceLeft > popupWidth + 20) {
    popup.style.left = `${rect.left - popupWidth - 10}px`;
  } else {
    popup.style.left = `${rect.left - popupWidth / 2 + rect.width / 2}px`;
  }

  document.body.appendChild(popup);

  const nameInput = popup.querySelector('.edit-name');
  const costInput = popup.querySelector('.edit-cost');
  const quantityInput = popup.querySelector('.edit-quantity');
  nameInput.focus();
  nameInput.select();

  popup.querySelector('.edit-accept').addEventListener('click', async () => {
    item.name = nameInput.value.trim() || item.name;
    item.cost = parseFloat(costInput.value) || item.cost;
    item.quantity = parseInt(quantityInput.value) || item.quantity;
    renderItems();
    updateBudgetDisplay();
    popup.remove();

    // 🔥 Guardar cambios en Firestore
    if (folderId && item.id) {
      const itemRef = doc(db, "carpetas", folderId, "inventario", item.id);
      await updateDoc(itemRef, {
        name: item.name,
        cost: item.cost,
        quantity: item.quantity
      });
      console.log("✏️ Item actualizado en Firestore:", item);
    }
  });


  popup.querySelector('.edit-cancel').addEventListener('click', () => popup.remove());

  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!popup.contains(e.target) && e.target !== btn) {
        popup.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 50);
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
      await guardarPresupuestoInicial(); // 🔥 Guarda en Firestore
      if (budgetScreen) budgetScreen.classList.remove('visible');
      updateBudgetDisplay();
      renderItems();
    } else budgetInput.focus();
  });
}


if (addItemForm) {
  addItemForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = itemNameInput.value.trim();
    const cost = parseFloat(itemCostInput.value) || 0;
    const quantity = parseInt(itemQuantityInput.value) || 1;

    if (!name) return itemNameInput.focus();
    if (cost < 0 || quantity < 1) return;

    addItem(name, cost, quantity);
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

      const rect = deleteBtn.getBoundingClientRect();
      const popupWidth = 220;
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;

      popup.style.position = 'absolute';
      popup.style.top = `${rect.top + window.scrollY - 10}px`;
      if (spaceRight > popupWidth + 20) {
        popup.style.left = `${rect.right + 10}px`;
      } else if (spaceLeft > popupWidth + 20) {
        popup.style.left = `${rect.left - popupWidth - 10}px`;
      } else {
        popup.style.left = `${rect.left - popupWidth / 2 + rect.width / 2}px`;
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

async function loadItems() {
  if (!folderId) return;
  const inventoryRef = collection(db, "carpetas", folderId, "inventario");
  const snapshot = await getDocs(inventoryRef);
  items = snapshot.docs.map(doc => doc.data());
  renderItems();
  updateBudgetDisplay();
  console.log("📦 Inventario cargado:", items);
}

const editBudgetBtn = document.getElementById('edit-budget-btn');

if (editBudgetBtn) {
  editBudgetBtn.addEventListener('click', () => {
    // Crear el popup flotante
    const popup = document.createElement('div');
    popup.className = 'edit-popup';
    popup.innerHTML = `
      <div class="popup-inner">
        <p><strong>Editar presupuesto inicial</strong></p>
        <input type="number" id="new-budget-input" value="${initialBudget}" min="0" />
        <div class="popup-buttons">
          <button id="save-budget" class="btn btn-primary">Guardar</button>
          <button id="cancel-budget" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    `;

    // Estilo básico para el popup (centrado)
    Object.assign(popup.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999'
    });

    const inner = popup.querySelector('.popup-inner');
    Object.assign(inner.style, {
      background: '#fff',
      padding: '1.5rem',
      borderRadius: '10px',
      width: '280px',
      textAlign: 'center',
      boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
    });

    document.body.appendChild(popup);

    // Eventos del popup
    document.getElementById('save-budget').addEventListener('click', async () => {
      const newVal = parseFloat(document.getElementById('new-budget-input').value);
      if (!isNaN(newVal) && newVal >= 0) {
        initialBudget = newVal;
        await guardarPresupuestoInicial(); // 🔥 Guarda en Firestore
        updateBudgetDisplay();
        popup.remove();
        console.log("💰 Presupuesto inicial editado y guardado:", newVal);
      }
    });

    document.getElementById('cancel-budget').addEventListener('click', () => popup.remove());
  });
}



// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  renderSuggestions();
  updateBudgetDisplay();
  await cargarPresupuestoInicial();
  await loadItems();
});