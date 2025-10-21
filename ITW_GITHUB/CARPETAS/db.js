// db.js
import { db } from "../firebase.js"; // ruta según donde esté tu archivo
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

