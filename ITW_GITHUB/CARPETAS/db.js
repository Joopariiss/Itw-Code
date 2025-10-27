// db.js
import { db } from "../firebase.js"; // ruta según donde esté tu archivo
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc  } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function createFolder(name, userId) {
  try {
    const docRef = await addDoc(collection(db, "carpetas"), {
      name: name,
      userId: userId
    });
    console.log("Carpeta creada con ID:", docRef.id); // debug
    return { id: docRef.id, name };
  } catch (error) {
    console.error("Error creando carpeta:", error);
  }
}

export async function getUserFolders(userId) {
  const q = query(collection(db, "carpetas"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ✅ Eliminar carpeta
export async function deleteFolder(folderId) {
  try {
    await deleteDoc(doc(db, "carpetas", folderId));
    console.log("Carpeta eliminada:", folderId);
  } catch (error) {
    console.error("Error eliminando carpeta:", error);
  }
}

// ✅ Modificar carpeta
export async function updateFolder(folderId, newName) {
  try {
    const ref = doc(db, "carpetas", folderId);
    await updateDoc(ref, { name: newName });
    console.log("Carpeta actualizada:", folderId);
  } catch (error) {
    console.error("Error actualizando carpeta:", error);
  }
}
