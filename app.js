// ===============================
// CONFIG
// ===============================
const backendUrl = "https://mayconnect-backend-1.onrender.com";

// ===============================
// PASSWORD TOGGLE
// ===============================
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Show";
  }
}

// ===============================
// SIGN UP
// ===============================
async function signup(event) {
  event.preventDefault();

  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();

  if (!name || !email || !password) {
    alert("All fields are required");
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Signup failed");
      return;
    }

    // Redirect to login (NO SOUND HERE)
    window.location.href = "login.html";

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

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    alert("All fields are required");
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);

    // Redirect to dashboard (NO SOUND)
    window.location.href = "dashboard.html";

  } catch (err) {
    alert("Network error");
    console.error(err);
  }
}

// ===============================
// FETCH DATA PLANS (USED LATER)
// ===============================
async function fetchPlans() {
  const container = document.getElementById("plans-container");
  if (!container) return;

  try {
    const res = await fetch(`${backendUrl}/api/plans`);
    const plans = await res.json();

    container.innerHTML = "";

    plans.forEach(plan => {
      const div = document.createElement("div");
      div.className = "plan-card";
      div.innerHTML = `
        <h3>${plan.name}</h3>
        <p>₦${plan.price}</p>
        <p>${plan.network}</p>
        <button>Buy</button>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    container.innerHTML = "<p>Error loading plans</p>";
  }
}

// Auto load plans if page needs it
document.addEventListener("DOMContentLoaded", fetchPlans);
