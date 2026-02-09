/* ==============================
   MAY-CONNECT LOGIN SCRIPT CLEAN • FINAL
   SAFE • MATCHES login.html
================================ */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");
const loader = document.getElementById("splashLoader");
const welcomeSound = document.getElementById("welcomeSound");

/* ===== Welcome sound ===== */
document.addEventListener("DOMContentLoaded", () => {
  welcomeSound?.play().catch(() => {});
});

/* ===== Show / Hide password ===== */
document.querySelector(".show-password-btn")?.addEventListener("click", function () {
  passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  this.textContent = passwordInput.type === "password" ? "Show" : "Hide";
});

/* ===== Login submit ===== */
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  loader?.classList.remove("hidden");

  try {
    const res = await fetch(`${backendUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Server did not return JSON");
    }

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Login failed");

    // SUCCESS
    localStorage.setItem("token", data.token);
    localStorage.setItem("name", data.name || "User");

    location.replace("dashboard.html");

  } catch (err) {
    console.error(err);
    alert(err.message || "Network error. Please check your connection or backend.");
  } finally {
    loader?.classList.add("hidden");
  }
});
