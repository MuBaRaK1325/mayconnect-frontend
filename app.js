/* ================= CONFIG ================= */
const backendUrl = "https://mayconnect-backend-1.onrender.com";
const $ = id => document.getElementById(id);
const getToken = () => localStorage.getItem("token");
const adminEmail = "abubakarmubarak3456@gmail.com";

/* ================= AUTH GUARD ================= */
(function authGuard() {
  const path = location.pathname.toLowerCase();
  const publicPages = ["login.html", "signup.html"];
  const token = getToken();
  if (!token && !publicPages.some(p => path.includes(p))) {
    location.href = "login.html";
  }
})();

/* ================= GLOBAL STATE ================= */
let selectedPlan = null;
let hasPin = false;
let pinMode = "purchase";
let isAdmin = false;

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
function showLoader() { loader?.classList.remove("hidden"); loaderState.innerHTML = `<div class="splash-ring"></div>`; }
function showSuccess() { loaderState.innerHTML = `<div class="success-check">✓</div>`; }
function hideLoader() { loader?.classList.add("hidden"); }

/* ================= SOUND ================= */
const welcomeSound = $("welcomeSound");
const successSound = $("successSound");
function playSuccessSound() { successSound?.play().catch(() => {}); }

/* ================= WALLET ================= */
async function updateWalletBalance() {
  if (!getToken()) return;
  try {
    const res = await fetch(`${backendUrl}/api/wallet`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if ($("walletBalance")) $("walletBalance").textContent = `₦${data.balance || 0}`;
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
  const colors = { maitama: "#4A90E2", subpadi: "#7ED321", cheapdatahub: "#F5A623" };
  card.style.borderColor = colors[plan.provider] || "#888";
  selectedPlan = plan;
  $("confirmOrderBtn")?.classList.remove("hidden");
}

/* ================= PIN MODAL ================= */
const pinInputs = document.querySelectorAll(".pin-inputs input");
function openPinModal(mode) {
  pinMode = mode;
  $("pinActionBtn").textContent = mode === "set" ? "Verify PIN" : "Pay";
  $("pinModal")?.classList.remove("hidden");
}
function closePinModal() { $("pinModal")?.classList.add("hidden"); }
function openSetPinFromMore() { openPinModal("set"); }

/* PIN INPUT UX */
pinInputs.forEach((input, idx) => {
  input.addEventListener("input", e => {
    if (e.target.value.length === 1 && idx < pinInputs.length - 1) pinInputs[idx + 1].focus();
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Backspace" && !input.value && idx > 0) pinInputs[idx - 1].focus();
  });
});
function togglePinVisibility() { pinInputs.forEach(i => i.type = i.type === "password" ? "text" : "password"); }
document.addEventListener("DOMContentLoaded", () => {
  const modalContent = $("#pinModal .modal-content");
  if (modalContent) {
    const btn = document.createElement("button");
    btn.type = "button"; btn.textContent = "Show"; btn.className = "show-password-btn"; btn.style.marginTop = "0.5rem";
    btn.onclick = () => { togglePinVisibility(); btn.textContent = pinInputs[0].type === "password" ? "Show" : "Hide"; };
    modalContent.appendChild(btn);
  }
});
function clearPinInputs() { pinInputs.forEach(i => i.value = ""); }

/* ================= CONFIRM ORDER ================= */
function confirmOrder() {
  if (!selectedPlan) return alert("Select a plan first");
  if (!$("phone")?.value) return alert("Enter phone number");
  if (!hasPin) return openPinModal("set");
  openPinModal("purchase");
}

/* ================= SUBMIT PIN ================= */
async function submitPin() {
  const pin = [...pinInputs].map(i => i.value).join("");
  if (!/^\d{4}$/.test(pin)) return alert("Enter 4-digit PIN");
  showLoader();
  try {
    let res, data;
    if (pinMode === "set") {
      res = await fetch(`${backendUrl}/api/set-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ pin })
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set PIN");
      hasPin = true;
      playSuccessSound(); alert("PIN verified successfully");
      closePinModal();
    } else {
      res = await fetch(`${backendUrl}/api/wallet/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          type: "data",
          pin,
          provider: selectedPlan.provider,
          details: { mobile_number: $("phone").value, plan: selectedPlan.plan_id }
        })
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || "Purchase failed");
      playSuccessSound();
      $("receiptBody").innerHTML = `<div><b>Reference:</b> ${data.receipt.reference}</div><div><b>Amount:</b> ₦${data.receipt.amount}</div><div style="color:green"><b>Status:</b> SUCCESS</div>`;
      $("receiptModal")?.classList.remove("hidden");
      updateWalletBalance();
      closePinModal();
    }
  } catch (err) { alert(err.message); } finally { hideLoader(); }
}
$("pinActionBtn").onclick = submitPin;

/* ================= MORE PANEL ================= */
function toggleMore() { $("morePanel")?.classList.toggle("hidden"); }
function closeMore() { $("morePanel")?.classList.add("hidden"); }
function enableBiometric() { alert("Biometric coming soon"); }
function forgotPin() { alert("Forgot PIN"); }
function forgotPassword() { alert("Forgot Password"); }
function contactWhatsApp() { window.open("https://wa.me/2348117988561"); }
function callSupport() { location.href = "tel:+2348117988561"; }
function logout() { localStorage.clear(); location.href = "login.html"; }
function copyAccount() { const acc = "1234567890"; navigator.clipboard.writeText(acc); alert("Copied: " + acc); }

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", async () => {
  if (welcomeSound) welcomeSound.play().catch(() => {});
  const name = localStorage.getItem("name") || "User";
  $("greeting").textContent = `Hello, ${name} 👋`;

  // Check admin
  const email = localStorage.getItem("email");
  isAdmin = email === adminEmail;
  if (isAdmin) console.log("Admin detected");

  updateWalletBalance();
  renderPlans();
  checkPinStatus();

  // Attach Set PIN from More tab
  $("#setPinBtn")?.addEventListener("click", openSetPinFromMore);
});

/* ================= CHECK PIN STATUS ================= */
async function checkPinStatus() {
  if (!getToken()) return;
  try {
    const res = await fetch(`${backendUrl}/api/wallet`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      hasPin = true;
      if ($("#setPinBtn")) $("#setPinBtn").textContent = "Change PIN";
    }
  } catch {}
}

/* ================= CRON JOB EXAMPLE ================= */
setInterval(async () => {
  // Example: fetch wallet every 5 mins automatically
  if (!getToken()) return;
  await updateWalletBalance();
}, 5 * 60 * 1000);
