const API = "https://mayconnect-backend-1.onrender.com"; // One backend for all companies

let cachedPlans = [];
let cachedAdminPlans = [];
let currentUser = null;
let ws = null;

let selectedNetwork = null;
let selectedPlan = null;
let airtimeNetwork = null;
let actionType = null;
let editingPlanId = null;
let selectedPlanId = null;
let selectedPhone = null;

/* ================= HELPERS ================= */
function getToken() { return localStorage.getItem("token"); }
function el(id) { return document.getElementById(id); }
function formatNaira(num) { return "₦" + Number(num || 0).toLocaleString(); }
function formatDate(date) { return new Date(date).toLocaleDateString('en-GB'); }
function openModal(id) { const m = el(id); if (m) m.style.display = "flex"; }
function closeModal(id) { const m = el(id); if (m) m.style.display = "none"; }

/* ================= WEBAUTHN HELPERS ================= */
function bufferEncode(value) {
  if (!value) return null;
  const uint8Array = new Uint8Array(value);
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bufferDecode(value) {
  if (!value) return null;
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/* ================= MESSAGE MODAL ================= */
function showMsg(msg, type = "info") {
  const color = type === "error"? "#ff4d4d" : type === "success"? "#00c853" : "#2196f3";
  el("msgBox").innerHTML = `
    <div style="text-align:center">
      <p style="color:${color};margin-bottom:16px">${msg}</p>
      <button onclick="closeModal('msgModal')" class="primaryBtn">OK</button>
    </div>`;
  openModal("msgModal");
}

/* ================= INPUT MODAL ================= */
function showInputModal(title, placeholder, callback) {
  el("msgBox").innerHTML = `
    <div style="text-align:center">
      <h3 style="margin-bottom:12px">${title}</h3>
      <input id="modalInput" type="text" placeholder="${placeholder}" style="width:100%;padding:10px;margin-bottom:16px" />
      <div style="display:flex;gap:8px;justify-content:center">
        <button id="modalCancelBtn" class="secondaryBtn">Cancel</button>
        <button id="modalOkBtn" class="primaryBtn">OK</button>
      </div>
    </div>`;
  openModal("msgModal");
  setTimeout(() => el("modalInput")?.focus(), 100);

  el("modalCancelBtn").onclick = () => closeModal("msgModal");
  el("modalOkBtn").onclick = () => {
    const val = el("modalInput").value;
    closeModal("msgModal");
    if (val) callback(val);
  };
}

/* ================= LOADER ================= */
function showLoader(text = "Processing...") {
  el("msgBox").innerHTML = `<p style="text-align:center">${text}</p>`;
  openModal("msgModal");
}
function hideLoader() { closeModal("msgModal"); }

/* ================= AUTH ================= */
function checkAuth() {
  if (!getToken()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/* ================= LOAD DASHBOARD ================= */
async function loadDashboard() {
  if (!checkAuth()) return;

    initKycListeners(); // ADD THIS LINE RIGHT HERE
    
  try {
    const res = await fetch(API + "/api/me", { headers: { Authorization: "Bearer " + getToken() } });
    if (!res.ok) throw new Error("Failed to fetch user - " + res.status);
    const contentType = res.headers.get("content-type");
    if (!contentType ||!contentType.includes("application/json")) {
      throw new Error("Server returned non-JSON response");
    }
    currentUser = await res.json();
    window.CURRENT_USER_ID = currentUser.id;
    console.log("Current user tier:", currentUser.user_tier);
  } catch (e) {
    console.error("Load user error:", e);
    logout();
    return;
  }

  if (el("usernameDisplay")) el("usernameDisplay").innerText = "Hello " + currentUser.username;
  if (el("companyBadge")) el("companyBadge").innerText = currentUser.company.toUpperCase();

  if (currentUser && currentUser.is_admin === true) {
    document.querySelectorAll(".adminOnly").forEach(e => e.style.display = "block");
    if (el("adminWalletBalance")) el("adminWalletBalance").innerText = formatNaira(currentUser.admin_wallet);
    if (el("adminWalletBalance2")) el("adminWalletBalance2").innerText = formatNaira(currentUser.admin_wallet);
  }

  initNavigation();
  await loadAccount();
  await loadPlans();
  fetchTransactions();
  if (currentUser.is_admin) loadAdminData();
  checkBiometricStatus();

  setTimeout(connectWebSocket, 1000);
}

/* ================= NAV ================= */
function initNavigation() {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  el("home").style.display = "block";
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  el(id).style.display = "block";
  if (id === "profitDashboard") loadProfitDashboard();
  if (id === "topUsersManager") loadTopUsers();
  if (id === "withdrawals") {
    populateBankDropdown();
    loadWithdrawals();
  }
  if (id === "plansManager") loadAdminPlans();
  if (id === "usersManager") loadAdminUsers();
  if (id === "profile") checkBiometricStatus();
}

/* ================= WALLET ================= */
function updateWallet(balance) {
  if (el("walletBalance")) el("walletBalance").innerText = formatNaira(balance);
}

async function loadWallet() {
  const res = await fetch(API + "/api/me", { headers: { Authorization: "Bearer " + getToken() } });
  const user = await res.json();

  updateWallet(user.wallet_balance);

  const wallet = user.wallet || {};
  const dva = wallet.dva || {};

  // --- PAYMENTPOINT DVA FOR ALL COMPANIES ---
  const dvaContainer = el("dvaContainer");
  if (dvaContainer) {
    if (dva.accountNumber) {
      dvaContainer.innerHTML = `
        <div class="walletCard">
          <h4>PaymentPoint Virtual Account</h4>
          <p><strong>Bank:</strong> ${dva.bankName || 'N/A'}</p>
          <p><strong>Account Number:</strong> ${dva.accountNumber} 
            <button onclick="copyToClipboard('${dva.accountNumber}')" class="smallBtn">Copy</button>
          </p>
          <p><strong>Account Name:</strong> ${dva.accountName || user.username}</p>
          <small style="opacity:0.7">Transfer to this account to fund your wallet instantly. Use exact amount.</small>
        </div>`;
    } else {
      // No DVA yet - show generate button
      dvaContainer.innerHTML = `
        <button onclick="generateDVA()" class="primaryBtn">Generate Virtual Account</button>`;
    }
  }

  // --- RENDER TRANSACTIONS ---
  const list = el("walletTransactionsList");
  const transactions = wallet.transactions || [];
  if (list) {
    if (!transactions.length) {
      list.innerHTML = `<p style="opacity:0.6;text-align:center;">No wallet transactions yet</p>`;
      return;
    }
    list.innerHTML = "";
    transactions.forEach(tx => {
      const statusColor = tx.tx_status === "SUCCESS" ? "#00c853" : tx.tx_status === "PENDING" ? "#ffa000" : "#ff4d4d";
      const wasManual = tx.metadata?.manual_deducted ? '<span class="badge badgeWarning">MANUAL</span>' : '';
      const wasReversed = tx.metadata?.reversed ? '<span class="badge badgeDanger">REVERSED</span>' : '';

      list.innerHTML += `
        <div class="transactionCard">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
            <div>
              <strong>${tx.type || 'Wallet Tx'}</strong> ${wasManual} ${wasReversed}<br>
              <small style="font-family:monospace">${tx.reference || 'N/A'}</small>
            </div>
            <div style="text-align:right">
              <strong style="font-size:18px">${formatNaira(tx.amount || 0)}</strong><br>
              <span style="color:${statusColor};font-weight:600">${tx.tx_status || tx.type.toUpperCase()}</span>
            </div>
          </div>
          <small style="opacity:0.5">${formatDate(tx.created_at)}</small>
        </div>`;
    });
  }
}

// Helper for copy button
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  showMsg("Copied to clipboard!", "success");
}

/* ================= TRANSACTIONS ================= */
async function fetchTransactions() {
  try {
    const res = await fetch(API + "/api/transactions", {
      headers: { Authorization: "Bearer " + getToken() }
    });
    if (!res.ok) throw new Error("Failed to fetch transactions - " + res.status);
    const contentType = res.headers.get("content-type");
    if (!contentType ||!contentType.includes("application/json")) {
      throw new Error("Server returned non-JSON response");
    }
    const tx = await res.json();

    if (el("transactionHistory")) {
      el("transactionHistory").innerHTML = "";
      tx.slice(0, 5).forEach(t => {
        const card = txCard(t);
        card.onclick = () => showReceipt({
          number: t.phone || t.reference,
          network: t.network,
          plan: t.plan_name || t.type,
          type: t.type,
          date: new Date(t.created_at).toLocaleString(),
          price: t.amount,
          status: t.status,
          txnId: t.reference,
          id: t.id
        });
        el("transactionHistory").appendChild(card);
      });
    }

    if (el("allTransactions")) {
      el("allTransactions").innerHTML = "";
      tx.forEach(t => {
        const card = txCard(t);
        card.onclick = () => showReceipt({
          number: t.phone || t.reference,
          network: t.network,
          plan: t.plan_name || t.type,
          type: t.type,
          date: new Date(t.created_at).toLocaleString(),
          price: t.amount,
          status: t.status,
          txnId: t.reference,
          id: t.id
        });
        el("allTransactions").appendChild(card);
      });
    }
  } catch (e) {
    console.error("Fetch transactions error:", e);
    if (el("transactionHistory")) {
      el("transactionHistory").innerHTML = "<p style='color:#ff4d4d'>Failed to load transactions</p>";
    }
  }
}

function txCard(t) {
  const div = document.createElement("div");
  div.className = "transactionCard";
  const statusColor = t.status === "SUCCESS"? "#00c853" : t.status === "FAILED"? "#ff4d4d" : "#ffa000";
  div.innerHTML = `
    <strong>${t.type}</strong> ${formatNaira(t.amount)}<br>
    ${t.phone || t.network || t.reference || ""}<br>
    <span style="color:${statusColor}">${t.status}</span>
    <small style="float:right">${formatDate(t.created_at)}</small>`;
  div.style.cursor = "pointer";
  return div;
}

/* ================= PLANS ================= */
async function loadPlans() {
  try {
    const res = await fetch(API + "/api/plans", {
      headers: { Authorization: "Bearer " + getToken() }
    });
    if (!res.ok) throw new Error("Failed to fetch plans - " + res.status);
    const contentType = res.headers.get("content-type");
    if (!contentType ||!contentType.includes("application/json")) {
      throw new Error("Server returned non-JSON response");
    }
    const data = await res.json();
    cachedPlans = Array.isArray(data)? data : [];
    renderPlans();
  } catch (e) {
    console.log("PLANS ERROR", e);
    const list = el("planList");
    if (list) list.innerHTML = "<p style='color:#ff4d4d'>Failed to load plans. Please refresh.</p>";
  }
}

function selectNetwork(network, element) {
  selectedNetwork = (network || "").toLowerCase();
  selectedPlan = null;
  document.querySelectorAll(".networkItem").forEach(n => n.classList.remove("active"));
  if (element) element.classList.add("active");
  renderPlans();
}

function selectAirtimeNetwork(network, element) {
  airtimeNetwork = network;
  document.querySelectorAll(".airtimeNet").forEach(n => n.classList.remove("active"));
  if (element) element.classList.add("active");
}

// Get correct price based on user tier
function getPlanPrice(plan) {
  const tier = currentUser?.user_tier || 'default';
  if (tier === 'top' && plan.top_price) return Number(plan.top_price);
  if (tier === 'regular' && plan.regular_price) return Number(plan.regular_price);
  return Number(plan.price);
}

function renderPlans() {
  const list = el("planList");
  if (!list) return;

  list.innerHTML = "";

  if (!selectedNetwork) {
    list.innerHTML = "<p>Select a network first</p>";
    return;
  }

  const filtered = cachedPlans.filter(p => (p.network || "").toLowerCase() === selectedNetwork && p.is_active!== false);

  if (!filtered.length) {
    list.innerHTML = "<p>No plans available for this network</p>";
    return;
  }

  const tier = currentUser?.user_tier || 'default';
  console.log("Rendering plans for tier:", tier);

  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "planItem";

    const priceDisplay = getPlanPrice(p);
    let badge = "";

    if (tier === 'top') {
      badge = `<span class="topUserBadge">TOP</span>`;
    } else if (tier === 'regular' && p.regular_price) {
      badge = `<span class="regularUserBadge" style="position:absolute;top:8px;right:8px;background:#ffa000;padding:2px 6px;border-radius:4px;font-size:10px;">REGULAR</span>`;
    }

    const validityText = p.validity ? `${p.validity} Days` : "";

    div.innerHTML = `
      <strong>${p.name}</strong> ${badge}<br>
      ${validityText}<br>
      <strong>${formatNaira(priceDisplay)}</strong>
    `;

    div.onclick = () => {
      selectedPlan = {...p, price: priceDisplay };
      openPurchaseModal(p.id, p.name, priceDisplay);
    };

    list.appendChild(div);
  });
}

/* ================= BIOMETRIC - NEW VERSION ================= */
// Saka wannan a saman app.js
/* ================= BIOMETRIC STATUS ================= */
async function checkBiometricStatus() {
  const elStatus = el("biometricStatus");
  const enableBtn = el("enableBiometricBtn");
  const loginBtn = el("biometricLoginBtn");
  if (!elStatus) return;

  if (!window.isSecureContext) {
    elStatus.innerHTML = "Status: <span style='color:orange'>HTTPS required</span>";
    if (enableBtn) enableBtn.style.display = "none";
    if (loginBtn) loginBtn.style.display = "none";
    return;
  }

  if (!window.PublicKeyCredential) {
    elStatus.innerHTML = "Status: <span style='color:red'>Not supported</span>";
    if (enableBtn) enableBtn.style.display = "none";
    if (loginBtn) loginBtn.style.display = "none";
    return;
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      elStatus.innerHTML = "Status: <span style='color:orange'>No fingerprint enrolled</span>";
      if (enableBtn) enableBtn.style.display = "none";
      if (loginBtn) loginBtn.style.display = "none";
      return;
    }

    const res = await fetch(API + '/api/auth/webauthn/check-enabled', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });

    if (!res.ok) throw new Error("Server error " + res.status);
    const data = await res.json();

    if (data.enabled) {
      elStatus.innerHTML = "Status: <span style='color:green'>Enabled ✓</span>";
      if (enableBtn) enableBtn.style.display = "none";
      if (loginBtn) loginBtn.style.display = "inline-block";
    } else {
      elStatus.innerHTML = "Status: <span style='color:orange'>Available - click to enable</span>";
      if (enableBtn) enableBtn.style.display = "inline-block";
      if (loginBtn) loginBtn.style.display = "none";
    }
  } catch (e) {
    elStatus.innerHTML = "Status: <span style='color:red'>Check failed</span>";
    console.error("Biometric check error:", e);
    if (enableBtn) enableBtn.style.display = "none";
    if (loginBtn) loginBtn.style.display = "none";
  }
}

/* ================= ENABLE BIOMETRIC ================= */
window.enableBiometric = async function() {
  const btn = el("enableBiometricBtn");
  if (btn) { btn.disabled = true; btn.textContent = 'Setting up...'; }

  try {
    const startRes = await fetch(API + '/api/auth/webauthn/register-start', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });

    if (!startRes.ok) throw new Error("Failed to start - " + startRes.status);
    const options = await startRes.json();
    if (options.error) throw new Error(options.error);

    // LIBRARY ZAI YI DUK ENCODING - NAN FINGERPRINT ZAI NUNA SUNAN COMPANY + LOGO
    const regResp = await startRegistration(options);

    showLoader('Saving credential...');
    const finishRes = await fetch(API + '/api/auth/webauthn/register-finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(regResp)
    });

    hideLoader();
    const result = await finishRes.json();

    if (finishRes.ok && result.verified) {
      showMsg('Fingerprint enabled! Next login will show ' + window.location.hostname, 'success');
      checkBiometricStatus();
    } else {
      throw new Error(result.error || 'Verification failed');
    }

  } catch (e) {
    hideLoader();
    if (e.name === 'NotAllowedError') {
      showMsg('Cancelled or timed out', 'error');
    } else if (e.name === 'InvalidStateError') {
      showMsg('Already enabled. Clear site data first.', 'error');
    } else {
      showMsg('Error: ' + e.message, 'error');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🫆 Enable Fingerprint'; }
  }
}

/* ================= LOGIN WITH BIOMETRIC - BABU EMAIL ================= */
window.loginWithBiometric = async function() {
  const btn = el("biometricLoginBtn");
  if (btn) { btn.disabled = true; btn.textContent = 'Waiting...'; }

  try {
    showLoader('Starting...');
    const startRes = await fetch(API + '/api/auth/webauthn/login-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
      // BABU EMAIL - BUTTON DAYA KAWAI
    });

    if (!startRes.ok) throw new Error("Failed to start - " + startRes.status);
    const options = await startRes.json();
    if (options.error) throw new Error(options.error);

    hideLoader();
    showLoader('Touch fingerprint...');

    // LIBRARY ZAI YI DUK - FINGERPRINT INSTANT
    const authResp = await startAuthentication(options);

    showLoader('Verifying...');
    const finishRes = await fetch(API + '/api/auth/webauthn/login-finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authResp) // BABU EMAIL
    });

    hideLoader();
    const result = await finishRes.json();

    if (finishRes.ok && result.token) {
      localStorage.setItem('token', result.token);
      location.reload();
    } else {
      throw new Error(result.error || 'Login failed');
    }

  } catch (e) {
    hideLoader();
    if (e.name === 'NotAllowedError') {
      showMsg('Cancelled or timed out', 'error');
    } else {
      showMsg('Biometric error: ' + e.message, 'error');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🫆 Login with Fingerprint'; }
  }
}

// Call on page load
document.addEventListener('DOMContentLoaded', checkBiometricStatus);
/* ================= PURCHASE WITH BIOMETRIC - NEW VERSION ================= */
async function purchaseWithBiometric() {
  if (!selectedPhone) return showMsg('Enter phone number first', 'error');

  try {
    closeModal('pinModal');
    showLoader('Touch fingerprint...');

    // 1. START - Yi amfani da login-start maimakon verify-purchase
    // Saboda backend din da na turo maka yana da login-start/login-finish kawai
    const startRes = await fetch(API + '/api/auth/webauthn/login-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!startRes.ok) throw new Error('Failed to start biometric');
    const options = await startRes.json();
    if (options.error) throw new Error(options.error);

    hideLoader();
    
    // 2. LIBRARY ZAI YI DUK - BABU MANUAL ENCODING
    const { startAuthentication } = await import('https://unpkg.com/@simplewebauthn/browser/dist/bundle/index.js');
    const authResp = await startAuthentication(options);

    // 3. FINISH - Verify
    showLoader('Verifying...');
    const verifyRes = await fetch(API + '/api/auth/webauthn/login-finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authResp)
    });

    hideLoader();
    const result = await verifyRes.json();

    if (!verifyRes.ok || !result.token) {
      throw new Error(result.error || 'Verification failed');
    }

    // 4. Idan biometric ya yi success, yi purchase da PIN 'biometric_verified'
    showMsg('Fingerprint verified ✓', 'success');
    
    if (actionType === "DATA") buyData('biometric_verified');
    if (actionType === "AIRTIME") buyAirtime('biometric_verified');

  } catch (e) {
    hideLoader();
    if (e.name === 'NotAllowedError') {
      showMsg('Fingerprint cancelled', 'error');
    } else {
      showMsg('Error: ' + e.message, 'error');
    }
    // Bude pin modal din baya idan biometric ya fadi
    openModal('pinModal');
  }
}

/* ================= BUY DATA - WITH TEEVERSH RECEIPT ================= */
async function buyData(pin) {
  const phone = selectedPhone || el("dataPhone")?.value;

  if (!phone || !selectedPlanId) return showMsg("Select plan & enter phone", "error");
  if (!pin) return showMsg("Enter PIN", "error");

  showLoader("Purchasing data...");

  try {
    const res = await fetch(API + "/api/buy-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ phone, plan_id: selectedPlanId, pin })
    });

    const data = await res.json();
    hideLoader();

    if (res.ok && data.success !== false) {
      updateWallet(data.balance);
      fetchTransactions();
      
      // Show TEEVERSH receipt
      showReceipt({
        number: data.phone || phone,
        network: data.network || selectedNetwork?.toUpperCase(),
        plan: data.plan_name || selectedPlan?.name,
        amount: data.amount,  // use API response, not selectedPlan.price
        date: data.created_at || new Date().toISOString(),
        txnId: data.reference || data.transaction_id || data.tx_id,
        status: data.status || 'SUCCESS'
      });

      if (el("dataPhone")) el("dataPhone").value = '';
    } else {
      showMsg(data.message || "Purchase failed", "error");
    }
  } catch (err) {
    hideLoader();
    showMsg("Network error. Try again.", "error");
  }
}

/* ================= BUY AIRTIME - WITH TEEVERSH RECEIPT ================= */
async function buyAirtime(pin) {
  const phone = selectedPhone || el("airtimePhone")?.value;
  const amount = el("airtimeAmount")?.value;

  if (!phone || !amount || !airtimeNetwork) return showMsg("Fill all fields", "error");
  if (!pin) return showMsg("Enter PIN", "error");

  showLoader("Purchasing airtime...");

  try {
    const res = await fetch(API + "/api/buy-airtime", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ phone, amount, network: airtimeNetwork, pin })
    });

    const data = await res.json();
    hideLoader();

    if (res.ok && data.success !== false) {
      updateWallet(data.balance);
      fetchTransactions();

      // Show TEEVERSH receipt
      showReceipt({
        number: data.phone || phone,
        network: data.network || airtimeNetwork?.toUpperCase(),
        plan: 'Airtime Top-up',
        amount: data.amount || amount,  // prefer API response
        date: data.created_at || new Date().toISOString(),
        txnId: data.reference || data.transaction_id || data.tx_id,
        status: data.status || 'SUCCESS'
      });

      if (el("airtimePhone")) el("airtimePhone").value = '';
      if (el("airtimeAmount")) el("airtimeAmount").value = '';
    } else {
      showMsg(data.message || "Purchase failed", "error");
    }
  } catch (err) {
    hideLoader();
    showMsg("Network error. Try again.", "error");
  }
}


/* ================= KYC MODAL HANDLERS ================= */
function openKycModal() {
  el("kycModal").style.display = "flex";
}

function closeKycModal() {
  el("kycModal").style.display = "none";
  el("idNumberInput").value = '';
  el("idError").style.display = 'none';
}

function initKycListeners() {
  if (!el('idTypeSelect')) return;

  el('idTypeSelect').addEventListener('change', () => {
    const idType = el('idTypeSelect').value;
    el('idNumberInput').placeholder = idType === 'bvn'? 'Enter 11-digit BVN' : 'Enter 11-digit NIN';
    el('idNumberInput').value = '';
    el('idError').style.display = 'none';
  });

  el('idNumberInput').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    if (e.target.value.length === 11) el('idError').style.display = 'none';
  });

  el('submitKycBtn').addEventListener('click', submitKycAndGenerate);
}

/* ================= DVA GENERATION - MATCHES YOUR HTML ================= */
async function handleGenerateClick() {
  showLoader("Checking account...");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(API + "/api/wallet/create-dva", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({}),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await res.json();

    console.log('DVA Response:', data);

    if (data.requireKyc === true) {
      hideLoader();
      openKycModal();
      return;
    }

    if (res.ok && data.success && (data.account_number || data.account?.account_number)) {
      const acc = data.account_number? data : data.account;
      updateWalletCard(acc);
      hideLoader();
      showMsg("Virtual account created successfully", "success");
    } else {
      hideLoader();
      showMsg(data.error || data.message || "Failed to generate account", "error");
    }
  } catch (err) {
    hideLoader();
    console.error("DVA Error:", err);
    if (err.name === 'AbortError') {
      showMsg("Request timeout. Please try again.", "error");
    } else {
      showMsg(err.message || "Network error. Check your connection.", "error");
    }
  }
}

// Submit from KYC modal
async function submitKycAndGenerate() {
  const idType = el('idTypeSelect').value;
  const idNumber = el('idNumberInput').value;
  const idError = el('idError');

  if (idNumber.length!== 11) {
    idError.textContent = `${idType.toUpperCase()} must be exactly 11 digits`;
    idError.style.display = 'block';
    return;
  }

  const body = {};
  body[idType] = idNumber;

  closeKycModal();
  showLoader("Verifying & generating account...");

  try {
    const res = await fetch(API + "/api/wallet/create-dva", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.success && data.account_number) {
      updateWalletCard(data);
      hideLoader();
      showMsg("Account generated successfully!", "success");
      await loadAccount();
    } else if (data.requireKyc === true) {
      hideLoader();
      idError.textContent = data.message || "Verification failed. Check your BVN/NIN";
      idError.style.display = 'block';
      openKycModal();
    } else {
      hideLoader();
      idError.textContent = data.error || data.message || "Verification failed";
      idError.style.display = 'block';
      openKycModal();
    }
  } catch (err) {
    hideLoader();
    idError.textContent = err.message || 'Network error. Try again.';
    idError.style.display = 'block';
    openKycModal();
  }
}

function updateWalletCard(data) {
  el("bankName").innerText = data.bank_name || "Bank Name";
  el("accountNumber").innerText = data.account_number || "0000000000";
  el("accountName").innerText = data.account_name || "Account Name";
  el("generateAccountBtn").style.display = "none";
}




// Init on load
document.addEventListener('DOMContentLoaded', initKycListeners);



/* ================= ADMIN: TRANSACTIONS MANAGER ================= */
async function loadAdminTransactions() {
  const status = el("txStatusFilter")?.value || "";
  const search = el("txSearch")?.value || "";
  const list = el("transactionsList");
  if (!list) return;

  list.innerHTML = `<p style="text-align:center;opacity:0.6">Loading transactions...</p>`;
  showLoader("Loading transactions...");
  
  try {
    const token = getToken();
    if (!token) {
      hideLoader();
      list.innerHTML = `<p style="color:red;text-align:center">Not authenticated. Please login again.</p>`;
      return;
    }

    // Removed provider param - backend doesn't use it
    const url = `${API}/admin/wallet/transactions?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}&t=${Date.now()}`;
    console.log("[ADMIN TX] Fetching:", url);
    
    const res = await fetch(url, {
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(errData.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    hideLoader();

    const transactions = Array.isArray(data) ? data : [];
    console.log("[ADMIN TX] Loaded:", transactions.length, "transactions");
    
    list.innerHTML = "";
    if (!transactions.length) {
      list.innerHTML = `<p style="text-align:center;opacity:0.6">No transactions found</p>`;
      return;
    }

    transactions.forEach(tx => {
      const isManual = tx.metadata?.manual_deducted;
      const isReversed = tx.metadata?.reversed;
      
      // Determine display status from type and metadata
      let displayStatus = tx.type === 'credit' ? 'CREDIT' : 'DEBIT';
      let statusColor = tx.type === 'credit' ? "#00c853" : "#ff4d4d";
      
      if (isManual) {
        displayStatus = "MANUAL DEDUCT";
        statusColor = "#ffa000";
      }
      if (isReversed) {
        displayStatus = "REVERSED";
        statusColor = "#ff4d4d";
      }

      const wasManual = isManual ? '<span class="badge badgeWarning">MANUAL</span>' : '';
      const wasReversed = isReversed ? '<span class="badge badgeDanger">REVERSED</span>' : '';

      list.innerHTML += `
        <div class="transactionCard">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
            <div>
              <strong>${tx.type || 'Transaction'}</strong> ${wasManual} ${wasReversed}<br>
              <small style="opacity:0.7">${tx.username || 'N/A'} - ${tx.email || 'N/A'}</small><br>
              <small style="font-family:monospace">${tx.reference || 'N/A'}</small>
            </div>
            <div style="text-align:right">
              <strong style="font-size:18px">${formatNaira(tx.amount || 0)}</strong><br>
              <span style="color:${statusColor};font-weight:600">${displayStatus}</span><br>
              <small style="opacity:0.6">${tx.admin_email || 'System'}</small>
            </div>
          </div>

          <small style="opacity:0.5">${formatDate(tx.created_at)}</small>

          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            ${tx.type === 'debit' && !isManual && !isReversed ?
              `<button onclick="forceDeductTransaction('${tx.reference}', ${tx.amount})" class="warningBtn">Force Deduct</button>` : ''}

            ${tx.type === 'credit' && !isReversed ?
              `<button onclick="reverseTransaction('${tx.reference}')" class="dangerBtn">Reverse</button>` : ''}
          </div>
        </div>`;
    });
  } catch (e) {
    hideLoader();
    console.error("Load transactions error:", e);
    el("transactionsList").innerHTML = `<p style="color:red;text-align:center">Failed to load transactions: ${e.message}</p>`;
  }
}

async function forceDeductTransaction(reference, amount) {
  const reason = prompt(`Deduct ₦${formatNaira(amount)} from user wallet?\n\nEnter reason:`, "Admin manual deduction");
  if (!reason) return;

  if (!confirm(`Confirm deduction of ₦${formatNaira(amount)} from user wallet? This cannot be undone.`)) return;

  showLoader("Processing deduction...");
  try {
    const res = await fetch(API + "/admin/wallet/force-deduct", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ reference, reason })
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok ? "success" : "error");
    if (res.ok) {
      loadAdminTransactions();
      loadAdminUsers();
    }
  } catch (e) {
    hideLoader();
    console.error("Force deduct error:", e);
    showMsg("Server error", "error");
  }
}

async function reverseTransaction(reference) {
  const reason = prompt("Enter reason for reversal:", "Admin reversal");
  if (!reason) return;

  if (!confirm(`Confirm reversal of transaction ${reference}? User wallet will be refunded.`)) return;

  showLoader("Processing reversal...");
  try {
    const res = await fetch(API + "/admin/wallet/reverse", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ reference, reason })
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok ? "success" : "error");
    if (res.ok) {
      loadAdminTransactions();
      loadAdminUsers();
    }
  } catch (e) {
    hideLoader();
    console.error("Reverse transaction error:", e);
    showMsg("Server error", "error");
  }
}

/* ================= ADMIN: USERS MANAGER ================= */
async function loadAdminUsers() {
  const search = el("userSearch")?.value || "";
  try {
    const res = await fetch(`${API}/admin/users?search=${encodeURIComponent(search)}`, {
      headers: { Authorization: "Bearer " + getToken() }
    });
    if (!res.ok) throw new Error("Failed to load users");
    const users = await res.json();
    const list = el("adminUsersList");
    if (list) {
      list.innerHTML = "";
      if (!users.length) {
        list.innerHTML = `<p style="text-align:center;opacity:0.6">No users found</p>`;
        return;
      }
      users.forEach(u => {
        const tierColor = u.user_tier === 'top'? '#00c853' : u.user_tier === 'regular'? '#ffa000' : '#888';
        const tierBadge = `<span style="color:${tierColor};font-weight:bold">${u.user_tier.toUpperCase()}</span>`;
        list.innerHTML += `<div class="userCard">
          <strong>${u.username}</strong> - ${u.email} ${tierBadge}<br>
          Wallet: ${formatNaira(u.wallet_balance)} | Phone: ${u.phone || 'N/A'}<br>
          <select onchange="setUserTier(${u.id}, this.value)" class="tierSelect">
            <option value="default" ${u.user_tier === 'default'? 'selected' : ''}>Default</option>
            <option value="regular" ${u.user_tier === 'regular'? 'selected' : ''}>Regular</option>
            <option value="top" ${u.user_tier === 'top'? 'selected' : ''}>Top</option>
          </select>
        </div>`;
      });
    }
  } catch(e) {
    console.error("Load users error:", e);
    showMsg("Failed to load users", "error");
  }
}

async function setUserTier(id, tier) {
  showLoader("Updating tier...");
  try {
    const res = await fetch(`${API}/admin/users/set-tier`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ user_id: id, tier })
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message || "Tier updated", res.ok? "success" : "error");
    if (res.ok) {
      loadAdminUsers(); // Refresh users list
      broadcastTopUserUpdate(currentUser.company);
    }
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}
/* ================= ADMIN: PLANS MANAGER ================= */
async function loadAdminPlans() {
  try {
    const res = await fetch(API + "/admin/plans", {
      headers: { Authorization: "Bearer " + getToken() }
    });
    const plans = await res.json();
    cachedAdminPlans = plans;
    const list = el("adminPlansList");
    if (list) {
      list.innerHTML = "";
      plans.forEach(p => {
        const statusColor = p.is_active ? "#00c853" : "#ff4d4d";
        const restrictBadge = p.restricted ? `<span class="badge badgeWarning">RESTRICTED</span>` : '';
        const providerBadge = p.provider ? `<span class="badge">${p.provider.toUpperCase()}</span>` : '';
        
        const defaultDisplay = p.default_price != null && p.default_price !== '' ? formatNaira(p.default_price) : formatNaira(p.price);
        const regularDisplay = p.regular_price != null && p.regular_price !== '' ? formatNaira(p.regular_price) : '-';
        const topDisplay = p.top_price != null && p.top_price !== '' ? formatNaira(p.top_price) : '-';
        
        list.innerHTML += `<div class="planCard">
          <strong>${p.name}</strong> - ${p.network} ${restrictBadge} ${providerBadge}<br>
          Default: ${defaultDisplay} | Regular: ${regularDisplay} | Top: ${topDisplay} | Cost: ${formatNaira(p.cost)}<br>
          Provider: ${p.provider || 'N/A'} | Net ID: ${p.network_id || 'N/A'} | API ID: ${p.api_plan_id || 'N/A'}<br>
          <span style="color:${statusColor}">${p.is_active ? 'Active' : 'Disabled'}</span>
          <button onclick="editPlan(${p.id})" class="primaryBtn">Edit</button>
          <button onclick="togglePlan(${p.id}, ${!p.is_active})" class="dangerBtn">${p.is_active ? 'Disable' : 'Enable'}</button>
        </div>`;
      });
    }
  } catch(e) {
    console.error("Load admin plans error:", e);
  }
}

async function addPlan() {
  const plan = {
    plan_id: el("newPlanId")?.value,
    network: el("newPlanNetwork")?.value,
    name: el("newPlanName")?.value,
    price: el("newPlanPrice")?.value,
    default_price: el("newPlanDefaultPrice")?.value || null,
    regular_price: el("newPlanRegularPrice")?.value || null,
    top_price: el("newPlanTopPrice")?.value || null,
    cost: el("newPlanCost")?.value,
    validity: el("newPlanValidity")?.value,
    restricted: el("newPlanRestricted")?.checked,
    provider: el("newPlanProvider")?.value,
    network_id: el("newPlanNetworkId")?.value,
    api_plan_id: el("newPlanApiId")?.value
  };

  if (!plan.plan_id || !plan.network || !plan.name || !plan.price || !plan.cost || !plan.provider || !plan.network_id || !plan.api_plan_id) {
    return showMsg("Fill all required fields including provider details", "error");
  }

  showLoader("Adding plan...");
  try {
    const res = await fetch(API + "/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify(plan)
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok ? "success" : "error");
    if (res.ok) {
      loadAdminPlans();
      loadPlans();
      broadcastTopUserUpdate(currentUser.company);
    }
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

async function togglePlan(id, is_active) {
  showLoader("Updating...");
  try {
    const res = await fetch(`${API}/admin/plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ is_active })
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok ? "success" : "error");
    if (res.ok) {
      loadAdminPlans();
      loadPlans();
      broadcastTopUserUpdate(currentUser.company);
    }
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

async function editPlan(id) {
  const plan = cachedAdminPlans.find(p => p.id === id);
  if (!plan) return showMsg("Plan not found", "error");

  editingPlanId = id;

  if (el("editPlanName")) el("editPlanName").value = plan.name || "";
  if (el("editPlanPrice")) el("editPlanPrice").value = plan.price || "";
  if (el("editPlanDefaultPrice")) el("editPlanDefaultPrice").value = plan.default_price || "";
  if (el("editPlanRegularPrice")) el("editPlanRegularPrice").value = plan.regular_price || "";
  if (el("editPlanTopPrice")) el("editPlanTopPrice").value = plan.top_price || "";
  if (el("editPlanCost")) el("editPlanCost").value = plan.cost || "";
  if (el("editPlanValidity")) el("editPlanValidity").value = plan.validity || "";
  if (el("editPlanRestricted")) el("editPlanRestricted").checked = plan.restricted || false;
  if (el("editPlanProvider")) el("editPlanProvider").value = plan.provider || "";
  if (el("editPlanNetworkId")) el("editPlanNetworkId").value = plan.network_id || "";
  if (el("editPlanApiId")) el("editPlanApiId").value = plan.api_plan_id || "";
  if (el("editPlanActive")) el("editPlanActive").checked = plan.is_active !== false;

  openModal("editPlanModal");
}

async function savePlanEdit() {
  if (!editingPlanId) return;

  const updated = {
    name: el("editPlanName")?.value,
    price: el("editPlanPrice")?.value,
    default_price: el("editPlanDefaultPrice")?.value || null,
    regular_price: el("editPlanRegularPrice")?.value || null,
    top_price: el("editPlanTopPrice")?.value || null,
    cost: el("editPlanCost")?.value,
    validity: el("editPlanValidity")?.value,
    restricted: el("editPlanRestricted")?.checked,
    provider: el("editPlanProvider")?.value,
    network_id: el("editPlanNetworkId")?.value,
    api_plan_id: el("editPlanApiId")?.value,
    is_active: el("editPlanActive")?.checked
  };

  if (!updated.name || !updated.price || !updated.cost || !updated.provider || !updated.network_id || !updated.api_plan_id) {
    return showMsg("Name, Price, Cost, Provider, Network ID and API Plan ID are required", "error");
  }

  showLoader("Updating plan...");
  try {
    const res = await fetch(`${API}/admin/plans/${editingPlanId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify(updated)
    });
    const data = await res.json();
    hideLoader();
    closeModal("editPlanModal");
    showMsg(data.message, res.ok ? "success" : "error");
    if (res.ok) {
      loadAdminPlans();
      loadPlans();
      broadcastTopUserUpdate(currentUser.company);
    }
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}




/* ================= BROADCAST ================= */
function broadcastTopUserUpdate(company) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'tier_update',
      company: company
    }));
  }
}

/* ================= PASSWORD & PIN ================= */
async function submitPassword() {
  const oldPass = el("oldPassword").value;
  const newPass = el("newPassword").value;
  if (!oldPass ||!newPass) return showMsg("Fill fields", "error");

  showLoader("Updating...");
  const res = await fetch(API + "/api/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
    body: JSON.stringify({ oldPass, newPass })
  });
  const data = await res.json();
  hideLoader();
  showMsg(data.message, res.ok ? "success" : "error");
}

async function submitPin() {
  const oldPin = el("oldPin").value;
  const newPin = el("newPin").value;
  if (!oldPin ||!newPin) return showMsg("Fill fields", "error");

  showLoader("Updating...");
  const res = await fetch(API + "/api/change-pin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
    body: JSON.stringify({ oldPin, newPin })
  });
  const data = await res.json();
  hideLoader();
  showMsg(data.message, res.ok ? "success" : "error");
}

/* ================= ADMIN DATA LOADER ================= */
function loadAdminData() {
  loadAdminPlans();
  loadAdminUsers();
}




/* ================= WS ================= */
function connectWebSocket() {
  const wsURL = API.replace("https", "wss");
  ws = new WebSocket(wsURL + "?token=" + getToken());
  ws.onmessage = msg => {
    const data = JSON.parse(msg.data);
    if (data.type === "wallet_update") updateWallet(data.balance);
  };
  ws.onerror = () => console.log("WS error");
  ws.onclose = () => setTimeout(connectWebSocket, 5000);
}

/* ================= LOGOUT ================= */
function logout() {
  if (ws) ws.close();
  localStorage.clear();
  window.location.href = "login.html";
}

/* ================= START ================= */
document.addEventListener("DOMContentLoaded", loadDashboard);



