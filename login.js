/* ================= CONFIG ================= */
const backendUrl = "https://mayconnect-backend-1.onrender.com";
const $ = id => document.getElementById(id);
const getToken = () => localStorage.getItem("token");

/* DOM ELEMENTS */
const loginForm = $("loginForm");
const emailInput = $("login-email");
const passwordInput = $("login-password");
const loader = $("splashLoader");
const welcomeSound = $("welcomeSound");

/* ================= PAGE LOAD ================= */
document.addEventListener("DOMContentLoaded", () => {
  if (welcomeSound) welcomeSound.play().catch(() => {});
  if (getToken()) location.href = "dashboard.html"; // auto-redirect if logged in
});

/* ================= SHOW/HIDE PASSWORD ================= */
function togglePassword(inputId, btn) {
  const input = $(inputId);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "Show" : "Hide";
}

/* ================= LOGIN SUBMIT ================= */
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!emailInput || !passwordInput) {
      alert("Login form misconfigured. Refresh page.");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    loader?.classList.remove("hidden");

    try {
      const res = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server did not return JSON.");
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed. Check credentials.");
      }

      // Success: save token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name || "User");
      localStorage.setItem("email", email);

      location.href = "dashboard.html";

    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      loader?.classList.add("hidden");
    }
  });
}

/* ================= BIOMETRIC PLACEHOLDER ================= */
function biometricLogin() {
  alert("Biometric login coming soon");
}
