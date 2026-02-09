const backendUrl = "https://mayconnect-backend-1.onrender.com";

const form = document.getElementById("loginForm");
const email = document.getElementById("login-email");
const password = document.getElementById("login-password");
const loader = document.getElementById("splashLoader");

form.addEventListener("submit", async e => {
 e.preventDefault();

 if(!email.value || !password.value){
  alert("Enter email and password");
  return;
 }

 loader.classList.remove("hidden");

 try{
  const res = await fetch(`${backendUrl}/api/login`,{
   method:"POST",
   headers:{ "Content-Type":"application/json" },
   body:JSON.stringify({
     email: email.value.trim(),
     password: password.value.trim()
   })
  });

  const data = await res.json();

  if(!res.ok) throw new Error(data.error);

  localStorage.setItem("token",data.token);
  localStorage.setItem("name",data.name);
  localStorage.setItem("email",email.value);

  if(email.value==="abubakarmubarak3456@gmail.com"){
    alert("ADMIN LOGIN");
  }

  location.href="dashboard.html";

 }catch(err){
  alert(err.message);
 }finally{
  loader.classList.add("hidden");
 }
});
