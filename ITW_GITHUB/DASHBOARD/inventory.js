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

const itemsContainer = document.getElementById('items-container');
const suggestionsContainer = document.getElementById('suggestions');

// ---------- Utilidades ----------
function formatCurrency(amount) {
  // Usa 2 decimales si hay centavos, si no muestra sin decimales para que quede limpio
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0
  }).format(amount);
}

function computeTotals() {
  const total = items.reduce((s, it) => s + Number(it.cost || 0), 0);
  const remaining = initialBudget - total;
  return { total, remaining };
}

function updateBudgetDisplay() {
  const { total, remaining } = computeTotals();
  initialBudgetEl.textContent = formatCurrency(initialBudget);
  totalSpentEl.textContent = formatCurrency(total);
  remainingBudgetEl.textContent = formatCurrency(remaining);

  // estilo cuando queda negativo
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

  // Crear encabezado
  const header = document.createElement('div');
  header.className = 'item-header';
  header.innerHTML = `
    <div class="col-number">Nro</div>
    <div class="col-name">Item</div>
    <div class="col-cost">Costo</div>
    <div class="col-action">Acción</div>
  `;
  itemsContainer.appendChild(header);

  // Crear lista
  const fragment = document.createDocumentFragment();

  items.forEach((it, index) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.id = it.id;

    row.innerHTML = `
      <div class="col-number">${index + 1}</div>
      <div class="col-name">${escapeHtml(it.name)}</div>
      <div class="col-cost">${formatCurrency(Number(it.cost || 0))}</div>
      <div class="col-action">
        <button class="icon-btn delete-btn" data-id="${it.id}" aria-label="Eliminar ${escapeHtml(it.name)}">🗑</button>
      </div>
    `;

    fragment.appendChild(row);
  });

  itemsContainer.appendChild(fragment);
}



// simple escape to avoid injection if nombres raros
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- Operaciones ----------
function addItem(name, cost) {
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36);
  items.unshift({ id, name: String(name).trim(), cost: Number(cost || 0) });
  renderItems();
  updateBudgetDisplay();
}

function deleteItemById(id) {
  items = items.filter(i => i.id !== id);
  renderItems();
  updateBudgetDisplay();
}

// ---------- Sugerencias (similar a utilizar IA) ----------
const SUGGESTIONS = [
  'Carpa',
  'Saco de Dormir',
  'Kit Primeros Auxilios',
  'Cargador Portatil',
  'Chaqueta GTX',
  'Articulo Aseo',
  'Botella de Agua'
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
      // cuando clickean una sugerencia, rellenamos nombre y enfocamos costo
      itemNameInput.value = s;
      itemCostInput.value = '0';
      itemCostInput.focus();
      itemCostInput.select();
    });
    suggestionsContainer.appendChild(btn);
  });
}

// ---------- Eventos ----------

// Subir presupuesto (formulario)
if (budgetForm) {
  budgetForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const val = parseFloat(budgetInput.value);
    if (!isNaN(val) && val >= 0) {
      initialBudget = val;
      // cerrar modal de presupuesto
      if (budgetScreen) budgetScreen.style.display = 'none';
      updateBudgetDisplay();
      renderItems();
    } else {
      // si hay error simple feedback
      budgetInput.focus();
    }
  });
}

// Agregar item
if (addItemForm) {
  addItemForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = itemNameInput.value.trim();
    const costRaw = itemCostInput.value;
    const cost = costRaw === '' ? 0 : parseFloat(costRaw);

    if (!name) {
      itemNameInput.focus();
      return;
    }
    if (isNaN(cost) || cost < 0) {
      itemCostInput.focus();
      return;
    }

    addItem(name, cost);
    addItemForm.reset();
    itemNameInput.focus();
  });
}

// Delegación para eliminar (lista estática dentro de itemsContainer)
if (itemsContainer) {
  itemsContainer.addEventListener('click', (ev) => {
    const btn = ev.target.closest && ev.target.closest('.delete-btn');
    if (btn) {
      const id = btn.dataset.id;
      if (!id) return;

      // Si ya hay un popup abierto, lo quitamos
      const existingPopup = document.querySelector('.confirm-popup');
      if (existingPopup) existingPopup.remove();

      // Crear popup de confirmación
      const popup = document.createElement('div');
      popup.className = 'confirm-popup';
      popup.innerHTML = `
        <p>¿Seguro que quieres eliminar este item?</p>
        <div class="popup-buttons">
          <button class="confirm-yes">Sí</button>
          <button class="confirm-no">No</button>
        </div>
      `;

      // Posicionar el popup al lado del botón
      // Posicionar el popup de forma inteligente
      const rect = btn.getBoundingClientRect();
      const popupWidth = 220; // ancho estimado del popup
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;

      popup.style.position = 'absolute';
      popup.style.top = `${rect.top + window.scrollY - 10}px`;

      // Si hay espacio a la derecha, mostrar ahí. Si no, a la izquierda
      if (spaceRight > popupWidth + 20) {
        popup.style.left = `${rect.right + 10}px`;
      } else if (spaceLeft > popupWidth + 20) {
        popup.style.left = `${rect.left - popupWidth - 10}px`;
      } else {
        // Centrado sobre el botón si no hay espacio a los lados
        popup.style.left = `${rect.left - popupWidth / 2 + rect.width / 2}px`;
      }


      document.body.appendChild(popup);

      // Evento confirmar
      popup.querySelector('.confirm-yes').addEventListener('click', () => {
        deleteItemById(id);
        popup.remove();
      });

      // Evento cancelar
      popup.querySelector('.confirm-no').addEventListener('click', () => popup.remove());

      // Cerrar si se hace clic fuera
      setTimeout(() => {
        document.addEventListener('click', function handler(e) {
          if (!popup.contains(e.target) && e.target !== btn) {
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
  // Mostrar sugerencias
  renderSuggestions();

  // Si quieres ocultar la pantalla de presupuesto cuando haya un valor ya (ej: valor por defecto)
  // por ahora dejamos que el modal esté visible hasta que el usuario confirme.
  updateBudgetDisplay();
});
