/* =================================================
   MAY-CONNECT — FULL FEATURED APP.JS
   ✅ Set PIN auto-check
   ✅ Data plans show on logo tap
   ✅ Confirm order works
================================================== */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* ================= GLOBAL HELPERS ================= */
const $ = id => document.getElementById(id);
const getToken = () => localStorage.getItem("token");

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
function showLoader() {
  if (!loader) return;
  loaderState.innerHTML = `<div class="splash-ring"></div>`;
  loader.classList.remove("hidden");
}
function showSuccess() { loaderState.innerHTML = `<div class="success-check">✓</div>`; }
function hideLoader() { loader?.classList.add("hidden"); }

/* ================= SOUNDS ================= */
function playSuccessSound() { $("successSound")?.play().catch(()=>{}); }

/* ================= LOGIN ================= */
$("loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  showLoader();
  try {
    const res = await fetch(`${backendUrl}/api/login`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        email: $("login-email").value,
        password: $("login-password").value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("token", data.token);
    showSuccess();
    setTimeout(()=>location.replace("dashboard.html"),600);
  } catch(err){ alert(err.message || "Login failed"); hideLoader(); }
});

/* ================= SIGNUP ================= */
$("signupForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  showLoader();
  try {
    const res = await fetch(`${backendUrl}/api/signup`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        name: $("signup-name").value,
        email: $("signup-email").value,
        password: $("signup-password").value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("token", data.token);
    showSuccess();
    setTimeout(()=>location.replace("dashboard.html"),600);
  } catch(err){ alert(err.message || "Signup failed"); hideLoader(); }
});

/* ================= WALLET ================= */
async function updateWalletBalance() {
  if (!getToken()) return;
  try {
    const res = await fetch(`${backendUrl}/api/wallet`, {
      headers:{Authorization:`Bearer ${getToken()}`}
    });
    const data = await res.json();
    $("walletBalance") && ($("walletBalance").textContent = `₦${data.balance || 0}`);
  } catch { showNetwork("offline"); }
}

/* ================= DATA PLANS ================= */
let selectedNetwork = null;
let selectedPlan = null;

const plans = {
  MTN: [
    { plan_id:158, maitama_network:1, name:"MTN 5GB SME", price:1600, validity:"30 Days" }
  ],
  AIRTEL: [],
  GLO: []
};

const networkLogos = {
  MTN: "images/Mtn.png",
  AIRTEL: "images/Airtel.png",
  GLO: "images/Glo.png"
};

const plansContainer = $("plansContainer");
const loadingPlans = $("loadingPlans");

/* ================= SELECT NETWORK ================= */
function selectNetwork(el) {
  selectedNetwork = el.dataset.network;
  selectedPlan = null;
  document.querySelectorAll(".network").forEach(n=>n.classList.remove("selected"));
  el.classList.add("selected");

  plansContainer.innerHTML="";
  loadingPlans.classList.remove("hidden");

  setTimeout(()=>{
    loadingPlans.classList.add("hidden");
    const list = plans[selectedNetwork]||[];
    if(!list.length){ plansContainer.innerHTML="<p>No plans available</p>"; $("confirmBtn").disabled=true; return; }

    list.forEach(plan=>{
      const div=document.createElement("div");
      div.className="plan-card";
      div.innerHTML=`
        <div class="plan-logo"><img src="${networkLogos[selectedNetwork]}" alt="${selectedNetwork} Logo"></div>
        <div class="plan-info">
          <span class="plan-name">${plan.name}</span>
          <span class="plan-validity">${plan.validity}</span>
        </div>
        <div class="plan-price">₦${plan.price}</div>
      `;
      div.onclick=()=>selectPlan(div,plan);
      plansContainer.appendChild(div);
    });
  },300);
}

/* ================= SELECT PLAN ================= */
function selectPlan(card, plan) {
  document.querySelectorAll(".plan-card").forEach(c=>c.classList.remove("selected"));
  card.classList.add("selected");
  selectedPlan=plan;
  $("confirmBtn").disabled=false;
}

/* ================= SET PIN MODAL ================= */
function openSetPin(){ $("setPinModal")?.classList.remove("hidden"); document.querySelectorAll("#setPinModal input").forEach(i=>i.value=""); }
function closeSetPin(){ $("setPinModal")?.classList.add("hidden"); }

async function submitSetPin(){
  let pin="";
  document.querySelectorAll("#setPinModal input").forEach(i=>pin+=i.value);
  if(!/^\d{4}$/.test(pin)){ alert("PIN must be exactly 4 digits"); return; }
  showLoader();
  try {
    const res = await fetch(`${backendUrl}/api/set-pin`, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${getToken()}`
      },
      body: JSON.stringify({pin})
    });
    const data = await res.json();
    if(!res.ok){ alert(data.message||data.error||"Failed to set PIN"); hideLoader(); return; }
    showSuccess();
    playSuccessSound();
    setTimeout(()=>{ hideLoader(); closeSetPin(); alert("✅ Transaction PIN set successfully"); },700);
  } catch(err){ console.error(err); hideLoader(); showNetwork("offline"); }
}

/* ================= PIN MODAL ================= */
function openPinModal(){ $("pinModal")?.classList.remove("hidden"); }
function closePinModal(){ $("pinModal")?.classList.add("hidden"); }

async function submitPin(){
  const pin=[...document.querySelectorAll(".pin-inputs input")].map(i=>i.value).join("");
  if(pin.length!==4)return alert("Enter 4-digit PIN");
  const phone=$("phone").value;
  if(!phone||!selectedPlan)return alert("Missing data");
  showLoader();
  try{
    const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${getToken()}`
      },
      body: JSON.stringify({
        type:"data",
        pin,
        details:{
          mobile_number: phone,
          plan: selectedPlan.plan_id,
          network: selectedPlan.maitama_network
        }
      })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error);
    playSuccessSound();
    showReceipt(data.receipt);
    updateWalletBalance();
    closePinModal();
  }catch(err){ alert(err.message||"Purchase failed"); } finally{ hideLoader(); }
}

/* ================= CONFIRM ORDER ================= */
async function confirmOrder(){
  if(!selectedPlan)return alert("Select a plan first");
  if(!$("phone").value)return alert("Enter phone number");
  // Check if PIN exists
  try{
    const res=await fetch(`${backendUrl}/api/has-pin`, { headers:{Authorization:`Bearer ${getToken()}`} });
    const data=await res.json();
    if(!data.hasPin){ alert("You must set a transaction PIN before purchase"); openSetPin(); return; }
    openPinModal();
  }catch(err){ console.error(err); showNetwork("offline"); }
}

/* ================= RECEIPT ================= */
function showReceipt(r){
  $("receiptBody").innerHTML=`
    <div><strong>Reference:</strong> ${r.reference}</div>
    <div><strong>Amount:</strong> ₦${r.amount}</div>
    <div style="color:green"><strong>Status:</strong> SUCCESS</div>
  `;
  $("receiptModal").classList.remove("hidden");
}
function closeReceipt(){ $("receiptModal")?.classList.add("hidden"); }

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded",()=>{
  if(getToken()) updateWalletBalance();
});
