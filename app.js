/* ================= CONFIG ================= */

const backendUrl = "https://mayconnect-backend-1.onrender.com";
const $ = id => document.getElementById(id);
const getToken = () => localStorage.getItem("token");

/* ================= AUTH ================= */

if (!getToken()) location.href = "login.html";

/* ================= GLOBAL ================= */

let selectedPlan = null;
let pinMode = "purchase";
let hasPin = false;

/* ================= SOUNDS ================= */

function playWelcome(){ $("welcomeSound")?.play().catch(()=>{}); }
function playSuccess(){ $("successSound")?.play().catch(()=>{}); }

/* ================= LOADER ================= */

function showLoader(){ $("splashLoader")?.classList.remove("hidden"); }
function hideLoader(){ $("splashLoader")?.classList.add("hidden"); }

/* ================= GREETING ================= */

document.addEventListener("DOMContentLoaded",()=>{
 $("greeting").textContent=`Hello, ${localStorage.getItem("name")||"User"} 👋`;
 playWelcome();
});

/* ================= WALLET ================= */

async function updateWallet(){
 try{
  const r=await fetch(`${backendUrl}/api/wallet`,{
   headers:{Authorization:`Bearer ${getToken()}`}
  });
  const j=await r.json();
  $("walletBalance").textContent=`₦${j.balance||0}`;
  hasPin=true;
 }catch{}
}

/* ================= FULL DATA PLANS ================= */
const DATA_PLANS = [

/* MTN */
{ plan_id:153, provider:"maitama", network:"MTN", name:"MTN 5GB SME", price:1500 },
{ plan_id:414, provider:"subpadi", network:"MTN", name:"2.5GB GIFTING", price:600 },
{ plan_id:413, provider:"subpadi", network:"MTN", name:"1GB GIFTING", price:300 },
{ plan_id:359, provider:"subpadi", network:"MTN", name:"2GB GIFTING", price:500 },

/* AIRTEL */
{ plan_id:415, provider:"subpadi", network:"AIRTEL", name:"3.2GB GIFTING", price:1050 },
{ plan_id:394, provider:"subpadi", network:"AIRTEL", name:"2GB GIFTING", price:700 },
{ plan_id:329, provider:"subpadi", network:"AIRTEL", name:"6.5GB SME", price:1500 },
{ plan_id:327, provider:"subpadi", network:"AIRTEL", name:"3.2GB SME", price:700 },
{ plan_id:37, provider:"maitama", network:"AIRTEL", name:"1GB", price:300 },
{ plan_id:38, provider:"maitama", network:"AIRTEL", name:"2GB", price:600 },
{ plan_id:39, provider:"maitama", network:"AIRTEL", name:"3GB", price:600 },
{ plan_id:52, provider:"cheapdatahub", network:"AIRTEL", name:"5GB", price:1650 },

/* GLO */
{ plan_id:335, provider:"subpadi", network:"GLO", name:"9.8GB SME", price:2450 },
{ plan_id:334, provider:"subpadi", network:"GLO", name:"2.5GB SME", price:700 },
{ plan_id:261, provider:"subpadi", network:"GLO", name:"1.024GB CORPORATE", price:500 },
{ plan_id:195, provider:"subpadi", network:"GLO", name:"3.9GB GIFTING", price:1050 },
{ plan_id:194, provider:"subpadi", network:"GLO", name:"1.05GB GIFTING", price:500 }

];

/* ================= RENDER PLANS ================= */

function renderPlans(){
 const g=$("plansGrid");
 DATA_PLANS.forEach(p=>{
  const d=document.createElement("div");
  d.className="plan-card";
  d.innerHTML=`<small>${p.network}</small><h4>${p.name}</h4><div>₦${p.price}</div>`;
  d.onclick=()=>{
   selectedPlan=p;
   $("confirmOrderBtn").classList.remove("hidden");
  };
  g.appendChild(d);
 });
}

/* ================= MORE TAB ================= */

function toggleMore(){ $("morePanel").classList.toggle("hidden"); }
function closeMore(){ $("morePanel").classList.add("hidden"); }
function logout(){ localStorage.clear(); location.href="login.html"; }

$("setPinBtn")?.addEventListener("click",()=>openPinModal("set"));

/* ================= PIN MODAL ================= */

function openPinModal(m){
 pinMode=m;
 $("pinActionBtn").innerText=m==="set"?"Verify":"Pay";
 $("pinModal").classList.remove("hidden");
}

function closePinModal(){ $("pinModal").classList.add("hidden"); }

/* ================= PIN UX ================= */

const pinInputs=document.querySelectorAll(".pin-inputs input");

pinInputs.forEach((i,idx)=>{
 i.addEventListener("input",()=>{ if(i.value && idx<3) pinInputs[idx+1].focus(); });
});

/* ================= CONFIRM ================= */

function confirmOrder(){
 if(!selectedPlan) return alert("Select plan");
 openPinModal("purchase");
}

/* ================= SUBMIT PIN ================= */

async function submitPin(){

 const pin=[...pinInputs].map(i=>i.value).join("");
 if(pin.length!==4) return alert("Enter 4 digit PIN");

 showLoader();

 try{

 if(pinMode==="set"){
  const r=await fetch(`${backendUrl}/api/set-pin`,{
   method:"POST",
   headers:{
    "Content-Type":"application/json",
    Authorization:`Bearer ${getToken()}`
   },
   body:JSON.stringify({pin})
  });

  const j=await r.json();
  if(!r.ok) throw new Error(j.error);
  hasPin=true;
  playSuccess();
  alert("PIN set");
  closePinModal();
  return;
 }

 const r=await fetch(`${backendUrl}/api/wallet/purchase`,{
  method:"POST",
  headers:{
   "Content-Type":"application/json",
   Authorization:`Bearer ${getToken()}`
  },
  body:JSON.stringify({
   type:"data",
   pin,
   provider:selectedPlan.provider,
   details:{plan:selectedPlan.plan_id}
  })
 });

 const j=await r.json();
 if(!r.ok) throw new Error(j.error);

 playSuccess();

 $("receiptBody").innerHTML=`SUCCESS ₦${j.receipt.amount}`;
 $("receiptModal").classList.remove("hidden");

 updateWallet();

 }catch(e){ alert(e.message); }

 finally{ hideLoader(); }
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded",()=>{
 updateWallet();
 renderPlans();
});
