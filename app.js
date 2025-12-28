const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* ---------------- SHOW / HIDE PASSWORD ---------------- */
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

/* ---------------- SIGNUP ---------------- */
async function signup(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const res = await fetch(`${backendUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  if (res.ok) {
    localStorage.setItem("email", email);
    window.location.href = "dashboard.html";
  } else {
    const data = await res.json();
    alert(data.error || "Signup failed");
  }
}

/* ---------------- LOGIN ---------------- */
async function login(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const res = await fetch(`${backendUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("email", email);
    window.location.href = "dashboard.html";
  } else alert(data.error || "Login failed");
}

/* ---------------- DASHBOARD WELCOME SOUND ---------------- */
window.onload = () => {
  const sound = document.getElementById("welcomeSound");
  if (sound) sound.play();
  updateWalletBalance();
  loadTransactions();
};

/* ---------------- LOGOUT ---------------- */
function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

/* ---------------- WALLET & TRANSACTION FUNCTIONS ---------------- */
async function getAuthToken() {
  return localStorage.getItem("token");
}

/* Update wallet balance dynamically */
async function updateWalletBalance() {
  const token = await getAuthToken();
  if (!token) return;

  const res = await fetch(`${backendUrl}/api/wallet`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const walletEl = document.querySelector(".card.blue strong");
  if (walletEl && data.balance !== undefined) walletEl.textContent = `₦${data.balance}`;
}

/* Load transaction history dynamically */
async function loadTransactions() {
  const token = await getAuthToken();
  if (!token) return;

  const res = await fetch(`${backendUrl}/api/wallet/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  const transactionsContainer = document.getElementById("transactionsList");
  if (!transactionsContainer) return;
  transactionsContainer.innerHTML = "";

  if (data.transactions && data.transactions.length) {
    data.transactions.forEach(txn => {
      const div = document.createElement("div");
      div.className = "txn-card";
      div.innerHTML = `
        <p><strong>${txn.type.toUpperCase()}</strong> - ₦${txn.amount}</p>
        <p>${txn.description}</p>
        <button onclick="showReceipt('${txn.reference}')">View Receipt</button>
      `;
      transactionsContainer.appendChild(div);
    });
  }
}

/* ---------------- PIN / BIOMETRIC MODAL ---------------- */
async function verifyPinOrBiometric(actionDesc) {
  return new Promise(resolve => {
    const modal = document.getElementById("pinModal");
    const actionText = document.getElementById("modalActionText");
    const pinInput = document.getElementById("pinInput");
    const biometricBtn = document.getElementById("biometricBtn");
    const pinSubmitBtn = document.getElementById("pinSubmitBtn");

    actionText.textContent = actionDesc;
    pinInput.value = "";
    modal.style.display = "block";

    // PIN submit
    pinSubmitBtn.onclick = async () => {
      const pin = pinInput.value;
      const token = await getAuthToken();
      const res = await fetch(`${backendUrl}/api/wallet/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (res.ok) {
        modal.style.display = "none";
        resolve(true);
      } else alert(data.error || "Incorrect PIN");
    };

    // Biometric
    biometricBtn.onclick = async () => {
      const token = await getAuthToken();
      const res = await fetch(`${backendUrl}/api/auth/biometric-login`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        modal.style.display = "none";
        resolve(true);
      } else alert(data.error || "Biometric verification failed");
    };
  });
}

/* ---------------- FUND WALLET ---------------- */
async function fundWalletPaystack() {
  const amount = parseFloat(document.getElementById("fundAmount").value);
  if (!amount || amount <= 0) return alert("Enter a valid amount");

  const verified = await verifyPinOrBiometric("Fund Wallet via Paystack");
  if (!verified) return;

  const token = await getAuthToken();
  const email = localStorage.getItem("email");

  try {
    const res = await fetch(`${backendUrl}/api/wallet/deposit/paystack`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount, email })
    });
    const data = await res.json();
    if (data.authorization_url) window.open(data.authorization_url, "_blank");
    else alert("Failed to initialize Paystack payment");
    setTimeout(updateWalletBalance, 5000); // auto-update
  } catch (err) {
    console.error(err);
    alert("Error funding wallet");
  }
}

async function fundWalletFlutterwave() {
  const amount = parseFloat(document.getElementById("fundAmount").value);
  if (!amount || amount <= 0) return alert("Enter a valid amount");

  const verified = await verifyPinOrBiometric("Fund Wallet via Flutterwave");
  if (!verified) return;

  const token = await getAuthToken();
  const email = localStorage.getItem("email");

  try {
    const res = await fetch(`${backendUrl}/api/wallet/deposit/flutterwave`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount, email })
    });
    const data = await res.json();
    if (data.data && data.data.link) window.open(data.data.link, "_blank");
    else alert("Failed to initialize Flutterwave payment");
    setTimeout(updateWalletBalance, 5000);
  } catch (err) {
    console.error(err);
    alert("Error funding wallet");
  }
}

/* ---------------- PURCHASE ---------------- */
async function purchase(type) {
  const amount = parseFloat(document.getElementById(`${type}Amount`).value);
  const detailsInput = document.getElementById(`${type}Details`).value;
  if (!amount || amount <= 0) return alert("Enter valid amount");

  const verified = await verifyPinOrBiometric(`Purchase ${type}`);
  if (!verified) return;

  const token = await getAuthToken();
  try {
    const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, amount, details: { info: detailsInput } })
    });
    const data = await res.json();
    if (res.ok) {
      showReceipt(data.receipt.reference, data.receipt);
      updateWalletBalance();
      loadTransactions();
      const sound = document.getElementById("successSound");
      if (sound) sound.play();
    } else alert(data.error || "Purchase failed");
  } catch (err) {
    console.error(err);
    alert("Error making purchase");
  }
}

/* ---------------- SHOW RECEIPT ---------------- */
function showReceipt(reference, receiptData = null) {
  const modal = document.getElementById("receiptModal");
  const receiptContainer = document.getElementById("receiptContent");

  let html = `<img src="logo.png" class="receipt-logo"><h3>MAY-Connect Receipt</h3>`;
  if (receiptData) {
    html += `<p>Reference: ${receiptData.reference}</p>`;
    html += `<p>Type: ${receiptData.type}</p>`;
    html += `<p>Amount: ₦${receiptData.amount}</p>`;
    html += `<p>Status: ${receiptData.status}</p>`;
    html += `<p>Date: ${new Date(receiptData.date).toLocaleString()}</p>`;
  } else html += `<p>Reference: ${reference}</p>`;

  receiptContainer.innerHTML = html;
  modal.style.display = "block";
}

/* ---------------- CLOSE MODALS ---------------- */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
}
