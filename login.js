/* ==============================
   MAY-CONNECT LOGIN SCRIPT
   CLEAN • SINGLE FLOW • STABLE
================================ */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const loader = document.getElementById("splashLoader");
const welcomeSound = document.getElementById("welcomeSound");

/* PLAY SOUND */
document.addEventListener("DOMContentLoaded", () => {
  welcomeSound?.play().catch(()=>{});
});

/* SHOW / HIDE PASSWORD */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "Show" : "Hide";
}

/* LOGIN */
loginForm?.addEventListener("submit", async e => {
  e.preventDefault();

  if (!emailInput || !passwordInput) {
    alert("Login form misconfigured");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

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

    if (!res.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem("token", data.token);
    localStorage.setItem("name", data.name || "User");

    location.replace("dashboard.html");

  } catch (err) {
    alert(err.message || "Network error");
  } finally {
    loader?.classList.add("hidden");
  }
});

/* BIOMETRIC PLACEHOLDER */
function biometricLogin(){
  alert("Biometric coming soon");
}
