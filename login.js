const backendUrl = "https://mayconnect-backend-1.onrender.com";
const loader = document.getElementById("splashLoader");
const welcomeSound = document.getElementById("welcomeSound");

document.addEventListener("DOMContentLoaded", () => {
  welcomeSound.play().catch(() => {}); // play once loaded

  // show/hide password
  document.querySelectorAll(".show-password-btn").forEach(btn => {
    btn.onclick = () => {
      const input = btn.previousElementSibling;
      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "Show" : "Hide";
    };
  });

  // login submit
  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    loader.classList.remove("hidden");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const res = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("name", data.name || email);
        location.replace("dashboard.html");
      } else {
        alert(data.error || "Login failed");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      loader.classList.add("hidden");
    }
  });
});
