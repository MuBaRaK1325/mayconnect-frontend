const API = "https://mayconnect-backend-1.onrender.com";

const btn = document.getElementById("signupBtn");

btn.addEventListener("click", signup);

async function signup(){

const username = document.getElementById("username").value.trim();
const email = document.getElementById("email").value.trim();
const password = document.getElementById("password").value.trim();
const pin = document.getElementById("pin").value.trim();

if(!username || !email || !password || !pin){
alert("All fields are required");
return;
}

if(pin.length !== 4 || isNaN(pin)){
alert("PIN must be exactly 4 digits");
return;
}

btn.disabled = true;
btn.innerText = "Creating...";

try{

const res = await fetch(API + "/api/signup",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body: JSON.stringify({
username,
email,
password,
pin
})
});

const data = await res.json();

if(!res.ok){
alert(data.message || "Signup failed");
return;
}

/* ✅ AUTO LOGIN */
localStorage.setItem("token", data.token);

alert("Account created successfully ✅");

/* ✅ GO TO DASHBOARD */
window.location.href = "index.html";

}catch(err){

console.error(err);
alert("Server error. Try again.");

}finally{

btn.disabled = false;
btn.innerText = "Create Account";

}

}