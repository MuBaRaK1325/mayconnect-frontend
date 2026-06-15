const API = "https://mayconnect-backend-1.onrender.com";

/* ELEMENTS */
const loginBtn = document.getElementById("loginBtn");
const loader = document.getElementById("loginLoader");

/* SOUND */
const welcomeSound = new Audio("sounds/welcome.mp3");

/* AUTO REDIRECT IDAN AKO DA SESSION */
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (token) {
    window.location.href = "dashboard.html";
  }
});

/* LOGIN BUTTON CLICK - PASSWORDLESS */
loginBtn.addEventListener("click", loginWithPasskey);

/* CONVERT BASE64URL TO ARRAYBUFFER */
function base64urlToArrayBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer.buffer;
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

/* PASSWORDLESS LOGIN FUNCTION */
async function loginWithPasskey() {
  loginBtn.disabled = true;
  loader.style.display = "flex";

  try {
    // 1. Nemi login options daga backend - BABU username/password
    const res = await fetch(API + "/api/auth/webauthn/login-start", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    let options;
    try {
      options = await res.json();
    } catch {
      throw new Error("Invalid server response");
    }

    if (!res.ok) {
      throw new Error(options.error || "Failed to get login options");
    }

    // 2. Convert challenge + allowCredentials IDs zuwa ArrayBuffer
    const publicKeyCredentialRequestOptions = {
     ...options,
      challenge: base64urlToArrayBuffer(options.challenge),
      allowCredentials: options.allowCredentials.map(cred => ({
       ...cred,
        id: base64urlToArrayBuffer(cred.id)
      }))
    };

    // 3. Buɗe fingerprint/face ID popup na Chrome/Android
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
      mediation: "optional"
    });

    if (!credential) {
      throw new Error("Authentication cancelled");
    }

    // 4. Tura response zuwa backend don tabbatarwa
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

    if (!authRes.ok) {
      throw new Error(data.error || "Login verification failed");
    }

    if (!data.token) {
      throw new Error("No token received");
    }

    // 5. SAVE SESSION
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.userId);

    // 6. SOUND + REDIRECT
    welcomeSound.play().catch(() => {});

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 600);

  } catch (err) {
    console.error("Login ERROR:", err);
    alert(err.message || "Login failed");
    loader.style.display = "none";
    loginBtn.disabled = false;
  }
}