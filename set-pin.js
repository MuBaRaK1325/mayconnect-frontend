/* =================================================
   MAY-CONNECT — SET PIN FRONTEND
================================================== */

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return document.querySelectorAll(selector);
}

/* ===================== PIN INPUT AUTO-FOCUS ===================== */
$all(".pin-box input").forEach((input, index, arr) => {
  input.addEventListener("input", () => {
    if (input.value.length === 1 && index < arr.length - 1) {
      arr[index + 1].focus();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && input.value === "" && index > 0) {
      arr[index - 1].focus();
    }
  });
});

/* ===================== GET TOKEN ===================== */
function getToken() {
  return localStorage.getItem("token");
}

/* ===================== SUBMIT PIN ===================== */
async function submitPin() {
  const pinInputs = $all(".pin-box:first-child input");
  const confirmInputs = $all(".pin-box:last-child input");

  const pin = Array.from(pinInputs).map(i => i.value).join("");
  const confirmPin = Array.from(confirmInputs).map(i => i.value).join("");

  const messageEl = $("#pinMessage");
  messageEl.textContent = "";

  // Validation
  if (!/^\d{4}$/.test(pin)) {
    messageEl.textContent = "PIN must be 4 digits";
    return;
  }

  if (pin !== confirmPin) {
    messageEl.textContent = "PIN and confirmation do not match";
    return;
  }

  // Call backend
  try {
    const res = await fetch("https://mayconnect-backend-1.onrender.com/api/set-pin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`
      },
      body: JSON.stringify({ pin })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      messageEl.style.color = "#22c55e"; // green
      messageEl.textContent = "PIN set successfully ✅";
      setTimeout(() => {
        window.location.href = "dashboard.html"; // redirect after success
      }, 1200);
    } else {
      messageEl.style.color = "#dc2626"; // red
      messageEl.textContent = data.message || "Failed to set PIN";
    }
  } catch (err) {
    console.error(err);
    messageEl.style.color = "#dc2626";
    messageEl.textContent = "Network error, try again";
  }
}
