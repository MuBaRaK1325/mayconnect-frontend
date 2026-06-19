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

/* ================= WEBAUTHN HELPERS ================= */

function base64urlToUint8Array(base64url) {
  if (!base64url) throw new Error("Missing base64url value");

  const base64 = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding = "=".repeat((4 - (base64.length % 4)) % 4);

  const binary = atob(base64 + padding);

  return Uint8Array.from(
    binary,
    c => c.charCodeAt(0)
  );
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


/* ================= LOGIN ================= */

async function biometricLogin() {

  if (!window.PublicKeyCredential) {
    alert("Biometric not supported");
    return;
  }

  biometricBtn.disabled = true;
  loader.style.display = "flex";

  try {

    const res = await fetch(
      API + "/api/auth/webauthn/login-start",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const options = await res.json();

    if (!res.ok) {
      throw new Error(options.error || "Login start failed");
    }

    const publicKey = {
      challenge: base64urlToUint8Array(options.challenge),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification || "preferred"
    };

    if (
      Array.isArray(options.allowCredentials) &&
      options.allowCredentials.length > 0
    ) {

      publicKey.allowCredentials =
        options.allowCredentials.map(c => ({

          type: "public-key",

          id: base64urlToUint8Array(
            String(c.id).trim()
          ),

          transports: Array.isArray(c.transports)
            ? c.transports
            : ["internal", "hybrid"]

        }));

    }

    console.log(publicKey);

    console.log(
      publicKey.allowCredentials?.[0]?.id
    );

    console.log(
      publicKey.allowCredentials?.[0]?.id
        ?.constructor?.name
    );

    console.log(
      publicKey.allowCredentials?.[0]?.id
        ?.byteLength
    );

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
      throw new Error(
        data.error || "Verification failed"
      );
    }

    localStorage.setItem(
      "token",
      data.token
    );

    if (data.user?.id) {
      localStorage.setItem(
        "userId",
        data.user.id
      );
    }

    window.location.href = "dashboard.html";

  } catch (err) {

    console.error(err);

    alert(
      err.message || "Biometric login failed"
    );

    biometricBtn.disabled = false;
    loader.style.display = "none";

  }
}