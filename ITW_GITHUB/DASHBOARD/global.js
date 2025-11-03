// Control simple de tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');


let currentUserId = null;

export function setCurrentUserId(uid) {
  currentUserId = uid;
}


tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    // Cambiar estado activo en botones
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Mostrar solo la sección activa
    tabContents.forEach(sec => {
      sec.classList.remove('active');
      if (sec.id === target) sec.classList.add('active');
    });
  });
});


// ============================
// INVITAR USUARIOS - POPUP + FIRESTORE
// ============================
import { db } from "../firebase.js";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  collection,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Referencias al DOM
const inviteBtn = document.getElementById("invite-btn");
const inviteModal = document.getElementById("invite-modal");
const sendInviteBtn = document.getElementById("send-invite-btn");
const closeInviteBtn = document.getElementById("close-invite-btn");
const inviteEmailInput = document.getElementById("invite-email");
const inviteStatus = document.getElementById("invite-status");

// Mostrar el popup
inviteBtn?.addEventListener("click", () => {
  inviteModal.classList.remove("hidden");
  inviteStatus.textContent = "";
  inviteEmailInput.value = "";
});

// Cerrar el popup
closeInviteBtn?.addEventListener("click", () => {
  inviteModal.classList.add("hidden");
});

// Enviar invitación
sendInviteBtn?.addEventListener("click", async () => {
  const email = inviteEmailInput.value.trim();
  if (!email) {
    inviteStatus.textContent = "Por favor ingresa un correo.";
    inviteStatus.style.color = "red";
    return;
  }

  try {
    // Buscar usuario por email
    const usersRef = collection(db, "usuarios");
    const q = query(usersRef, where("email", "==", email));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      inviteStatus.textContent = "No se encontró ningún usuario con ese correo.";
      inviteStatus.style.color = "red";
      return;
    }

    const invitedDoc = querySnap.docs[0];
    const invitedUid = invitedDoc.id;

    // Validar que no sea el usuario logueado
    if (invitedUid === currentUserId) {
      inviteStatus.textContent = "No puedes invitarte a ti mismo.";
      inviteStatus.style.color = "red";
      return;
    }




    const folderRef = doc(db, "carpetas", window.folderId);
    
    // Obtener el documento de la carpeta para revisar invitados actuales
    const folderSnap = await getDocs(collection(db, "carpetas"));
    // Nota: aquí podrías traer sólo la carpeta actual si quieres más eficiencia
    // const folderDoc = await getDoc(folderRef);

    // Agregar al array "invitadosPendientes" sólo si no está ya invitado o aceptado
    await updateDoc(folderRef, {
      invitadosPendientes: arrayUnion(invitedUid)
    });

    inviteStatus.textContent = `✅ Invitación enviada a ${email}`;
    inviteStatus.style.color = "green";

    // Cerrar modal luego de 1.5s
    setTimeout(() => {
      inviteModal.classList.add("hidden");
    }, 1500);

  } catch (error) {
    console.error("Error al invitar usuario:", error);
    inviteStatus.textContent = "Error al enviar invitación.";
    inviteStatus.style.color = "red";
  }
});
