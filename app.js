const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* ================= AUTH ================= */

async function signup(event) {
  event.preventDefault();

  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const res = await fetch(`${backendUrl}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (res.ok) {
    window.location.href = "login.html";
  } else {
    alert(data.error || "Signup failed");
  }
}

async function login(event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const res = await fetch(`${backendUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("email", email);
    window.location.href = "dashboard.html";
  } else {
    alert("Invalid login");
  }
}

/* ================= DASHBOARD ================= */

if (window.location.pathname.includes("dashboard.html")) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }

  document.getElementById("userEmail").textContent =
    localStorage.getItem("email") || "";

  // Play welcome sound ONCE, fully
  window.addEventListener("load", () => {
    const sound = document.getElementById("welcomeSound");
    sound.volume = 1;
    sound.play().catch(() => {});
  });
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* ================= PASSWORD TOGGLE ================= */

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
