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
    e.preventDefault();
    alert("✅ ¡Gracias por tu mensaje! Nos pondremos en contacto pronto.");
    contactForm.reset();
  });
});