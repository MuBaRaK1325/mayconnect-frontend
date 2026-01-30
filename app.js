/* =================================================
   MAY-CONNECT — FULLY WIRED & STABLE APP.JS
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

/* ================= SOUNDS ================= */
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
        email: $("login-email").value.trim(),
        password: $("login-password").value.trim()
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

$("signupForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  showLoader();

  try {
    const res = await fetch(`${backendUrl}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: $("signup-name").value.trim(),
        email: $("signup-email").value.trim(),
        password: $("signup-password").value.trim()
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    localStorage.setItem("token", data.token);
    showSuccess();
    setTimeout(() => location.replace("dashboard.html"), 600);
  } catch (err) {
    alert(err.message || "Signup failed");
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

/* ================= DATA PLANS ================= */
let selectedPlan = null;

const plans = {
  MTN: [
    {
      plan_id: 158,
      network: 1,
      name: "MTN 5GB SME",
      price: 1600,
      validity: "30 Days"
    }
  ]
};

function selectPlan(el, plan) {
  document
    .querySelectorAll(".plan-card")
    .forEach(p => p.classList.remove("selected"));
  el.classList.add("selected");
  selectedPlan = plan;
  $("confirmBtn").disabled = false;
}

/* ================= SET TRANSACTION PIN ================= */
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
    return alert("PIN must be exactly 4 digits");

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

    playSuccessSound();
    showSuccess();

    setTimeout(() => {
      hideLoader();
      closeSetPin();
      alert("✅ Transaction PIN set successfully");
    }, 700);
  } catch (err) {
    hideLoader();
    alert(err.message || "Failed to set PIN");
  }
}

/* ================= PURCHASE PIN ================= */
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

  if (!/^\d{4}$/.test(pin)) return alert("Enter 4-digit PIN");

  const phone = $("phone").value.trim();
  if (!phone || !selectedPlan) return alert("Missing data");

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
          mobile_number: phone
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

/* ================= CONFIRM ================= */
function confirmOrder() {
  if (!selectedPlan) return alert("Select a plan");
  if (!$("phone").value.trim()) return alert("Enter phone number");
  openPinModal();
}

/* ================= RECEIPT ================= */
function showReceipt(r) {
  $("receiptBody").innerHTML = `
    <div><strong>Reference:</strong> ${r.reference}</div>
    <div><strong>Amount:</strong> ₦${r.amount}</div>
    <div style="color:green"><strong>Status:</strong> SUCCESS</div>
  `;
  $("receiptModal")?.classList.remove("hidden");
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  if (getToken()) updateWalletBalance();
});
