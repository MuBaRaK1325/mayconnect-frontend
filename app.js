<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MAY-Connect | Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="styles.css">
</head>
<body>

<!-- SPLASH LOADER -->
<div id="splashLoader" class="splash-loader hidden">
  <div id="loaderState" class="splash-content">
    <div class="splash-ring"></div>
    <img src="images/logo.png" alt="MAY-Connect">
  </div>
</div>

<!-- NETWORK STATUS -->
<div id="networkStatus" class="network-status hidden"></div>

<!-- LOGO + GREETING -->
<div class="logo-circle">
  <img src="images/logo.png" alt="MAY-Connect Logo">
</div>
<div style="text-align:center; margin-bottom:1rem;">
  <h3 id="greeting">Hello, User 👋</h3>
</div>

<audio id="welcomeSound" src="sounds/welcome.mp3" preload="auto"></audio>
<audio id="successSound" src="sounds/success.mp3" preload="auto"></audio>

<!-- MORE PANEL -->
<div id="morePanel" class="more-panel hidden">
  <button id="setPinBtn">Set Transaction PIN</button>
  <button onclick="enableBiometric()">Enable Biometric</button>
  <button onclick="forgotPin()">Forgot PIN</button>
  <button onclick="forgotPassword()">Forgot Password</button>
  <button onclick="contactWhatsApp()">WhatsApp Support</button>
  <button onclick="callSupport()">Call Support</button>
  <button onclick="copyAccount()">Copy Account</button>
  <button onclick="logout()">Logout</button>
  <button onclick="closeMore()">Close</button>
</div>

<!-- DASHBOARD CONTENT -->
<div class="dashboard-content">

  <!-- WALLET -->
  <div class="wallet-card">
    <p>Wallet Balance</p>
    <strong id="walletBalance">₦0</strong>
    <button onclick="copyAccount()">Copy Account Number</button>
  </div>

  <!-- QUICK ACTIONS -->
  <div class="quick-actions">
    <button onclick="location.href='data.html'">📶 Buy Data</button>
    <button onclick="location.href='airtime.html'">📞 Buy Airtime</button>
  </div>

  <!-- DATA PLANS -->
  <div id="plansGrid" class="plans-grid"></div>

  <!-- CONFIRM ORDER -->
  <button id="confirmOrderBtn" class="primary-btn hidden" onclick="confirmOrder()">Confirm</button>

  <!-- TRANSACTIONS LIST -->
  <div id="transactionsList" class="transactions-list"></div>
</div>

<!-- PIN MODAL -->
<div id="pinModal" class="modal hidden">
  <div class="modal-content">
    <h3>Enter PIN</h3>
    <div class="pin-inputs">
      <input type="password" maxlength="1">
      <input type="password" maxlength="1">
      <input type="password" maxlength="1">
      <input type="password" maxlength="1">
    </div>
    <button id="pinActionBtn" class="primary-btn">Pay</button>
    <button onclick="closePinModal()" class="secondary-btn">Cancel</button>
  </div>
</div>

<!-- RECEIPT MODAL -->
<div id="receiptModal" class="modal hidden">
  <div class="modal-content">
    <h3>Receipt</h3>
    <div id="receiptBody"></div>
    <button onclick="receiptModal.classList.add('hidden')" class="primary-btn">Close</button>
  </div>
</div>

<!-- BOTTOM NAV -->
<div class="bottom-nav">
  <button onclick="location.href='dashboard.html'">🏠<br>Home</button>
  <button onclick="location.href='transactions.html'">💳<br>Transactions</button>
  <button onclick="toggleMore()">⚙️<br>More</button>
</div>

<script>
/* ================= CONFIG ================= */
const backendUrl = "https://mayconnect-backend-1.onrender.com";
const $ = id => document.getElementById(id);
const getToken = () => localStorage.getItem("token");

/* ================= AUTH GUARD ================= */
(function authGuard() {
  const path = location.pathname.toLowerCase();
  const publicPages = ["login.html", "signup.html"];
  if (!getToken() && !publicPages.some(p => path.includes(p))) {
    location.href = "login.html";
  }
})();

/* ================= GLOBAL STATE ================= */
let selectedPlan = null;
let hasPin = false;
let pinMode = "purchase"; // "purchase" | "set"

/* ================= NETWORK ================= */
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
function showLoader(){ loader?.classList.remove("hidden"); loaderState.innerHTML=`<div class="splash-ring"></div>`; }
function showSuccess(){ loaderState.innerHTML=`<div class="success-check">✓</div>`; }
function hideLoader(){ loader?.classList.add("hidden"); }

/* ================= SOUND ================= */
function playSuccessSound(){ $("successSound")?.play().catch(()=>{}); }

/* ================= WALLET ================= */
async function updateWalletBalance() {
  if(!getToken()) return;
  try{
    const res = await fetch(`${backendUrl}/api/wallet`, { headers:{ Authorization:`Bearer ${getToken()}` }});
    const data = await res.json();
    if($("walletBalance")) $("walletBalance").textContent=`₦${data.balance||0}`;
  }catch{}
}

/* ================= DATA PLANS ================= */
const DATA_PLANS=[
  { plan_id:153,provider:"maitama",network:"MTN",name:"MTN 5GB SME",price:1500 },
  { plan_id:414,provider:"subpadi",network:"MTN",name:"2.5GB GIFTING",price:600 },
  { plan_id:413,provider:"subpadi",network:"MTN",name:"1GB GIFTING",price:300 },
  { plan_id:359,provider:"subpadi",network:"MTN",name:"2GB GIFTING",price:500 },
  { plan_id:415,provider:"subpadi",network:"AIRTEL",name:"3.2GB GIFTING",price:1050 },
  { plan_id:394,provider:"subpadi",network:"AIRTEL",name:"2GB GIFTING",price:700 },
  { plan_id:329,provider:"subpadi",network:"AIRTEL",name:"6.5GB SME",price:1500 },
  { plan_id:327,provider:"subpadi",network:"AIRTEL",name:"3.2GB SME",price:700 },
  { plan_id:37,provider:"maitama",network:"AIRTEL",name:"1GB",price:300 },
  { plan_id:38,provider:"maitama",network:"AIRTEL",name:"2GB",price:600 },
  { plan_id:39,provider:"maitama",network:"AIRTEL",name:"3GB",price:600 },
  { plan_id:335,provider:"subpadi",network:"GLO",name:"9.8GB SME",price:2450 },
  { plan_id:334,provider:"subpadi",network:"GLO",name:"2.5GB SME",price:700 },
  { plan_id:261,provider:"subpadi",network:"GLO",name:"1.024GB CORPORATE",price:500 },
  { plan_id:195,provider:"subpadi",network:"GLO",name:"3.9GB GIFTING",price:1050 },
  { plan_id:194,provider:"subpadi",network:"GLO",name:"1.05GB GIFTING",price:500 },
  { plan_id:52,provider:"cheapdatahub",network:"AIRTEL",name:"5GB",price:1650 }
];

/* ================= RENDER PLANS ================= */
function renderPlans() {
  const container=$("plansGrid");
  if(!container) return;
  container.innerHTML="";
  DATA_PLANS.forEach(plan=>{
    const div=document.createElement("div");
    div.className="plan-card";
    div.innerHTML=`
      <small>${plan.network}</small>
      <h4>${plan.name}</h4>
      <small>Monthly</small>
      <div class="price">₦${plan.price}</div>
    `;
    div.onclick=()=>selectPlan(div,plan);
    container.appendChild(div);
  });
}

function selectPlan(card, plan){
  document.querySelectorAll(".plan-card").forEach(p=>{
    p.classList.remove("selected");
    p.style.borderColor="";
  });
  card.classList.add("selected");
  const colors={maitama:"#4A90E2", subpadi:"#7ED321", cheapdatahub:"#F5A623"};
  card.style.borderColor=colors[plan.provider]||"#888";
  selectedPlan=plan;
  $("confirmOrderBtn")?.classList.remove("hidden");
}

/* ================= PIN MODAL ================= */
function openPinModal(mode){
  pinMode=mode;
  $("pinActionBtn").textContent=mode==="set"?"Verify PIN":"Pay";
  $("pinModal")?.classList.remove("hidden");
}
function closePinModal(){ $("pinModal")?.classList.add("hidden"); }
function openSetPinFromMore(){ openPinModal("set"); }

/* ================= PIN INPUT UX ================= */
const pinInputs=document.querySelectorAll(".pin-inputs input");
pinInputs.forEach((input,idx)=>{
  input.addEventListener("input",e=>{ if(e.target.value.length===1 && idx<pinInputs.length-1) pinInputs[idx+1].focus(); });
  input.addEventListener("keydown",e=>{ if(e.key==="Backspace" && !input.value && idx>0) pinInputs[idx-1].focus(); });
});
function togglePinVisibility(){ pinInputs.forEach(i=>i.type=i.type==="password"?"text":"password"); }
document.addEventListener("DOMContentLoaded",()=>{
  const modalContent=$("#pinModal .modal-content");
  if(modalContent){
    const btn=document.createElement("button");
    btn.type="button"; btn.textContent="Show"; btn.className="show-password-btn"; btn.style.marginTop="0.5rem";
    btn.onclick=()=>{ togglePinVisibility(); btn.textContent=pinInputs[0].type==="password"?"Show":"Hide"; };
    modalContent.appendChild(btn);
  }
});
function clearPinInputs(){ pinInputs.forEach(i=>i.value=""); }
$("pinModal")?.addEventListener("show", clearPinInputs);

/* ================= CONFIRM ORDER & SUBMIT PIN ================= */
function confirmOrder(){
  if(!selectedPlan) return alert("Select a plan first");
  if(!$("phone")?.value) return alert("Enter phone number");
  if(!hasPin) return openPinModal("set");
  openPinModal("purchase");
}

async function submitPin(){
  const pin=[...pinInputs].map(i=>i.value).join("");
  if(!/^\d{4}$/.test(pin)) return alert("Enter 4-digit PIN");
  showLoader();
  try{
    let res,data;
    if(pinMode==="set"){
      res=await fetch(`${backendUrl}/api/set-pin`,{ method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` }, body:JSON.stringify({pin}) });
      data=await res.json();
      if(!res.ok) throw new Error(data.error||"Failed to set PIN");
      hasPin=true;
      playSuccessSound(); alert("PIN verified successfully");
      closePinModal();
    } else {
      res=await fetch(`${backendUrl}/api/wallet/purchase`,{ method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` }, body:JSON.stringify({ type:"data", pin, provider:selectedPlan.provider, details:{ mobile_number:$("phone").value, plan:selectedPlan.plan_id } }) });
      data=await res.json();
      if(!res.ok) throw new Error(data.error||"Purchase failed");
      playSuccessSound();
      showReceipt(data.receipt);
      updateWalletBalance();
      closePinModal();
    }
  }catch(err){ alert(err.message); } finally{ hideLoader(); }
}

/* ================= RECEIPT ================= */
function showReceipt(r){ $("receiptBody").innerHTML=`<div><b>Reference:</b> ${r.reference}</div><div><b>Amount:</b> ₦${r.amount}</div><div style="color:green"><b>Status:</b> SUCCESS</div>`; $("receiptModal")?.classList.remove("hidden"); }

/* ================= MORE PANEL ================= */
function toggleMore(){ $("morePanel").classList.toggle("hidden"); }
function closeMore(){ $("morePanel").classList.add("hidden"); }
function enableBiometric(){ alert("Biometric coming soon"); }
function forgotPin(){ alert("Forgot PIN"); }
function forgotPassword(){ alert("Forgot Password"); }
function contactWhatsApp(){ window.open("https://wa.me/2348117988561"); }
function callSupport(){ location.href="tel:+2348117988561"; }
function logout(){ localStorage.clear(); location.href="login.html"; }
function copyAccount(){ const acc="1234567890"; navigator.clipboard.writeText(acc); alert("Copied: "+acc); }

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded",async()=>{
  welcomeSound.play();
  const name = localStorage.getItem("name")||"User";
  $("greeting").textContent=`Hello, ${name} 👋`;
  if(getToken()){ updateWalletBalance(); checkPinStatus(); }
  renderPlans();

  // Attach Set PIN from More tab
  $("#setPinBtn")?.addEventListener("click", openSetPinFromMore);
});
</script>

</body>
</html>
