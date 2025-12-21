const backendUrl = "https://mayconnect-backend-1.onrender.com";

function togglePassword(id, el) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
  el.textContent = input.type === "password" ? "Show" : "Hide";
}

// SIGNUP
async function signup(e) {
  e.preventDefault();

  const name = signup-name.value;
  const email = signup-email.value;
  const password = signup-password.value;

  const res = await fetch(`${backendUrl}/api/signup`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ name, email, password })
  });

  if (res.ok) location.href = "dashboard.html";
  else alert("Signup failed");
}

// LOGIN
async function login(e) {
  e.preventDefault();

  const email = login-email.value;
  const password = login-password.value;

  const res = await fetch(`${backendUrl}/api/login`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ email, password })
  });

  if (res.ok) location.href = "dashboard.html";
  else alert("Login failed");
}

function logout() {
  location.href = "index.html";
}
