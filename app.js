/* =================================================
   MAY-CONNECT — CLEAN APP.JS (SINGLE SOURCE OF TRUTH)
================================================== */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* =================================================
   GLOBAL HELPERS
================================================== */

function $(id) {
  return document.getElementById(id);
}

function getToken() {
  return localStorage.getItem("token");
}

/* =================================================
   NETWORK STATUS
================================================== */

const net = $("networkStatus");

function showNetwork(type) {
  if (!net) return;

  net.className = `network-status ${type}`;
  net.textContent =
    type === "slow"
      ? "Slow network detected"
      : "You are offline";

  net.classList.remove("hidden");
  setTimeout(() => net.classList.add("hidden"), 3000);
}

window.addEventListener("offline", () => showNetwork("offline"));

/* =================================================
   SPLASH / ACTION LOADER
================================================== */

const loader = $("splashLoader");
const loaderState = $("loaderState");

function showLoader() {
  if (!loader) return;
  loaderState.innerHTML = `
    <div class="splash-ring"></div>
    <img src="images/logo.png">
  `;
  loader.classList.remove("hidden");
}

function showSuccess() {
  if (!loader) return;
  loaderState.innerHTML = `<div class="success-check">✓</div>`;
}

function hideLoader() {
  loader?.classList.add("hidden");
}

/* =================================================
   WELCOME SOUND
================================================== */

function playWelcomeSound() {
  const sound = $("welcomeSound");
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
   BIOMETRIC LOGIN (UI READY)
================================================== */

function biometricLogin() {
  if (!("credentials" in navigator)) {
    alert("Biometric not supported on this device");
    return;
  }

  showLoader();

  setTimeout(() => {
    alert("Biometric authentication coming soon 🔐");
    hideLoader();
  }, 1200);
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
   DASHBOARD
================================================== */

async function updateWalletBalance() {
  if (!getToken()) return;

  const res = await fetch(`${backendUrl}/api/wallet`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });

  const data = await res.json();
  $("walletBalance") && ($("walletBalance").textContent = `₦${data.balance || 0}`);
}

async function loadTransactions() {
  if (!getToken()) return;

  const container = $("transactionsList");
  if (!container) return;

  container.innerHTML = "";

  const res = await fetch(`${backendUrl}/api/wallet/transactions`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });

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

function closePin() {
  $("pinModal")?.classList.add("hidden");
}

async function verifyPin() {
  let pin = "";
  document.querySelectorAll(".pin-inputs input").forEach(i => pin += i.value);
  if (pin.length !== 4) return alert("Enter 4-digit PIN");

  const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
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
   DATA PURCHASE
================================================== */

let selectedNetwork = null;
let selectedPlan = null;

function selectNetwork(el) {
  selectedNetwork = el.dataset.network;
  selectedPlan = null;

  document.querySelectorAll(".network")
    .forEach(n => n.classList.remove("selected"));
  el.classList.add("selected");

  $("plansContainer").innerHTML = "";
  $("loadingPlans").classList.remove("hidden");

  setTimeout(() => {
    $("loadingPlans").classList.add("hidden");

    const plansList = plans[selectedNetwork] || [];
    plansList.forEach(plan => {
      const div = document.createElement("div");
      div.className = "plan-card";
      div.innerHTML = `<strong>${plan.name}</strong><span>₦${plan.price}</span>`;
      div.onclick = () => selectPlan(div, plan);
      $("plansContainer").appendChild(div);
    });
  }, 600);
}

function selectPlan(el, plan) {
  selectedPlan = plan;
  document.querySelectorAll(".plan-card").forEach(p => p.classList.remove("selected"));
  el.classList.add("selected");
  $("confirmBtn").disabled = false;
}

async function confirmOrder() {
  const phone = $("phone").value.trim();
  if (!selectedNetwork || !selectedPlan || !phone) return alert("Enter phone and select plan");

  openPin(async (pin) => {
    showLoader();
    try {
      const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          type: "data",
          amount: selectedPlan.price,
          pin,
          details: {
            mobile_number: phone,
            plan: selectedPlan.name,
            network: selectedNetwork
          }
        })
      });

      const data = await res.json();
      hideLoader();

      if (res.ok) {
        $("successSound")?.play();
        showReceipt({ reference: data.receipt.reference, amount: data.receipt.amount, type: "data" });
        updateWalletBalance();
        loadTransactions();
      } else {
        alert(data.error || "Purchase failed");
      }
    } catch {
      hideLoader();
      showNetwork("offline");
    }
  });
}

/* =================================================
   DATA PLANS (MAITAMA — FINAL)
================================================== */

const plans = {
  MTN: [
    {
      id: 165, // Maitama plan ID
      name: "5GB Monthly",
      price: 1600,       // what user pays
      cost: 1400,        // what Maitama charges you
      profit: 200,
      type: "SME",
      validity: "30 Days"
    }
  ],

  AIRTEL: [],
  GLO: []
};

/* =================================================
   RECEIPT
================================================== */

function showReceipt(receipt) {
  $("receiptBody").innerHTML = `
    <div class="receipt-row"><span>Reference</span><strong>${receipt.reference}</strong></div>
    <div class="receipt-row"><span>Amount</span><strong>₦${receipt.amount}</strong></div>
    <div class="receipt-row"><span>Status</span><strong style="color:#22c55e">SUCCESS</strong></div>
  `;
  $("receiptModal").classList.remove("hidden");
}

function closeReceipt() {
  $("receiptModal")?.classList.add("hidden");
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
