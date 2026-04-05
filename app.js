const API="https://mayconnect-backend-1.onrender.com"

const welcomeSound=new Audio("sounds/welcome.mp3")
const successSound=new Audio("sounds/success.mp3")

let cachedPlans=[]
let currentBalance=0
let currentUser=null
let ws=null
let hasPlayedWelcome=false

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
zIndex:"9999"
})

document.body.appendChild(t)
setTimeout(()=>t.remove(),3000)
}

/* ================= LOADER ================= */

function showLoader(){
document.body.style.display="none"
}

function hideLoader(){
document.body.style.display="block"
}

/* ================= AUTH CHECK ================= */

if(!getToken()){
location.href="index.html"
}

/* ================= DASHBOARD ================= */

async function loadDashboard(){

showLoader()

const token=getToken()

try{

const payload = JSON.parse(atob(token.split(".")[1]))
currentUser = payload

el("usernameDisplay").innerText="Hello "+payload.username

animateWallet(0)

/* ADMIN PANEL */
if(payload.is_admin && el("admin")){
el("admin").style.display="block"
}

/* ✅ PLAY SOUND ONCE */
if(!hasPlayedWelcome){
welcomeSound.play().catch(()=>{})
hasPlayedWelcome=true
}

/* LOAD DATA */
await Promise.all([
fetchTransactions(),
loadPlans(),
loadAdminProfit()
])

connectWebSocket()

}catch(err){

console.log(err)
showToast("Session expired")
logout()
return

}

hideLoader()
}

/* ================= WALLET ================= */

function animateWallet(balance){
currentBalance=Number(balance||0)

if(el("walletBalance")){
el("walletBalance").innerText="₦"+currentBalance.toLocaleString()
}
}

/* ================= TRANSACTIONS ================= */

async function fetchTransactions(){

try{

const res=await fetch(API+"/api/transactions",{
headers:{Authorization:"Bearer "+getToken()}
})

if(!res.ok) return

const tx=await res.json()

/* UPDATE WALLET */
if(tx.length){
animateWallet(tx[0].wallet_balance || currentBalance)
}

/* HOME */
const home=el("transactionHistory")
if(home){
home.innerHTML=""

tx.slice(0,5).forEach(t=>{
const div=document.createElement("div")
div.className="transactionCard"
div.innerHTML=`
<strong>${t.type}</strong> ₦${t.amount}<br>
${t.phone||""}<br>
<span>${t.status}</span>
`
home.appendChild(div)
})
}

/* ALL */
const all=el("allTransactions")
if(all){
all.innerHTML=""

tx.forEach(t=>{
const div=document.createElement("div")
div.className="transactionCard"
div.innerHTML=`
<strong>${t.type}</strong> ₦${t.amount}<br>
${t.phone||""}<br>
<span>${t.status}</span>
`
all.appendChild(div)
})
}

}catch{
console.log("Transactions error")
}

}

/* ================= PLANS ================= */

async function loadPlans(){

try{

const res=await fetch(API+"/api/plans",{
headers:{Authorization:"Bearer "+getToken()}
})

if(!res.ok) throw new Error()

const plans=await res.json()

cachedPlans=plans.filter(p=>p.company===currentUser.company)

updatePlans()

}catch{
showToast("Failed to load plans")
}

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

/* ================= NETWORK ================= */

const logos={
MTN:"images/mtn.png",
Airtel:"images/airtel.png",
Glo:"images/glo.png"
}

function handlePhoneInput(input,select,logo){

const phone=el(input)?.value
if(!phone || phone.length<4) return

const prefix=phone.substring(0,4)

let net=null

if(["0803","0806","0703"].includes(prefix)) net="MTN"
if(["0802","0808","0708"].includes(prefix)) net="Airtel"
if(["0805","0705"].includes(prefix)) net="Glo"

if(net){
if(el(select)) el(select).value=net
if(el(logo)) el(logo).src=logos[net]
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
showToast("Data successful")
fetchTransactions()

}else{
showToast(data.message||"Failed")
}

}catch{
showToast("Network error")
}

}

/* ================= ADMIN ACTIONS ================= */

function changePassword(){
const newPass=prompt("Enter new password")
if(!newPass) return
showToast("Password change coming soon")
}

function changePin(){
const newPin=prompt("Enter new 4-digit PIN")
if(!newPin) return
showToast("PIN change coming soon")
}

function toggleBiometric(){
const current=localStorage.getItem("biometric")==="true"
localStorage.setItem("biometric",(!current).toString())
showToast("Biometric "+(!current?"Enabled":"Disabled"))
}

/* ================= WEBSOCKET ================= */

function connectWebSocket(){

if(ws){
ws.close()
}

try{

const wsURL=API.replace("https","wss").replace("http","ws")

ws=new WebSocket(wsURL+"?token="+getToken())

ws.onmessage=(msg)=>{
const data=JSON.parse(msg.data)

if(data.type==="wallet_update"){
animateWallet(data.balance)
fetchTransactions()
}
}

ws.onclose=()=>{
setTimeout(connectWebSocket,5000)
}

}catch{}

}

/* ================= LOGOUT ================= */

function logout(){

try{
if(ws) ws.close()
}catch{}

localStorage.clear()

/* FORCE REDIRECT */
window.location.href="index.html"
setTimeout(()=>window.location.reload(),100)

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

})