/* ==============================
   MAY-CONNECT LOGIN SCRIPT
   Final Production Version
================================ */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

// DOM Elements
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const loader = document.getElementById("splashLoader");
const welcomeSound = document.getElementById("welcomeSound");

document.addEventListener("DOMContentLoaded", () => {
  welcomeSound?.play().catch(() => {});
});

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Safety check
    if (!emailInput || !passwordInput) {
      alert("Login form misconfigured.");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("Enter email and password.");
      return;
    }

    loader?.classList.remove("hidden");

    try {
      const res = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server did not return JSON");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      // Save token and name
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name || "User");
      localStorage.setItem("email", email);

      // Notify if admin
      if (email.toLowerCase() === "abubakarmubarak3456@gmail.com") {
        alert("Welcome Admin! You are logged in as admin.");
      }

      // Redirect to dashboard
      location.href = "dashboard.html";

    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      loader?.classList.add("hidden");
    }
  });
}
