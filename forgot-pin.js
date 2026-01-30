function $(selector) {
  return document.querySelector(selector);
}

async function submitForgotPin() {
  const email = $("#email").value.trim();
  const messageEl = $("#forgotPinMessage");
  messageEl.textContent = "";
  messageEl.style.color = "#dc2626"; // default red

  if (!email) {
    messageEl.textContent = "Email is required";
    return;
  }

  try {
    const res = await fetch("https://mayconnect-backend-1.onrender.com/api/forgot-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (res.ok) {
      messageEl.style.color = "#22c55e"; // green
      messageEl.textContent = "Reset instructions sent to your email ✅";
    } else {
      messageEl.textContent = data.error || "Failed to send reset instructions";
    }
  } catch (err) {
    console.error(err);
    messageEl.textContent = "Network error, try again";
  }
}
