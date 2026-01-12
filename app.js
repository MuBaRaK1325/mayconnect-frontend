const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* ---------------- SHOW / HIDE PASSWORD ---------------- */
function togglePassword(id, el) {
  const input = document.getElementById(id);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  el.textContent = input.type === "password" ? "Show" : "Hide";
}

/* ---------------- DOM READY ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  playWelcomeSound();

  /* ---------------- SIGNUP ---------------- */
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("signup-name").value;
      const email = document.getElementById("signup-email").value;
      const password = document.getElementById("signup-password").value;

      const res = await fetch(`${backendUrl}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("email", email);
        window.location.replace("dashboard.html");
      } else {
        alert(data.error || "Signup failed");
      }
    });
  }

  /* ---------------- LOGIN ---------------- */
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      const res = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("email", email);
        window.location.replace("dashboard.html");
      } else {
        alert(data.error || "Login failed");
      }
    });
  }

  /* ---------------- DASHBOARD AUTO LOAD ---------------- */
  if (localStorage.getItem("token")) {
    updateWalletBalance();
    loadTransactions();
  }
});

/* ---------------- LOGOUT ---------------- */
function logout() {
  localStorage.clear();
  window.location.replace("login.html");
}

/* ---------------- AUTH ---------------- */
function getAuthToken() {
  return localStorage.getItem("token");
}

/* ---------------- WALLET ---------------- */
async function updateWalletBalance() {
  const token = getAuthToken();
  if (!token) return;

  const res = await fetch(`${backendUrl}/api/wallet`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const walletEl = document.querySelector(".card.blue strong");
  if (walletEl && data.balance !== undefined) {
    walletEl.textContent = `₦${data.balance}`;
  }
}

/* ---------------- TRANSACTIONS ---------------- */
async function loadTransactions() {
  const token = getAuthToken();
  if (!token) return;

  const res = await fetch(`${backendUrl}/api/wallet/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const container = document.getElementById("transactionsList");
  if (!container) return;

  container.innerHTML = "";

  (data.transactions || []).forEach(txn => {
    const div = document.createElement("div");
    div.className = "txn-card";
    div.innerHTML = `
      <p><strong>${txn.type.toUpperCase()}</strong> - ₦${txn.amount}</p>
      <p>${txn.description || ""}</p>
      <button onclick="showReceipt(${JSON.stringify(txn)})">View Receipt</button>
    `;
    container.appendChild(div);
  });
}

/* ---------------- PIN / BIOMETRIC ---------------- */
let pendingAction = null;

function openPin(callback) {
  pendingAction = callback;
  document.getElementById("pinModal").classList.remove("hidden");
}

function closePin() {
  document.getElementById("pinModal").classList.add("hidden");
  document.querySelectorAll(".pin-inputs input").forEach(i => i.value = "");
}

async function verifyPin() {
  let pin = "";
  document.querySelectorAll(".pin-inputs input").forEach(i => pin += i.value);
  if (pin.length !== 4) return alert("Enter 4-digit PIN");

  const token = getAuthToken();
  const res = await fetch(`${backendUrl}/api/wallet/verify-pin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ pin })
  });

  const data = await res.json();
  if (res.ok) {
    closePin();
    if (pendingAction) pendingAction(pin); // pass pin to pendingAction
  } else {
    alert(data.error || "Incorrect PIN");
  }
}

function useBiometric() {
  alert("Biometric login coming soon");
}

/* ================= DATA PURCHASE (UI LOGIC) ================= */

let selectedNetwork = null;
let selectedPlan = null;

function selectNetwork(el) {
  selectedNetwork = el.dataset.network;
  selectedPlan = null;

  // Haptic vibration (mobile)
  if (navigator.vibrate) navigator.vibrate(30);

  document.querySelectorAll(".network")
    .forEach(n => n.classList.remove("selected"));
  el.classList.add("selected");

  const container = document.getElementById("plansContainer");
  const shimmer = document.getElementById("loadingPlans");
  const confirmBtn = document.getElementById("confirmBtn");

  container.innerHTML = "";
  confirmBtn.disabled = true;
  confirmBtn.classList.add("disabled");

  shimmer.classList.remove("hidden");

  // Simulate API delay (video animation feel)
  setTimeout(() => {
    shimmer.classList.add("hidden");

    plans[selectedNetwork].forEach((plan, index) => {
      const div = document.createElement("div");
      div.className = "plan-card";
      div.style.animationDelay = `${index * 0.06}s`;
      div.innerHTML = `
        <strong>${plan.name}</strong>
        <span>₦${plan.price}</span>
      `;
      div.onclick = () => selectPlan(div, plan);
      container.appendChild(div);
    });

    // Auto-scroll to plans
    container.scrollIntoView({ behavior: "smooth" });

  }, 600);
}

function selectPlan(el, plan) {
  selectedPlan = plan;

  if (navigator.vibrate) navigator.vibrate(20);

  document.querySelectorAll(".plan-card")
    .forEach(p => p.classList.remove("selected"));

  el.classList.add("selected");

  const confirmBtn = document.getElementById("confirmBtn");
  confirmBtn.disabled = false;
  confirmBtn.classList.remove("disabled");
}

function confirmOrder() {
  const phone = document.getElementById("phone").value;
  if (!phone) return alert("Enter phone number");
  if (!selectedNetwork) return alert("Select a network");
  if (!selectedPlan) return alert("Select a plan");

  const details = `
    Phone: ${phone} <br>
    Network: ${selectedNetwork} <br>
    Plan: ${selectedPlan.name} <br>
    Price: ₦${selectedPlan.price}
  `;

  document.getElementById("confirmDetails").innerHTML = details;
  document.getElementById("confirmModal").classList.remove("hidden");
}

async function processPurchase(pin) {
  const phone = document.getElementById("phone").value;
  const token = getAuthToken();

  const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      type: "data",
      amount: parseFloat(selectedPlan.price),
      details: { phone, network: selectedNetwork, plan: selectedPlan.name },
      pin
    })
  });

  const data = await res.json();
  if (res.ok) {
    closeConfirm();
    showReceipt(data.receipt); // receipt UI + sound
  } else {
    alert(data.error || "Purchase failed");
  }
}

/* ---------------- AIRTIME PURCHASE ---------------- */
let selectedAirtimeNetwork = null;

function selectAirtimeNetwork(el) {
  selectedAirtimeNetwork = el.dataset.network;

  // HAPTIC
  if (navigator.vibrate) navigator.vibrate(20);

  document.querySelectorAll(".network-card")
    .forEach(n => n.classList.remove("selected"));

  el.classList.add("selected");

  // AUTO SCROLL
  document.getElementById("airtimeAmount")
    .scrollIntoView({ behavior: "smooth", block: "center" });

function selectAmount(value) {
  if (navigator.vibrate) navigator.vibrate(15);
  document.getElementById("airtimeAmount").value = value;
}

  // ENABLE BUTTON
  const btn = document.getElementById("airtimeConfirmBtn");
  btn.disabled = false;
  btn.classList.remove("disabled");
}

async function confirmAirtime() {
  const phone = document.getElementById("airtimePhone").value;
  const amount = document.getElementById("airtimeAmount").value;

  if (!phone || !amount) return alert("Fill all fields");
  if (!selectedAirtimeNetwork) return alert("Select network");

  document.getElementById("airtimeShimmer").classList.remove("hidden");

  openPin(async (pin) => {
    const token = getAuthToken();

    const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        type: "airtime",
        amount: parseFloat(amount),
        details: { phone, network: selectedAirtimeNetwork },
        pin
      })
    });

    document.getElementById("airtimeShimmer").classList.add("hidden");

    const data = await res.json();
    if (res.ok) {
      showReceipt(data.receipt);
    } else {
      alert(data.error || "Purchase failed");
    }
  });
}
const colors = {
  MTN: "#ffcc00",
  Airtel: "#e60000",
  Glo: "#0f9d58"
};

document.getElementById("airtimeConfirmBtn").style.background =
  colors[selectedAirtimeNetwork];

/* ---------------- RECEIPT ---------------- */
function showReceipt(receipt) {
  const body = document.getElementById("receiptBody");
  const sound = document.getElementById("successSound");

  body.innerHTML = `
    <div class="receipt-row"><span>Reference</span><strong>${receipt.reference}</strong></div>
    <div class="receipt-row"><span>Service</span><strong>${receipt.type.toUpperCase()}</strong></div>
    <div class="receipt-row"><span>Amount</span><strong>₦${receipt.amount}</strong></div>
    <div class="receipt-row"><span>Status</span><strong style="color:#16a34a">SUCCESS</strong></div>
    <div class="receipt-row"><span>Date</span><strong>${new Date().toLocaleString()}</strong></div>
  `;
function launchConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height / 2,
    r: Math.random() * 6 + 4,
    d: Math.random() * 20 + 10
  }));

  let angle = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(34,197,94,0.8)";
    ctx.beginPath();

    particles.forEach(p => {
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    });

    ctx.fill();
    update();
  }

  function update() {
    angle += 0.01;
    particles.forEach(p => {
      p.y += Math.cos(angle + p.d) + 1;
      p.x += Math.sin(angle) * 2;
      if (p.y > canvas.height) p.y = 0;
    });
  }

  const interval = setInterval(draw, 16);
  setTimeout(() => {
    clearInterval(interval);
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }, 2000);
}
launchConfetti();
  document.getElementById("receiptModal").classList.remove("hidden");

  // Play success sound fully
  sound.currentTime = 0;
  sound.play();
}

function closeReceipt() {
  document.getElementById("receiptModal").classList.add("hidden");
}

/* ---------------- WELCOME SOUND ---------------- */
function playWelcomeSound() {
  const sound = document.getElementById("welcomeSound");
  if (!sound) return;
  sound.currentTime = 0;
  sound.play();
}

/* ---------------- FUND WALLET ---------------- */
async function fundWallet(amount, method) {
  if (!amount) return alert("Enter amount");

  openPin(async (pin) => {
    const token = getAuthToken();
    const email = localStorage.getItem("email");

    const endpoint = method === "paystack"
      ? "/api/wallet/deposit/paystack"
      : "/api/wallet/deposit/flutterwave";

    const res = await fetch(`${backendUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ amount, email })
    });

    const data = await res.json();
    if (data.authorization_url || data.data?.link) {
      window.open(data.authorization_url || data.data.link, "_blank");
      setTimeout(updateWalletBalance, 5000);
    }
  });
}

window.addEventListener("offline", () => {
  document.getElementById("offlineBanner")?.classList.remove("hidden");
});

window.addEventListener("online", () => {
  document.getElementById("offlineBanner")?.classList.add("hidden");
});
