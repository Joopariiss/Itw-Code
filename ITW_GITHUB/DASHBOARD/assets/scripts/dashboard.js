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

// DOM para invitaciones
const inviteBtn = document.getElementById("invite-btn");
const inviteModal = document.getElementById("invite-modal");
const sendInviteBtn = document.getElementById("send-invite-btn");
const closeInviteBtn = document.getElementById("close-invite-btn");
const inviteEmailInput = document.getElementById("invite-email");
const inviteStatus = document.getElementById("invite-status");

// Mostrar/ocultar popup
inviteBtn?.addEventListener("click", () => {
  inviteModal.classList.remove("hidden");
  inviteStatus.textContent = "";
  inviteEmailInput.value = "";
});
closeInviteBtn?.addEventListener("click", () => inviteModal.classList.add("hidden"));

// Enviar invitación
sendInviteBtn?.addEventListener("click", async () => {
  // BLOQUEO PARA INVITADOS → esta parte te faltaba
  if (window.USER_IS_OWNER === false) {
    return showInviteError("Solo el dueño puede invitar.");
  }

  const email = inviteEmailInput.value.trim();
  if (!email) return showInviteError("Por favor ingresa un correo.");

  try {
    const currentUserId = localStorage.getItem("currentUserId");
    if (!currentUserId) return showInviteError("Error: usuario no autenticado aún.");

    const usersRef = collection(db, "usuarios");
    const q = query(usersRef, where("email", "==", email));
    const querySnap = await getDocs(q);

    if (querySnap.empty) return showInviteError("No se encontró ningún usuario con ese correo.");

    const invitedUid = querySnap.docs[0].id;

    if (invitedUid === currentUserId) return showInviteError("No puedes invitarte a ti mismo.");

    const folderRef = doc(db, "carpetas", window.folderId);
    await updateDoc(folderRef, { invitadosPendientes: arrayUnion(invitedUid) });

    inviteStatus.textContent = `✅ Invitación enviada a ${email}`;
    inviteStatus.style.color = "green";
    setTimeout(() => inviteModal.classList.add("hidden"), 1500);

  } catch (error) {
    console.error("Error al invitar usuario:", error);
    showInviteError("Error al enviar invitación.");
  }
});

function showInviteError(msg) {
  inviteStatus.textContent = msg;
  inviteStatus.style.color = "red";
}


