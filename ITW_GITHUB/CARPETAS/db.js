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
  getDoc,
  onSnapshot // <--- IMPORTANTE: Asegúrate de tener esto importado
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ==========================================================
   CREAR CARPETA (AHORA CON FECHA)
   ========================================================== */
// db.js
export async function createFolder(name, userId, imageUrl) { 
  try {
    // Si no viene imagen, ponemos una por defecto
    const finalImage = imageUrl || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e";

    const docRef = await addDoc(collection(db, "carpetas"), {
      name: name,
      userId: userId,
      createdAt: Date.now(),
      imageUrl: finalImage
    });
    
    console.log("📁 Carpeta creada con ID:", docRef.id);
    
    // 🔥 AQUÍ ESTABA EL ERROR: Agregamos userId al return
    return { 
        id: docRef.id, 
        name, 
        createdAt: Date.now(), 
        imageUrl: finalImage, 
        userId: userId // <--- ¡Esto faltaba!
    };

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

    // 1. Eliminar subcolecciones conocidas
    // (Agrega aquí CUALQUIER subcolección que tu app use)
    await deleteSubcollection(folderRef, "inventario");
    await deleteSubcollection(folderRef, "calendario");
    await deleteSubcollection(folderRef, "itinerario");
    
    // 👇 AGREGA ESTAS LÍNEAS NUEVAS 👇
    await deleteSubcollection(folderRef, "presencia"); 
    await deleteSubcollection(folderRef, "checklist");
    // Si usas 'objetos' o 'presupuestos', agrégalos aquí también:
    // await deleteSubcollection(folderRef, "objetos");
    // await deleteSubcollection(folderRef, "presupuestos");

    // 2. Eliminar documento principal
    await deleteDoc(folderRef);
    console.log("✅ Carpeta y TODAS sus subcolecciones eliminadas:", folderId);

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

/* ==========================================================
   🔔 ESCUCHAR INVITACIONES EN TIEMPO REAL
   ========================================================== */
export function listenToInvitations(userId, onInviteDetected) {
  // Query: Busca carpetas donde mi ID esté en la lista de espera
  const q = query(collection(db, "carpetas"), where("invitadosPendientes", "array-contains", userId));
  
  // Se queda escuchando cambios
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      // 'added' significa que apareció una carpeta nueva en esta query 
      // (o sea, me acaban de invitar o entré a la app y ya estaba invitado)
      if (change.type === "added") {
        const folderData = { id: change.doc.id, ...change.doc.data() };
        // Llamamos al callback que pasaremos desde script.js
        onInviteDetected(folderData);
      }
    });
  });
}