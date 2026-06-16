const API = "https://mayconnect-backend-1.onrender.com";

/* ELEMENTS */
const usernameInput = document.getElementById("loginUsername");
const passwordInput = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const biometricBtn = document.getElementById("biometricBtn");
const loader = document.getElementById("loginLoader");

/* SOUND */
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

/* CONVERT BASE64URL TO ARRAYBUFFER */
function base64urlToArrayBuffer(base64url) {
  if (!base64url) return new ArrayBuffer(0);
  base64url = base64url.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (base64url.length % 4) base64url += '=';
  const binaryString = atob(base64url);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/* CONVERT ARRAYBUFFER TO BASE64URL */
function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/* PASSWORD LOGIN */
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
    if(!data.token) throw new Error("No token received");

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

/* BIOMETRIC LOGIN - CONVERT IDs DAIDAI */
async function biometricLogin(){
  if(!window.PublicKeyCredential){
    alert("Biometric not supported on this device");
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
    if (!res.ok) throw new Error(options.error || "Failed to get login options");

    // MUHIMMI: Kada mu yi...options. Mu sake ginawa gaba ɗaya
    const publicKeyCredentialRequestOptions = {
      challenge: base64urlToArrayBuffer(options.challenge),
      timeout: options.timeout || 60000,
      rpId: options.rpId,
      userVerification: options.userVerification || "preferred",
      allowCredentials: (options.allowCredentials || []).map(cred => ({
        id: base64urlToArrayBuffer(cred.id), // CONVERT NAN
        type: "public-key",
        transports: cred.transports || ["internal", "hybrid"]
      }))
    };

    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });

    if (!credential) throw new Error("Authentication cancelled");

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
    if (!authRes.ok) throw new Error(data.error || "Login verification failed");

    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.userId);
    welcomeSound.play().catch(()=>{});
    setTimeout(()=> window.location.href = "dashboard.html", 600);

  } catch (err) {
    console.error("Biometric ERROR:", err);
    alert(err.message || "Biometric login failed");
    loader.style.display = "none";
    biometricBtn.disabled = false;
  }
}