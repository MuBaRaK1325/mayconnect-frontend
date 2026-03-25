const API="https://mayconnect-backend-1.onrender.com"

/* TOKEN */

function getToken(){
return localStorage.getItem("token")
}

/* SAFE ELEMENT */

function el(id){
return document.getElementById(id)
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
t.style.zIndex="9999"

document.body.appendChild(t)

setTimeout(()=>t.remove(),3000)

}

/* NETWORK PREFIX */

const NETWORK_PREFIX={
MTN:["0803","0806","0813","0816","0703","0706","0903","0906"],
AIRTEL:["0802","0808","0812","0701","0708","0901","0902"],
GLO:["0805","0807","0811","0705","0905"],
"9MOBILE":["0809","0817","0818","0908"]
}

/* DETECT NETWORK */

function detectNetwork(phone){

phone=phone.replace(/\D/g,"")

if(phone.startsWith("234")){
phone="0"+phone.slice(3)
}

const prefix=phone.substring(0,4)

for(const network in NETWORK_PREFIX){

if(NETWORK_PREFIX[network].includes(prefix)){
return network
}

}

return null
}

/* NETWORK LOGO */

function showNetworkLogo(network){

const logo=el("networkLogo")
const badge=el("networkName")

if(!logo) return

const logos={
MTN:"images/mtn.png",
AIRTEL:"images/airtel.png",
GLO:"images/glo.png",
"9MOBILE":"images/9mobile.png"
}

logo.src=logos[network] || ""
logo.style.display="block"
logo.style.border="3px solid #2f6bff"
logo.style.borderRadius="50%"
logo.style.padding="5px"

if(badge){
badge.innerText=network
badge.style.display="inline-block"
}

}

/* PHONE INPUT */

let lastNetworkLoaded=null

function handlePhoneInput(input){

const phone=input.value

if(phone.length<4) return

const network=detectNetwork(phone)

if(!network) return

showNetworkLogo(network)

/* STOP RELOADING SAME NETWORK */

if(network===lastNetworkLoaded) return

lastNetworkLoaded=network

if(el("plans")){
loadDataPlans(network)
}

}

/* LOAD DATA PLANS */

async function loadDataPlans(network){

try{

const token=getToken()

const res=await fetch(`${API}/api/plans`,{
headers:{Authorization:`Bearer ${token}`}
})

const plans=await res.json()

const container=el("plans")

if(!container) return

container.innerHTML=""

/* FILTER NETWORK */

const filtered=plans.filter(p=>{

if(!p.network) return false

return p.network.toLowerCase().includes(network.toLowerCase())

})

if(filtered.length===0){
container.innerHTML="<p>No plans available</p>"
return
}

/* RENDER */

filtered.forEach(plan=>{

const planName=plan.plan || plan.name || plan.title || "Data Plan"

const validity=
plan.validity ||
plan.validity_days ||
plan.duration ||
plan.validity_text ||
"N/A"

const price=plan.price || plan.amount || 0

const planId=plan.plan_id || plan.id

const card=document.createElement("div")

card.className="planCard"

card.innerHTML=`
<h4>${planName}</h4>
<p>₦${price}</p>
<p>${validity}</p>
<button onclick="openPinModal('${planId}','data')">Buy</button>
`

container.appendChild(card)

})

}catch(e){

console.log("Plan load error:",e)

showToast("Failed to load plans")

}

}

/* PURCHASE MODAL */

let selectedPlan=null
let purchaseType=null

function openPinModal(plan,type){

selectedPlan=plan
purchaseType=type

el("pinModal")?.classList.remove("hidden")

}

function closePinModal(){
el("pinModal")?.classList.add("hidden")
}

/* BIOMETRIC PURCHASE */

function confirmBiometric(){

if(!localStorage.getItem("biometric")){
showToast("Biometric not enabled")
return
}

confirmPurchase()

}

/* BUY DATA */

async function buyData(planId,pin){

const phone=el("phone")?.value

const token=getToken()

try{

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

if(!res.ok || data.status===false){
showToast(data.message || "Transaction failed")
return
}

showToast("Data purchase successful")

}catch{

showToast("Network error")

}

}

/* BUY AIRTIME */

async function buyAirtime(phone,amount,pin){

const token=getToken()

try{

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

if(!res.ok || data.status===false){
showToast(data.message || "Airtime failed")
return
}

showToast("Airtime successful")

}catch{

showToast("Network error")

}

}

/* CONFIRM PURCHASE */

function confirmPurchase(){

const pin=el("pin")?.value

if(!pin){
showToast("Enter transaction PIN")
return
}

if(purchaseType==="airtime"){

const phone=el("phone").value
const amount=el("amount").value

buyAirtime(phone,amount,pin)

}else{

buyData(selectedPlan,pin)

}

closePinModal()

}

/* SAVE PIN */

async function savePin(){

const pin=el("pin")?.value

const token=getToken()

try{

const res=await fetch(`${API}/api/set-pin`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({pin})

})

const data=await res.json()

showToast(data.message)

localStorage.setItem("pinSet","true")

}catch{

showToast("Failed to save PIN")

}

}

/* BIOMETRIC */

function toggleBiometric(){

const enabled=localStorage.getItem("biometric")

if(enabled){

localStorage.removeItem("biometric")

showToast("Biometric disabled")

}else{

localStorage.setItem("biometric","true")

showToast("Biometric enabled")

}

}

/* PASSWORD */

function changePassword(){
showToast("Password feature coming soon")
}

/* DASHBOARD */

async function loadDashboard(){

const token=getToken()

if(!token){
window.location="login.html"
return
}

try{

const res=await fetch(`${API}/api/user`,{
headers:{Authorization:`Bearer ${token}`}
})

const user=await res.json()

if(el("usernameDisplay"))
el("usernameDisplay").innerText=`Hello 👋 ${user.name}`

if(el("walletBalance"))
el("walletBalance").innerText=`₦${user.wallet || 0}`

if(el("profileName"))
el("profileName").innerText=user.name

if(el("profileEmail"))
el("profileEmail").innerText=user.email

/* ADMIN PANEL */

if((user.isAdmin || user.is_admin) && el("adminPanel")){
el("adminPanel").style.display="block"
}

/* PIN BUTTON */

if(localStorage.getItem("pinSet")){
if(el("pinBtn")) el("pinBtn").innerText="Change Transaction PIN"
}

}catch(e){

console.log(e)

showToast("Dashboard offline")

}

/* HIDE LOADER */

const loader=el("dashboardLoader")

if(loader) loader.style.display="none"

}

/* LOADER SAFETY */

setTimeout(()=>{

const loader=el("dashboardLoader")

if(loader) loader.style.display="none"

},8000)

/* START DASHBOARD */

window.addEventListener("load",()=>{

if(el("walletBalance")){
loadDashboard()
}

})

/* LOGOUT */

function logout(){

localStorage.removeItem("token")

window.location="login.html"

}