const API="https://mayconnect-backend-1.onrender.com"

const welcomeSound=new Audio("sounds/welcome.mp3")
const successSound=new Audio("sounds/success.mp3")

let cachedPlans=[]
let currentBalance=0
let ws

/* ================= HELPERS ================= */

function getToken(){
return localStorage.getItem("token")
}

function el(id){
return document.getElementById(id)
}

function showToast(msg){

const t=document.createElement("div")

t.innerText=msg

Object.assign(t.style,{
position:"fixed",
bottom:"30px",
left:"50%",
transform:"translateX(-50%)",
background:"#000",
padding:"12px 20px",
borderRadius:"8px",
color:"#fff",
zIndex:"9999",
fontSize:"14px"
})

document.body.appendChild(t)

setTimeout(()=>t.remove(),3000)

}

/* ================= NETWORK ================= */

const networkPrefixes={
MTN:["0803","0806","0703","0706","0813","0816","0810","0814","0903","0906"],
Airtel:["0802","0808","0708","0812","0701","0902","0907"],
Glo:["0805","0705","0815","0811","0905"]
}

const networkLogos={
MTN:"images/mtn.png",
Airtel:"images/airtel.png",
Glo:"images/glo.png"
}

/* ================= WALLET ================= */

function animateWallet(balance){

currentBalance=Number(balance||0)

if(el("walletBalance"))
el("walletBalance").innerText="₦"+currentBalance.toLocaleString()

}

/* ================= BIOMETRIC ================= */

async function biometricAuth(){

if(localStorage.getItem("biometric")!=="true") return true

if(!window.PublicKeyCredential){
showToast("Biometric not supported")
return true
}

try{

const challenge=new Uint8Array(32)
crypto.getRandomValues(challenge)

await navigator.credentials.get({
publicKey:{
challenge,
timeout:60000,
userVerification:"preferred"
}
})

return true

}catch{

showToast("Biometric verification failed")
return false

}

}

/* ================= DASHBOARD ================= */

async function loadDashboard(){

const token=getToken()

if(!token){
location="login.html"
return
}

try{

const res=await fetch(API+"/api/me",{
headers:{Authorization:"Bearer "+token}
})

if(!res.ok) throw new Error()

const user=await res.json()

el("usernameDisplay").innerText="Hello "+user.username

animateWallet(user.wallet_balance)

try{welcomeSound.play()}catch{}

if(user.is_admin && el("admin")){
el("admin").style.display="block"
}

fetchTransactions()
loadPlans()
connectWalletWebSocket()
loadAdminProfit()

}catch{

showToast("Session expired")
logout()

}

document.body.style.display="block"

}

/* ================= TRANSACTIONS ================= */

async function fetchTransactions(){

try{

const res=await fetch(API+"/api/transactions",{
headers:{Authorization:"Bearer "+getToken()}
})

const tx=await res.json()

const container=el("transactionHistory")

if(!container) return

container.innerHTML=""

tx.slice(0,5).forEach(t=>{

const statusColor=
t.status==="SUCCESS"?"#2ecc71":
t.status==="PENDING"?"#f1c40f":"#e74c3c"

const div=document.createElement("div")

div.className="transactionCard"

div.innerHTML=`
<strong>${t.type}</strong> ₦${t.amount}<br>
${t.phone||""}<br>
<span style="color:${statusColor}">${t.status}</span><br>
<button onclick='showReceipt(${JSON.stringify(t)})'>Receipt</button>
`

container.appendChild(div)

})

}catch{}

}

/* ================= DATA PLANS ================= */

async function loadPlans(){

try{

const res=await fetch(API+"/api/plans")

cachedPlans=await res.json()

updatePlans()

}catch{}

}

function updatePlans(){

const network=el("networkSelect")?.value
const select=el("planSelect")

if(!select) return

select.innerHTML=""

cachedPlans
.filter(p=>!network || p.network===network)
.forEach(plan=>{

const opt=document.createElement("option")

opt.value=plan.id
opt.textContent=`${plan.name} - ₦${plan.price}`

select.appendChild(opt)

})

}

/* ================= NETWORK DETECTION ================= */

function detectNetwork(phone){

const prefix=phone.substring(0,4)

for(const net in networkPrefixes){
if(networkPrefixes[net].includes(prefix)) return net
}

return null

}

function handlePhoneInput(inputId,networkSelectId,logoId){

const phone=el(inputId)?.value

if(!phone || phone.length<4) return

const net=detectNetwork(phone)

if(net){

if(el(networkSelectId))
el(networkSelectId).value=net

if(el(logoId))
el(logoId).src=networkLogos[net]

updatePlans()

}

}

/* ================= BUY DATA ================= */

async function buyData(pin){

const phone=el("dataPhone").value
const planId=el("planSelect").value

if(!phone || !planId){
showToast("Fill all fields")
return
}

const plan=cachedPlans.find(p=>p.id==planId)

if(plan && currentBalance<plan.price){
showToast("Insufficient balance")
return
}

const bio=await biometricAuth()
if(!bio) return

try{

const res=await fetch(API+"/api/buy-data",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},

body:JSON.stringify({phone,plan_id:planId,pin})

})

const data=await res.json()

if(res.ok && data.success){

successSound.play()

animateWallet(currentBalance-plan.price)

showToast("Data purchase successful")

fetchTransactions()
showReceipt(data.transaction)

}else{

showToast(data.message||"Purchase failed")

}

}catch{

showToast("Network error")

}

}

/* ================= BUY AIRTIME ================= */

async function buyAirtime(pin){

const phone=el("airtimePhone").value
const amount=Number(el("airtimeAmount").value)

if(!phone || !amount){
showToast("Fill all fields")
return
}

if(currentBalance<amount){
showToast("Insufficient balance")
return
}

const bio=await biometricAuth()
if(!bio) return

try{

const res=await fetch(API+"/api/buy-airtime",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},

body:JSON.stringify({phone,amount,pin})

})

const data=await res.json()

if(res.ok && data.success){

successSound.play()

animateWallet(currentBalance-amount)

showToast("Airtime sent")

fetchTransactions()
showReceipt(data.transaction)

}else{

showToast(data.message||"Purchase failed")

}

}catch{

showToast("Network error")

}

}

/* ================= RECEIPT ================= */

function showReceipt(t){

if(!t) return

const text=`
MAY CONNECT RECEIPT

Type: ${t.type}
Amount: ₦${t.amount}
Phone: ${t.phone||"-"}
Status: ${t.status}
Reference: ${t.reference||"-"}
Date: ${new Date(t.created_at).toLocaleString()}
`

alert(text)

}

/* ================= ACCOUNT ================= */

async function changePassword(){

const oldPassword=prompt("Enter current password")
const newPassword=prompt("Enter new password")

if(!oldPassword||!newPassword) return

try{

const res=await fetch(API+"/api/change-password",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},

body:JSON.stringify({oldPassword,newPassword})

})

const data=await res.json()

showToast(data.message||"Password updated")

}catch{

showToast("Error updating password")

}

}

async function changePin(){

const oldPin=prompt("Enter old PIN")
const newPin=prompt("Enter new PIN")

if(!oldPin||!newPin) return

try{

const res=await fetch(API+"/api/change-pin",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},

body:JSON.stringify({oldPin,newPin})

})

const data=await res.json()

showToast(data.message||"PIN updated")

}catch{

showToast("Error updating PIN")

}

}

/* ================= ADMIN ================= */

async function withdrawProfit(){

const amount=el("withdrawAmount").value
const bank=el("withdrawBank").value
const account=el("withdrawAccount").value

if(!amount||!bank||!account){
showToast("Fill all fields")
return
}

try{

const res=await fetch(API+"/api/admin/withdraw-profit",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},

body:JSON.stringify({amount,bank,account})

})

const data=await res.json()

showToast(data.message||"Withdrawal processed")

loadAdminProfit()

}catch{

showToast("Withdrawal failed")

}

}

/* ================= WEBSOCKET ================= */

function connectWalletWebSocket(){

const token=getToken()

try{

ws=new WebSocket(API.replace(/^http/,"ws")+"?token="+token)

ws.onmessage=(msg)=>{

const data=JSON.parse(msg.data)

if(data.type==="wallet_update"){

animateWallet(data.balance)
fetchTransactions()

}

}

ws.onclose=()=>{
setTimeout(connectWalletWebSocket,5000)
}

}catch{}

}

/* ================= ADMIN PROFIT ================= */

async function loadAdminProfit(){

if(!el("adminTotalProfit")) return

try{

const res=await fetch(API+"/api/admin/profits",{
headers:{Authorization:"Bearer "+getToken()}
})

const data=await res.json()

el("adminTotalProfit").innerText="₦"+(data.total_profit||0)

}catch{}

}

setInterval(loadAdminProfit,30000)

/* ================= BIOMETRIC ================= */

function toggleBiometric(){

const enabled=localStorage.getItem("biometric")==="true"

localStorage.setItem("biometric",!enabled)

showToast(!enabled?"Biometric enabled":"Biometric disabled")

}

/* ================= LOGOUT ================= */

function logout(){

localStorage.removeItem("token")

location="login.html"

}

/* ================= START ================= */

document.addEventListener("DOMContentLoaded",()=>{

loadDashboard()

if(el("networkSelect")){
el("networkSelect").addEventListener("change",updatePlans)
}

if(el("dataPhone")){
el("dataPhone").addEventListener("input",()=>handlePhoneInput("dataPhone","networkSelect","networkLogo"))
}

if(el("airtimePhone")){
el("airtimePhone").addEventListener("input",()=>handlePhoneInput("airtimePhone","airtimeNetwork","airtimeLogo"))
}

})