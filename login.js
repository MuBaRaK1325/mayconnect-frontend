/* =================================================
   MAY-CONNECT — LOGIN.JS
   ✔ Clean
   ✔ Render-safe
   ✔ Matches latest server.js
================================================== */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

const loginForm = document.getElementById("loginForm");
const loader = document.getElementById("splashLoader");
const welcomeSound = document.getElementById("welcomeSound");

/* ================= PAGE INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  // Play welcome sound safely
  welcomeSound?.play().catch(() => {});

  // Password toggle buttons
  document.querySelectorAll(".show-password-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "Show" : "Hide";
    });
  });
});

/* ================= LOGIN ================= */
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  loader?.classList.remove("hidden");

  try {
    const res = await fetch(`${backendUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    if (!data.token) {
      throw new Error("No token received");
    }

    // Save auth
    localStorage.setItem("token", data.token);
    if (data.user?.name) {
      localStorage.setItem("name", data.user.name);
    }

    // Redirect
    location.replace("dashboard.html");

  } catch (err) {
    alert(err.message);
  } finally {
    loader?.classList.add("hidden");
  }
});

/* ================= BIOMETRIC (SAFE PLACEHOLDER) ================= */
function biometricLogin() {
  alert("Biometric login will be available soon.");
}
