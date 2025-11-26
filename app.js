const backendUrl = "https://mayconnect-backend-1.onrender.com";

// ===============================
// SIGNUP
// ===============================
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
    alert("Signup successful!");
    window.location.href = "login.html";
  } else {
    alert(data.message);
  }
}

// ===============================
// LOGIN
// ===============================
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
    alert("Login successful!");
    window.location.href = "plans.html";
  } else {
    alert(data.message);
  }
}

// ===============================
// FETCH PLANS
// ===============================
async function fetchPlans() {
  const container = document.getElementById("plans-container");

  const res = await fetch(`${backendUrl}/api/plans`);
  const plans = await res.json();

  container.innerHTML = "";

  plans.forEach(p => {
    container.innerHTML += `
      <div class="plan-card">
        <h3>${p.name}</h3>
        <p>₦${p.price}</p>
        <p>${p.network} — ${p.type}</p>
      </div>
    `;
  });
}

if (document.getElementById("plans-container")) {
  fetchPlans();
}
