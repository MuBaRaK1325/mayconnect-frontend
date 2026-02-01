/* =================================================
   MAY-CONNECT — FINAL CORRECT APP.JS
   ✔ Auth guard
   ✔ Wallet & purchase
   ✔ Proper PIN modes (SET vs PAY)
   ✔ Matches latest server.js
================================================== */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* ================= HELPERS ================= */
const $ = id => document.getElementById(id);
const getToken = () => localStorage.getItem("token");

/* ================= AUTH GUARD ================= */
(function authGuard() {
  const path = location.pathname.toLowerCase();
  const publicPages = ["login.html", "signup.html", "forgot-password.html"];
  if (!getToken() && !publicPages.some(p => path.includes(p))) {
    location.href = "login.html";
  }
})();

/* ================= GLOBAL STATE ================= */
let selectedPlan = null;
let hasPin = false;
let pinMode = "purchase"; // "purchase" | "set"

/* ================= NETWORK ================= */
const net = $("networkStatus");
function showNetwork(type) {
  if (!net) return;
  net.className = `network-status ${type}`;
  net.textContent =
    type === "slow" ? "Slow network detected" : "You are offline";
  net.classList.remove("hidden");
  setTimeout(() => net.classList.add("hidden"), 3000);
}
window.addEventListener("offline", () => showNetwork("offline"));

/* ================= LOADER ================= */
const loader = $("splashLoader");
const loaderState = $("loaderState");

function showLoader() {
  loader?.classList.remove("hidden");
  loaderState.innerHTML = `<div class="splash-ring"></div>`;
}
function showSuccess() {
  loaderState.innerHTML = `<div class="success-check">✓</div>`;
}
function hideLoader() {
  loader?.classList.add("hidden");
}

/* ================= SOUND ================= */
function playSuccessSound() {
  $("successSound")?.play().catch(() => {});
}

/* ================= WALLET ================= */
async function updateWalletBalance() {
  if (!getToken()) return;
  try {
    const res = await fetch(`${backendUrl}/api/wallet`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if ($("walletBalance")) {
      $("walletBalance").textContent = `₦${data.balance || 0}`;
    }
  } catch {}
}

/* ================= DATA PLANS ================= */
const DATA_PLANS = [
  { plan_id: 153, provider: "maitama", network: "MTN", name: "MTN 5GB SME", price: 1500 },
  { plan_id: 414, provider: "subpadi", network: "MTN", name: "2.5GB GIFTING", price: 600 },
  { plan_id: 413, provider: "subpadi", network: "MTN", name: "1GB GIFTING", price: 300 },
  { plan_id: 359, provider: "subpadi", network: "MTN", name: "2GB GIFTING", price: 500 },
  { plan_id: 415, provider: "subpadi", network: "AIRTEL", name: "3.2GB GIFTING", price: 1050 },
  { plan_id: 394, provider: "subpadi", network: "AIRTEL", name: "2GB GIFTING", price: 700 },
  { plan_id: 329, provider: "subpadi", network: "AIRTEL", name: "6.5GB SME", price: 1500 },
  { plan_id: 327, provider: "subpadi", network: "AIRTEL", name: "3.2GB SME", price: 700 },
  { plan_id: 37, provider: "maitama", network: "AIRTEL", name: "1GB", price: 300 },
  { plan_id: 38, provider: "maitama", network: "AIRTEL", name: "2GB", price: 600 },
  { plan_id: 39, provider: "maitama", network: "AIRTEL", name: "3GB", price: 600 },
  { plan_id: 335, provider: "subpadi", network: "GLO", name: "9.8GB SME", price: 2450 },
  { plan_id: 334, provider: "subpadi", network: "GLO", name: "2.5GB SME", price: 700 },
  { plan_id: 261, provider: "subpadi", network: "GLO", name: "1.024GB CORPORATE", price: 500 },
  { plan_id: 195, provider: "subpadi", network: "GLO", name: "3.9GB GIFTING", price: 1050 },
  { plan_id: 194, provider: "subpadi", network: "GLO", name: "1.05GB GIFTING", price: 500 },
  { plan_id: 52, provider: "cheapdatahub", network: "AIRTEL", name: "5GB", price: 1650 }
];

/* ================= RENDER PLANS ================= */
function renderPlans() {
  const container = $("plansGrid");
  if (!container) return;
  container.innerHTML = "";

  DATA_PLANS.forEach(plan => {
    const div = document.createElement("div");
    div.className = "plan-card";
    div.innerHTML = `
      <small>${plan.network}</small>
      <h4>${plan.name}</h4>
      <small>Monthly</small>
      <div class="price">₦${plan.price}</div>
    `;
    div.onclick = () => selectPlan(div, plan);
    container.appendChild(div);
  });
}

function selectPlan(card, plan) {
  document.querySelectorAll(".plan-card").forEach(p => {
    p.classList.remove("selected");
    p.style.borderColor = "";
  });

  card.classList.add("selected");

  const colors = {
    maitama: "#4A90E2",
    subpadi: "#7ED321",
    cheapdatahub: "#F5A623"
  };
  card.style.borderColor = colors[plan.provider] || "#888";

  selectedPlan = plan;
  $("confirmOrderBtn")?.classList.remove("hidden");
}

/* ================= PIN STATUS ================= */
async function checkPinStatus() {
  if (!getToken()) return;
  try {
    const res = await fetch(`${backendUrl}/api/wallet`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (res.ok) {
      hasPin = true;
      if ($("setPinBtn")) $("setPinBtn").textContent = "Change PIN";
    }
  } catch {}
}

/* ================= PIN MODALS ================= */
function openPinModal(mode) {
  pinMode = mode;
  $("pinActionBtn").textContent =
    mode === "set" ? "Verify PIN" : "Pay";
  $("pinModal")?.classList.remove("hidden");
}

function closePinModal() {
  $("pinModal")?.classList.add("hidden");
}

/* ================= CONFIRM ORDER ================= */
function confirmOrder() {
  if (!selectedPlan) return alert("Select a plan first");
  if (!$("phone")?.value) return alert("Enter phone number");
  if (!hasPin) return openPinModal("set");
  openPinModal("purchase");
}

/* ================= SET PIN FROM MORE TAB ================= */
function openSetPinFromMore() {
  openPinModal("set");
}

/* ================= PIN SUBMIT ================= */
async function submitPin() {
  const pin = [...document.querySelectorAll(".pin-inputs input")]
    .map(i => i.value)
    .join("");

  if (!/^\d{4}$/.test(pin)) return alert("Enter 4-digit PIN");

  showLoader();
  try {
    let res, data;

    if (pinMode === "set") {
      res = await fetch(`${backendUrl}/api/set-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ pin })
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set PIN");

      hasPin = true;
      playSuccessSound();
      alert("PIN verified successfully");
      closePinModal();
    } else {
      res = await fetch(`${backendUrl}/api/wallet/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          type: "data",
          pin,
          provider: selectedPlan.provider,
          details: {
            mobile_number: $("phone").value,
            plan: selectedPlan.plan_id
          }
        })
      });

      data = await res.json();
      if (!res.ok) throw new Error(data.error || "Purchase failed");

      playSuccessSound();
      showReceipt(data.receipt);
      updateWalletBalance();
      closePinModal();
    }
  } catch (err) {
    alert(err.message);
  } finally {
    hideLoader();
  }
}

/* ================= RECEIPT ================= */
function showReceipt(r) {
  $("receiptBody").innerHTML = `
    <div><b>Reference:</b> ${r.reference}</div>
    <div><b>Amount:</b> ₦${r.amount}</div>
    <div style="color:green"><b>Status:</b> SUCCESS</div>
  `;
  $("receiptModal")?.classList.remove("hidden");
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  renderPlans();
  if (getToken()) {
    updateWalletBalance();
    checkPinStatus();
  }
});
