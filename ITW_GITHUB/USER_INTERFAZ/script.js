// Abrir y cerrar el sidebar derecho
const toggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

toggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});
