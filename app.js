// ========================================
// CONFIG
// ========================================

const API = "https://mayconnect-backend-1.onrender.com"
const token = localStorage.getItem("token")

// ========================================
// PAGE GUARD
// ========================================

const currentPage = window.location.pathname

if (!token && !currentPage.includes("index.html")) {
  window.location.href = "index.html"
}

if (token && currentPage.includes("index.html")) {
  window.location.href = "dashboard.html"
}

// ========================================
// SOUNDS
// ========================================

const welcomeSound = new Audio("sounds/welcome.mp3")
const successSound = new Audio("sounds/success.mp3")

// ========================================
// AUTH FUNCTIONS
// ========================================

async function login() {
  const username = document.getElementById("loginUsername").value
  const password = document.getElementById("loginPassword").value

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })

  const data = await res.json()
  if (!res.ok) return alert(data.message)

  localStorage.setItem("token", data.token)
  window.location.href = "dashboard.html"
}

async function signup() {
  const username = document.getElementById("signupUsername").value
  const email = document.getElementById("signupEmail").value
  const password = document.getElementById("signupPassword").value

  const res = await fetch(`${API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  })

  const data = await res.json()
  if (!res.ok) return alert(data.message)

  localStorage.setItem("token", data.token)
  window.location.href = "dashboard.html"
}

// ========================================
// SET TRANSACTION PIN
// ========================================

async function setPin() {
  const pin = document.getElementById("setPinInput").value

  const res = await fetch(`${API}/set-pin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ pin })
  })

  const data = await res.json()
  alert(data.message)
}

// ========================================
// DASHBOARD LOAD
// ========================================

async function loadDashboard() {
  if (!token) return

  const res = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  const user = await res.json()

  // Hello 👋 username
  const usernameDisplay = document.getElementById("usernameDisplay")
  if (usernameDisplay) {
    usernameDisplay.innerHTML = `Hello 👋 ${user.username}`
  }

  // Wallet balance
  const wallet = document.getElementById("walletBalance")
  if (wallet) {
    wallet.innerText = `₦${Number(user.wallet_balance).toLocaleString()}`
  }

  // Admin panel
  if (user.is_admin) {
    const adminPanel = document.getElementById("adminPanel")
    if (adminPanel) adminPanel.style.display = "block"

    const profitRes = await fetch(`${API}/admin/profit`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const profitData = await profitRes.json()

    const adminWallet = document.getElementById("adminWallet")
    if (adminWallet) {
      adminWallet.innerText = `₦${Number(profitData.admin_wallet).toLocaleString()}`
    }
  }

  loadTransactions()   // ✅ VERY IMPORTANT
  welcomeSound.play()
}

loadDashboard()

// ========================================
// LOAD TRANSACTION HISTORY
// ========================================

async function loadTransactions() {
  if (!token) return

  const res = await fetch(`${API}/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  const transactions = await res.json()
  const container = document.getElementById("transactionHistory")
  if (!container) return

  container.innerHTML = ""

  if (!transactions.length) {
    container.innerHTML = "<p>No transactions yet</p>"
    return
  }

  transactions.reverse().forEach(tx => {
    container.innerHTML += `
      <div class="transaction-card">
        <h4>${tx.network || ""} - ${tx.type}</h4>
        <p>₦${Number(tx.amount).toLocaleString()}</p>
        <small>Status: ${tx.status}</small><br>
        <small>${new Date(tx.created_at).toLocaleString()}</small>
      </div>
    `
  })
}

// ========================================
// LOAD DATA PLANS (FILTERED CORRECTLY)
// ========================================

async function loadPlans(network) {

  document.querySelectorAll(".network-logo").forEach(logo => {
    logo.classList.remove("active-network")
  })

  const activeLogo = document.getElementById(network)
  if (activeLogo) activeLogo.classList.add("active-network")

  const res = await fetch(`${API}/plans?network=${network}`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  const plans = await res.json()
  const container = document.getElementById("plansContainer")
  if (!container) return

  container.innerHTML = ""

  plans.forEach(plan => {
    container.innerHTML += `
      <div class="plan-card">
        <h4>${plan.name}</h4>
        <p>₦${Number(plan.price).toLocaleString()}</p>
        <button onclick="openPinModal(${plan.plan_id}, 'data')">Buy</button>
      </div>
    `
  })
}

// ========================================
// PURCHASE
// ========================================

let selectedPlan = null
let purchaseType = null

function openPinModal(id, type) {
  selectedPlan = id
  purchaseType = type
  document.getElementById("pinModal").style.display = "flex"
}

function closePinModal() {
  document.getElementById("pinModal").style.display = "none"
}

async function confirmPurchase() {
  const phone = document.getElementById("phoneInput").value
  const pin = document.getElementById("pinInput").value

  const res = await fetch(`${API}/buy-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      plan_id: selectedPlan,
      phone,
      pin
    })
  })

  const data = await res.json()
  if (!res.ok) return alert(data.message)

  successSound.play()
  alert("Purchase successful")
  closePinModal()
  loadDashboard()
}

// ========================================
// ADMIN WITHDRAW
// ========================================

function openWithdrawModal(){
  document.getElementById("withdrawModal").style.display="flex"
}

function closeWithdrawModal(){
  document.getElementById("withdrawModal").style.display="none"
}

async function confirmWithdraw(){
  const bank = document.getElementById("bankName").value
  const account_number = document.getElementById("accountNumber").value
  const account_name = document.getElementById("accountName").value
  const amount = document.getElementById("withdrawAmount").value

  const res = await fetch(`${API}/admin/withdraw`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization:`Bearer ${token}`
    },
    body:JSON.stringify({ bank, account_number, account_name, amount })
  })

  const data = await res.json()
  if(!res.ok) return alert(data.message)

  alert("Withdrawal recorded")
  closeWithdrawModal()
  loadDashboard()
}

// ========================================
// LOGOUT
// ========================================

function logout() {
  localStorage.removeItem("token")
  window.location.href = "index.html"
}