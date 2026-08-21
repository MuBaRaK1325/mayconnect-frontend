const API = "https://mayconnect-backend-1.onrender.com";

const usernameInput = document.getElementById("loginUsername");
const passwordInput = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const biometricBtn = document.getElementById("biometricBtn");
const loader = document.getElementById("loginLoader");
const welcomeSound = new Audio("sounds/welcome.mp3");

const NativeBiometric =
window.Capacitor?.Plugins?.NativeBiometric;

document.addEventListener("DOMContentLoaded", () => {

if (localStorage.getItem("token")) {
location.href = "dashboard.html";
}

});

function togglePassword() {

if (!passwordInput) return;

passwordInput.type =
passwordInput.type === "password"
? "text"
: "password";

}

async function login() {

const username = usernameInput.value.trim();  
const password = passwordInput.value.trim();  

if (!username || !password) {  
    alert("Saka username da password");  
    return;  
}  

loginBtn.disabled = true;  
loader.style.display = "flex";  

try {  

    const res = await fetch(API + "/api/login", {  

        method: "POST",  

        headers: {  
            "Content-Type": "application/json"  
        },  

        body: JSON.stringify({  
            username,  
            password  
        })  

    });  

    const data = await res.json();  
    console.log("LOGIN RESPONSE =", data);  

    if (!res.ok) {  
        throw new Error(data.message || "Login failed");  
    }

// Save login details
localStorage.setItem("token", data.token);
localStorage.setItem("username", data.user.username);
localStorage.setItem("userId", data.user.id);
localStorage.setItem("email", data.user.email || "");

// Save password temporarily for fingerprint setup
localStorage.setItem("biometric_password", password);

console.log("Saved username:", localStorage.getItem("username"));
console.log("Saved password:", localStorage.getItem("biometric_password"));

if (data.user.is_admin) {
alert("Welcome Admin");
}

welcomeSound.play().catch(() => {});  

    setTimeout(() => {  
        location.href = "dashboard.html";  
    }, 600);  

} catch (err) {  

    console.error(err);  

    alert(err.message || "Server error");  

    loader.style.display = "none";  
    loginBtn.disabled = false;  

}

}

loginBtn.addEventListener("click", login);

if (biometricBtn) {
biometricBtn.addEventListener(
"click",
biometricLogin
);
}

/* ================= HELPERS ================= */

function base64urlToArrayBuffer(base64url) {

if (!base64url) {  
    throw new Error("Missing base64url value");  
}  

const padding =  
    "=".repeat((4 - (base64url.length % 4)) % 4);  

const base64 =  
    (base64url + padding)  
        .replace(/-/g, "+")  
        .replace(/_/g, "/");  

const binary = atob(base64);  

const bytes = new Uint8Array(binary.length);  

for (let i = 0; i < binary.length; i++) {  
    bytes[i] = binary.charCodeAt(i);  
}  

return bytes.buffer;

}

function arrayBufferToBase64url(buffer) {

const bytes = new Uint8Array(buffer);  

let binary = "";  

for (const b of bytes) {  
    binary += String.fromCharCode(b);  
}  

return btoa(binary)  
    .replace(/\+/g, "-")  
    .replace(/\//g, "_")  
    .replace(/=/g, "");

}

async function biometricLogin() {

// ================= ANDROID APP =================
if (window.Capacitor?.isNativePlatform?.() && NativeBiometric) {

try {  

    // Show the same loader used by password login  
    loginBtn.disabled = true;  
    loader.style.display = "flex";  

    const username = localStorage.getItem("username");  

    if (!username) {  
        throw new Error("Please login normally once before using fingerprint.");  
    }  

    const server = "mayconnect-dataplug-" + username;  

    const result = await NativeBiometric.isCredentialsSaved({  
        server  
    });  

    if (!result.isSaved) {  
        throw new Error("Fingerprint has not been enabled for this account.");  
    }  

    await NativeBiometric.verifyIdentity({  
        reason: "Login with Fingerprint",  
        title: "MAYCONNECT DATA PLUG"  
    });  

    const credentials = await NativeBiometric.getCredentials({  
        server  
    });  

    const res = await fetch(API + "/api/login", {  
        method: "POST",  
        headers: {  
            "Content-Type": "application/json"  
        },  
        body: JSON.stringify({  
            username: credentials.username,  
            password: credentials.password  
        })  
    });  

    const data = await res.json();  

    if (!res.ok) {  
        throw new Error(data.message || "Login failed");  
    }  

    localStorage.setItem("token", data.token);  
    localStorage.setItem("username", data.user.username);  
    localStorage.setItem("userId", data.user.id);  
    localStorage.setItem("email", data.user.email || "");  

    // Hide loader before redirect  
    loader.style.display = "none";  

    window.location.href = "dashboard.html";  
    return;  

} catch (err) {  

    console.error(err);  

    // Hide loader if login fails  
    loader.style.display = "none";  
    loginBtn.disabled = false;  

    alert(err.message || "Biometric login failed");  
    return;  
}

}

// ================= WEBSITE (your existing code continues below) =================

try {

const res = await fetch(
API + "/api/auth/webauthn/login-start",
{
method: "POST",
credentials: "include"
}
);

const options = await res.json();

if (!res.ok) {
throw new Error(options.error || "Login start failed");
}

const publicKey = {
challenge: base64urlToArrayBuffer(
options.challenge
),
rpId: options.rpId,
timeout: options.timeout,
userVerification:
options.userVerification || "preferred"
};

if (
Array.isArray(options.allowCredentials) &&
options.allowCredentials.length > 0
) {

publicKey.allowCredentials =
options.allowCredentials.map(c => ({

type: "public-key",    

  id: base64urlToArrayBuffer(    
    String(c.id).trim()    
  ),    

  transports:    
    Array.isArray(c.transports)    
     ? c.transports    
      : ["internal", "hybrid"]    

}));

}

const credential =
await navigator.credentials.get({
publicKey
});

if (!credential) {
throw new Error("Cancelled");
}

const authRes = await fetch(
API + "/api/auth/webauthn/login-finish",
{
method: "POST",
credentials: "include",

headers: {    
  "Content-Type": "application/json"    
},    

body: JSON.stringify({    

  id: credential.id,    

  rawId:    
    arrayBufferToBase64url(    
      credential.rawId    
    ),    

  response: {    

    authenticatorData:    
      arrayBufferToBase64url(    
        credential.response.authenticatorData    
      ),    

    clientDataJSON:    
      arrayBufferToBase64url(    
        credential.response.clientDataJSON    
      ),    

    signature:    
      arrayBufferToBase64url(    
        credential.response.signature    
      ),    

    userHandle:    
      credential.response.userHandle    
       ? arrayBufferToBase64url(    
            credential.response.userHandle    
          )    
        : null    

  },    

  type: credential.type    

})

}
);

const data = await authRes.json();

if (!authRes.ok) {
throw new Error(
data.error || "Verification failed"
);
}

localStorage.setItem(

"token",
data.token
);

if (data.user) {

localStorage.setItem(
"userId",
data.user.id
);

localStorage.setItem(
"username",
data.user.username
);

localStorage.setItem(
"email",
data.user.email || ""
);

}

location.href = "dashboard.html";

}
catch (err) {

console.error(err);

}

}