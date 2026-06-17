const API = "https://mayconnect-backend-1.onrender.com";

// GYARA: Tabbatar RP_ID ya daidaita da backend
const RP_ID = "www.mayconnectdataplug.com.ng";

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

async function login(){
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if(!username ||!password){
    alert("Saka username da password");
    return;
  }

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

/* BASE64URL -> UINT8ARRAY */
function base64urlToUint8Array(base64url) {
  if (!base64url) throw new Error("Empty value");

  let str = String(base64url)
  .trim()
  .replace(/-/g, "+")
  .replace(/_/g, "/");

  while (str.length % 4) str += "=";

  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/* ARRAYBUFFER -> BASE64URL */
function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=/g, "");
}

async function biometricLogin() {
  if (!window.PublicKeyCredential) {
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
    if (!res.ok) throw new Error(options.error || "Login start failed");

    console.log("OPTIONS FROM SERVER:", options);

    const publicKey = {
      challenge: base64urlToUint8Array(options.challenge),
      timeout: options.timeout || 60000,
      rpId: RP_ID, // GYARA: Yi amfani da RP_ID daidai maimakon hostname
      userVerification: options.userVerification || "preferred"
    };

    if (options.allowCredentials && options.allowCredentials.length > 0) {
      publicKey.allowCredentials = options.allowCredentials.map(c => ({
        type: c.type || "public-key",
        id: base64urlToUint8Array(c.id),
        transports: c.transports || ["internal"]
      }));
    }

    console.log("PUBLICKEY OBJECT:", publicKey);
    console.log("RP_ID used:", publicKey.rpId);
    console.log("Challenge Uint8Array:", publicKey.challenge instanceof Uint8Array);
    console.log("First ID Uint8Array:", publicKey.allowCredentials?.[0]?.id instanceof Uint8Array);

    const credential = await navigator.credentials.get({ publicKey });
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
    if (!authRes.ok) throw new Error(data.error || "Verification failed");

    localStorage.setItem("token", data.token);
    if (data.user?.id) localStorage.setItem("userId", data.user.id);

    welcomeSound.play().catch(()=>{});
    setTimeout(() => window.location.href = "dashboard.html", 500);

  } catch (err) {
    console.error("Biometric ERROR:", err);
    alert(err.message);
    loader.style.display = "none";
    biometricBtn.disabled = false;
  }
}