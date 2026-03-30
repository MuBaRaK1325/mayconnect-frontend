const API="https://mayconnect-backend-1.onrender.com"

const welcomeSound=new Audio("sounds/welcome.mp3")
const successSound=new Audio("sounds/success.mp3")

let cachedPlans=[]
let currentBalance=0

/* ================= NETWORK PREFIX MAP ================= */

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

/* ================= WALLET ================= */

function animateWallet(balance){

currentBalance=Number(balance||0)

const wallet=el("walletBalance")

if(wallet){
wallet.innerText="₦"+currentBalance.toLocaleString()
}

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
window.crypto.getRandomValues(challenge)

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
window.location="login.html"
return
}

try{

const res=await fetch(API+"/api/me",{
headers:{Authorization:"Bearer "+token}
})

if(!res.ok) throw new Error()

const user=await res.json()

if(el("usernameDisplay"))
el("usernameDisplay").innerText="Hello "+user.username

animateWallet(user.wallet_balance)

try{ welcomeSound.play() }catch{}

/* ADMIN PANEL */

if(user.is_admin && el("admin")){
el("admin").style.display="block"
}

/* LOAD DATA */

fetchTransactions()
loadPlans()
connectWalletWebSocket()
loadAdminProfit()

}catch{

showToast("Session expired")
window.location="login.html"

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

if(!container)return

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

const plans=await res.json()

cachedPlans=plans

updatePlans()

}catch{}

}

function updatePlans(){

const network=el("networkSelect")?.value
const select=el("planSelect")

if(!select)return

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

const phone=el("dataPhone")?.value
const planId=el("planSelect")?.value

if(!phone||!planId){
showToast("Fill all fields")
return
}

const plan=cachedPlans.find(p=>p.id==planId)

if(plan && currentBalance<plan.price){
showToast("Insufficient wallet balance")
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

body:JSON.stringify({
phone,
plan_id:planId,
pin
})

})

const data=await res.json()

if(data.success){

successSound.play()

showToast("Data purchase successful")

fetchTransactions()
loadAdminProfit()

}else{

showToast(data.message||"Purchase failed")

}

}catch{

showToast("Network error")

}

}

/* ================= BUY AIRTIME ================= */

async function buyAirtime(pin){

const phone=el("airtimePhone")?.value
const amount=Number(el("airtimeAmount")?.value)

if(!phone || !amount){
showToast("Fill all fields")
return
}

if(currentBalance<amount){
showToast("Insufficient wallet balance")
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

body:JSON.stringify({
phone,
amount,
pin
})

})

const data=await res.json()

if(data.success){

successSound.play()

showToast("Airtime sent successfully")

fetchTransactions()
loadAdminProfit()

}else{

showToast(data.message||"Purchase failed")

}

}catch{

showToast("Network error")

}

}

/* ================= RECEIPT ================= */

function showReceipt(t){

const text=`
MAY CONNECT RECEIPT

Type: ${t.type}
Amount: ₦${t.amount}
Phone: ${t.phone||"-"}
Status: ${t.status}
Reference: ${t.reference||"-"}
Date: ${new Date(t.created_at).toLocaleString()}
`

const share=encodeURIComponent(text)

const box=document.createElement("div")

Object.assign(box.style,{
position:"fixed",
top:"0",
left:"0",
width:"100%",
height:"100%",
background:"rgba(0,0,0,0.92)",
display:"flex",
alignItems:"center",
justifyContent:"center",
zIndex:"9999"
})

box.innerHTML=`

<div style="background:#08142c;padding:25px;border-radius:16px;width:90%;max-width:420px;text-align:center">

<h2>Transaction Receipt</h2>

<pre style="white-space:pre-wrap">${text}</pre>

<button onclick="window.open('https://wa.me/?text=${share}')">
Share on WhatsApp
</button>

<button onclick="navigator.clipboard.writeText('${t.reference||""}')">
Copy Reference
</button>

<button onclick="this.parentElement.parentElement.remove()">
Close
</button>

</div>
`

document.body.appendChild(box)

}

/* ================= BIOMETRIC ================= */

function toggleBiometric(){

const enabled=localStorage.getItem("biometric")==="true"

localStorage.setItem("biometric",!enabled)

showToast(!enabled?"Biometric enabled":"Biometric disabled")

}

/* ================= LOGOUT ================= */

function logout(){

localStorage.removeItem("token")

window.location="login.html"

}

/* ================= WEBSOCKET ================= */

let ws

function connectWalletWebSocket(){

const token=getToken()

ws=new WebSocket(
API.replace(/^http/,"ws")+"?token="+token
)

ws.onmessage=(msg)=>{

const data=JSON.parse(msg.data)

if(data.type==="wallet_update"){

animateWallet(data.balance)

fetchTransactions()

}

}

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