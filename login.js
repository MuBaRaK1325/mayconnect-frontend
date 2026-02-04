/* ==============================
   MAY-CONNECT LOGIN SCRIPT
   SAFE • DEFENSIVE • PRODUCTION
================================ */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

// DOM ELEMENTS (MATCH HTML EXACTLY)
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const loader = document.getElementById("splashLoader");
const welcomeSound = document.getElementById("welcomeSound");

/* ==============================
   PAGE LOAD
================================ */
document.addEventListener("DOMContentLoaded", () => {
  if (welcomeSound) {
    welcomeSound.play().catch(() => {});
  }
});

/* ==============================
   SHOW / HIDE PASSWORD
================================ */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "Show" : "Hide";
}

/* ==============================
   LOGIN SUBMIT
================================ */
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // SAFETY CHECKS
    if (!emailInput || !passwordInput) {
      alert("Login form is misconfigured.");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    loader.classList.remove("hidden");

    try {
      const res = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      // ❗ IMPORTANT: Check content-type before JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server did not return JSON");
      }

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Login failed");
        return;
      }

      // SUCCESS
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name || "User");

      location.replace("dashboard.html");

    } catch (err) {
      console.error(err);
      alert("Network error. Please check your connection or backend.");
    } finally {
      loader.classList.add("hidden");
    }
  });
}

/* ==============================
   BIOMETRIC PLACEHOLDER
================================ */
function biometricLogin() {
  alert("Biometric login coming soon");
}
