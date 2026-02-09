const backendUrl="https://mayconnect-backend-1.onrender.com";

const form=document.getElementById("signupForm");
const name=document.getElementById("signup-name");
const email=document.getElementById("signup-email");
const password=document.getElementById("signup-password");
const loader=document.getElementById("splashLoader");

form.addEventListener("submit",async e=>{
 e.preventDefault();

 if(!name.value||!email.value||!password.value){
  alert("All fields required");
  return;
 }

 loader.classList.remove("hidden");

 try{
  const res=await fetch(`${backendUrl}/api/signup`,{
   method:"POST",
   headers:{ "Content-Type":"application/json" },
   body:JSON.stringify({
     name:name.value.trim(),
     email:email.value.trim(),
     password:password.value.trim()
   })
  });

  const data=await res.json();
  if(!res.ok) throw new Error(data.error);

  alert("Signup success");
  location.href="login.html";

 }catch(err){
  alert(err.message);
 }finally{
  loader.classList.add("hidden");
 }
});
