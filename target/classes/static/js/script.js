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

function getThemeToggleIcon(nextTheme) {
  if (nextTheme === "light") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4"></circle>
        <line x1="12" y1="2.5" x2="12" y2="5"></line>
        <line x1="12" y1="19" x2="12" y2="21.5"></line>
        <line x1="2.5" y1="12" x2="5" y2="12"></line>
        <line x1="19" y1="12" x2="21.5" y2="12"></line>
        <line x1="5.2" y1="5.2" x2="7" y2="7"></line>
        <line x1="17" y1="17" x2="18.8" y2="18.8"></line>
        <line x1="5.2" y1="18.8" x2="7" y2="17"></line>
        <line x1="17" y1="7" x2="18.8" y2="5.2"></line>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"></path>
    </svg>
  `;
}

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
    const nextTheme = isLight ? "dark" : "light";
    themeToggle.innerHTML = getThemeToggleIcon(nextTheme);
    themeToggle.setAttribute("aria-label", nextTheme === "light" ? "Ativar tema claro" : "Ativar tema escuro");
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
