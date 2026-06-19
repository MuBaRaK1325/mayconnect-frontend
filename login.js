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

/* ================= HELPERS ================= */

function base64urlToArrayBuffer(base64url) {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padding = '='.repeat((4 - base64.length % 4) % 4);

  const binary = atob(base64 + padding);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);

  let binary = '';

  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}


/* ================= LOGIN ================= */

async function biometricLogin() {

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
      throw new Error(options.error);
    }

    const publicKey = {
      challenge: base64urlToArrayBuffer(options.challenge),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification
    };

    if (
      Array.isArray(options.allowCredentials) &&
      options.allowCredentials.length > 0
    ) {

      publicKey.allowCredentials =
        options.allowCredentials.map(c => ({
          type: "public-key",

          // IMPORTANT
          id: base64urlToArrayBuffer(c.id),

          transports: c.transports
        }));

    }

    console.log(publicKey);

    const credential =
      await navigator.credentials.get({
        publicKey
      });

    const authRes = await fetch(
      API + "/api/auth/webauthn/login-finish",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({

          id: credential.id,

          rawId: arrayBufferToBase64url(
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
      throw new Error(data.error);
    }

    localStorage.setItem("token", data.token);

    location.href = "dashboard.html";

  } catch (err) {

    console.error("Login ERROR:", err);

    alert(err.message);

  }

}