const API="https://mayconnect-backend-1.onrender.com"

/* TOKEN */

function getToken(){
return localStorage.getItem("token")
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

/* SHOW NETWORK LOGO */

function showNetworkLogo(network){

const logo=document.getElementById("networkLogo")

if(!logo) return

const logos={
MTN:"images/mtn.png",
AIRTEL:"images/airtel.png",
GLO:"images/glo.png",
"9MOBILE":"images/9mobile.png"
}

logo.src=logos[network] || ""
logo.style.display="block"

}

/* PHONE INPUT */

function handlePhoneInput(input){

const phone=input.value

if(phone.length<4) return

const network=detectNetwork(phone)

if(!network) return

showNetworkLogo(network)

loadDataPlans(network)

}

/* LOAD DATA PLANS */

async function loadDataPlans(network){

try{

const token=getToken()

const res=await fetch(`${API}/api/plans`,{
headers:{Authorization:`Bearer ${token}`}
})

const plans=await res.json()

const container=document.getElementById("plans")

if(!container) return

container.innerHTML=""

const filtered=plans.filter(
p=>p.network.toUpperCase()===network
)

filtered.forEach(plan=>{

const card=document.createElement("div")

card.className="planCard"

card.innerHTML=`
<h4>${plan.plan}</h4>
<p>₦${plan.price}</p>
<p>${plan.validity || ""}</p>
<button onclick="openPinModal('${plan.plan_id}','data')">Buy</button>
`

container.appendChild(card)

})

}catch{

showToast("Failed to load plans")

}

}

/* PIN MODAL */

let selectedPlan=null
let purchaseType=null

function openPinModal(plan,type){

selectedPlan=plan
purchaseType=type

document.getElementById("pinModal").classList.remove("hidden")

}

function closePinModal(){

document.getElementById("pinModal").classList.add("hidden")

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

/* CONFIRM PURCHASE */

async function confirmPurchase(){

const pin=document.getElementById("pin").value

if(!pin){
showToast("Enter transaction PIN")
return
}

if(purchaseType==="airtime"){

const phone=document.getElementById("phone").value
const amount=document.getElementById("amount").value

buyAirtime(phone,amount,pin)

}else{

buyData(selectedPlan,pin)

}

closePinModal()

}

/* SAVE PIN */

async function savePin(){

const pin=document.getElementById("pin").value

if(!pin){
showToast("Enter PIN")
return
}

const token=getToken()

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

closePinModal()

}

/* LOGOUT */

function logout(){

localStorage.removeItem("token")

window.location="login.html"

}