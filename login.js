/* ==============================
   MAY-CONNECT LOGIN SCRIPT
================================ */
const backendUrl = "https://mayconnect-backend-1.onrender.com";
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const welcomeSound = document.getElementById("welcomeSound");
const splashLoader = document.getElementById("splashLoader");

function getToken() {
  return localStorage.getItem("token");
}

document.addEventListener("DOMContentLoaded", () => {
  if (welcomeSound) welcomeSound.play().catch(() => {});
});

/* ================= SHOW / HIDE PASSWORD ================= */
function togglePassword() {
  const pw = passwordInput;
  if (!pw) return;
  pw.type = pw.type === "password" ? "text" : "password";
}

/* ================= BIOMETRIC PLACEHOLDER ================= */
function biometricLogin() {
  alert("Biometric login coming soon");
}

/* ================= LOGIN SUBMIT ================= */
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!emailInput || !passwordInput) {
      alert("Login form misconfigured");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("All fields are required");
      return;
    }

    // Show loader
    splashLoader.classList.remove("hidden");

    try {
      const res = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Invalid email or password");
        return;
      }

      // Save token & name
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name || "User");

      // ✅ Admin notification
      if (email.toLowerCase() === "abubakarmubarak3456@gmail.com") {
        alert("Welcome Admin!");
      }

      // Redirect to dashboard
      location.href = "dashboard.html";

    } catch (err) {
      console.error(err);
      alert("Network error. Check your connection or backend.");
    } finally {
      splashLoader.classList.add("hidden");
    }
  });
}
