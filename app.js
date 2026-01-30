/* =================================================
   MAY-CONNECT — FINAL WIRED APP.JS (STABLE)
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

/* ================= AUTH ================= */
$("loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  showLoader();
  try {
    const res = await fetch(`${backendUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: $("login-email").value,
        password: $("login-password").value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("token", data.token);
    showSuccess();
    setTimeout(() => location.replace("dashboard.html"), 600);
  } catch (err) {
    alert(err.message || "Login failed");
    hideLoader();
  }
});

/* ================= WALLET ================= */
async function updateWalletBalance() {
  if (!getToken()) return;
  const res = await fetch(`${backendUrl}/api/wallet`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  const data = await res.json();
  $("walletBalance").textContent = `₦${data.balance || 0}`;
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
      const btn = $("setPinBtn");
      if (btn) btn.textContent = "Change PIN";
    }
  } catch {}
}

/* ================= DATA PLANS ================= */
let selectedPlan = null;

const plans = [
  {
    id: "mtn5gb",
    plan_id: 158,
    network: 1,
    name: "MTN 5GB SME",
    price: 1600,
    validity: "30 Days"
  }
];

/* When plan card is tapped */
function selectPlan(card, plan) {
  document.querySelectorAll(".plan-card")
    .forEach(p => p.classList.remove("selected"));

  card.classList.add("selected");
  selectedPlan = plan;

  $("confirmOrderBtn")?.classList.remove("hidden");
}

/* ================= CONFIRM ORDER ================= */
function confirmOrder() {
  if (!selectedPlan) return alert("Select a plan first");
  if (!$("phone").value) return alert("Enter phone number");

  if (!hasPin) {
    openSetPin();
    return;
  }

  openPinModal();
}

/* ================= SET PIN ================= */
function openSetPin() {
  $("setPinModal")?.classList.remove("hidden");
  document
    .querySelectorAll("#setPinModal input")
    .forEach(i => (i.value = ""));
}

function closeSetPin() {
  $("setPinModal")?.classList.add("hidden");
}

async function submitSetPin() {
  const pin = [...document.querySelectorAll("#setPinModal input")]
    .map(i => i.value)
    .join("");

  if (!/^\d{4}$/.test(pin))
    return alert("PIN must be 4 digits");

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

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error);

    hasPin = true;
    $("setPinBtn").textContent = "Change PIN";
    showSuccess();
    playSuccessSound();

    setTimeout(() => {
      hideLoader();
      closeSetPin();
      openPinModal(); // continue purchase automatically
    }, 600);
  } catch (err) {
    alert(err.message);
    hideLoader();
  }
}

/* ================= PIN MODAL ================= */
function openPinModal() {
  $("pinModal")?.classList.remove("hidden");
}
function closePinModal() {
  $("pinModal")?.classList.add("hidden");
}

async function submitPin() {
  const pin = [...document.querySelectorAll(".pin-inputs input")]
    .map(i => i.value)
    .join("");

  if (pin.length !== 4) return alert("Enter 4-digit PIN");

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
    if (!res.ok) throw new Error(data.error);

    playSuccessSound();
    showReceipt(data.receipt);
    updateWalletBalance();
    closePinModal();
  } catch (err) {
    alert(err.message || "Purchase failed");
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
  if (getToken()) {
    updateWalletBalance();
    checkPinStatus();
  }
});
