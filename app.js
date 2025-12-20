const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* ---------- LOGIN ---------- */
async function login(event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const res = await fetch(`${backendUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("email", email);
    window.location.href = "dashboard.html";
  } else {
    alert(data.error || "Login failed");
  }
}

/* ---------- SIGNUP ---------- */
async function signup(event) {
  event.preventDefault();

  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const res = await fetch(`${backendUrl}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (res.ok) {
    window.location.href = "login.html";
  } else {
    alert(data.error || "Signup failed");
  }
}

/* ---------- DASHBOARD LOAD ---------- */
if (window.location.pathname.includes("dashboard.html")) {
  const email = localStorage.getItem("email");
  document.getElementById("user-email").textContent = email || "";

  const welcomeSound = new Audio("sounds/welcome.mp3");
  welcomeSound.play().catch(() => {});
}

/* ---------- LOGOUT ---------- */
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* ---------- SHOW PASSWORD ---------- */
function togglePassword(id, btn) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "Show" : "Hide";
}
