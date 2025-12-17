// DASHBOARD USER NAME
if (document.getElementById("user-name")) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  } else {
    const payload = JSON.parse(atob(token.split(".")[1]));
    document.getElementById("user-name").innerText =
      payload.email.split("@")[0];
  }
}

// LOGOUT
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ===============================
// CONFIG
     const backendUrl = "https://mayconnect-backend-1.onrender.com"; // <-- make sure this matches your deployed backend
// ===============================
// SOUND EFFECTS
// ===============================
const welcomeSound = new Audio("sounds/welcome.mp3");
const successSound = new Audio("sounds/success.mp3");

function playWelcomeSound() {
  welcomeSound.currentTime = 0;
  welcomeSound.play().catch(() => {});
}

function playSuccessSound() {
  successSound.currentTime = 0;
  successSound.play().catch(() => {});
}

// ===============================
// SHOW / HIDE PASSWORD
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Show";
  }
}
// FETCH PLANS
async function fetchPlans() {
  const container = document.getElementById("plans-container");
  try {
    const response = await fetch(`${backendUrl}/api/plans`);
    const plans = await response.json();
    container.innerHTML = "";
    plans.forEach(plan => {
      let logo = "default.png";
      if (plan.network === "MTN") logo = "mtn.png";
      if (plan.network === "Airtel") logo = "airtel.png";
      if (plan.network === "Glo") logo = "glo.png";
      if (plan.network === "9mobile") logo = "9mobile.png";
      const div = document.createElement("div");
      div.classList.add("plan-card");
      div.innerHTML = `
        <img src="${logo}" class="plan-logo" />
        <h3>${plan.name}</h3>
        <p><strong>₦${plan.price}</strong></p>
        <p>${plan.network} — ${plan.type}</p>
        <button class="buy-btn">Buy Now</button>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    container.innerHTML = "<p style='color:red;'>Unable to load plans. Check connection.</p>";
    console.error("Error fetching plans:", error);
  }
}

// SIGNUP
async function signup(event) {
  event.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  try {
    const response = await fetch(`${backendUrl}/api/signup`, {   // <-- note /api/signup
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
       if (response.ok) {
  playWelcomeSound(); // 🔊 welcome sound

  setTimeout(() => {
    window.location.href = "login.html";
  }, 800);
} else {
      alert(data.error || data.message || "Signup failed.");
    }
  } catch (error) {
    alert("Network error.");
    console.error("Signup error:", error);
  }
}

// LOGIN
async function login(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    const response = await fetch(`${backendUrl}/api/login`, {   // <-- /api/login
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
      if (response.ok) {
  playWelcomeSound(); // 🔊 welcome sound
  localStorage.setItem("token", data.token);

  setTimeout(() => {
    window.location.href = "plans.html";
  }, 800); // small delay so sound can play
} else {
      alert(data.error || data.message || "Invalid login details.");
    }
  } catch (error) {
    alert("Network error.");
    console.error("Login error:", error);
  }
}

// AUTO LOAD PLANS
if (document.getElementById("plans-container")) {
  fetchPlans();
}
