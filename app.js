const API="https://mayconnect-backend-1.onrender.com"

let cachedPlans=[]
let currentUser=null
let ws=null

let selectedNetwork=null
let selectedPlan=null
let airtimeNetwork=null

/* ================= SOUND ================= */

function playSuccess(){
try{
const audio = new Audio("success.mp3")
audio.play()
}catch{}
}

/* ================= HELPERS ================= */

function getToken(){ return localStorage.getItem("token") }
function el(id){ return document.getElementById(id) }

/* ================= MESSAGE ================= */

function showMsg(msg){
if(!el("msgBox")) return alert(msg)

el("msgBox").innerHTML=`
<div style="text-align:center">
<p>${msg}</p>
<button onclick="closeModal('msgModal')" class="primaryBtn">OK</button>
</div>
`
openModal("msgModal")
}

/* ================= LOADER ================= */

function showLoader(){
el("msgBox").innerHTML=`
<div style="text-align:center">
<p>Processing...</p>
</div>
`
openModal("msgModal")
}

function hideLoader(){
closeModal("msgModal")
}

/* ================= RECEIPT ================= */

function showReceipt(type, amount, phone){
el("msgBox").innerHTML=`
<div style="text-align:center">
<h3 style="color:#00cec9">Transaction Successful ✅</h3>
<p><strong>Type:</strong> ${type}</p>
<p><strong>Amount:</strong> ₦${amount}</p>
<p><strong>Phone:</strong> ${phone}</p>
<button onclick="closeModal('msgModal')" class="primaryBtn">Done</button>
</div>
`
openModal("msgModal")
}

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

document.body.style.display="block"

if(el("usernameDisplay")){
el("usernameDisplay").innerText="Hello "+currentUser.username
}

/* ADMIN */
if(currentUser.is_admin){
document.querySelectorAll(".adminOnly").forEach(e=>e.style.display="block")
loadTopUsers()
}

initNavigation()

await loadAccount()
await loadPlans()
fetchTransactions()

/* PAYSTACK VERIFY */
const urlParams = new URLSearchParams(window.location.search)
const reference = urlParams.get("reference")
if(reference){
verifyPayment(reference)
}

setTimeout(connectWebSocket,1000)
}

/* ================= NAV ================= */

function initNavigation(){
document.querySelectorAll(".section").forEach(s=>s.style.display="none")
if(el("home")) el("home").style.display="block"
}

function showSection(id){
document.querySelectorAll(".section").forEach(s=>s.style.display="none")
if(el(id)) el(id).style.display="block"
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

if(tx.length) updateWallet(tx[0].wallet_balance)

if(el("transactionHistory")){
el("transactionHistory").innerHTML=""
tx.slice(0,5).forEach(t=>el("transactionHistory").appendChild(txCard(t)))
}

if(el("allTransactions")){
el("allTransactions").innerHTML=""
tx.forEach(t=>el("allTransactions").appendChild(txCard(t)))
}

}catch(e){
console.log("TX ERROR",e)
}
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
cachedPlans = Array.isArray(data) ? data : data.data || []

}catch(e){
console.log("PLANS ERROR",e)
}
}

/* ================= NETWORK ================= */

function selectNetwork(network, element){
selectedNetwork = (network || "").toLowerCase()
selectedPlan = null

document.querySelectorAll(".networkItem").forEach(n=>n.classList.remove("active"))
if(element) element.classList.add("active")

renderPlans()
}

/* ================= AIRTIME NETWORK ================= */

function selectAirtimeNetwork(network, element){
airtimeNetwork = network

document.querySelectorAll(".airtimeNet").forEach(n=>n.classList.remove("active"))
if(element) element.classList.add("active")
}

/* ================= RENDER PLANS ================= */

function renderPlans(){
const list=el("planList")
if(!list) return

list.innerHTML=""

const filtered = cachedPlans.filter(p=>{
let net = (p.network || "").toLowerCase()
return net.includes(selectedNetwork)
})

if(!filtered.length){
list.innerHTML="<p>No plans available</p>"
return
}

filtered.forEach(p=>{
let validity = p.validity || p.duration || "N/A"

const div=document.createElement("div")
div.className="planItem"

div.innerHTML=`
<strong>${p.name}</strong><br>
${validity}<br>
<strong>₦${p.price}</strong>
`

div.onclick=()=>{
selectedPlan = p
openConfirmModal(p)
}

list.appendChild(div)
})
}

/* ================= CONFIRM ================= */

function openConfirmModal(plan){
el("msgBox").innerHTML=`
<div style="text-align:center">
<h3 style="color:#00cec9">Confirm Purchase</h3>
<p>${plan.name}</p>
<p>₦${plan.price}</p>
<button onclick="openPinModal()" class="primaryBtn">Enter PIN</button>
</div>
`
openModal("msgModal")
}

/* ================= PIN ================= */

function openPinModal(){
closeModal("msgModal")
el("pinModal").style.display="flex"
}

function confirmPurchase(){
const pin=el("pinInput").value
if(!pin) return showMsg("Enter PIN")
closeModal("pinModal")
buyData(pin)
}

/* ================= BUY DATA ================= */

async function buyData(pin){

const phone=el("dataPhone").value

if(!phone || !selectedPlan){
showMsg("Select plan & enter phone")
return
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
playSuccess()
showReceipt("DATA", selectedPlan.price, phone)
fetchTransactions()
}else{
showMsg(data.message || "Transaction failed")
}

}catch{
hideLoader()
showMsg("Server unreachable")
}
}

/* ================= BUY AIRTIME ================= */

async function buyAirtime(){

const phone=el("airtimePhone")?.value
const amount=el("airtimeAmount")?.value
const pin=prompt("Enter PIN")

if(!phone || !amount || !airtimeNetwork){
return showMsg("Select network & fill fields")
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
playSuccess()
showReceipt("AIRTIME", amount, phone)
fetchTransactions()
}else{
showMsg(data.message || "Failed")
}

}catch{
hideLoader()
showMsg("Server unreachable")
}
}

/* ================= PAYSTACK ================= */

async function fundWallet(){
const amount = prompt("Enter amount")
if(!amount) return

showLoader()

try{
const res = await fetch(API+"/api/fund/init",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({amount})
})

const data = await res.json()
hideLoader()

if(data.url){
window.location.href = data.url
}else{
showMsg("Payment failed")
}

}catch{
hideLoader()
showMsg("Error starting payment")
}
}

async function verifyPayment(reference){
showLoader()

try{
await fetch(API+"/api/fund/verify/"+reference,{
headers:{Authorization:"Bearer "+getToken()}
})

hideLoader()
showMsg("Wallet funded successfully ✅")
fetchTransactions()

}catch{
hideLoader()
}
}

/* ================= ACCOUNT ================= */

async function loadAccount(){
try{
const res=await fetch(API+"/api/me",{
headers:{Authorization:"Bearer "+getToken()}
})
const user=await res.json()

if(el("bankName")) el("bankName").innerText=user.bank_name||"N/A"
if(el("accountNumber")) el("accountNumber").innerText=user.account_number||"N/A"
if(el("accountName")) el("accountName").innerText=user.account_name||"N/A"

}catch{}
}

function copyAccount(){
const acc = el("accountNumber")?.innerText
navigator.clipboard.writeText(acc)
showMsg("Copied ✅")
}

/* ================= PASSWORD ================= */

async function submitPassword(){
const oldPass=el("oldPassword").value
const newPass=el("newPassword").value

if(!oldPass || !newPass) return showMsg("Fill fields")

const res=await fetch(API+"/api/change-password",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({oldPass,newPass})
})

const data=await res.json()
showMsg(data.message)
}

/* ================= PIN ================= */

async function submitPin(){
const oldPin=el("oldPin").value
const newPin=el("newPin").value

if(!oldPin || !newPin) return showMsg("Fill fields")

const res=await fetch(API+"/api/change-pin",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({oldPin,newPin})
})

const data=await res.json()
showMsg(data.message)
}

/* ================= ADMIN ================= */

async function adminWithdraw(){
const username=el("withdrawUser").value
const amount=el("withdrawAmount").value

if(!username || !amount) return showMsg("Fill fields")

const res=await fetch(API+"/api/admin/withdraw",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({username,amount})
})

const data=await res.json()
showMsg(data.message || "Done")
}

/* ================= TOP USERS ================= */

async function loadTopUsers(){
try{
const res = await fetch(API+"/api/admin/top-users",{
headers:{Authorization:"Bearer "+getToken()}
})
const users = await res.json()

if(el("topUsersList")){
el("topUsersList").innerHTML = users.map(u=>`<p>${u.email}</p>`).join("")
}
}catch{}
}

async function addTopUser(){
const email = el("topUserEmail").value
if(!email) return showMsg("Enter email")

const res = await fetch(API+"/api/admin/top-users/add",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({email})
})

const data = await res.json()
showMsg(data.message)
loadTopUsers()
}

async function removeTopUser(){
const email = el("topUserEmail").value
if(!email) return showMsg("Enter email")

const res = await fetch(API+"/api/admin/top-users/remove",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({email})
})

const data = await res.json()
showMsg(data.message)
loadTopUsers()
}

/* ================= MODALS ================= */

function openModal(id){
if(el(id)) el(id).style.display="flex"
}

function closeModal(id){
if(el(id)) el(id).style.display="none"
}

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
try{ if(ws) ws.close() }catch{}
localStorage.clear()
window.location.href="login.html"
}

/* ================= START ================= */

document.addEventListener("DOMContentLoaded",loadDashboard)