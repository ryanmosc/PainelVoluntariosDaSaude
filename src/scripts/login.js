const apiUrl = "https://api.voluntariosdasaude.com.br/auth/login";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = document.getElementById("submitBtn");
  const btnText = submitBtn.querySelector(".btn-text");
  const loading = submitBtn.querySelector(".loading");
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");

  // Esconde erro anterior
  errorMessage.classList.remove("show");

  // Mostra loading
  submitBtn.disabled = true;
  btnText.style.display = "none";
  loading.style.display = "flex";

  const data = {
    login: form.login.value.trim(),
    password: form.password.value
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      const result = await response.json();
      localStorage.setItem("token", result.token);
      
      setTimeout(() => {
        alert("Login realizado com sucesso!");
        window.location.href = "eventos.html";
      }, 600);
    } else {
      const error = await response.text();
      errorText.textContent = error || "Credenciais inválidas. Tente novamente.";
      errorMessage.classList.add("show");
    }
  } catch (error) {
    errorText.textContent = "Erro de conexão. Verifique sua rede e tente novamente.";
    errorMessage.classList.add("show");
    console.error("Erro na requisição:", error);
  } finally {
    setTimeout(() => {
      submitBtn.disabled = false;
      btnText.style.display = "flex";
      loading.style.display = "none";
    }, 800);
  }
});