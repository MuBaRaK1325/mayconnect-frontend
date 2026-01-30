/* =================================================
   MAY-CONNECT — CLEAN APP.JS (FULL FEATURED)
================================================== */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* =================================================
   GLOBAL HELPERS
================================================== */

function $(id) { return document.getElementById(id); }
function getToken() { return localStorage.getItem("token"); }

/* =================================================
   NETWORK STATUS
================================================== */

const net = $("networkStatus");
function showNetwork(type) {
  if (!net) return;
  net.className = `network-status ${type}`;
  net.textContent = type === "slow" ? "Slow network detected" : "You are offline";
  net.classList.remove("hidden");
  setTimeout(() => net.classList.add("hidden"), 3000);
}
window.addEventListener("offline", () => showNetwork("offline"));

/* =================================================
   SPLASH / LOADER
================================================== */

const loader = $("splashLoader");
const loaderState = $("loaderState");

function showLoader() {
  if (!loader) return;
  loaderState.innerHTML = `<div class="splash-ring"></div><img src="images/logo.png">`;
  loader.classList.remove("hidden");
}
function showSuccess() {
  if (!loader) return;
  loaderState.innerHTML = `<div class="success-check">✓</div>`;
}
function hideLoader() { loader?.classList.add("hidden"); }

/* =================================================
   SOUNDS
================================================== */

function playWelcomeSound() {
  const sound = $("welcomeSound");
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}
function playSuccessSound() {
  const sound = $("successSound");
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

/* =================================================
   PASSWORD TOGGLE
================================================== */

function togglePassword(inputId, btn) {
  const input = $(inputId);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "Show" : "Hide";
}

/* =================================================
   LOGIN
================================================== */

const loginForm = $("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    showLoader();
    const start = performance.now();
    try {
      const res = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: $("login-email").value,
          password: $("login-password").value
        })
      });

      const elapsed = performance.now() - start;
      if (elapsed > 2500) showNetwork("slow");

      const data = await res.json();
      if (res.ok && data.token) {
        showSuccess();
        setTimeout(() => {
          localStorage.setItem("token", data.token);
          location.replace("dashboard.html");
        }, 700);
      } else {
        alert(data.error || "Login failed");
        hideLoader();
      }
    } catch {
      showNetwork("offline");
      hideLoader();
    }
  });
}

/* =================================================
   SIGNUP
================================================== */

const signupForm = $("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async e => {
    e.preventDefault();
    showLoader();
    try {
      const res = await fetch(`${backendUrl}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: $("signup-name").value,
          email: $("signup-email").value,
          password: $("signup-password").value
        })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        showSuccess();
        setTimeout(() => {
          localStorage.setItem("token", data.token);
          location.replace("dashboard.html");
        }, 700);
      } else {
        alert(data.error || "Signup failed");
        hideLoader();
      }
    } catch {
      showNetwork("offline");
      hideLoader();
    }
  });
}

/* =================================================
   DASHBOARD WALLET & TRANSACTIONS
================================================== */

async function updateWalletBalance() {
  if (!getToken()) return;
  const res = await fetch(`${backendUrl}/api/wallet`, { headers: { Authorization: `Bearer ${getToken()}` } });
  const data = await res.json();
  $("walletBalance") && ($("walletBalance").textContent = `₦${data.balance || 0}`);
}

async function loadTransactions() {
  if (!getToken()) return;
  const container = $("transactionsList");
  if (!container) return;
  container.innerHTML = "";

  const res = await fetch(`${backendUrl}/api/wallet/transactions`, { headers: { Authorization: `Bearer ${getToken()}` } });
  const data = await res.json();
  (data.transactions || []).forEach(txn => {
    const div = document.createElement("div");
    div.className = "txn-card";
    div.innerHTML = `
      <p><strong>${txn.type.toUpperCase()}</strong> - ₦${txn.amount}</p>
      <p>${txn.description || ""}</p>
      <button onclick='showReceipt(${JSON.stringify(txn)})'>View Receipt</button>
    `;
    container.appendChild(div);
  });
}

/* =================================================
   PIN HANDLING
================================================== */

let pendingAction = null;

function openPin(cb) {
  pendingAction = cb;
  $("pinModal")?.classList.remove("hidden");
}

function closePin() { $("pinModal")?.classList.add("hidden"); }

async function verifyPin() {
  let pin = "";
  document.querySelectorAll(".pin-inputs input").forEach(i => pin += i.value);
  if (pin.length !== 4) return alert("Enter 4-digit PIN");

  const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ pin })
  });

  const data = await res.json();
  if (res.ok) {
    closePin();
    pendingAction?.(pin);
  } else {
    alert(data.error || "Incorrect PIN");
  }
}

/* =================================================
   DATA PLANS (MTN 5GB SME)
================================================== */

const plans = {
  MTN: [
    {
      plan_id: 158,          // Maitama plan ID
      name: "5GB Monthly",
      price: 1500,           // what user pays
      cost: 1400,            // Maitama charges
      profit: 100,
      type: "SME",
      validity: "30 Days",
      maitama_network: 1
    }
  ],
  AIRTEL: [],
  GLO: []
};

let selectedNetwork = null;
let selectedPlan = null;

/* =================================================
   SELECT NETWORK & PLAN
================================================== */

function selectNetwork(el) {
  selectedNetwork = el.dataset.network;
  selectedPlan = null;

  document.querySelectorAll(".network").forEach(n => n.classList.remove("selected"));
  el.classList.add("selected");

  $("plansContainer").innerHTML = "";
  $("loadingPlans")?.classList.remove("hidden");

  setTimeout(() => {
    $("loadingPlans")?.classList.add("hidden");

/* =================================================
   DATA PURCHASE / PLAN RENDERING
================================================== */

const plansContainer = document.getElementById("plansContainer");
const loadingPlans = document.getElementById("loadingPlans");

let selectedNetwork = null;
let selectedPlan = null;

// Mapping network names to logos
const networkLogos = {
  MTN: "images/Mtn.png",
  AIRTEL: "images/Airtel.png",
  GLO: "images/Glo.png"
};

function selectNetwork(el) {
  selectedNetwork = el.dataset.network;
  selectedPlan = null;

  // Highlight selected network
  document.querySelectorAll(".network").forEach(n => n.classList.remove("selected"));
  el.classList.add("selected");

  // Show loader
  plansContainer.innerHTML = "";
  loadingPlans.classList.remove("hidden");

  setTimeout(() => {
    loadingPlans.classList.add("hidden");

    const plansList = plans[selectedNetwork] || [];

    if (plansList.length === 0) {
      plansContainer.innerHTML = "<p>No plans available for this network</p>";
      return;
    }

    plansList.forEach(plan => {
      const div = document.createElement("div");
      div.className = "plan-card";
      
      // Inject network logo dynamically
      div.innerHTML = `
        <div class="plan-logo">
          <img src="${networkLogos[selectedNetwork]}" alt="${selectedNetwork} Logo">
        </div>
        <div class="plan-info">
          <span class="plan-name">${plan.name}</span>
          <span class="plan-validity">${plan.validity}</span>
        </div>
        <div class="plan-price">₦${plan.price}</div>
      `;

      div.onclick = () => {
        selectPlan(div, plan);
      };

      plansContainer.appendChild(div);
    });
  }, 600);
}

function selectPlan(card, plan) {
  selectedPlan = plan;
  document.querySelectorAll(".plan-card").forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");
  $("confirmBtn").disabled = false;
  $("confirmBtn").classList.remove("disabled");
}
}

function selectPlan(card, plan) {
  document.querySelectorAll(".plan-card").forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");
  selectedPlan = plan;
  $("confirmBtn").disabled = false;
  $("confirmBtn").classList.remove("disabled");
}

/* =================================================
   CONFIRM PURCHASE
================================================== */

async function confirmOrder() {
  if (!selectedPlan) return;
  const phone = $("phone").value;
  if (!phone) return alert("Enter phone number");

  const userPin = prompt("Enter your 4-digit PIN"); // can be replaced with your PIN modal
  if (!userPin) return;

  const payload = {
    type: "data",
    pin: userPin,
    details: {
      mobile_number: phone,
      plan: selectedPlan.plan_id,
      network: selectedPlan.maitama_network
    }
  };

  try {
    const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      playSuccessSound(); // ✅ only success sound
      showReceipt(data.receipt);
      updateWalletBalance();
      loadTransactions();
    } else {
      alert(data.error || "Purchase failed");
    }
  } catch {
    showNetwork("offline");
  }
}

/* =================================================
   RECEIPT
================================================== */

function showReceipt(receipt) {
  $("receiptBody").innerHTML = `
    <div class="receipt-row"><span>Reference</span><strong>${receipt.reference}</strong></div>
    <div class="receipt-row"><span>Amount</span><strong>₦${receipt.amount}</strong></div>
    <div class="receipt-row"><span>Status</span><strong style="color:#22c55e">SUCCESS</strong></div>
  `;
  $("receiptModal")?.classList.remove("hidden");
}
function closeReceipt() { $("receiptModal")?.classList.add("hidden"); }

/* =================================================
   BIOMETRICS PLACEHOLDER
================================================== */

function biometricLogin() {
  if (!("credentials" in navigator)) return alert("Biometric not supported");
  showLoader();
  setTimeout(() => { alert("Biometric auth coming soon 🔐"); hideLoader(); }, 1200);
}

/* =================================================
   INIT
================================================== */

document.addEventListener("DOMContentLoaded", () => {
  playWelcomeSound();
  if (getToken()) {
    updateWalletBalance();
    loadTransactions();
  }
});
