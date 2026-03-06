/* ===============================
   TOGGLE LOGIN / REGISTER
================================= */

const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");
const themeToggle = document.getElementById("themeToggle");
const toastContainer = document.getElementById("toastContainer");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordModal = document.getElementById("forgotPasswordModal");
const cancelForgotPasswordBtn = document.getElementById("cancelForgotPassword");
const THEME_KEY = "ironedge-theme";

function showToast(message, type = "success") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = type === "success" ? "✓" : "!";
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(6px)";
    setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light-theme", isLight);
  if (themeToggle) {
    themeToggle.textContent = isLight ? "🌙 Tema Escuro" : "☀ Tema Claro";
  }
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  applyTheme(stored === "light" ? "light" : "dark");
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("light-theme") ? "dark" : "light";
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

initTheme();

function openForgotPasswordModal() {
  if (!forgotPasswordModal) return;
  forgotPasswordModal.classList.add("open");
}

function closeForgotPasswordModal() {
  if (!forgotPasswordModal) return;
  forgotPasswordModal.classList.remove("open");
}

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", (event) => {
    event.preventDefault();
    openForgotPasswordModal();
  });
}

if (cancelForgotPasswordBtn) {
  cancelForgotPasswordBtn.addEventListener("click", closeForgotPasswordModal);
}

if (forgotPasswordModal) {
  forgotPasswordModal.addEventListener("click", (event) => {
    if (event.target === forgotPasswordModal) {
      closeForgotPasswordModal();
    }
  });
}

if (registerBtn) {
  registerBtn.addEventListener("click", () => {
    container.classList.add("active");
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    container.classList.remove("active");
  });
}

/* ===============================
   REGISTER
================================= */

async function registerUser(event) {
  event.preventDefault();

  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();

  try {

    const response = await fetch("/auth/register", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {

      showToast("Conta criada com sucesso!", "success");

      container.classList.remove("active");

    } else {

      showToast(data.message || "Erro ao registrar", "error");

    }

  } catch (error) {

    console.error(error);
    showToast("Erro de conexão com o servidor", "error");

  }
}

/* ===============================
   LOGIN
================================= */

async function loginUser(event) {

  event.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  try {

    const response = await fetch("/auth/login", {
      method: "POST",
      credentials: "include", // 🔥 necessário para sessão
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showToast(data.message || "Email ou senha inválidos", "error");
      return;
    }

    // Evita falso negativo de sessão por timing no WebView:
    // após login OK, redireciona diretamente para o dashboard.
    window.location.href = "/dashboard.html";

  } catch (error) {

    console.error(error);
    showToast("Erro de conexão com o servidor", "error");

  }
}

async function resetPassword(event) {
  event.preventDefault();

  const email = document.getElementById("forgot-email").value.trim();
  const password = document.getElementById("forgot-password").value.trim();
  const passwordConfirm = document.getElementById("forgot-password-confirm").value.trim();

  if (!email || !password) {
    showToast("Email e nova senha são obrigatórios", "error");
    return;
  }

  if (password !== passwordConfirm) {
    showToast("As senhas não coincidem", "error");
    return;
  }

  try {
    const response = await fetch("/auth/forgot-password", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showToast(data.message || "Erro ao redefinir senha", "error");
      return;
    }

    showToast(data.message || "Senha atualizada com sucesso", "success");
    closeForgotPasswordModal();
  } catch (error) {
    console.error(error);
    showToast("Erro de conexão com o servidor", "error");
  }
}
