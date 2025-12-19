// ===============================
// CONFIG
const backendUrl = "https://mayconnect-backend-1.onrender.com";
// ===============================

// ===============================
// PASSWORD TOGGLE
function togglePassword(id, btn) {
  const input = document.getElementById(id);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    btn.innerText = "Hide";
  } else {
    input.type = "password";
    btn.innerText = "Show";
  }
}
// ===============================

// ===============================
// SIGN UP
async function signup(e) {
  e.preventDefault();

  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  try {
    const res = await fetch(`${backendUrl}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) return alert(data.error || "Signup failed");

    window.location.href = "login.html";
  } catch {
    alert("Network error");
  }
}
// ===============================

// ===============================
// LOGIN
async function login(e) {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${backendUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) return alert(data.error || "Login failed");

    localStorage.setItem("token", data.token);
    localStorage.setItem("userEmail", email);

    window.location.href = "dashboard.html";
  } catch {
    alert("Network error");
  }
}
// ===============================

// ===============================
// DASHBOARD LOAD
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("dashboard-page")) {
    const audio = new Audio("sounds/welcome.mp3");
    audio.play().catch(() => {});
  }
});
// ===============================
