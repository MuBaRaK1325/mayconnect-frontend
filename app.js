/* =================================================
   MAY-CONNECT — UPDATED APP.JS
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
  net.textContent = type === "slow" ? "Slow network detected" : "You are offline";
  net.classList.remove("hidden");
  setTimeout(() => net.classList.add("hidden"), 3000);
}
window.addEventListener("offline", () => showNetwork("offline"));

/* ================= LOADER ================= */
const loader = $("splashLoader");
const loaderState = $("loaderState");
function showLoader() { loader?.classList.remove("hidden"); loaderState.innerHTML = `<div class="splash-ring"></div>`; }
function showSuccess() { loaderState.innerHTML = `<div class="success-check">✓</div>`; }
function hideLoader() { loader?.classList.add("hidden"); }

/* ================= SOUND ================= */
function playSuccessSound() { $("successSound")?.play().catch(() => {}); }

/* ================= WALLET ================= */
async function updateWalletBalance() {
  if (!getToken()) return;
  try {
    const res = await fetch(`${backendUrl}/api/wallet`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    $("walletBalance") && ($("walletBalance").textContent = `₦${data.balance || 0}`);
  } catch {}
}
const $ = id => document.getElementById(id);
let selectedPlan = null;

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
  { plan_id: 52, provider: "cheapdatahub", network: "AIRTEL", name: "5GB", price: 1650 },
  { plan_id: 37, provider: "maitama", network: "AIRTEL", name: "1GB", price: 300 },
  { plan_id: 38, provider: "maitama", network: "AIRTEL", name: "2GB", price: 600 },
  { plan_id: 39, provider: "maitama", network: "AIRTEL", name: "3GB", price: 600 }
];

function renderPlans() {
  const container = $("plansGrid");
  container.innerHTML = "";
  DATA_PLANS.forEach(plan => {
    const div = document.createElement("div");
    div.className = "plan-card";
    div.innerHTML = `
      <small>${plan.network}</small>
      <h4>${plan.name.split(" ")[1]}</h4>
      <small>${plan.validity || "Monthly"}</small>
      <div class="price">₦ ${plan.price}</div>
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

  const providerColors = { maitama: "#4A90E2", subpadi: "#7ED321", cheapdatahub: "#F5A623" };
  card.style.borderColor = providerColors[plan.provider] || "#888";

  selectedPlan = plan;
  $("confirmOrderBtn")?.classList.remove("hidden");
}

function confirmOrder() {
  if (!selectedPlan) return alert("Select a plan first");
  if (!$("phone").value) return alert("Enter phone number");

  openPinModal();
}

function openSetPin() { $("setPinModal")?.classList.remove("hidden"); }
function closeSetPin() { $("setPinModal")?.classList.add("hidden"); }
function openPinModal() { $("pinModal")?.classList.remove("hidden"); }
function closePinModal() { $("pinModal")?.classList.add("hidden"); }

document.addEventListener("DOMContentLoaded", () => renderPlans());

/* ================= PIN STATE ================= */
let hasPin = false;
async function checkPinStatus() {
  try {
    const res = await fetch(`${backendUrl}/api/wallet`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { hasPin = true; $("setPinBtn") && ($("setPinBtn").textContent = "Change PIN"); }
  } catch {}
}


/* ================= CONFIRM ORDER ================= */
function confirmOrder() {
  if (!selectedPlan) return alert("Select a plan first");
  if (!$("phone").value) return alert("Enter phone number");
  if (!hasPin) { openSetPin(); return; }
  openPinModal();
}

/* ================= SET PIN ================= */
function openSetPin() { $("setPinModal")?.classList.remove("hidden"); document.querySelectorAll("#setPinModal input").forEach(i => i.value = ""); }
function closeSetPin() { $("setPinModal")?.classList.add("hidden"); }

async function submitSetPin() {
  const pin = [...document.querySelectorAll("#setPinModal input")].map(i => i.value).join("");
  if (!/^\d{4}$/.test(pin)) return alert("PIN must be 4 digits");

  showLoader();
  try {
    const res = await fetch(`${backendUrl}/api/set-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
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
      if (selectedPlan && $("phone").value) openPinModal();
    }, 600);
  } catch (err) {
    alert(err.message);
    hideLoader();
  }
}

/* ================= PIN MODAL ================= */
function openPinModal() { $("pinModal")?.classList.remove("hidden"); }
function closePinModal() { $("pinModal")?.classList.add("hidden"); }

async function submitPin() {
  const pin = [...document.querySelectorAll(".pin-inputs input")].map(i => i.value).join("");
  if (pin.length !== 4) return alert("Enter 4-digit PIN");

  showLoader();
  try {
    const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        type: "data",
        pin,
        details: { mobile_number: $("phone").value, plan: selectedPlan.plan_id },
        provider: selectedPlan.provider
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Purchase failed");

    playSuccessSound();
    showReceipt(data.receipt);
    updateWalletBalance();
    closePinModal();
  } catch (err) {
    alert(err.message || "Purchase failed");
  } finally { hideLoader(); }
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
  if (getToken()) { updateWalletBalance(); checkPinStatus(); }
});
