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

// GYARA 100%: Pure synchronous conversion. Converts Base64URL straight to Uint8Array buffer
function base64urlToUint8Array(base64url) {
  if (!base64url) return new Uint8Array(0);
  
  const str = String(base64url).trim();
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
  
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes;
}

// Uint8Array/ArrayBuffer -> base64url
function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function biometricLogin() {
  if (!window.PublicKeyCredential) {
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
    if (!res.ok) throw new Error(options.error || "Login start failed");

    // CRITICAL FIX: Extract properties directly out of the SimpleWebAuthn .publicKey envelope
    const serverPublicKey = options.publicKey || options;

    if (!serverPublicKey.challenge) {
      throw new Error("Cryptographic challenge missing from server options payload.");
    }

    // 1. Convert the challenge safely to binary
    const cleanChallenge = base64urlToUint8Array(serverPublicKey.challenge);

    // 2. Loop through credentials explicitly targeting serverPublicKey.allowCredentials
    const formattedAllowCredentials = [];
    const rawCredentials = serverPublicKey.allowCredentials || [];

    for (const cred of rawCredentials) {
      if (!cred.id) continue;

      // Ensure the incoming credential ID string value is targeted natively
      const rawIdString = typeof cred.id === "string" ? cred.id : (cred.id.id || cred.id);

      formattedAllowCredentials.push({
        type: "public-key",
        id: base64urlToUint8Array(rawIdString), // Casts straight to target Uint8Array buffer
        transports: cred.transports || ["internal", "hybrid"]
      });
    }

    // 3. Assemble the payload option tree from scratch (No references inherited from backend layout)
    const webAuthnRequestArgs = {
      publicKey: {
        challenge: cleanChallenge,
        timeout: serverPublicKey.timeout || 60000,
        rpId: "://mayconnectdataplug.com.ng",
        userVerification: serverPublicKey.userVerification || "preferred",
        allowCredentials: formattedAllowCredentials
      }
    };

    console.log("Passing clean configuration to API:", webAuthnRequestArgs);

    // 4. Fire the biometric authorization panel
    const credential = await navigator.credentials.get(webAuthnRequestArgs);
    if (!credential) throw new Error("Cancelled");

    // 5. Send payload response directly upstream to verify the authentication challenge signature
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
          userHandle: credential.response.userHandle ? arrayBufferToBase64url(credential.response.userHandle) : null
        },
        type: credential.type
      })
    });

    const data = await authRes.json();
    if (!authRes.ok) throw new Error(data.error || "Verification failed");

    // Save tokens and navigate inside dashboard
    localStorage.setItem("token", data.token);
    if (data.user?.id) localStorage.setItem("userId", data.user.id);

    welcomeSound.play().catch(()=>{});
    setTimeout(() => window.location.href = "dashboard.html", 500);

  } catch (err) {
    console.error("Biometric ERROR:", err);
    alert(err.message || "An unexpected error occurred during Biometric sign-in.");
    loader.style.display = "none";
    biometricBtn.disabled = false;
  }
}