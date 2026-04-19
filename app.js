const API="https://mayconnect-backend-1.onrender.com"

let cachedPlans=[]
let currentUser=null
let ws=null

let selectedNetwork=null
let selectedPlan=null
let airtimeNetwork=null
let actionType=null

/* ================= HELPERS ================= */

function getToken(){ return localStorage.getItem("token") }
function el(id){ return document.getElementById(id) }

/* ================= MESSAGE ================= */

function showMsg(msg){
el("msgBox").innerHTML=`
<div style="text-align:center">
<p>${msg}</p>
<button onclick="closeModal('msgModal')" class="primaryBtn">OK</button>
</div>`
openModal("msgModal")
}

/* ================= LOADER ================= */

function showLoader(){
el("msgBox").innerHTML=`<p style="text-align:center">Processing...</p>`
openModal("msgModal")
}
function hideLoader(){ closeModal("msgModal") }

/* ================= AUTH ================= */

function checkAuth(){
if(!getToken()){
window.location.href="login.html"
return false
}
return true
}

/* ================= LOAD ================= */

async function loadDashboard(){

if(!checkAuth()) return

try{
currentUser = JSON.parse(atob(getToken().split(".")[1]))
}catch{
logout()
return
}

if(el("usernameDisplay")){
el("usernameDisplay").innerText="Hello "+currentUser.username
}

/* ADMIN FIX */
if(currentUser && currentUser.is_admin === true){
document.querySelectorAll(".adminOnly").forEach(e=>e.style.display="block")
}

initNavigation()
await loadAccount()
await loadPlans()
fetchTransactions()

setTimeout(connectWebSocket,1000)
}

/* ================= NAV ================= */

function initNavigation(){
document.querySelectorAll(".section").forEach(s=>s.style.display="none")
el("home").style.display="block"
}

function showSection(id){
document.querySelectorAll(".section").forEach(s=>s.style.display="none")
el(id).style.display="block"
}

/* ================= WALLET ================= */

function updateWallet(balance){
if(el("walletBalance")){
el("walletBalance").innerText="₦"+Number(balance).toLocaleString()
}
}

/* ================= TRANSACTIONS ================= */

async function fetchTransactions(){
try{
const res=await fetch(API+"/api/transactions",{
headers:{Authorization:"Bearer "+getToken()}
})
const tx=await res.json()

if(el("transactionHistory")){
el("transactionHistory").innerHTML=""
tx.slice(0,5).forEach(t=>el("transactionHistory").appendChild(txCard(t)))
}

}catch{}
}

function txCard(t){
const div=document.createElement("div")
div.className="transactionCard"
div.innerHTML=`
<strong>${t.type}</strong> ₦${t.amount}<br>
${t.phone||""}<br>
<span>${t.status}</span>
`
return div
}

/* ================= PLANS ================= */

async function loadPlans(){
try{
const res=await fetch(API+"/api/plans",{
headers:{Authorization:"Bearer "+getToken()}
})

const data = await res.json()
cachedPlans = Array.isArray(data) ? data : []

}catch(e){
console.log("PLANS ERROR",e)
}
}

/* ================= NETWORK ================= */

function selectNetwork(network, element){
selectedNetwork = (network || "").toLowerCase()
selectedPlan=null

document.querySelectorAll(".networkItem").forEach(n=>n.classList.remove("active"))
if(element) element.classList.add("active")

renderPlans()
}

/* ================= AIRTIME ================= */

function selectAirtimeNetwork(network, element){
airtimeNetwork=network

document.querySelectorAll(".airtimeNet").forEach(n=>n.classList.remove("active"))
if(element) element.classList.add("active")
}

/* ================= RENDER ================= */

function renderPlans(){
const list=el("planList")
if(!list) return

list.innerHTML=""

/* 🔥 FIX: use includes instead of strict match */
const filtered = cachedPlans.filter(p=>{
const net = (p.network || "").toLowerCase()
return net.includes(selectedNetwork)
})

if(!filtered.length){
list.innerHTML="<p>No plans available</p>"
return
}

filtered.forEach(p=>{
const div=document.createElement("div")
div.className="planItem"

div.innerHTML=`
<strong>${p.name}</strong><br>
${p.validity || ""}<br>
<strong>₦${p.price}</strong>
`

div.onclick=()=>{
selectedPlan=p
actionType="DATA"
openConfirmModal(p)
}

list.appendChild(div)
})
}

/* ================= CONFIRM ================= */

function openConfirmModal(plan){
el("msgBox").innerHTML=`
<div style="text-align:center">
<h3>Confirm Purchase</h3>
<p>${plan.name}</p>
<p>₦${plan.price}</p>
<button onclick="proceedToPin()" class="primaryBtn">Continue</button>
</div>`
openModal("msgModal")
}

function proceedToPin(){
closeModal("msgModal")
openPinModal()
}

/* ================= PIN ================= */

function openPinModal(){
el("pinInput").value=""
el("pinModal").style.display="flex"
}

function confirmPurchase(){
const pin=el("pinInput").value

if(!pin) return showMsg("Enter PIN")

closeModal("pinModal")

if(actionType==="DATA") buyData(pin)
if(actionType==="AIRTIME") buyAirtime(pin)
}

/* ================= BUY DATA ================= */

async function buyData(pin){

const phone=el("dataPhone").value

if(!phone || !selectedPlan){
return showMsg("Select plan & phone")
}

showLoader()

try{
const res=await fetch(API+"/api/buy-data",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({
phone,
plan_id:selectedPlan.id,
pin
})
})

const data=await res.json()
hideLoader()

if(res.ok){
showMsg("Data purchase successful ✅")
fetchTransactions()
}else{
showMsg(data.message)
}

}catch{
hideLoader()
showMsg("Server error")
}
}

/* ================= BUY AIRTIME ================= */

function openAirtimePin(){
actionType="AIRTIME"
openPinModal()
}

async function buyAirtime(pin){

const phone=el("airtimePhone").value
const amount=el("airtimeAmount").value

if(!phone || !amount || !airtimeNetwork){
return showMsg("Fill all fields")
}

showLoader()

try{
const res=await fetch(API+"/api/buy-airtime",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({
phone,
amount,
network:airtimeNetwork,
pin
})
})

const data=await res.json()
hideLoader()

if(res.ok){
showMsg("Airtime successful ✅")
fetchTransactions()
}else{
showMsg(data.message)
}

}catch{
hideLoader()
showMsg("Server error")
}
}

/* ================= FUND ================= */

function openFundModal(){
el("msgBox").innerHTML=`
<div style="text-align:center">
<input id="fundAmount" placeholder="Enter amount" />
<br><br>
<button onclick="confirmFund()" class="primaryBtn">Continue</button>
</div>`
openModal("msgModal")
}

async function confirmFund(){
const amount=el("fundAmount").value
if(!amount) return showMsg("Enter amount")

const res=await fetch(API+"/api/fund/init",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({amount})
})

const data=await res.json()

if(data.url){
window.location.href=data.url
}else{
showMsg("Payment failed")
}
}

/* ================= REVERSAL ================= */

async function reverseTransaction(){
const reference=el("reverseRef").value

const res=await fetch(API+"/api/admin/reverse",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({reference})
})

const data=await res.json()
showMsg(data.message)
}

/* ================= TOP USER ================= */

async function addTopUser(){
const email=el("topUserEmail").value

const res=await fetch(API+"/api/admin/add-top-user",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({email})
})

const data=await res.json()
showMsg(data.message)
}

async function removeTopUser(){
const email=el("topUserEmail").value

const res=await fetch(API+"/api/admin/remove-top-user",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({email})
})

const data=await res.json()
showMsg(data.message)
}

/* ================= ACCOUNT ================= */

async function loadAccount(){
const res=await fetch(API+"/api/me",{
headers:{Authorization:"Bearer "+getToken()}
})
const user=await res.json()

el("bankName").innerText=user.bank_name||"N/A"
el("accountNumber").innerText=user.account_number||"N/A"
el("accountName").innerText=user.account_name||"N/A"
}

/* ================= ADMIN ================= */

async function adminWithdraw(){
const username=el("withdrawUser").value
const amount=el("withdrawAmount").value

const res=await fetch(API+"/api/admin/withdraw",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({username,amount})
})

const data=await res.json()
showMsg(data.message)
}

/* ================= MODAL ================= */

function openModal(id){ el(id).style.display="flex" }
function closeModal(id){ el(id).style.display="none" }

/* ================= WS ================= */

function connectWebSocket(){
const wsURL=API.replace("https","wss")
ws=new WebSocket(wsURL+"?token="+getToken())

ws.onmessage=(msg)=>{
const data=JSON.parse(msg.data)
if(data.type==="wallet_update"){
updateWallet(data.balance)
}
}
}

/* ================= LOGOUT ================= */

function logout(){
if(ws) ws.close()
localStorage.clear()
window.location.href="login.html"
}

/* ================= START ================= */

document.addEventListener("DOMContentLoaded",loadDashboard)