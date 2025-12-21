const backendUrl = "https://mayconnect-backend-1.onrender.com";

/* SHOW PASSWORD */
function togglePassword(id, el) {
  const input = document.getElementById(id);
  if (input.type === "password") {
    input.type = "text";
    el.textContent = "Hide";
  } else {
    input.type = "password";
    el.textContent = "Show";
  }
}

/* SIGNUP */
async function signup(e) {
  e.preventDefault();
  const email = signup-email.value;
  const password = signup-password.value;

  const res = await fetch(`${backendUrl}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (res.ok) window.location.href = "dashboard.html";
  else alert("Signup failed");
}

/* LOGIN */
async function login(e) {
  e.preventDefault();
  const email = login-email.value;
  const password = login-password.value;

  const res = await fetch(`${backendUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("token", data.token);
    window.location.href = "dashboard.html";
  } else alert("Login failed");
}

/* DASHBOARD SOUND */
window.onload = () => {
  const sound = document.getElementById("welcomeSound");
  if (sound) sound.play();
};

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}
