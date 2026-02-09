/* ==============================
   MAY-CONNECT SIGNUP SCRIPT
   Final Production Version
================================ */

const backendUrl = "https://mayconnect-backend-1.onrender.com";

// DOM Elements
const signupForm = document.getElementById("signupForm");
const nameInput = document.getElementById("signup-name");
const emailInput = document.getElementById("signup-email");
const passwordInput = document.getElementById("signup-password");
const loader = document.getElementById("splashLoader");

document.addEventListener("DOMContentLoaded", () => {
  loader?.classList.add("hidden");
});

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value.trim();

    if (!name || !email || !password) {
      alert("All fields are required.");
      return;
    }

    loader?.classList.remove("hidden");

    try {
      const res = await fetch(`${backendUrl}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Signup failed");

      alert("Signup successful! Please login.");

      // Optionally notify admin if the new signup email is admin
      if (email.toLowerCase() === "abubakarmubarak3456@gmail.com") {
        alert("Admin account created successfully!");
      }

      location.href = "login.html";

    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      loader?.classList.add("hidden");
    }
  });
}
