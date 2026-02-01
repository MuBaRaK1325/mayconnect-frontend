const backendUrl = "https://mayconnect-backend-1.onrender.com";
const loader = document.getElementById("splashLoader");
const welcomeSound = document.getElementById("welcomeSound");

document.addEventListener("DOMContentLoaded", () => {
  welcomeSound.play().catch(() => {});

  // show/hide password
  document.querySelectorAll(".show-password-btn").forEach(btn => {
    btn.onclick = () => {
      const input = btn.previousElementSibling;
      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "Show" : "Hide";
    };
  });

  // signup submit
  const signupForm = document.getElementById("signupForm");
  signupForm.addEventListener("submit", async e => {
    e.preventDefault();
    loader.classList.remove("hidden");

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    try {
      const res = await fetch(`${backendUrl}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("name", name);
        location.replace("dashboard.html");
      } else {
        alert(data.error || "Signup failed");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      loader.classList.add("hidden");
    }
  });
});
