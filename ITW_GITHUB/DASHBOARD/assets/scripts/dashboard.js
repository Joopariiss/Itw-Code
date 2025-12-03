// ============================
// DASHBOARD.JS
// Funcionalidades exclusivas del DASHBOARD
// ============================

// Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tabContents.forEach(sec => {
      sec.classList.remove('active');
      if (sec.id === target) sec.classList.add('active');
    });
  });
});

// ============================
// INVITAR USUARIOS - POPUP + FIRESTORE
// ============================
import { db } from "../../../firebase.js";
import { doc, updateDoc, arrayUnion, getDocs, collection, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// ============================
// VALIDAR PERMISOS DEL DUEÑO
// ============================
async function checkInvitePermissions() {
  const currentUserId = localStorage.getItem("currentUserId");
  if (!currentUserId) return;

  const folderRef = doc(db, "carpetas", window.folderId);
  const snap = await getDoc(folderRef);
  if (!snap.exists()) return;

  const data = snap.data();

  // El dueño está en data.userId
  const isOwner = data.userId === currentUserId;

  if (!isOwner) {
    // Ocultar botón
    const btn = document.getElementById("invite-btn");
    if (btn) btn.style.display = "none";
    window.USER_IS_OWNER = false;
  } else {
    window.USER_IS_OWNER = true;
  }
}

// Ejecutar una vez cargado el dashboard
checkInvitePermissions();



