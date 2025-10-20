// Abrir y cerrar el sidebar derecho
const toggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

toggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// Ir a Carpetas
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("carpetasBtn");

  loginBtn.addEventListener("click", () => {
    window.location.href = "../CARPETAS/carpetas.html";
  });
});

