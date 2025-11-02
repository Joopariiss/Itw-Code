document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const contactForm = document.getElementById("contactForm");

  // Botones de navegación
  loginBtn.addEventListener("click", () => {
    window.location.href = "../LOGIN/login.html";
  });

  registerBtn.addEventListener("click", () => {
    window.location.href = "../REGISTRO/registro.html";
  });

  // Pop-up elementos
  const popupOverlay = document.getElementById("popup-overlay");
  const popupMessage = document.getElementById("popup-message");
  const popupClose = document.getElementById("popup-close");

  // Función para mostrar el pop-up
  function showPopup() {
    popupOverlay.style.display = "block";
    popupMessage.style.display = "block";
  }

  // Función para cerrar el pop-up
  function closePopup() {
    popupOverlay.style.display = "none";
    popupMessage.style.display = "none";
  }

  popupClose.addEventListener("click", closePopup);
  popupOverlay.addEventListener("click", closePopup);

  // Envío del formulario
  contactForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = new FormData(contactForm);

    fetch(contactForm.action, {
      method: contactForm.method,
      body: data,
      headers: { "Accept": "application/json" },
    })
      .then((response) => {
        if (response.ok) {
          showPopup(); // Muestra el pop-up centrado
          contactForm.reset();
        } else {
          alert("❌ Ups! Algo salió mal. Intenta nuevamente.");
        }
      })
      .catch(() => {
        alert("❌ Error de conexión. Intenta nuevamente.");
      });
  });
});
