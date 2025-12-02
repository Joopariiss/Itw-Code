import { db } from "../../../firebase.js";
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Iconos para las categorías
const categoryIcons = {
    "Ropa": "👕",
    "Documentos": "📘",
    "Electrónica": "🔌",
    "Aseo": "🪥",
    "Varios": "💼"
};

// Variable para guardar temporalmente el ID del item a eliminar
let itemToDeleteId = null;

export function initChecklist() {
    if (!window.folderId) return;

    const checklistRef = collection(db, "carpetas", window.folderId, "checklist");
    
    // Elementos del DOM
    const container = document.getElementById("checklist-items-container");
    const progressBar = document.getElementById("progress-bar-fill");
    const progressText = document.getElementById("progress-text-count");

    // --- ELEMENTOS DEL NUEVO MODAL ---
    const deleteModal = document.getElementById("checklist-delete-modal");
    const confirmBtn = document.getElementById("confirm-delete-check-btn");
    const cancelBtn = document.getElementById("cancel-delete-check-btn");

    // LOGICA DEL MODAL (Se define una sola vez)
    if (deleteModal && confirmBtn && cancelBtn) {
        
        // 1. Al hacer clic en "Eliminar" dentro del modal
        confirmBtn.addEventListener("click", async () => {
            if (itemToDeleteId) {
                try {
                    const docRef = doc(db, "carpetas", window.folderId, "checklist", itemToDeleteId);
                    await deleteDoc(docRef);
                    // Cerrar modal y limpiar variable
                    deleteModal.classList.add("hidden");
                    itemToDeleteId = null;
                } catch (error) {
                    console.error("Error al eliminar:", error);
                }
            }
        });

        // 2. Al hacer clic en "Cancelar"
        cancelBtn.addEventListener("click", () => {
            deleteModal.classList.add("hidden");
            itemToDeleteId = null;
        });
    }

    // --- LISTENER EN TIEMPO REAL ---
    onSnapshot(checklistRef, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        renderChecklist(items, container, progressBar, progressText);
    });

    // --- FORMULARIO AGREGAR ---
    const addForm = document.getElementById("add-checklist-form");
    if(addForm){
        addForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById("check-name");
            const catInput = document.getElementById("check-category");

            if(nameInput.value && catInput.value) {
                try {
                    await addDoc(checklistRef, {
                        name: nameInput.value,
                        category: catInput.value,
                        packed: false,
                        createdAt: Date.now()
                    });
                    nameInput.value = ""; 
                } catch (error) {
                    console.error("Error al agregar:", error);
                }
            }
        });
    }
}

function renderChecklist(items, container, progressBar, progressText) {
    container.innerHTML = "";

    // Calcular Progreso
    const total = items.length;
    const packedCount = items.filter(i => i.packed).length;
    const percentage = total === 0 ? 0 : Math.round((packedCount / total) * 100);

    if(progressBar) progressBar.style.width = `${percentage}%`;
    if(progressText) progressText.textContent = `${packedCount} / ${total} items`;

    // Agrupar items
    const grouped = items.reduce((acc, item) => {
        const cat = item.category || "Varios";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    if (total === 0) {
        container.innerHTML = "<p class='checklist-empty-msg'>Tu lista está vacía. Agrega items arriba.</p>";
        return;
    }

    // Renderizar
    Object.keys(grouped).sort().forEach(category => {
        const catItems = grouped[category];
        const icon = categoryIcons[category] || "📦";
        
        const section = document.createElement("div");
        section.className = "checklist-category-section"; 
        
        section.innerHTML = `
            <div class="checklist-category-header">
                <span class="checklist-cat-icon">${icon}</span>
                <span class="checklist-cat-title">${category}</span>
            </div>
            <div class="checklist-items-group"></div>
        `;
        
        const listContainer = section.querySelector(".checklist-items-group");

        catItems.forEach(item => {
            const itemEl = document.createElement("div");
            itemEl.className = `checklist-item-row ${item.packed ? 'checklist-item-checked' : ''}`;
            
            itemEl.innerHTML = `
                <label class="checklist-label">
                    <input type="checkbox" class="checklist-input-hidden" ${item.packed ? "checked" : ""} data-id="${item.id}">
                    <span class="checklist-custom-checkbox"></span>
                    <span class="checklist-item-name">${item.name}</span>
                </label>
                <button class="checklist-delete-btn" title="Eliminar">×</button>
            `;

            // Checkbox logic
            const checkbox = itemEl.querySelector("input");
            checkbox.addEventListener("change", async () => {
                const docRef = doc(db, "carpetas", window.folderId, "checklist", item.id);
                await updateDoc(docRef, { packed: checkbox.checked });
            });

            // --- BOTÓN ELIMINAR (AHORA ABRE EL MODAL) ---
            const delBtn = itemEl.querySelector(".checklist-delete-btn");
            delBtn.addEventListener("click", () => {
                // 1. Guardamos el ID que queremos borrar
                itemToDeleteId = item.id;
                
                // 2. Actualizamos el texto del modal para que sea personalizado
                const msgEl = document.getElementById("checklist-delete-msg");
                const modal = document.getElementById("checklist-delete-modal");
                
                if (msgEl) msgEl.textContent = `¿Eliminar "${item.name}"?`;
                
                // 3. Mostramos el modal (quitando la clase hidden)
                if (modal) modal.classList.remove("hidden");
            });

            listContainer.appendChild(itemEl);
        });

        container.appendChild(section);
    });
}