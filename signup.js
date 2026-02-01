/* =================================================
   MAY-CONNECT — SIGNUP.JS
   ✔ Matches latest server.js
   ✔ Clean auth flow
================================================== */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

const loader = document.getElementById("splashLoader");
const welcomeSound = document.getElementById("welcomeSound");

const signupForm = document.getElementById("signupForm");
const nameInput = document.getElementById("signup-name");
const emailInput = document.getElementById("signup-email");
const passwordInput = document.getElementById("signup-password");

/* ================= PASSWORD TOGGLE ================= */
function togglePassword(id, btn) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "Show" : "Hide";
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  welcomeSound?.play().catch(() => {});
});

/* ================= SIGNUP ================= */
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!nameInput.value || !emailInput.value || !passwordInput.value) {
    return alert("All fields are required");
  }

  loader.classList.remove("hidden");

  try {
    const res = await fetch(`${backendUrl}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Signup failed");
    }

    // Save token
    localStorage.setItem("token", data.token);
    localStorage.setItem("name", nameInput.value.trim());

    // Redirect
    location.replace("dashboard.html");

  } catch (err) {
    alert(err.message);
  } finally {
    loader.classList.add("hidden");
  }
});
