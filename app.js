// ===============================
// CONFIG
// ===============================
const backendUrl = "https://mayconnect-backend-1.onrender.com";

// ===============================
// AUTH HELPERS
// ===============================
function saveSession(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("email", data.email || "");
}

function isLoggedIn() {
  return !!localStorage.getItem("token");
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

// ===============================
// SIGN UP
// ===============================
async function signup(event) {
  event.preventDefault();

  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const response = await fetch(`${backendUrl}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  const data = await response.json();

  if (response.ok) {
    saveSession(data);
    window.location.href = "dashboard.html";
  } else {
    alert(data.error || "Signup failed");
  }
}

// ===============================
// LOGIN
// ===============================
async function login(event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const response = await fetch(`${backendUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (response.ok) {
    saveSession(data);
    window.location.href = "dashboard.html";
  } else {
    alert(data.error || "Invalid login");
  }
}

// ===============================
// DASHBOARD INIT
// ===============================
function initDashboard() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const email = localStorage.getItem("email");
  const emailEl = document.getElementById("user-email");
  if (emailEl) emailEl.textContent = email;

  // 🔊 PLAY WELCOME SOUND ONCE (FULL)
  const audio = new Audio("sounds/welcome.mp3");
  audio.play().catch(() => {});
}

// ===============================
// PASSWORD TOGGLE
// ===============================
function togglePassword(id, btn) {
  const input = document.getElementById(id);
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Show";
  }
}
