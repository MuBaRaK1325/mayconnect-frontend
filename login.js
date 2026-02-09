/* ================= CONFIG ================= */
const backendUrl = "https://mayconnect-backend-1.onrender.com";

const $ = id => document.getElementById(id);
const getToken = () => localStorage.getItem("token");

const loginForm = $("loginForm");
const emailInput = $("login-email");
const passwordInput = $("login-password");
const loader = $("splashLoader");
const welcomeSound = $("welcomeSound");

/* ================= PAGE LOAD ================= */
document.addEventListener("DOMContentLoaded", () => {
  if (welcomeSound) welcomeSound.play().catch(() => {});
  if (getToken()) location.href = "dashboard.html"; // auto-redirect if already logged in
});

/* ================= SHOW/HIDE PASSWORD ================= */
function togglePassword(inputId, btn) {
  const input = $(inputId);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "Show" : "Hide";
}

/* ================= LOGIN SUBMIT ================= */
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Defensive checks
    if (!emailInput || !passwordInput) {
      alert("Login form misconfigured. Please refresh the page.");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    loader?.classList.remove("hidden");

    try {
      const res = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      // Check server response type
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server did not return JSON. Try again later.");
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed. Check your credentials.");
      }

      // SUCCESS: store token & name
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name || "User");
      localStorage.setItem("email", email);

      location.replace("dashboard.html");

    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      loader?.classList.add("hidden");
    }
  });
}

/* ================= BIOMETRIC PLACEHOLDER ================= */
function biometricLogin() {
  alert("Biometric login coming soon");
}





    // ==============================
    // ADMIN CHECK: YOUR EMAIL
    // ==============================
    if(email.toLowerCase() === "abubakarmubarak3456@gmail.com"){
      localStorage.setItem("isAdmin", "true");
    } else {
      localStorage.setItem("isAdmin", "false");
    }

    location.replace("dashboard.html");

  }catch(err){
    console.error(err);
    alert(err.message || "Network error");
  }finally{
    loader.classList.add("hidden");
  }
});
