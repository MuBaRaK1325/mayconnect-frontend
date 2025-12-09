// ===============================
// CONFIG
const backendUrl = "https://mayconnect-backend-1.onrender.com"; // <-- make sure this matches your deployed backend
// ===============================

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
      alert("Signup successful!");
      window.location.href = "login.html";
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
      alert("Login successful!");
      localStorage.setItem("token", data.token);
      window.location.href = "plans.html";
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
