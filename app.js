/* =================================================
   MAY-CONNECT — DATA PAGE APP.JS
================================================== */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* ================= GLOBAL HELPERS ================= */
const $ = id => document.getElementById(id);
const getToken = () => localStorage.getItem("token");

/* ================= NETWORK STATUS ================= */
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

/* ================= SOUNDS ================= */
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
    $("walletBalance").textContent = `₦${data.balance || 0}`;
  } catch {
    showNetwork("offline");
  }
}

/* ================= CHECK PIN STATUS ================= */
async function checkPinStatus() {
  if (!getToken()) return;
  try {
    const res = await fetch(`${backendUrl}/api/has-pin`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();
    const btn = $("setPinBtn");
    if (!btn) return;
    btn.textContent = data.hasPin ? "Change PIN" : "Set PIN";
    // If user has no PIN, prompt immediately before first purchase
    if (!data.hasPin) {
      openSetPin();
    }
  } catch(err) {
    console.error("Failed to check PIN", err);
  }
}

/* ================= SET TRANSACTION PIN ================= */
function openSetPin() {
  const modal = $("setPinModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.querySelectorAll("input").forEach(i => i.value = "");
}

function closeSetPin() {
  $("setPinModal")?.classList.add("hidden");
}

async function submitSetPin() {
  let pin = "";
  document.querySelectorAll("#setPinModal input").forEach(i => pin += i.value);
  if (!/^\d{4}$/.test(pin)) return alert("PIN must be exactly 4 digits");

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
    if (!res.ok) throw new Error(data.message || data.error || "Failed to set PIN");
    showSuccess();
    playSuccessSound();
    setTimeout(() => {
      hideLoader();
      closeSetPin();
      $("setPinBtn").textContent = "Change PIN";
      alert("✅ Transaction PIN set successfully");
    }, 700);
  } catch(err) {
    console.error(err);
    hideLoader();
    showNetwork("offline");
  }
}

/* ================= DATA PLANS ================= */
let selectedPlan = null;
const plans = {
  MTN: [
    {
      plan_id: 158,
      maitama_network: 1,
      name: "MTN 5GB SME",
      price: 1600,
      validity: "30 Days"
    }
  ],
  AIRTEL: [],
  GLO: []
};

const networkLogos = {
  MTN: "images/Mtn.png",
  AIRTEL: "images/Airtel.png",
  GLO: "images/Glo.png"
};

function renderPlans(network="MTN") {
  const container = $("plansContainer");
  if (!container) return;
  container.innerHTML = "";
  const list = plans[network] || [];
  if (!list.length) {
    container.innerHTML = "<p>No plans available for this network</p>";
    $("confirmBtn").disabled = true;
    return;
  }
  list.forEach(plan => {
    const div = document.createElement("div");
    div.className = "plan-card";
    div.innerHTML = `
      <div class="plan-logo"><img src="${networkLogos[network]}" alt="${network} Logo"></div>
      <div class="plan-info">
        <span class="plan-name">${plan.name}</span>
        <span class="plan-validity">${plan.validity}</span>
      </div>
      <div class="plan-price">₦${plan.price}</div>
    `;
    div.addEventListener("click", () => selectPlan(div, plan));
    container.appendChild(div);
  });
}

/* ================= SELECT PLAN ================= */
function selectPlan(card, plan) {
  selectedPlan = plan;
  document.querySelectorAll(".plan-card").forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");
  $("confirmBtn").disabled = false;
}

/* ================= PIN MODAL FOR PURCHASE ================= */
function openPinModal() {
  $("pinModal")?.classList.remove("hidden");
}
function closePinModal() {
  $("pinModal")?.classList.add("hidden");
}

async function submitPin() {
  const pin = [...document.querySelectorAll(".pin-inputs input")].map(i => i.value).join("");
  if (pin.length !== 4) return alert("Enter 4-digit PIN");
  const phone = $("phone").value;
  if (!phone || !selectedPlan) return alert("Missing phone or plan");

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
          mobile_number: phone,
          plan: selectedPlan.plan_id,
          network: selectedPlan.maitama_network
        }
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Purchase failed");

    playSuccessSound();
    showReceipt(data.receipt);
    updateWalletBalance();
    closePinModal();
  } catch(err) {
    alert(err.message || "Purchase failed");
  } finally {
    hideLoader();
  }
}

/* ================= CONFIRM ORDER ================= */
function confirmOrder() {
  if (!selectedPlan) return alert("Select a plan first");
  if (!$("phone").value) return alert("Enter phone number");
  openPinModal();
}

/* ================= RECEIPT ================= */
function showReceipt(receipt) {
  $("receiptBody").innerHTML = `
    <div><strong>Reference:</strong> ${receipt.reference}</div>
    <div><strong>Amount:</strong> ₦${receipt.amount}</div>
    <div style="color:green"><strong>Status:</strong> SUCCESS</div>
  `;
  $("receiptModal")?.classList.remove("hidden");
}
function closeReceipt() {
  $("receiptModal")?.classList.add("hidden");
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) {
    location.replace("login.html");
    return;
  }
  updateWalletBalance();
  checkPinStatus();
  renderPlans();
});
