/* =================================================
   MAY-CONNECT — FINAL STABLE APP.JS (ALL PLANS FIXED)
================================================== */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* ================= HELPERS ================= */
const $ = id => document.getElementById(id);
const getToken = () => localStorage.getItem("token");

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
  if (!loader) return;
  loaderState.innerHTML = `<div class="splash-ring"></div>`;
  loader.classList.remove("hidden");
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
    $("walletBalance") &&
      ($("walletBalance").textContent = `₦${data.balance || 0}`);
  } catch {}
}

/* ================= PIN STATE ================= */
let hasPin = false;

async function checkPinStatus() {
  try {
    const res = await fetch(`${backendUrl}/api/wallet`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (res.ok) {
      hasPin = true;
      $("setPinBtn") && ($("setPinBtn").textContent = "Change PIN");
    }
  } catch {}
}

/* ================= DATA PLANS ================= */
let selectedPlan = null;

const DATA_PLANS = [
  /* ========= MAITAMA ========= */
  {
    plan_id: 153,
    network: "MTN",
    name: "MTN 5GB SME",
    price: 1500,
    validity: "30 Days"
  },

  /* ========= MTN (SUBPADI) ========= */
  { plan_id: 414, network: "MTN", name: "2.5GB GIFTING", price: 600, validity: "1 Month" },
  { plan_id: 413, network: "MTN", name: "1GB GIFTING", price: 300, validity: "1 Month" },
  { plan_id: 359, network: "MTN", name: "2GB GIFTING", price: 500, validity: "1 Month" },

  /* ========= AIRTEL (SUBPADI) ========= */
  { plan_id: 415, network: "AIRTEL", name: "3.2GB GIFTING", price: 1050, validity: "1 Month" },
  { plan_id: 394, network: "AIRTEL", name: "2GB GIFTING", price: 700, validity: "1 Month" },
  { plan_id: 329, network: "AIRTEL", name: "6.5GB SME", price: 1500, validity: "1 Month" },
  { plan_id: 327, network: "AIRTEL", name: "3.2GB SME", price: 700, validity: "1 Month" },

  /* ========= AIRTEL (MAITAMA) ========= */
  { plan_id: 37, network: "AIRTEL", name: "1GB", price: 300, validity: "Monthly" },
  { plan_id: 38, network: "AIRTEL", name: "2GB", price: 600, validity: "Monthly" },
  { plan_id: 39, network: "AIRTEL", name: "3GB", price: 600, validity: "Monthly" },

  /* ========= GLO ========= */
  { plan_id: 335, network: "GLO", name: "9.8GB SME", price: 2450, validity: "1 Month" },
  { plan_id: 334, network: "GLO", name: "2.5GB SME", price: 700, validity: "1 Month" },
  { plan_id: 261, network: "GLO", name: "1.024GB CORPORATE", price: 500, validity: "1 Month" },
  { plan_id: 195, network: "GLO", name: "3.9GB GIFTING", price: 1050, validity: "1 Month" },
  { plan_id: 194, network: "GLO", name: "1.05GB GIFTING", price: 500, validity: "1 Month" },

  /* ========= CHEAP DATA HUB ========= */
  { plan_id: 52, network: "AIRTEL", name: "5GB", price: 1650, validity: "7 Days" }
];

/* ================= RENDER PLANS ================= */
function renderPlans() {
  const grid = $("plansGrid");
  if (!grid) return;

  grid.innerHTML = "";

  DATA_PLANS.forEach(plan => {
    const card = document.createElement("div");
    card.className = "plan-card";
    card.innerHTML = `
      <small>${plan.network}</small>
      <h4>${plan.name}</h4>
      <small>${plan.validity}</small>
      <div class="price">₦${plan.price}</div>
    `;
    card.onclick = () => selectPlan(card, plan);
    grid.appendChild(card);
  });
}

/* ================= SELECT PLAN ================= */
function selectPlan(card, plan) {
  document.querySelectorAll(".plan-card")
    .forEach(c => c.classList.remove("selected"));

  card.classList.add("selected");
  selectedPlan = plan;
  $("confirmOrderBtn")?.classList.remove("hidden");
}

/* ================= CONFIRM ORDER ================= */
function confirmOrder() {
  if (!selectedPlan) return alert("Select a data plan");
  if (!$("phone")?.value) return alert("Enter phone number");

  if (!hasPin) return openSetPin();
  openPinModal();
}

/* ================= SET PIN ================= */
function openSetPin() {
  $("setPinModal")?.classList.remove("hidden");
  document
    .querySelectorAll("#setPinModal input")
    .forEach(i => (i.value = ""));
}

async function submitSetPin() {
  const pin = [...document.querySelectorAll("#setPinModal input")]
    .map(i => i.value)
    .join("");

  if (!/^\d{4}$/.test(pin)) return alert("PIN must be 4 digits");

  showLoader();
  try {
    const res = await fetch(`${backendUrl}/api/set-pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ pin })
    });

    if (!res.ok) throw new Error("Failed to set PIN");

    hasPin = true;
    $("setPinBtn").textContent = "Change PIN";
    showSuccess();
    playSuccessSound();

    setTimeout(() => {
      hideLoader();
      $("setPinModal").classList.add("hidden");
      openPinModal();
    }, 600);
  } catch (e) {
    alert(e.message);
    hideLoader();
  }
}

/* ================= PIN MODAL ================= */
function openPinModal() {
  $("pinModal")?.classList.remove("hidden");
}

async function submitPin() {
  const pin = [...document.querySelectorAll("#pinModal input")]
    .map(i => i.value)
    .join("");

  if (pin.length !== 4) return alert("Enter PIN");

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
        pin,
        details: {
          mobile_number: $("phone").value,
          plan: selectedPlan.plan_id,
          network: selectedPlan.network
        }
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Purchase failed");

    playSuccessSound();
    updateWalletBalance();
    alert("Data purchase successful ✅");
    $("pinModal").classList.add("hidden");
  } catch (e) {
    alert(e.message);
  } finally {
    hideLoader();
  }
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  renderPlans();
  if (getToken()) {
    updateWalletBalance();
    checkPinStatus();
  }
});
