// db.js
import { db } from "../firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,  
  arrayUnion,
  arrayRemove,
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ==========================================================
   CREAR CARPETA
   ========================================================== */
export async function createFolder(name, userId) {
  try {
    const docRef = await addDoc(collection(db, "carpetas"), {
      name: name,
      userId: userId,
    });
    console.log("📁 Carpeta creada con ID:", docRef.id);
    return { id: docRef.id, name };
  } catch (error) {
    console.error("❌ Error creando carpeta:", error);
  }
}


/* ==========================================================
   OBTENER CARPETAS DEL USUARIO
   ========================================================== */
export async function getUserFolders(userId) {
  const q = query(collection(db, "carpetas"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/* ==========================================================
   🔥 ELIMINAR TODAS LAS SUBCOLECCIONES DE UNA CARPETA
   ========================================================== */
async function deleteSubcollection(folderRef, subName) {
  try {
    const subRef = collection(folderRef, subName);
    const snapshot = await getDocs(subRef);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
    console.log(`🗑️ Subcolección "${subName}" eliminada`);
  } catch (err) {
    console.warn(`⚠️ No se pudo eliminar subcolección "${subName}":`, err.message);
  }
}

/* ==========================================================
   ✅ ELIMINAR CARPETA COMPLETA CON SUS SUBCOLECCIONES
   ========================================================== */
export async function deleteFolder(folderId) {
  try {
    const folderRef = doc(db, "carpetas", folderId);

    // Eliminar subcolecciones conocidas (si existen)
    await deleteSubcollection(folderRef, "inventario");
    await deleteSubcollection(folderRef, "calendario");
    await deleteSubcollection(folderRef, "itinerario");

    // Eliminar documento principal
    await deleteDoc(folderRef);
    console.log("✅ Carpeta y subcolecciones eliminadas:", folderId);
  } catch (error) {
    console.error("❌ Error eliminando carpeta:", error);
  }
}

/* ==========================================================
   MODIFICAR CARPETA
   ========================================================== */
export async function updateFolder(folderId, newName) {
  try {
    const ref = doc(db, "carpetas", folderId);
    await updateDoc(ref, { name: newName });
    console.log("✏️ Carpeta actualizada:", folderId);
  } catch (error) {
    console.error("❌ Error actualizando carpeta:", error);
  }
}

/* ==========================================================
   OBTENER CARPETAS DONDE EL USUARIO ESTÁ INVITADO
   ========================================================== */
export async function getInvitedFolders(userId) {
  const invited = query(collection(db, "carpetas"), where("invitadosPendientes", "array-contains", userId));
  const accepted = query(collection(db, "carpetas"), where("invitadosAceptados", "array-contains", userId));

  const [snapInvited, snapAccepted] = await Promise.all([getDocs(invited), getDocs(accepted)]);
  const folders = [
    ...snapInvited.docs.map((d) => ({ id: d.id, status: "pendiente", ...d.data() })),
    ...snapAccepted.docs.map((d) => ({ id: d.id, status: "aceptado", ...d.data() }))
  ];

  return folders;
}

export async function acceptInvitation(folderId, userId) {
  const ref = doc(db, "carpetas", folderId);
  await updateDoc(ref, {
    invitadosPendientes: arrayRemove(userId),
    invitadosAceptados: arrayUnion(userId)
  });
}

export async function rejectInvitation(folderId, userId) {
  const ref = doc(db, "carpetas", folderId);
  await updateDoc(ref, {
    invitadosPendientes: arrayRemove(userId)
  });
}

// ==========================================================
// OBTENER FECHAS DE LA SUBCOLECCIÓN CALENDARIO
// ==========================================================
export async function getFolderDates(folderId) {
  try {
    const infoRef = doc(db, "carpetas", folderId, "calendario", "info");
    const snap = await getDoc(infoRef);

    if (!snap.exists()) {
      return { fechaInicio: null, fechaFin: null };
    }

    return snap.data();
  } catch (error) {
    console.error("❌ Error obteniendo fechas:", error);
    return { fechaInicio: null, fechaFin: null };
  }
}

/* ==========================================================
   OBTENER NOMBRE DEL DUEÑO DE LA CARPETA
   ========================================================== */
export async function getOwnerName(userId) {
  try {
    if (!userId) return "Desconocido";
    const userRef = doc(db, "usuarios", userId);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
      const data = snap.data();
      return `${data.nombre} ${data.apellido}`;
    } else {
      return "Usuario Desconocido";
    }
  } catch (error) {
    console.error("Error obteniendo nombre del dueño:", error);
    return "Desconocido";
  }
}