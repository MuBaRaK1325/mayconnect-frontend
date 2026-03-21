const API="https://mayconnect-backend-1.onrender.com"

/* ==============================
TOKEN HELPER
============================== */

function getToken(){
return localStorage.getItem("token")
}

/* ==============================
GLOBAL ERROR
============================== */

window.onerror=function(){
showToast("Something went wrong ⚠️")
hideLoader()
return true
}

window.onunhandledrejection=function(){
showToast("Network issue ⚠️")
hideLoader()
}

/* ==============================
TOAST
============================== */

function showToast(msg){

const t=document.createElement("div")

t.innerText=msg
t.style.position="fixed"
t.style.bottom="30px"
t.style.left="50%"
t.style.transform="translateX(-50%)"
t.style.background="#000"
t.style.padding="12px 20px"
t.style.borderRadius="8px"
t.style.color="#fff"
t.style.zIndex="99999"

document.body.appendChild(t)

setTimeout(()=>t.remove(),3000)

}

/* ==============================
SPLASH LOADER
============================== */

function hideLoader(){

const loader=document.getElementById("splashLoader") || document.getElementById("dashboardLoader")

if(!loader) return

loader.style.display="none"

}

window.addEventListener("load",()=>{

setTimeout(()=>{
hideLoader()
},800)

})

/* ==============================
SMART FETCH
============================== */

async function smartFetch(url,options={}){

try{

const res=await fetch(url,options)
return res

}catch{

showToast("Network error")
throw new Error("Network")

}

}

/* ==============================
LOGIN
============================== */

async function login(){

const username=document.getElementById("loginUsername").value
const password=document.getElementById("loginPassword").value

const res=await fetch(`${API}/api/login`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({username,password})

})

const data=await res.json()

if(!res.ok){

alert(data.message)
return

}

localStorage.setItem("token",data.token)

window.location="dashboard.html"

}

/* ==============================
REAL TIME WALLET
============================== */

let walletSocket

function connectWalletSocket(){

const token=getToken()

if(!token) return

try{

walletSocket=new WebSocket(`wss://mayconnect-backend-1.onrender.com/ws?token=${token}`)

walletSocket.onmessage=(event)=>{

const data=JSON.parse(event.data)

if(data.type==="wallet_update"){

updateWalletUI(data.balance)

}

if(data.type==="transaction"){

loadTransactions()

sendNotification("New Transaction","Transaction received")

}

}

walletSocket.onclose=()=>{

setTimeout(connectWalletSocket,4000)

}

}catch{

console.log("Websocket failed")

}

}

function updateWalletUI(balance){

const walletEl=document.getElementById("walletBalance")

if(walletEl){

walletEl.innerText="₦"+Number(balance).toLocaleString()

}

}

/* ==============================
PUSH NOTIFICATIONS
============================== */

function enableNotifications(){

if(!("Notification" in window)) return

if(Notification.permission==="default"){

Notification.requestPermission()

}

}

function sendNotification(title,message){

if(Notification.permission==="granted"){

new Notification(title,{
body:message
})

}

}

/* ==============================
NETWORK DETECTION
============================== */

const NETWORK_PREFIX={
MTN:["0803","0806","0813","0816","0703","0706","0903","0906"],
AIRTEL:["0802","0808","0812","0701","0708","0901","0902"],
GLO:["0805","0807","0811","0705","0905"],
"9MOBILE":["0809","0817","0818","0908"]
}

function detectNetwork(phone){

phone=phone.replace(/\D/g,"")

const prefix=phone.substring(0,4)

for(const network in NETWORK_PREFIX){

if(NETWORK_PREFIX[network].includes(prefix)){

return network

}

}

return null

}

/* ==============================
LOAD DATA PLANS
============================== */

async function loadDataPlans(network){

try{

const res=await fetch(`${API}/api/data-plans?network=${network}`)

const plans=await res.json()

const container=document.getElementById("plans")

if(!container) return

container.innerHTML=""

plans.forEach(plan=>{

const card=document.createElement("div")

card.className="planCard"

card.innerHTML=`
<h4>${plan.name}</h4>
<p>₦${plan.price}</p>
<button onclick="selectPlan('${plan.id}')">Buy</button>
`

container.appendChild(card)

})

}catch{

showToast("Failed to load data plans")

}

}

/* ==============================
BALANCE ANIMATION
============================== */

function animateBalance(balance){

const el=document.getElementById("walletBalance")

if(!el) return

let start=0
const step=balance/40

const t=setInterval(()=>{

start+=step

if(start>=balance){

el.innerText="₦"+balance.toLocaleString()
clearInterval(t)

}else{

el.innerText="₦"+Math.floor(start).toLocaleString()

}

},30)

}

/* ==============================
TRANSACTION CARD
============================== */

function createTransactionCard(t){

const div=document.createElement("div")

div.className="transaction-card"

div.innerHTML=`
<strong>${t.type.toUpperCase()}</strong>
<p>₦${Number(t.amount).toLocaleString()}</p>
<small>${t.phone||""}</small>
<br>
<small>${new Date(t.created_at).toLocaleString()}</small>
`

return div

}

/* ==============================
TRANSACTIONS
============================== */

async function loadTransactions(){

const token=getToken()

if(!token) return

try{

const res=await fetch(`${API}/api/transactions`,{

headers:{
Authorization:`Bearer ${token}`
}

})

const tx=await res.json()

const container=document.getElementById("transactionHistory")

if(!container) return

container.innerHTML=""

tx.forEach(t=>{
container.appendChild(createTransactionCard(t))
})

calculateProfit(tx)

}catch{}

}

/* ==============================
ADMIN MONITOR
============================== */

function adminLiveMonitor(){

const token=getToken()

if(!token) return

const socket=new WebSocket(`wss://mayconnect-backend-1.onrender.com/admin?token=${token}`)

socket.onmessage=(event)=>{

const data=JSON.parse(event.data)

if(data.type==="new_transaction"){

loadTransactions()

showToast("New user transaction")

}

}

}

/* ==============================
PROFIT CALCULATOR
============================== */

function calculateProfit(transactions){

let profit=0

transactions.forEach(t=>{

if(t.profit){
profit+=Number(t.profit)
}

})

const profitEl=document.getElementById("profitBalance")

if(profitEl){

profitEl.innerText="₦"+profit.toLocaleString()

}

}

/* ==============================
DASHBOARD
============================== */

async function loadDashboard(){

const token=getToken()

if(!token){

window.location="login.html"
return

}

try{

const res=await smartFetch(`${API}/api/me`,{

headers:{
Authorization:`Bearer ${token}`
}

})

if(!res.ok){

localStorage.removeItem("token")
window.location="login.html"
return

}

const user=await res.json()

animateBalance(user.wallet_balance||0)

enableNotifications()

connectWalletSocket()

loadTransactions()

if(user.is_admin){

adminLiveMonitor()

}

}catch{

localStorage.removeItem("token")

window.location="login.html"

}

}

if(window.location.pathname.includes("dashboard")){

window.addEventListener("load",loadDashboard)

}

/* ==============================
LOGOUT
============================== */

function logout(){

localStorage.removeItem("token")

window.location="login.html"

}