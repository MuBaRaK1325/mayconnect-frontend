const API = "https://mayconnect-backend-1.onrender.com";

const usernameInput = document.getElementById("loginUsername");
const passwordInput = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const biometricBtn = document.getElementById("biometricBtn");
const loader = document.getElementById("loginLoader");
const welcomeSound = new Audio("sounds/welcome.mp3");

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("token")) window.location.href = "dashboard.html";
});

function togglePassword(){
  if(!passwordInput) return;
  passwordInput.type = passwordInput.type === "password"? "text" : "password";
}

async function login(){
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if(!username ||!password){ alert("Saka username da password"); return; }

  loginBtn.disabled = true; loader.style.display = "flex";
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
    if(data.is_admin) alert("Barka da zuwa Admin");
    welcomeSound.play().catch(()=>{});
    setTimeout(()=> window.location.href = "dashboard.html", 600);
  }catch(err){
    console.error(err);
    alert(err.message || "Server error");
    loader.style.display = "none";
    loginBtn.disabled = false;
  }
}

loginBtn.addEventListener("click", login);
if(biometricBtn) biometricBtn.addEventListener("click", biometricLogin);

// GYARA 100%: Base64url -> Uint8Array. Chrome/Firefox/Safari duk suna karba
function base64urlToUint8Array(base64url) {
  if (!base64url || typeof base64url!== 'string') return null;

  // base64url -> base64
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');

  // add padding
  const pad = base64.length % 4;
  const padded = base64 + (pad? '='.repeat(4 - pad) : '');

  // decode
  const rawData = atob(padded);

  // to Uint8Array
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function biometricLogin() {
  if (!window.PublicKeyCredential) {
    alert("Biometric not supported on this device/browser");
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
    if (!res.ok) throw new Error(options.error || "Login start failed");

    // Backend yana aika {challenge, allowCredentials, rpId...} kai tsaye
    if (!options.challenge) {
      throw new Error("Cryptographic challenge is missing from backend response.");
    }

    const publicKey = {
      challenge: base64urlToUint8Array(options.challenge),
      timeout: options.timeout || 60000,
      rpId: "www.mayconnectdataplug.com.ng",
      userVerification: options.userVerification || "preferred"
    };

    if (options.allowCredentials && options.allowCredentials.length > 0) {
      publicKey.allowCredentials = options.allowCredentials.map(c => ({
        type: "public-key",
        id: base64urlToUint8Array(c.id),
        transports: c.transports || ["internal", "hybrid"]
      }));

      // DEBUG: Dole ya buga Uint8Array
      console.log("ID type:", publicKey.allowCredentials[0].id.constructor.name);
      console.log("ID length:", publicKey.allowCredentials[0].id.byteLength);
    } else {
      console.log("No allowCredentials - browser will show all passkeys");
    }

    const credential = await navigator.credentials.get({ publicKey });
    if (!credential) throw new Error("Cancelled by user");

    const authRes = await fetch(API + "/api/auth/webauthn/login-finish", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
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
    if (!authRes.ok) throw new Error(data.error || "Verification failed");

    localStorage.setItem("token", data.token);
    if (data.user?.id) localStorage.setItem("userId", data.user.id);

    welcomeSound.play().catch(()=>{});
    setTimeout(() => window.location.href = "dashboard.html", 500);

  } catch (err) {
    console.error("Biometric ERROR:", err);
    if (err.name === "NotAllowedError") {
      alert("Cancelled or no passkey found. Register first from Profile.");
    } else if (err.name === "InvalidStateError") {
      alert("Passkey already registered on this device.");
    } else {
      alert(err.message || "Biometric login failed");
    }
    loader.style.display = "none";
    biometricBtn.disabled = false;
  }
}