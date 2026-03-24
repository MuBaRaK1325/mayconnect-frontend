const API="https://mayconnect-backend-1.onrender.com"

/* TOKEN */

function getToken(){
return localStorage.getItem("token")
}

/* DEVICE */

const DEVICE_ID="mayconnect_device"

if(!localStorage.getItem(DEVICE_ID)){
localStorage.setItem(DEVICE_ID,crypto.randomUUID())
}

function getDevice(){
return localStorage.getItem(DEVICE_ID)
}

/* RATE LIMIT */

const RATE_LIMIT={}

function limitAction(key,delay=3000){

const now=Date.now()

if(RATE_LIMIT[key] && now-RATE_LIMIT[key]<delay){

showToast("Please wait a moment")
return false

}

RATE_LIMIT[key]=now
return true
}

/* GLOBAL ERROR HANDLER */

window.onerror=function(e){
console.log(e)
showToast("Something went wrong ⚠️")
hideLoader()
return true
}

window.onunhandledrejection=function(e){
console.log(e)
showToast("Network issue ⚠️")
hideLoader()
}

/* TOAST */

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

/* LOADER */

function hideLoader(){

const loader=document.getElementById("splashLoader") || document.getElementById("dashboardLoader")

if(loader) loader.style.display="none"

}

window.addEventListener("load",()=>{
setTimeout(hideLoader,800)
})

/* LOGIN */

async function login(){

if(!limitAction("login",2000)) return

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

/* WEBSOCKET */

let walletSocket

function connectWalletSocket(){

const token=getToken()
if(!token) return

walletSocket=new WebSocket(`wss://mayconnect-backend-1.onrender.com?token=${token}`)

walletSocket.onmessage=(event)=>{

const data=JSON.parse(event.data)

if(data.type==="wallet_update"){
animateBalance(data.balance)
}

}

walletSocket.onclose=()=>{
setTimeout(connectWalletSocket,4000)
}

}

/* NETWORK DETECTION */

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

return "MTN"
}

/* SHOW NETWORK LOGO */

function showNetworkLogo(network){

const logo=document.getElementById("networkLogo")

if(!logo) return

const logos={
MTN:"images/Mtn.png",
AIRTEL:"images/Airtel.png",
GLO:"images/Glo.png"
}

logo.src=logos[network] || "images/Mtn.png"

logo.style.display="block"

}

/* PHONE INPUT HANDLER */

function handlePhoneInput(input){

const phone=input.value

if(phone.length<4) return

const network=detectNetwork(phone)

showNetworkLogo(network)

loadDataPlans(network)

}

/* LOAD DATA PLANS */

async function loadDataPlans(network){

const token=getToken()

const res=await fetch(`${API}/api/plans`,{
headers:{Authorization:`Bearer ${token}`}
})

const plans=await res.json()

const container=document.getElementById("plans")

if(!container) return

container.innerHTML=""

const filtered=plans.filter(p=>p.network===network)

/* REMOVE DUPLICATES */

const unique={}

filtered.forEach(p=>{
if(!unique[p.plan]){
unique[p.plan]=p
}
})

Object.values(unique).forEach(plan=>{

const card=document.createElement("div")

card.className="planCard"

card.innerHTML=`
<h4>${plan.plan}</h4>
<p>₦${plan.price}</p>
<button onclick="openPinModal('${plan.id}')">Buy</button>
`

container.appendChild(card)

})

}

/* BUY AIRTIME */

async function buyAirtime(phone,amount,pin){

const token=getToken()

const res=await fetch(`${API}/api/buy-airtime`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({
network:detectNetwork(phone),
phone,
amount,
pin
})

})

const data=await res.json()

if(!res.ok){
showToast(data.message)
return
}

showToast("Airtime successful")

}

/* BUY DATA */

async function buyData(planId,pin){

const phone=document.getElementById("phone").value

const token=getToken()

const res=await fetch(`${API}/api/buy-data`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({
plan_id:planId,
phone,
pin
})

})

const data=await res.json()

if(!res.ok){
showToast(data.message)
return
}

showToast("Data purchase successful")

}

/* CONFIRM PURCHASE */

async function confirmPurchase(){

const pin=document.getElementById("pin").value

if(window.purchaseType==="airtime"){

const phone=document.getElementById("phone").value
const amount=document.getElementById("airtimeAmount").value

buyAirtime(phone,amount,pin)

}else{

buyData(window.selectedPlan,pin)

}

closePinModal()

}

/* ADMIN WITHDRAW */

async function adminWithdraw(){

const amount=document.getElementById("withdrawAmount").value
const bank=document.getElementById("bank").value
const account=document.getElementById("accountNumber").value
const name=document.getElementById("accountName").value

const token=getToken()

const res=await fetch(`${API}/api/admin/withdraw`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({
amount,
bank,
account_number:account,
account_name:name
})

})

const data=await res.json()

if(!res.ok){
showToast(data.message)
return
}

showToast("Withdrawal request sent")

}

/* BALANCE */

function animateBalance(balance){

const el=document.getElementById("walletBalance")

if(!el) return

el.innerText="₦"+Number(balance).toLocaleString()

}

/* TRANSACTIONS */

async function loadTransactions(){

const token=getToken()

const res=await fetch(`${API}/api/transactions`,{

headers:{Authorization:`Bearer ${token}`}

})

const tx=await res.json()

const container=document.getElementById("transactionHistory")

if(!container) return

container.innerHTML=""

tx.forEach(t=>{

const div=document.createElement("div")

div.className="transaction-card"

div.innerHTML=`
<strong>${t.type}</strong>
<p>₦${t.amount}</p>
`

container.appendChild(div)

})

}

/* DASHBOARD */

async function loadDashboard(){

const token=getToken()

if(!token){
window.location="login.html"
return
}

const res=await fetch(`${API}/api/me`,{
headers:{Authorization:`Bearer ${token}`}
})

const user=await res.json()

animateBalance(user.wallet_balance)

const name=document.getElementById("usernameDisplay")
if(name) name.innerText=`Hello 👋 ${user.username}`

const profileName=document.getElementById("profileName")
if(profileName) profileName.innerText=user.username

const avatar=document.getElementById("avatar")
if(avatar) avatar.innerText=user.username.charAt(0).toUpperCase()

/* ADMIN PANEL */

if(user.is_admin){

const panel=document.getElementById("adminPanel")
if(panel) panel.style.display="block"

const profit=document.getElementById("profitBalance")
if(profit) profit.innerText="₦"+Number(user.admin_wallet).toLocaleString()

}

connectWalletSocket()

loadTransactions()

}

if(window.location.pathname.includes("dashboard")){
window.addEventListener("load",loadDashboard)
}

/* LOGOUT */

function logout(){

localStorage.removeItem("token")

window.location="login.html"

}