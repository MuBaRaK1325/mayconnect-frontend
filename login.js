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

// GYARA 100%: Wannan yana canza Base64URL string zuwa Uint8Array ba tare da kuskure ba
function base64urlToUint8Array(base64url) {
  if (!base64url) return new Uint8Array(0);
  
  // Idan an riga an canza shi, dawo da shi kai tsaye
  if (base64url instanceof Uint8Array) return base64url;
  
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

    console.log("RAW Backend Options Payload:", JSON.stringify(options));

    // 1. Gano inda Challenge yake da gaskiya (ko a tushe ko a cikin options)
    const rawChallenge = options.challenge || options.publicKey?.challenge;
    if (!rawChallenge) {
      throw new Error("Challenge missing from server options payload.");
    }

    // 2. Gano inda allowCredentials yake
    const rawAllowCredentials = options.allowCredentials || options.publicKey?.allowCredentials || [];

    // 3. Tace kuma a canza kowane ID zuwa Uint8Array
    const formattedCredentials = [];
    for (const cred of rawAllowCredentials) {
      // Nemo ID ko ta wani yanayi ya zo daga SimpleWebAuthn
      let idStr = "";
      if (typeof cred.id === "string") {
        idStr = cred.id;
      } else if (cred.id && typeof cred.id === "object") {
        idStr = cred.id.id || cred.id;
      }

      if (!idStr && cred.credentialID) {
        idStr = cred.credentialID;
      }

      if (!idStr) {
        console.warn("Skipping unreadable credential object:", cred);
        continue;
      }

      formattedCredentials.push({
        type: "public-key",
        id: base64urlToUint8Array(idStr), // Canzawa zuwa binary buffer na gaskiya
        transports: cred.transports || ["internal", "hybrid"]
      });
    }

    // 4. GINA `publicKey` DAGA TUSHE (Kada a yi kuskuren nesting)
    const cleanPublicKeyConfig = {
      challenge: base64urlToUint8Array(rawChallenge),
      timeout: options.timeout || options.publicKey?.timeout || 60000,
      rpId: "://mayconnectdataplug.com.ng",
      userVerification: options.userVerification || options.publicKey?.userVerification || "preferred",
      allowCredentials: formattedCredentials
    };

    console.log("Final WebAuthn Request Object:", cleanPublicKeyConfig);

    // 5. Kira WebAuthn prompt (Wannan ba zai sake yin crash ba!)
    const credential = await navigator.credentials.get({ 
      publicKey: cleanPublicKeyConfig 
    });
    
    if (!credential) throw new Error("Cancelled");

    // 6. Tura sakamako zuwa backend don gamawa
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