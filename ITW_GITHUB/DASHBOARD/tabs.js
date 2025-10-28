// Control simple de tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

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
