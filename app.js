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
      <button onclick="showReceipt('${txn.reference}')">View Receipt</button>
    `;
    container.appendChild(div);
  });
}

/* ---------------- PIN / BIOMETRIC ---------------- */
async function verifyPinOrBiometric(action) {
  return new Promise(resolve => {
    const modal = document.getElementById("pinModal");
    const text = document.getElementById("modalActionText");
    const pinInput = document.getElementById("pinInput");
    const pinBtn = document.getElementById("pinSubmitBtn");
    const bioBtn = document.getElementById("biometricBtn");

    text.textContent = action;
    pinInput.value = "";
    modal.style.display = "block";

    pinBtn.onclick = async () => {
      const token = getAuthToken();
      const res = await fetch(`${backendUrl}/api/wallet/verify-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pin: pinInput.value })
      });

      if (res.ok) {
        modal.style.display = "none";
        resolve(true);
      } else {
        alert("Invalid PIN");
      }
    };

    bioBtn.onclick = async () => {
      const token = getAuthToken();
      const res = await fetch(`${backendUrl}/api/auth/biometric-login`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        modal.style.display = "none";
        resolve(true);
      } else {
        alert("Biometric failed");
      }
    };
  });
}

/* ---------------- FUND WALLET ---------------- */
async function fundWalletPaystack() {
  const amount = parseFloat(document.getElementById("fundAmount").value);
  if (!amount) return alert("Enter amount");

  if (!(await verifyPinOrBiometric("Fund Wallet via Paystack"))) return;

  const token = getAuthToken();
  const email = localStorage.getItem("email");

  const res = await fetch(`${backendUrl}/api/wallet/deposit/paystack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount, email })
  });

  const data = await res.json();
  if (data.authorization_url) {
    window.open(data.authorization_url, "_blank");
    setTimeout(updateWalletBalance, 5000);
  }
}

async function fundWalletFlutterwave() {
  const amount = parseFloat(document.getElementById("fundAmount").value);
  if (!amount) return alert("Enter amount");

  if (!(await verifyPinOrBiometric("Fund Wallet via Flutterwave"))) return;

  const token = getAuthToken();
  const email = localStorage.getItem("email");

  const res = await fetch(`${backendUrl}/api/wallet/deposit/flutterwave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount, email })
  });

  const data = await res.json();
  if (data.data?.link) {
    window.open(data.data.link, "_blank");
    setTimeout(updateWalletBalance, 5000);
  }
}

/* ---------------- PURCHASE ---------------- */
async function purchase(type) {
  const amount = parseFloat(document.getElementById(`${type}Amount`).value);
  const details = document.getElementById(`${type}Details`).value;

  if (!amount) return alert("Enter amount");
  if (!(await verifyPinOrBiometric(`Purchase ${type}`))) return;

  const token = getAuthToken();
  const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ type, amount, details: { info: details } })
  });

  const data = await res.json();
  if (res.ok) {
    showReceipt(data.receipt.reference, data.receipt);
    updateWalletBalance();
    loadTransactions();
  }
}

/* ---------------- RECEIPT ---------------- */
function showReceipt(ref, receipt = {}) {
  const modal = document.getElementById("receiptModal");
  const body = document.getElementById("receiptContent");

  body.innerHTML = `
    <img src="logo.png" class="receipt-logo">
    <h3>MAY-Connect Receipt</h3>
    <p>Reference: ${receipt.reference || ref}</p>
    <p>Type: ${receipt.type || ""}</p>
    <p>Amount: ₦${receipt.amount || ""}</p>
    <p>Status: ${receipt.status || "SUCCESS"}</p>
    <p>Date: ${new Date().toLocaleString()}</p>
  `;

  modal.style.display = "block";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}
