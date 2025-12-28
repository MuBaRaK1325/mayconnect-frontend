const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* ======================= UTILITY ======================= */
function togglePassword(id, el) {
  const input = document.getElementById(id);
  if (input.type === "password") {
    input.type = "text";
    el.textContent = "Hide";
  } else {
    input.type = "password";
    el.textContent = "Show";
  }
}

async function fetchJSON(url, options = {}) {
  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch (err) {
    console.error(err);
    return { error: "Network error" };
  }
}

/* ======================= AUTH ======================= */

/* SIGNUP */
async function signup(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const res = await fetchJSON(`${backendUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  if (res.token) {
    localStorage.setItem("token", res.token);
    localStorage.setItem("email", email);
    showPinModal();
  } else alert(res.error || "Signup failed");
}

/* LOGIN */
async function login(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const res = await fetchJSON(`${backendUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (res.token) {
    localStorage.setItem("token", res.token);
    localStorage.setItem("email", email);

    if (res.biometricEnabled) showBiometricLoginModal();
    else window.location.href = "dashboard.html";
  } else alert(res.error || "Login failed");
}

/* ======================= DASHBOARD ======================= */
window.onload = () => {
  const sound = document.getElementById("welcomeSound");
  if (sound) sound.play();
  updateWalletBalance();
  fetchTransactions();
};

/* LOGOUT */
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* ======================= WALLET ======================= */
async function updateWalletBalance() {
  const token = localStorage.getItem("token");
  if (!token) return;
  const res = await fetchJSON(`${backendUrl}/api/wallet`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.balance) document.querySelector(".card.blue strong").textContent = `₦${res.balance}`;
}

/* FUND WALLET PAYSTACK */
async function fundWalletPaystack(amount) {
  const verified = await verifyPinOrBiometric("Confirm funding PIN or biometric");
  if (!verified) return;

  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");

  const res = await fetchJSON(`${backendUrl}/api/wallet/deposit/paystack`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, email })
  });

  if (res.authorization_url) {
    window.open(res.authorization_url, "_blank");
    setTimeout(updateWalletBalance, 5000);
  } else alert(res.error || "Paystack initialization failed");
}

/* FUND WALLET FLUTTERWAVE */
async function fundWalletFlutterwave(amount) {
  const verified = await verifyPinOrBiometric("Confirm funding PIN or biometric");
  if (!verified) return;

  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");

  const res = await fetchJSON(`${backendUrl}/api/wallet/deposit/flutterwave`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, email })
  });

  if (res.data && res.data.link) {
    window.open(res.data.link, "_blank");
    setTimeout(updateWalletBalance, 5000);
  } else alert(res.error || "Flutterwave initialization failed");
}

/* PURCHASE (AIRTIME/DATA) */
async function purchase(type, amount, details) {
  const verified = await verifyPinOrBiometric(`Confirm purchase of ${type}`);
  if (!verified) return;

  const token = localStorage.getItem("token");
  const res = await fetchJSON(`${backendUrl}/api/wallet/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type, amount, details })
  });

  if (res.message) {
    showReceiptModal(res.receipt || res);
    updateWalletBalance();
    fetchTransactions();
  } else alert(res.error || "Purchase failed");
}

/* ======================= TRANSACTIONS ======================= */
async function fetchTransactions() {
  const token = localStorage.getItem("token");
  const res = await fetchJSON(`${backendUrl}/api/wallet/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const container = document.querySelector(".transactions-list");
  if (!res.transactions || !container) return;
  container.innerHTML = "";
  res.transactions.forEach(tx => {
    const div = document.createElement("div");
    div.className = "tx-item";
    div.innerHTML = `${tx.created_at} - ${tx.type} - ₦${tx.amount} - ${tx.status}`;
    container.appendChild(div);
  });
}

/* ======================= PIN & BIOMETRIC MODALS ======================= */
function showPinModal() {
  const pin = prompt("Set a 4-digit PIN"); // Replace with modal in your HTML
  if (!pin || pin.length !== 4) return alert("PIN must be 4 digits");
  savePin(pin);
  showBiometricEnableModal();
}

async function savePin(pin) {
  const token = localStorage.getItem("token");
  await fetchJSON(`${backendUrl}/api/wallet/set-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pin })
  });
}

function showBiometricEnableModal() {
  const enable = confirm("Enable biometric login?");
  if (enable) enableBiometric();
}

async function enableBiometric() {
  const token = localStorage.getItem("token");
  await fetchJSON(`${backendUrl}/api/wallet/enable-biometric`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function verifyPinOrBiometric(promptMsg) {
  // Replace prompt with modal in your HTML
  const useBio = confirm(`${promptMsg}\nUse biometric?`);
  if (useBio) {
    return await biometricLogin();
  } else {
    const pin = prompt("Enter your PIN");
    return await verifyPin(pin);
  }
}

async function verifyPin(pin) {
  const token = localStorage.getItem("token");
  const res = await fetchJSON(`${backendUrl}/api/wallet/verify-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pin })
  });
  return res.valid;
}

async function biometricLogin() {
  // Use WebAuthn or device API
  alert("Biometric authentication simulated (replace with real WebAuthn)");
  return true; // Return true if success
}

/* ======================= RECEIPT MODAL ======================= */
function showReceiptModal(receipt) {
  const modal = document.getElementById("receiptModal");
  modal.querySelector(".receipt-reference").textContent = receipt.reference;
  modal.querySelector(".receipt-type").textContent = receipt.type;
  modal.querySelector(".receipt-amount").textContent = `₦${receipt.amount}`;
  modal.querySelector(".receipt-status").textContent = receipt.status;
  modal.style.display = "block";

  const sound = document.getElementById("successSound");
  if (sound) sound.play();
}

function closeReceiptModal() {
  const modal = document.getElementById("receiptModal");
  modal.style.display = "none";
}
