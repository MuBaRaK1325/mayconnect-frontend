// ===============================
// CONFIG
// ===============================
const backendUrl = "https://mayconnect-backend-1.onrender.com";

// ===============================
// SOUNDS
// ===============================
const welcomeSound = new Audio("sounds/welcome.mp3");
const successSound = new Audio("sounds/success.mp3");

// ===============================
// TOGGLE PASSWORD
// ===============================
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
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
// SIGN UP
// ===============================
async function signup(event) {
  event.preventDefault();

  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  try {
    const response = await fetch(`${backendUrl}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (response.ok) {

      alert("Signup successful!");
      window.location.href = "login.html";
    } else {
      alert(data.error || data.message || "Signup failed");
    }
  } catch (err) {
    alert("Network error");
    console.error(err);
  }
}

// ===============================
// LOGIN
// ===============================
async function login(event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const response = await fetch(`${backendUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
if (response.ok) {
  localStorage.setItem("token", data.token);
  window.location.href = "dashboard.html";
}
      alert(data.error || data.message || "Login failed");
    }
  } catch (err) {
    alert("Network error");
    console.error(err);
  }
}
