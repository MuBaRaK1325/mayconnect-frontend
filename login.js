const API = "https://mayconnect-backend-1.onrender.com";

const usernameInput = document.getElementById("loginUsername");
const passwordInput = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const biometricBtn = document.getElementById("biometricBtn");
const loader = document.getElementById("loginLoader");

const welcomeSound = new Audio("sounds/welcome.mp3");

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (token) window.location.href = "dashboard.html";
});

function togglePassword(){
  if(!passwordInput) return;
  passwordInput.type = passwordInput.type === "password"? "text" : "password";
}

loginBtn.addEventListener("click", login);
if(biometricBtn) biometricBtn.addEventListener("click", biometricLogin);

/* BULLETPROOF CONVERT */
function base64urlToArrayBuffer(base64url) {
  if (!base64url) return new ArrayBuffer(0);

  // 1. Juya zuwa string + share quotes, spaces, newlines
  let str = base64url.toString().trim().replace(/"/g, '').replace(/\s/g, '');

  // 2. Juya url-safe zuwa base64
  str = str.replace(/-/g, '+').replace(/_/g, '/');

  // 3. Saka padding
  while (str.length % 4) str += '=';

  // 4. Convert zuwa ArrayBuffer
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function login(){
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if(!username ||!password){ alert("Enter username and password"); return; }

  loginBtn.disabled = true;
  loader.style.display = "flex";
  try{
    const res = await fetch(API + "/api/login",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ username, password })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || "Login failed");
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.username);
    localStorage.setItem("userId", data.userId);
    if(data.is_admin) alert("Welcome Admin");
    welcomeSound.play().catch(()=>{});
    setTimeout(()=> window.location.href = "dashboard.html", 600);
  }catch(err){
    console.error(err);
    alert(err.message || "Server error");
    loader.style.display = "none";
    loginBtn.disabled = false;
  }
}

async function biometricLogin(){
  if(!window.PublicKeyCredential){
    alert("Biometric not supported");
    return;
  }

  biometricBtn.disabled = true;
  loader.style.display = "flex";

  try {
    const res = await fetch(API + "/api/auth/webauthn/login-start", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    const options = await res.json();
    if (!res.ok) throw new Error(options.error || "Failed");

    // DEBUG: Duba abin da backend ke turawa
    console.log('RAW CRED ID:', JSON.stringify(options.allowCredentials[0].id));
    console.log('RAW TYPE:', typeof options.allowCredentials[0].id);
    console.log('RAW LENGTH:', options.allowCredentials[0].id.length);

    const cleanId = base64urlToArrayBuffer(options.allowCredentials[0].id);
    console.log('IS ARRAYBUFFER:', cleanId instanceof ArrayBuffer);
    console.log('BYTE LENGTH:', cleanId.byteLength);

    const publicKeyCredentialRequestOptions = {
      challenge: base64urlToArrayBuffer(options.challenge),
      timeout: 60000,
      rpId: options.rpId,
      userVerification: "preferred",
      allowCredentials: [{
        id: cleanId,
        type: "public-key",
        transports: ["internal"]
      }]
    };

    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });

    if (!credential) throw new Error("Cancelled");

    const authRes = await fetch(API + "/api/auth/webauthn/login-finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: credential.id,
        rawId: arrayBufferToBase64url(credential.rawId),
        response: {
          authenticatorData: arrayBufferToBase64url(credential.response.authenticatorData),
          clientDataJSON: arrayBufferToBase64url(credential.response.clientDataJSON),
          signature: arrayBufferToBase64url(credential.response.signature),
          userHandle: credential.response.userHandle? arrayBufferToBase64url(credential.response.userHandle) : null
        },
        type: credential.type
      })
    });

    const data = await authRes.json();
    if (!authRes.ok) throw new Error(data.error || "Verify failed");

    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.userId);
    welcomeSound.play().catch(()=>{});
    setTimeout(()=> window.location.href = "dashboard.html", 600);

  } catch (err) {
    console.error("Biometric ERROR:", err);
    alert(err.message);
    loader.style.display = "none";
    biometricBtn.disabled = false;
  }
}