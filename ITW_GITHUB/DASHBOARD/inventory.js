// script.js
// Trip Wallet — JS puro adaptado al HTML/CSS que compartiste

// ---------- Estado ----------
let items = [];
let initialBudget = 0;

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
function addItem(name, cost, quantity) {
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36);
  items.unshift({ id, name: String(name).trim(), cost: Number(cost || 0), quantity: Number(quantity || 1) });
  renderItems();
  updateBudgetDisplay();
}

function deleteItemById(id) {
  items = items.filter(i => i.id !== id);
  renderItems();
  updateBudgetDisplay();
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

  popup.querySelector('.edit-accept').addEventListener('click', () => {
    item.name = nameInput.value.trim() || item.name;
    item.cost = parseFloat(costInput.value) || item.cost;
    item.quantity = parseInt(quantityInput.value) || item.quantity;
    renderItems();
    updateBudgetDisplay();
    popup.remove();
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
  budgetForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const val = parseFloat(budgetInput.value);
    if (!isNaN(val) && val >= 0) {
      initialBudget = val;
      if (budgetScreen) budgetScreen.style.display = 'none';
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

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  renderSuggestions();
  updateBudgetDisplay();
});
