const API = "https://mayconnect-backend-1.onrender.com";

/* TOKEN */
function getToken() { return localStorage.getItem("token"); }

/* ELEMENT */
function el(id) { return document.getElementById(id); }

/* SUCCESS SOUND */
const successSound = new Audio("sounds/success.mp3");

/* TOAST */
function showToast(msg) {
  const t = document.createElement("div");
  t.innerText = msg;
  Object.assign(t.style, {
    position: "fixed", bottom: "30px", left: "50%",
    transform: "translateX(-50%)", background: "#000",
    padding: "12px 20px", borderRadius: "8px",
    color: "#fff", zIndex: "9999"
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* WALLET ANIMATION */
function animateWallet(newBalance) {
  const wallet = el("walletBalance");
  if (!wallet) return;
  let current = parseFloat(wallet.innerText.replace("₦", "")) || 0;
  const step = (current - newBalance) / 20;
  const interval = setInterval(() => {
    current -= step;
    if ((step>0 && current <= newBalance) || (step<0 && current >= newBalance)) {
      wallet.innerText = `₦${newBalance}`;
      clearInterval(interval);
    } else wallet.innerText = `₦${Math.floor(current)}`;
  }, 20);
}

/* SAVE TRANSACTION */
function saveTransaction(tx) {
  let history = JSON.parse(localStorage.getItem("transactions") || "[]");
  history.unshift(tx);
  localStorage.setItem("transactions", JSON.stringify(history));
  renderTransactions();
}

/* RENDER USER TRANSACTIONS */
function renderTransactions(transactions) {
  const container = el("transactionHistory");
  if (!container) return;
  container.innerHTML = "";
  const history = transactions || JSON.parse(localStorage.getItem("transactions") || "[]");
  history.slice(0, 5).forEach(tx => {
    const div = document.createElement("div");
    div.className = "transaction-card";
    div.innerHTML = `
      <p><strong>${tx.type}</strong> - ₦${tx.amount}</p>
      <p>${tx.phone || ""} (${tx.network || ""})</p>
      <p>${tx.date}</p>
    `;
    container.appendChild(div);
  });
}

/* FETCH USER TRANSACTIONS FROM SERVER */
async function fetchTransactions() {
  try {
    const token = getToken();
    const res = await fetch(`${API}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) {
      localStorage.setItem("transactions", JSON.stringify(data));
      renderTransactions(data);
    }
  } catch(e){ console.log("Failed to fetch transactions", e); }
}

/* NETWORK DETECTION */
const NETWORK_PREFIX = {
  MTN: ["0803","0806","0703","0706","0813","0816","0810","0814","0903","0906","0913","0916"],
  AIRTEL: ["0802","0808","0701","0708","0812","0901","0902","0907","0911","0912"],
  GLO: ["0805","0807","0705","0811","0815","0905","0915"],
  "9MOBILE": ["0809","0817","0818","0908","0909"]
};
function detectNetwork(phone) {
  if (!phone) return null;
  phone = phone.replace(/\D/g, "");
  if (phone.startsWith("234")) phone = "0" + phone.slice(3);
  const prefix = phone.substring(0, 4);
  for (const net in NETWORK_PREFIX) if (NETWORK_PREFIX[net].includes(prefix)) return net;
  return null;
}
function showNetworkLogo(network) {
  const logo = el("networkLogo");
  if (!logo) return;
  const logos = { MTN:"images/Mtn.png", AIRTEL:"images/Airtel.png", GLO:"images/Glo.png", "9MOBILE":"images/9mobile.png" };
  logo.src = logos[network] || "";
  logo.style.display = network ? "block":"none";
}
let lastNetworkLoaded = null;
function handlePhoneInput(input) {
  const phone = input.value;
  if (phone.length < 4) return;
  const network = detectNetwork(phone);
  showNetworkLogo(network);
  if (!network || network === lastNetworkLoaded) return;
  lastNetworkLoaded = network;
  loadDataPlans(network);
}

/* LOAD DATA PLANS */
async function loadDataPlans(network) {
  try {
    const res = await fetch(`${API}/api/plans?network=${network}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const plans = await res.json();
    const container = el("plans");
    if (!container) return;
    container.innerHTML = "";
    plans.forEach(plan => {
      const name = plan.plan || plan.name || "Data Plan";
      const price = plan.price || plan.amount || 0;
      const validity = plan.validity || "N/A";
      const id = plan.plan_id || plan.id;
      const card = document.createElement("div");
      card.className = "planCard";
      card.dataset.price = price;
      card.dataset.planId = id;
      card.onclick = () => {
        document.querySelectorAll(".planCard").forEach(c=>c.classList.remove("selected"));
        card.classList.add("selected");
      };
      card.innerHTML = `<h4>${name}</h4><p>₦${price}</p><p>Validity: ${validity}</p><button onclick="purchasePlan('${id}')">Buy</button>`;
      container.appendChild(card);
    });
  } catch(e) { showToast("Failed to load plans"); }
}

/* PURCHASE & PIN */
let selectedPlan = null;
let purchaseType = null;

function openPinModal(plan, type) {
  selectedPlan = plan; purchaseType = type;
  const modal = el("pinModal"); if (!modal) return;
  modal.classList.remove("hidden");
  const title = el("pinModalTitle"); const body = el("pinModalBody"); if (!title || !body) return;

  if(type==="setPin") {
    title.innerText="Set Transaction PIN";
    body.innerHTML=`<input type="password" id="pinInput" placeholder="Enter 4-digit PIN" maxlength="4"><button onclick="savePin()">Save PIN</button>`;
  } else if(type==="data"||type==="airtime") {
    title.innerText="Enter Transaction PIN";
    body.innerHTML=`<input type="password" id="pin" placeholder="PIN" maxlength="4"><button onclick="confirmPurchase()">Confirm</button>`;
  }
}
function closePinModal(){ el("pinModal")?.classList.add("hidden"); }
function savePin() { 
  const pin = el("pinInput")?.value; 
  if(!pin||pin.length!==4) return showToast("Enter 4-digit PIN"); 
  localStorage.setItem("userPin",pin); 
  showToast("Transaction PIN set"); 
  closePinModal(); 
}
function verifyPin(pin){ return localStorage.getItem("userPin")===pin; }

/* PURCHASE HANDLERS */
function purchasePlan(planId){
  selectedPlan=planId; 
  purchaseType="data"; 
  if(!localStorage.getItem("userPin")) openPinModal(null,"setPin"); 
  else openPinModal(planId,"data"); 
}
async function confirmPurchase(){
  const pin=el("pin")?.value||localStorage.getItem("userPin");
  if(!pin) return showToast("Enter PIN");

  if(purchaseType==="airtime"){
    const phone=el("phone")?.value;
    const amount=parseFloat(el("amount")?.value||0);
    if(!phone||!amount) return showToast("Phone and amount required");
    await buyAirtime(phone, amount, pin);
  } else if(purchaseType==="data") {
    const planId = selectedPlan || document.querySelector(".planCard.selected")?.dataset.planId;
    if(!planId) return showToast("Select a plan");
    const phone = el("phone")?.value;
    if(!phone) return showToast("Enter phone number");
    await buyData(planId, pin, phone);
  }

  closePinModal();
  fetchTransactions(); // Refresh transactions from backend
}

/* BUY DATA */
async function buyData(planId, pin, phone){
  try{
    const token = getToken();
    const res = await fetch(`${API}/api/buy-data`, {
      method:"POST",
      headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body: JSON.stringify({ plan_id: planId, phone, pin })
    });
    const data = await res.json();
    if(data.message){
      showToast(data.message);
      animateWallet(data.wallet_balance || parseFloat((el("walletBalance")?.innerText||"₦0").replace("₦","")));
    } else showToast(data.message || "Data purchase failed");
  }catch(e){ console.log(e); showToast("Data purchase failed"); }
}

/* BUY AIRTIME */
async function buyAirtime(phone, amount, pin){
  try{
    const token = getToken();
    const res = await fetch(`${API}/api/buy-airtime`, {
      method:"POST",
      headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body: JSON.stringify({ phone, amount, pin })
    });
    const data = await res.json();
    if(data.message){
      showToast(data.message);
      animateWallet(data.wallet_balance || parseFloat((el("walletBalance")?.innerText||"₦0").replace("₦","")));
    } else showToast(data.message || "Airtime failed");
  }catch(e){ console.log(e); showToast("Airtime failed"); }
}

/* DASHBOARD & ADMIN */
async function loadDashboard(){
  const token=getToken(); if(!token){ window.location="login.html"; return; }

  try{
    const res=await fetch(`${API}/api/me`,{headers:{Authorization:`Bearer ${token}`}});
    const user=await res.json();

    if(el("usernameDisplay")) el("usernameDisplay").innerText=`Hello ${user.username||"User"}`;
    if(el("walletBalance")) el("walletBalance").innerText=`₦${user.wallet_balance||0}`;

    const adminPanel=el("adminPanel");
    if(user.is_admin){
      adminPanel?.classList.remove("hidden");
      el("profitBalance")&&(el("profitBalance").innerText=`₦${user.admin_wallet||0}`);
      loadAdminTransactions();
    } else adminPanel?.classList.add("hidden");

    fetchTransactions(); // Load latest user transactions
    connectWalletWebSocket(user.id); // Connect WebSocket for live updates
  }catch(e){ showToast("Failed to load dashboard"); }
}

/* ADMIN TRANSACTIONS */
async function loadAdminTransactions(){
  try{
    const token=getToken();
    const res=await fetch(`${API}/api/admin/transactions`,{headers:{Authorization:`Bearer ${token}`}});
    const txs=await res.json();
    const container=el("transactionHistoryAdmin"); if(!container) return; container.innerHTML="";
    txs.slice(0,10).forEach(tx=>{
      const div=document.createElement("div"); div.className="transaction-card";
      div.innerHTML=`<p><strong>${tx.type}</strong> - ₦${tx.amount}</p><p>User: ${tx.username||"N/A"}</p><p>Phone: ${tx.phone||"N/A"} (${tx.network||"N/A"})</p><p>Date: ${tx.date}</p>`;
      container.appendChild(div);
    });
  }catch(e){ showToast("Failed to load admin transactions"); }
}

/* WITHDRAW PROFIT */
async function withdrawProfit(){
  const amount=parseFloat(el("withdrawAmount").value||0);
  const account=el("withdrawAccount").value.trim();
  if(!amount||!account) return showToast("Enter amount and account info");
  try{
    const token=getToken();
    const res=await fetch(`${API}/api/admin/withdraw`,{
      method:"POST",
      headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body:JSON.stringify({amount,account})
    });
    const data=await res.json();
    if(data.message) showToast(data.message);
    else if(data.error) showToast(data.error);
    el("withdrawAmount").value=""; el("withdrawAccount").value="";
    loadDashboard();
  }catch(e){ showToast("Withdrawal failed"); }
}

/* LOGOUT */
function logout(){ localStorage.removeItem("token"); window.location.replace("login.html"); }

/* WEBSOCKET WALLET & ADMIN UPDATES */
function connectWalletWebSocket(userId){
  const token = getToken();
  if(!token) return;

  const ws = new WebSocket(`${API.replace(/^http/,"ws")}/?token=${token}`);

  ws.onmessage = (msg)=>{
    const data = JSON.parse(msg.data);

    // User wallet updates
    if(data.type === "wallet_update"){
      animateWallet(data.balance);
      fetchTransactions(); // Refresh user transactions
    }

    // Admin live transaction updates
    if(data.type === "new_transaction" && el("transactionHistoryAdmin")){
      const container = el("transactionHistoryAdmin");
      const tx = data.transaction;
      const div = document.createElement("div");
      div.className = "transaction-card";
      div.innerHTML = `<p><strong>${tx.type}</strong> - ₦${tx.amount}</p>
                       <p>User: ${tx.username||"N/A"}</p>
                       <p>Phone: ${tx.phone||"N/A"} (${tx.network||"N/A"})</p>
                       <p>Date: ${tx.date}</p>`;
      container.prepend(div);
      while(container.children.length > 10) container.removeChild(container.lastChild);
    }
  };

  ws.onclose = ()=>{ console.log("WebSocket closed"); };
}

/* EVENTS */
document.addEventListener("DOMContentLoaded",loadDashboard);
el("withdrawBtn")?.addEventListener("click",withdrawProfit);
el("refreshProfit")?.addEventListener("click",loadDashboard);