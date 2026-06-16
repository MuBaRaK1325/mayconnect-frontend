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

/* FORCE CONVERT TO UINT8ARRAY - BULLETPROOF VERSION */
function base64urlToUint8Array(base64url) {
  if (!base64url) return new Uint8Array(0);

  // Convert zuwa string da tsaftacewa
  const str = String(base64url).replace(/-/g, '+').replace(/_/g, '/');

  // Padding
  const pad = str.length % 4;
  const padded = pad? str + '='.repeat(4 - pad) : str;

  // atob -> binary string -> Uint8Array
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes; // Tabbatar Uint8Array ne, ba ArrayBuffer ba
}

function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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

    console.log('RAW OPTIONS FROM SERVER:', JSON.stringify(options).substring(0, 200));

    // Gini publicKey object
    const publicKey = {
      challenge: base64urlToUint8Array(options.challenge),
      timeout: options.timeout || 60000,
      rpId: window.location.hostname,
      userVerification: options.userVerification || "preferred"
    };

    // Idan akwai allowCredentials, convert kowane id
    if (options.allowCredentials && options.allowCredentials.length > 0) {
      publicKey.allowCredentials = options.allowCredentials.map(c => {
        const idBytes = base64urlToUint8Array(c.id);
        console.log('Cred ID converted:', idBytes.constructor.name, 'Len:', idBytes.length);
        return {
          type: 'public-key',
          id: idBytes,
          transports: c.transports || ['internal']
        };
      });
    }

    console.log('FINAL PUBLICKEY:', publicKey);
    console.log('Challenge is Uint8Array:', publicKey.challenge instanceof Uint8Array);
    console.log('First ID is Uint8Array:', publicKey.allowCredentials?.[0]?.id instanceof Uint8Array);

    // KIRA BIOMETRIC
    const credential = await navigator.credentials.get({ publicKey });

    if (!credential) throw new Error("Cancelled");

    // Aika zuwa backend
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