document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");

  loginBtn.addEventListener("click", () => {
    window.location.href = "../LOGIN/login.html";
  });

  registerBtn.addEventListener("click", () => {
    window.location.href = "../REGISTRO/registro.html";
  });

  const contactForm = document.getElementById("contactForm");
  contactForm.addEventListener("submit", (e) => {
    alert("✅ ¡Gracias! Tu mensaje fue enviado.");
  });

});

const form = document.getElementById("contactForm");

form.addEventListener("submit", function(event) {
  event.preventDefault();
  const data = new FormData(form);
  fetch(form.action, {
    method: form.method,
    body: data,
    headers: {
      'Accept': 'application/json'
    }
  }).then(response => {
    alert("Mensaje enviado. Pronto nos pondremos en contacto contigo!");
    form.reset();
  }).catch(error => {
    alert("Ups! Algo salió mal. Intenta nuevamente.");
  });
});