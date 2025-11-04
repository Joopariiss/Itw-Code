// ============================
// GLOBAL - solo UID de usuario
// ============================

let currentUserId = localStorage.getItem("currentUserId") || null;

export function setCurrentUserId(uid) {
  currentUserId = uid;
}

export function getCurrentUserId() {
  return currentUserId;
}
