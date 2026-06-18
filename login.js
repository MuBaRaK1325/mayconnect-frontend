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

// GYARA 100%: Wannan baya amfani da fetch() don kada ya dawo da Promise maimakon Uint8Array
function base64urlToUint8Array(base64url) {
  if (!base64url) return new Uint8Array(0);
  
  // Idan riga Uint8Array ne ko ArrayBuffer, kar a sake sawa a string
  if (base64url instanceof Uint8Array) return base64url;
  if (base64url.buffer instanceof ArrayBuffer) return new Uint8Array(base64url.buffer);
  
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

    // 1. Parse your cryptographic challenge synchronously
    const publicKey = {
      challenge: base64urlToUint8Array(options.challenge),
      timeout: options.timeout || 60000,
      rpId: "www.mayconnectdataplug.com.ng",
      userVerification: options.userVerification || "preferred"
    };

    // 2. Format allowCredentials safely ensuring proper types
    if (options.allowCredentials && options.allowCredentials.length > 0) {
      
      publicKey.allowCredentials = options.allowCredentials.map((c) => {
        // DEFENSIVE CHECK: SimpleWebAuthn structures ID in different formats. 
        // We find the string wherever it is hidden.
        let rawIdString = "";
        
        if (typeof c.id === 'string') {
          rawIdString = c.id;
        } else if (c.id && typeof c.id === 'object') {
          // If SimpleWebAuthn wrapped it inside an object array or Buffer reference
          rawIdString = c.id.id || Object.values(c.id).join('');
        } else {
          rawIdString = c.id;
        }
        
        // Final fallback if the structure is completely custom
        if (!rawIdString && c.credentialID) {
          rawIdString = c.credentialID;
        }

        console.log("Extracting String target:", rawIdString);

        // Convert directly to Uint8Array without Promise wrapping
        const parsedBuffer = base64urlToUint8Array(rawIdString);
        
        return {
          type: "public-key",
          id: parsedBuffer, // MUST be Uint8Array object instance
          transports: c.transports || ["internal", "hybrid", "usb", "nfc"]
        };
      });

      console.log("Processed credentials array successfully:", publicKey.allowCredentials);
    } else {
      publicKey.allowCredentials = [];
    }

    // 3. Trigger the browser biometric prompt
    const credential = await navigator.credentials.get({ publicKey });
    if (!credential) throw new Error("Cancelled");

    // 4. Send the biometric signature to the backend to complete authentication
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

    // Store credentials and switch views
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