function base64urlToUint8Array(base64url) {
  if (!base64url) throw new Error("Empty value");

  let str = String(base64url)
    .trim()
    .replace(/"/g, "")
    .replace(/'/g, "")
    .replace(/\s/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (str.length % 4) {
    str += "=";
  }

  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
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
      headers: {
        "Content-Type": "application/json"
      }
    });

    const options = await res.json();

    if (!res.ok) {
      throw new Error(options.error || "Login start failed");
    }

    // DEBUG
    alert(JSON.stringify(options, null, 2));

    const publicKey = {
      challenge: base64urlToUint8Array(options.challenge),
      timeout: options.timeout || 60000,
      userVerification: options.userVerification || "preferred"
    };

    if (Array.isArray(options.allowCredentials) && options.allowCredentials.length > 0) {

      publicKey.allowCredentials = options.allowCredentials.map(c => ({
        type: "public-key",
        id: base64urlToUint8Array(c.id),
        transports: c.transports || ["internal"]
      }));

    }

    const credential = await navigator.credentials.get({
      publicKey
    });

    if (!credential) {
      throw new Error("Cancelled");
    }

    const authRes = await fetch(API + "/api/auth/webauthn/login-finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: credential.id,
        rawId: arrayBufferToBase64url(credential.rawId),
        response: {
          authenticatorData: arrayBufferToBase64url(
            credential.response.authenticatorData
          ),
          clientDataJSON: arrayBufferToBase64url(
            credential.response.clientDataJSON
          ),
          signature: arrayBufferToBase64url(
            credential.response.signature
          ),
          userHandle: credential.response.userHandle
            ? arrayBufferToBase64url(
                credential.response.userHandle
              )
            : null
        },
        type: credential.type
      })
    });

    const data = await authRes.json();

    if (!authRes.ok) {
      throw new Error(data.error || "Verification failed");
    }

    localStorage.setItem("token", data.token);

    if (data.user?.id) {
      localStorage.setItem("userId", data.user.id);
    }

    welcomeSound.play().catch(() => {});

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 500);

  } catch (err) {

    console.error("Biometric ERROR:", err);
    alert(err.message);

    loader.style.display = "none";
    biometricBtn.disabled = false;
  }
}