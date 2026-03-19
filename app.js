const API = "https://mayconnect-backend-1.onrender.com"
const token = localStorage.getItem("token")

/* ==============================
GLOBAL ERROR HANDLER
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
SAFE JSON PARSER
============================== */

async function safeJSON(res){
const text=await res.text()

try{
return JSON.parse(text)
}catch{
console.error("Invalid JSON:",text)
showToast("Server error ⚠️")
return null
}
}

/* ==============================
SMART FETCH
============================== */

async function smartFetch(url,options={},retries=2){

try{

const res=await fetch(url,options)

if(!res.ok && retries>0){
await new Promise(r=>setTimeout(r,1000))
return smartFetch(url,options,retries-1)
}

return res

}catch(err){

if(retries>0){
await new Promise(r=>setTimeout(r,1000))
return smartFetch(url,options,retries-1)
}

throw err
}
}

/* ==============================
PAGE GUARD
============================== */

const page=window.location.pathname
const isLogin=page.includes("login")||page.includes("index")

if(!token && !isLogin){
window.location.href="login.html"
}

if(token && isLogin){
window.location.href="dashboard.html"
}

/* ==============================
TOAST
============================== */

function showToast(msg){
const t=document.createElement("div")
t.className="toast"
t.innerText=msg
document.body.appendChild(t)

setTimeout(()=>t.remove(),3000)
}

/* ==============================
LOADER
============================== */

function hideLoader(){
const loader=document.getElementById("splashLoader")
if(!loader) return
loader.classList.add("hide")
setTimeout(()=>loader.remove(),500)
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

function normalizePhone(p){
return p.replace(/\D/g,"")
}

function formatPhone(p){
p=normalizePhone(p)

if(p.startsWith("0")) return "+234"+p.slice(1)
if(p.startsWith("234")) return "+"+p

return p
}

function detectNetwork(p){

p=normalizePhone(p)

const prefix=p.substring(0,4)

for(const n in NETWORK_PREFIX){
if(NETWORK_PREFIX[n].includes(prefix)) return n
}

return null
}

/* ==============================
WEBSOCKET (REAL TIME WALLET)
============================== */

let socket=null

function initSocket(){

if(!token) return

try{

socket=new WebSocket(`wss://mayconnect-backend-1.onrender.com/ws?token=${token}`)

socket.onmessage=(event)=>{

const data=JSON.parse(event.data)

if(data.type==="wallet"){
animateBalance(data.balance)
showToast("Wallet Updated")
}

if(data.type==="transaction"){
showToast("New Transaction")
loadTransactions()
}

}

socket.onclose=()=>{
setTimeout(initSocket,3000)
}

}catch(e){
console.log("socket error")
}
}

/* ==============================
PUSH NOTIFICATION
============================== */

async function initNotifications(){

if(!("Notification" in window)) return

const permission=await Notification.requestPermission()

if(permission!=="granted") return
}

function pushNotification(title,body){

if(Notification.permission==="granted"){
new Notification(title,{
body:body,
icon:"images/logo.png"
})
}

}

/* ==============================
BIOMETRIC LOGIN
============================== */

async function biometricLogin(){

if(!window.PublicKeyCredential){
showToast("Biometric not supported")
return
}

try{

await navigator.credentials.get({
publicKey:{
challenge:new Uint8Array(32),
timeout:60000,
userVerification:"required"
}
})

if(localStorage.getItem("token")){
showToast("Biometric login successful")
window.location.href="dashboard.html"
}else{
showToast("Login first")
}

}catch{
showToast("Biometric failed")
}
}

/* ==============================
LOGIN
============================== */

async function login(){

try{

const username=document.getElementById("loginUsername").value
const password=document.getElementById("loginPassword").value

const res=await smartFetch(`${API}/api/login`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({username,password})
})

const data=await safeJSON(res)

if(!res.ok){
alert(data.message||"Login failed")
return
}

localStorage.setItem("token",data.token)

window.location.href="dashboard.html"

}catch{
showToast("Login failed")
}
}

/* ==============================
DASHBOARD
============================== */

async function loadDashboard(){

try{

const res=await smartFetch(`${API}/api/me`,{
headers:{
Authorization:`Bearer ${token}`
}
})

const user=await safeJSON(res)

if(!user) return

document.getElementById("usernameDisplay").innerText=`Hello 👋 ${user.username}`

animateBalance(Number(user.wallet_balance||0))

/* ADMIN */

if(user.is_admin){

const adminPanel=document.getElementById("adminPanel")

if(adminPanel) adminPanel.style.display="block"

const profit=document.getElementById("profitBalance")

if(profit){
profit.innerText="₦"+Number(user.profit_balance||0).toLocaleString()
}

}

/* PIN LOGIC */

if(!user.has_pin){
openSetPinModal()
}else{
const btn=document.getElementById("pinBtn")
if(btn) btn.innerText="Change Transaction PIN"
}

loadTransactions()
initSocket()
initNotifications()

}catch{

localStorage.removeItem("token")

window.location.href="login.html"

}

hideLoader()
}

if(page.includes("dashboard")){
window.addEventListener("load",loadDashboard)
}

/* ==============================
BALANCE ANIMATION
============================== */

function animateBalance(balance){

const el=document.getElementById("walletBalance")

if(!el) return

let start=0
const step=balance/40

const timer=setInterval(()=>{

start+=step

if(start>=balance){
el.innerText="₦"+balance.toLocaleString()
clearInterval(timer)
}else{
el.innerText="₦"+Math.floor(start).toLocaleString()
}

},30)
}

/* ==============================
PIN MODALS
============================== */

function openSetPinModal(){
document.getElementById("setPinModal").style.display="flex"
}

async function savePin(){

const pin=document.getElementById("newPin").value

const res=await smartFetch(`${API}/api/set-pin`,{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({pin})
})

if(res.ok){
showToast("PIN Saved")
document.getElementById("setPinModal").style.display="none"
}
}

/* ==============================
PURCHASE
============================== */

let selectedPlan=null
let purchaseType=null

function openPinModal(id,type){

selectedPlan=id
purchaseType=type

document.getElementById("pinModal").style.display="flex"
}

function closePinModal(){
document.getElementById("pinModal").style.display="none"
}

async function confirmPurchase(){

const phone=formatPhone(document.getElementById("phone").value)
const pin=document.getElementById("pin").value

let endpoint=""
let body={}

if(purchaseType==="data"){
endpoint="/api/buy-data"
body={plan_id:selectedPlan,phone,pin}
}

if(purchaseType==="airtime"){

const amount=document.getElementById("airtimeAmount").value
const network=detectNetwork(phone)

endpoint="/api/buy-airtime"
body={network,phone,amount,pin}
}

const res=await smartFetch(`${API}${endpoint}`,{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify(body)
})

const data=await safeJSON(res)

if(!res.ok){
alert(data.message)
return
}

showToast("Purchase Successful")

closePinModal()
}

/* ==============================
LOGOUT
============================== */

function logout(){
localStorage.removeItem("token")
window.location.href="login.html"
}