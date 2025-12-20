const backendUrl = "https://mayconnect-backend-2.onrender.com"; // change to your backend

// ===== Password Toggle =====
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

// ===== Signup =====
async function signup(event) {
  event.preventDefault();
  const fullName = document.getElementById("signup-fullName").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const res = await fetch(`${backendUrl}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName, email, password })
  });
  const data = await res.json();
  if (res.ok) {
    alert(data.message);
    window.location.href = "login.html";
  } else alert(data.error);
}

// ===== Login =====
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
    localStorage.setItem("fullName", data.fullName);
    window.location.href = "dashboard.html";
  } else alert(data.error);
}

// ===== Dashboard =====
document.addEventListener("DOMContentLoaded", async () => {
  if (window.location.pathname.includes("dashboard.html")) {
    const fullName = localStorage.getItem("fullName");
    document.getElementById("user-name").textContent = fullName;

    // Play welcome sound
    const audio = new Audio("sounds/welcome.mp3");
    audio.play();

    // Fetch wallet
    const email = localStorage.getItem("email");
    const walletRes = await fetch(`${backendUrl}/api/wallet/${email}`);
    const walletData = await walletRes.json();
    document.getElementById("wallet-balance").textContent = walletData.wallet;

    // Fetch plans
    const plansRes = await fetch(`${backendUrl}/api/plans`);
    const plans = await plansRes.json();

    displayPlans(plans, "data");
    displayPlans(plans, "airtime");
    displayTransactions(email);
  }
});

// ===== Display Plans =====
function displayPlans(plans, type) {
  const container = document.getElementById(type);
  container.innerHTML = "";
  plans.filter(p => p.type.toLowerCase() === type.toLowerCase()).forEach(plan => {
    const div = document.createElement("div");
    div.classList.add("plan-card");
    div.innerHTML = `
      <h4>${plan.name}</h4>
      <p>₦${plan.price}</p>
      <button onclick="purchasePlan(${plan.id})">Buy</button>
    `;
    container.appendChild(div);
  });
}

// ===== Purchase Plan =====
async function purchasePlan(planId) {
  const email = localStorage.getItem("email");
  const res = await fetch(`${backendUrl}/api/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, planId })
  });
  const data = await res.json();
  if (res.ok) {
    alert(data.message);
    document.getElementById("wallet-balance").textContent = data.wallet;

    // Play success sound
    const audio = new Audio("sounds/success.mp3");
    audio.play();

    displayTransactions(email);
  } else alert(data.error);
}

// ===== Transactions =====
async function displayTransactions(email) {
  const res = await fetch(`${backendUrl}/api/transactions/${email}`);
  const transactions = await res.json();
  const container = document.getElementById("transactions");
  container.innerHTML = "";
  transactions.forEach(tx => {
    const div = document.createElement("div");
    div.classList.add("transaction-card");
    div.innerHTML = `
      <p><strong>${tx.type}:</strong> ${tx.planName} - ₦${tx.price}</p>
      <p>${new Date(tx.date).toLocaleString()}</p>
    `;
    container.appendChild(div);
  });
}

// ===== Tabs =====
function showTab(tab) {
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(tab).classList.add("active");
  document.querySelector(`button[onclick="showTab('${tab}')"]`).classList.add("active");
}
