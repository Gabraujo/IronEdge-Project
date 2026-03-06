/* ========================================
   IronEdge - Dashboard (Versão Final Estável)
======================================== */

const API = window.location.origin;
let editingTransactionId = null;
let deletingTransactionId = null;
let deletingGoalId = null;
let transactionsCache = [];
let editingBudgetCategory = null;
let goalsCache = [];
let editingGoalId = null;
let contributingGoalId = null;
let investmentsCache = [];
let editingInvestmentId = null;
let contributingInvestmentId = null;
let deletingInvestmentId = null;
const THEME_KEY = "ironedge-theme";
const BUDGET_DEFAULT_CATEGORIES = [
    "Moradia",
    "Alimentação",
    "Transporte",
    "Lazer",
    "Saúde",
    "Salário",
    "Freelance",
    "Investimentos"
];

function applyTheme(theme) {
    const isLight = theme === "light";
    document.body.classList.toggle("light-theme", isLight);
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
        themeToggle.textContent = isLight ? "🌙 Tema Escuro" : "☀ Tema Claro";
    }
}

function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    applyTheme(stored === "light" ? "light" : "dark");
}

// Torna as funções globais para que o 'onclick' do HTML as encontre
window.openTransactionModal = () => {
    resetTransactionForm();
    const modal = document.getElementById("transactionModal");
    if (modal) modal.style.display = "flex";
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
    if (id === "transactionModal") resetTransactionForm();
    if (id === "goalModal") resetGoalForm();
    if (id === "contributeModal") contributingGoalId = null;
    if (id === "investmentModal") resetInvestmentForm();
    if (id === "contributeInvestmentModal") contributingInvestmentId = null;
    if (id === "deleteModal") {
        deletingTransactionId = null;
        deletingGoalId = null;
        deletingInvestmentId = null;
    }
};

/* ============================
   UTILITÁRIOS E API
============================ */
async function api(endpoint, options = {}) {
    const config = {
        method: "GET",
        credentials: "include", // Mantém a sessão do usuário via cookies/JSESSIONID
        headers: { "Content-Type": "application/json" },
        ...options
    };

    try {
        // Mantém /api e /auth, prefixa /api apenas para recursos internos
        const path = (endpoint.startsWith("/api") || endpoint.startsWith("/auth"))
            ? endpoint
            : `/api${endpoint}`;
        const response = await fetch(API + path, config);

        if (response.status === 401 || response.status === 403) {
            window.location.href = "/index.html";
            return null;
        }

        if (response.status === 204) return null;
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Erro");
        return data;
    } catch (e) {
        console.error("Erro na chamada API:", endpoint, e);
        return null;
    }
}

function formatCurrency(value) {
    return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

window.logout = async () => {
    try {
        await fetch("/auth/logout", {
            method: "POST",
            credentials: "include"
        });
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
    } finally {
        window.location.href = "/index.html";
    }
};

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icon = type === "success" ? "✓" : type === "error" ? "!" : "i";
    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(6px)";
        setTimeout(() => toast.remove(), 220);
    }, 2600);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[char]));
}

function normalizeCategory(category) {
    return (category || "geral")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getCategoryBadgeClass(category) {
    const key = normalizeCategory(category);
    if (["salario", "investimentos", "freelance"].includes(key)) return "badge-cat-income";
    if (["moradia"].includes(key)) return "badge-cat-home";
    if (["alimentacao"].includes(key)) return "badge-cat-food";
    if (["transporte"].includes(key)) return "badge-cat-transport";
    if (["lazer"].includes(key)) return "badge-cat-fun";
    if (["saude", "farmacia"].includes(key)) return "badge-cat-health";
    return "badge-cat-default";
}

function getCategoryColor(category) {
    const key = normalizeCategory(category);
    if (key === "moradia") return "#60a5fa";
    if (key === "alimentacao") return "#4ade80";
    if (key === "transporte") return "#facc15";
    if (key === "lazer") return "#a78bfa";
    if (key === "saude") return "#f87171";
    if (["salario", "freelance", "investimentos"].includes(key)) return "#34d399";
    return "#38bdf8";
}

function formatCategoryLabel(category) {
    const key = normalizeCategory(category);
    const map = {
        "moradia": "Moradia",
        "alimentacao": "Alimentação",
        "transporte": "Transporte",
        "lazer": "Lazer",
        "saude": "Saúde",
        "salario": "Salário",
        "freelance": "Freelance",
        "investimentos": "Investimentos",
        "geral": "Geral"
    };
    return map[key] || category || "Geral";
}

function getTransactionIconSymbol(type) {
    return type === "RECEITA" ? "↑" : "↓";
}

function getTransactionIconClass(type) {
    return type === "RECEITA" ? "icon-income" : "icon-expense";
}

function renderTypeBadge(type) {
    const isIncome = type === "RECEITA";
    return `<span class="badge ${isIncome ? "badge-income" : "badge-expense"}">${isIncome ? "Receita" : "Despesa"}</span>`;
}

function renderAmount(value, type) {
    const isIncome = type === "RECEITA";
    return `<span class="${isIncome ? "amount-income" : "amount-expense"}">${isIncome ? "+" : "-"} ${formatCurrency(value)}</span>`;
}

// Filtro automático: Mês Atual
function getMonthBoundaries() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
}

/* ============================
   CARREGAMENTO DE DADOS (CARDS E GRÁFICOS)
============================ */
async function loadDashboardData() {
    const { start, end } = getMonthBoundaries();

    // 1. Carregar Resumo (Filtro: Mes Atual / Economia do Mes)
    const summary = await api(`/summary?start=${start}&end=${end}`);
    if (summary) {
        const income = summary.monthlyIncome ?? summary.receitas ?? 0;
        const expense = summary.monthlyExpense ?? summary.despesas ?? 0;
        const balance = summary.totalBalance ?? summary.saldo ?? 0;
        const savings = summary.monthlySavings ?? (income - expense);

        updateCards({
            balanceValue: balance,
            incomeValue: income,
            expenseValue: expense,
            savingsValue: savings
        });
    }

    // 2. Carregar Gráficos (Filtro: Ultimos 6 meses tratado no Backend)
    const chartData = await api("/summary/dashboard-data");
    if (chartData && typeof ChartUtils !== 'undefined') {
        ChartUtils.redrawAll(chartData);
    }

    // 3. Carregar Listas e Usuário
    loadRecentTransactions();
    loadAllTransactions();
    loadBudgets();
    loadGoals();
    loadInvestments();
    loadUser();
}

function updateCards(data) {
    const mapping = {
        "balanceValue": data.balanceValue,
        "incomeValue": data.incomeValue,
        "expenseValue": data.expenseValue,
        "savingsValue": data.savingsValue
    };

    for (let id in mapping) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = formatCurrency(mapping[id]);
        }
    }
}

/* ============================
   TRANSAÇÕES E ORÇAMENTOS
============================ */
async function loadRecentTransactions() {
    const data = await api("/transactions");
    const tbody = document.getElementById("recentTransactionsBody");
    if (!data || !tbody) return;

    const sorted = [...data].sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
        return (b.id || 0) - (a.id || 0);
    });
    const recent = sorted.slice(0, 6);

    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:32px">Nenhuma transação encontrada</td></tr>`;
        return;
    }

    // Remove o texto "Carregando..." e renderiza
    tbody.innerHTML = recent.map(t => `
        <tr>
            <td>
                <div class="transaction-desc">
                    <span class="transaction-icon ${getTransactionIconClass(t.type)}">${getTransactionIconSymbol(t.type)}</span>
                    <span>${escapeHtml(t.description || "-")}</span>
                </div>
            </td>
            <td><span class="badge badge-category ${getCategoryBadgeClass(t.category)}">${escapeHtml(t.category || "Geral")}</span></td>
            <td>${new Date(t.date).toLocaleDateString('pt-BR')}</td>
            <td>${renderAmount(t.amount, t.type)}</td>
        </tr>
    `).join('');
}

async function loadAllTransactions() {
    const data = await api("/transactions");
    const tbody = document.getElementById("allTransactionsBody");
    if (!data || !tbody) return;

    const sorted = [...data].sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
        return (b.id || 0) - (a.id || 0);
    });
    transactionsCache = sorted;

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px">Nenhuma transação encontrada</td></tr>`;
        return;
    }

    tbody.innerHTML = sorted.map(t => `
        <tr>
            <td>
                <div class="transaction-desc">
                    <span class="transaction-icon ${getTransactionIconClass(t.type)}">${getTransactionIconSymbol(t.type)}</span>
                    <span>${escapeHtml(t.description || "-")}</span>
                </div>
            </td>
            <td><span class="badge badge-category ${getCategoryBadgeClass(t.category)}">${escapeHtml(t.category || "Geral")}</span></td>
            <td>${renderTypeBadge(t.type)}</td>
            <td>${new Date(t.date).toLocaleDateString("pt-BR")}</td>
            <td>${renderAmount(t.amount, t.type)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-ghost btn-icon action-btn action-edit" onclick="editTransaction(${t.id})" aria-label="Editar transação">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                        </svg>
                    </button>
                    <button class="btn btn-ghost btn-icon action-btn action-delete" onclick="requestDeleteTransaction(${t.id})" aria-label="Excluir transação">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

function resetTransactionForm() {
    editingTransactionId = null;

    const title = document.getElementById("modalTransTitle");
    if (title) title.textContent = "Nova Transacao";

    const saveBtn = document.querySelector("#transactionModal .modal-actions .btn-primary");
    if (saveBtn) saveBtn.textContent = "Salvar";

    const descriptionInput = document.getElementById("transDescription");
    const amountInput = document.getElementById("transAmount");
    const typeInput = document.getElementById("transType");
    const categoryInput = document.getElementById("transCategory");
    const dateInput = document.getElementById("transDate");

    if (descriptionInput) descriptionInput.value = "";
    if (amountInput) amountInput.value = "";
    if (typeInput) typeInput.value = "DESPESA";
    if (categoryInput) categoryInput.value = "";
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
}

window.editTransaction = (id) => {
    const transaction = transactionsCache.find(t => t.id === id);
    if (!transaction) return;

    editingTransactionId = id;

    const title = document.getElementById("modalTransTitle");
    if (title) title.textContent = "Editar Transacao";

    const saveBtn = document.querySelector("#transactionModal .modal-actions .btn-primary");
    if (saveBtn) saveBtn.textContent = "Atualizar";

    document.getElementById("transDescription").value = transaction.description || "";
    document.getElementById("transAmount").value = transaction.amount ?? "";
    document.getElementById("transType").value = transaction.type || "DESPESA";
    document.getElementById("transCategory").value = transaction.category || "";
    document.getElementById("transDate").value = transaction.date || "";

    const modal = document.getElementById("transactionModal");
    if (modal) modal.style.display = "flex";
};

window.requestDeleteTransaction = (id) => {
    const transaction = transactionsCache.find(t => t.id === id);
    if (!transaction) return;

    deletingTransactionId = id;
    deletingGoalId = null;

    const itemName = document.getElementById("deleteItemName");
    if (itemName) itemName.textContent = transaction.description || "esta transação";

    const modal = document.getElementById("deleteModal");
    if (modal) modal.style.display = "flex";
};

window.confirmDelete = async () => {
    let endpoint = null;
    if (deletingTransactionId) endpoint = `/api/transactions/${deletingTransactionId}`;
    if (deletingGoalId) endpoint = `/api/goals/${deletingGoalId}`;
    if (deletingInvestmentId) endpoint = `/api/investments/${deletingInvestmentId}`;
    if (!endpoint) return;

    const response = await fetch(endpoint, { method: "DELETE", credentials: "include" });

    if (!response.ok) {
        showToast("Erro ao excluir item.", "error");
        return;
    }

    closeModal("deleteModal");
    await loadDashboardData();
    showToast("Item excluído com sucesso.", "success");
};

async function loadBudgets() {
    const [budgets, transactions] = await Promise.all([
        api("/budgets"),
        api("/transactions")
    ]);

    if (!budgets || !transactions) return;

    const summaryContainer = document.getElementById("budgetSummaryList");
    const fullContainer = document.getElementById("budgetFullList");

    const now = new Date();
    const currentMonthExpenses = transactions.filter(t => {
        if (t.type !== "DESPESA" || !t.date) return false;
        const txDate = new Date(t.date);
        return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
    });

    const spentByCategory = new Map();
    currentMonthExpenses.forEach(t => {
        const category = t.category || "Geral";
        spentByCategory.set(category, (spentByCategory.get(category) || 0) + (t.amount || 0));
    });

    const budgetByCategory = new Map();
    budgets.forEach(b => {
        budgetByCategory.set(normalizeCategory(b.category || "Geral"), b);
    });

    const allKeys = new Set(BUDGET_DEFAULT_CATEGORIES.map(c => normalizeCategory(c)));
    Array.from(budgetByCategory.keys()).forEach(k => allKeys.add(k));
    Array.from(spentByCategory.keys()).forEach(c => allKeys.add(normalizeCategory(c)));
    const allCategories = Array.from(allKeys).map(k => formatCategoryLabel(k));

    const items = allCategories
        .map(category => {
            const key = normalizeCategory(category);
            const budget = budgetByCategory.get(key);
            const spent = Array.from(spentByCategory.entries())
                .filter(([cat]) => normalizeCategory(cat) === key)
                .reduce((sum, [, value]) => sum + value, 0);
            const limit = budget?.limitAmount || 0;
            const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            return {
                category: formatCategoryLabel(budget?.category || category),
                spent,
                limit,
                percent,
                color: getCategoryColor(category)
            };
        })
        .sort((a, b) => {
            const aHasLimit = a.limit > 0 ? 1 : 0;
            const bHasLimit = b.limit > 0 ? 1 : 0;
            if (aHasLimit !== bHasLimit) return bHasLimit - aHasLimit;
            if (a.spent !== b.spent) return b.spent - a.spent;
            return a.category.localeCompare(b.category);
        });

    if (summaryContainer) {
        summaryContainer.innerHTML = items.slice(0, 5).map(item => `
            <div class="progress-item">
                <div class="progress-item-header">
                    <div class="progress-item-label">
                        <span class="dot" style="background:${item.color}"></span>
                        <span>${escapeHtml(item.category)}</span>
                    </div>
                    <div class="progress-item-values">
                        ${formatCurrency(item.spent)} / ${item.limit > 0 ? formatCurrency(item.limit) : "sem limite"}
                    </div>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width:${item.percent}%; background:${item.color};"></div>
                </div>
            </div>
        `).join("");
    }

    if (fullContainer) {
        if (items.length === 0) {
            fullContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px">Nenhum orçamento ou despesa encontrado</div>`;
            return;
        }

        fullContainer.innerHTML = items.map(item => `
            <div class="card">
                <div class="progress-item-header">
                    <div class="progress-item-label">
                        <span class="dot" style="background:${item.color}"></span>
                        <span>${escapeHtml(item.category)}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div class="progress-item-values">
                            ${formatCurrency(item.spent)} / ${item.limit > 0 ? formatCurrency(item.limit) : "sem limite"}
                        </div>
                        <button class="btn btn-ghost btn-icon action-btn action-edit" onclick="openBudgetModal(decodeURIComponent('${encodeURIComponent(item.category)}'), ${item.limit})" aria-label="Editar orçamento">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                ${item.limit > 0 ? `
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width:${item.percent}%; background:${item.color};"></div>
                    </div>
                ` : `
                    <div style="font-size:14px;color:var(--text-muted);margin-top:4px">Defina um limite de orçamento para acompanhar</div>
                `}
            </div>
        `).join("");
    }
}

window.openBudgetModal = (category, limit = 0) => {
    editingBudgetCategory = category;

    const title = document.querySelector("#budgetModal .modal-title");
    if (title) title.textContent = "Editar Orcamento";

    const cat = document.getElementById("budgetCatName");
    if (cat) cat.textContent = category;

    const limitInput = document.getElementById("budgetLimit");
    if (limitInput) limitInput.value = Number(limit) || 0;

    const modal = document.getElementById("budgetModal");
    if (modal) modal.style.display = "flex";
};

window.saveBudget = async () => {
    if (!editingBudgetCategory) return;

    const limitInput = document.getElementById("budgetLimit");
    const limitAmount = Number(limitInput?.value || 0);

    const response = await fetch("/api/budgets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            category: editingBudgetCategory,
            limitAmount: Number.isFinite(limitAmount) && limitAmount > 0 ? limitAmount : 0
        })
    });

    if (!response.ok) {
        showToast("Erro ao salvar orçamento.", "error");
        return;
    }

    closeModal("budgetModal");
    await loadBudgets();
    showToast("Orçamento atualizado.", "success");
};

async function loadGoals() {
    const goals = await api("/goals");
    if (!goals) return;

    goalsCache = goals;

    const summaryContainer = document.getElementById("goalsSummaryList");
    const fullContainer = document.getElementById("goalsFullGrid");

    const sortedGoals = [...goals].sort((a, b) => (b.currentAmount || 0) - (a.currentAmount || 0));

    if (summaryContainer) {
        if (sortedGoals.length === 0) {
            summaryContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:16px">Nenhuma meta cadastrada</div>`;
        } else {
            summaryContainer.innerHTML = sortedGoals.slice(0, 3).map(goal => {
                const target = goal.targetAmount || 1;
                const current = goal.currentAmount || 0;
                const percent = Math.min((current / target) * 100, 100);
                return `
                    <div class="progress-item">
                        <div class="progress-item-header">
                            <div class="progress-item-label">
                                <span class="dot" style="background:#4ade80"></span>
                                <span>${escapeHtml(goal.name)}</span>
                            </div>
                            <div class="progress-item-values">${percent.toFixed(0)}%</div>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width:${percent}%; background:#4ade80;"></div>
                        </div>
                    </div>
                `;
            }).join("");
        }
    }

    if (fullContainer) {
        if (sortedGoals.length === 0) {
            fullContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px">Nenhuma meta cadastrada</div>`;
            return;
        }

        fullContainer.innerHTML = sortedGoals.map(goal => {
            const target = goal.targetAmount || 1;
            const current = goal.currentAmount || 0;
            const percent = Math.min((current / target) * 100, 100);
            return `
                <div class="goal-card">
                    <div class="goal-card-header">
                        <div class="goal-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="9"></circle>
                                <circle cx="12" cy="12" r="5"></circle>
                                <circle cx="12" cy="12" r="2"></circle>
                            </svg>
                        </div>
                        <div class="table-actions">
                            <button class="btn btn-ghost btn-icon action-btn action-edit" onclick="openGoalModal(${goal.id})" aria-label="Editar meta">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 20h9"/>
                                    <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                                </svg>
                            </button>
                            <button class="btn btn-ghost btn-icon action-btn action-delete" onclick="requestDeleteGoal(${goal.id})" aria-label="Excluir meta">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14H6L5 6"/>
                                    <path d="M10 11v6M14 11v6"/>
                                    <path d="M9 6V4h6v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="goal-name">${escapeHtml(goal.name)}</div>
                    <div class="goal-amounts">${formatCurrency(current)} de <strong>${formatCurrency(target)}</strong></div>
                    <div class="goal-progress-text">${percent.toFixed(1)}%</div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width:${percent}%; background:#4ade80;"></div>
                    </div>
                    <div class="goal-actions">
                        <button class="btn btn-primary" style="width:100%" onclick="openContributeModal(${goal.id})">+ Contribuir</button>
                    </div>
                </div>
            `;
        }).join("");
    }
}

function resetGoalForm() {
    editingGoalId = null;
    const title = document.getElementById("modalGoalTitle");
    if (title) title.textContent = "Nova Meta";

    const nameInput = document.getElementById("goalName");
    const targetInput = document.getElementById("goalTarget");
    if (nameInput) nameInput.value = "";
    if (targetInput) targetInput.value = "";

    const saveBtn = document.querySelector("#goalModal .btn-primary");
    if (saveBtn) saveBtn.textContent = "Salvar";
}

window.openGoalModal = (goalId = null) => {
    resetGoalForm();

    if (goalId) {
        const goal = goalsCache.find(g => g.id === goalId);
        if (goal) {
            editingGoalId = goalId;
            document.getElementById("modalGoalTitle").textContent = "Editar Meta";
            document.getElementById("goalName").value = goal.name || "";
            document.getElementById("goalTarget").value = goal.targetAmount || "";
            const saveBtn = document.querySelector("#goalModal .btn-primary");
            if (saveBtn) saveBtn.textContent = "Atualizar";
        }
    }

    const modal = document.getElementById("goalModal");
    if (modal) modal.style.display = "flex";
};

window.saveGoal = async () => {
    const name = document.getElementById("goalName")?.value?.trim();
    const targetAmount = Number(document.getElementById("goalTarget")?.value);

    if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0) {
        showToast("Preencha nome e valor alvo corretamente.", "error");
        return;
    }

    const endpoint = editingGoalId ? `/api/goals/${editingGoalId}` : "/api/goals";
    const method = editingGoalId ? "PUT" : "POST";

    const payload = { name, targetAmount };
    if (!editingGoalId) payload.currentAmount = 0;

    const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        showToast("Erro ao salvar meta.", "error");
        return;
    }

    closeModal("goalModal");
    await loadDashboardData();
    showToast(editingGoalId ? "Meta atualizada." : "Meta criada com sucesso.", "success");
};

window.openContributeModal = (goalId) => {
    const goal = goalsCache.find(g => g.id === goalId);
    if (!goal) return;

    contributingGoalId = goalId;
    document.getElementById("contributeGoalName").textContent = goal.name;
    document.getElementById("contributeAmount").value = "";

    const modal = document.getElementById("contributeModal");
    if (modal) modal.style.display = "flex";
};

window.saveContribution = async () => {
    if (!contributingGoalId) return;

    const amount = Number(document.getElementById("contributeAmount")?.value);
    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Informe um valor válido para contribuir.", "error");
        return;
    }

    const response = await fetch(`/api/goals/${contributingGoalId}/contribute`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
    });

    if (!response.ok) {
        showToast("Erro ao contribuir com a meta.", "error");
        return;
    }

    closeModal("contributeModal");
    await loadDashboardData();
    showToast("Contribuição registrada com sucesso.", "success");
};

window.requestDeleteGoal = (goalId) => {
    const goal = goalsCache.find(g => g.id === goalId);
    if (!goal) return;

    deletingGoalId = goalId;
    deletingTransactionId = null;
    deletingInvestmentId = null;

    const itemName = document.getElementById("deleteItemName");
    if (itemName) itemName.textContent = goal.name || "esta meta";

    const modal = document.getElementById("deleteModal");
    if (modal) modal.style.display = "flex";
};

async function loadInvestments() {
    const investments = await api("/investments");
    if (!investments) return;

    investmentsCache = investments;

    const summaryContainer = document.getElementById("investmentsSummaryList");
    const fullContainer = document.getElementById("investmentsFullGrid");
    const sortedInvestments = [...investments].sort((a, b) => (b.currentAmount || 0) - (a.currentAmount || 0));

    if (summaryContainer) {
        if (sortedInvestments.length === 0) {
            summaryContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:16px">Nenhum investimento cadastrado</div>`;
        } else {
            summaryContainer.innerHTML = sortedInvestments.slice(0, 4).map(investment => `
                <div class="progress-item">
                    <div class="progress-item-header" style="margin-bottom:0;">
                        <div class="progress-item-label">
                            <span class="dot" style="background:#60a5fa"></span>
                            <span>${escapeHtml(investment.name)}</span>
                        </div>
                        <div class="progress-item-values">${formatCurrency(investment.currentAmount || 0)}</div>
                    </div>
                </div>
            `).join("");
        }
    }

    if (fullContainer) {
        if (sortedInvestments.length === 0) {
            fullContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px">Nenhum investimento cadastrado</div>`;
            return;
        }

        fullContainer.innerHTML = sortedInvestments.map(investment => `
            <div class="goal-card">
                <div class="goal-card-header">
                    <div class="goal-icon" style="background:var(--accent-blue-dim);color:var(--accent-blue);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19h16"></path>
                            <path d="M5 15l4-4 3 3 6-7"></path>
                            <path d="M18 7h2v2"></path>
                        </svg>
                    </div>
                    <div class="table-actions">
                        <button class="btn btn-ghost btn-icon action-btn action-edit" onclick="openInvestmentModal(${investment.id})" aria-label="Editar investimento">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                            </svg>
                        </button>
                        <button class="btn btn-ghost btn-icon action-btn action-delete" onclick="requestDeleteInvestment(${investment.id})" aria-label="Excluir investimento">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="goal-name">${escapeHtml(investment.name)}</div>
                <div class="goal-amounts">Total investido: <strong>${formatCurrency(investment.currentAmount || 0)}</strong></div>
                <div class="goal-actions">
                    <button class="btn btn-primary" style="width:100%" onclick="openContributeInvestmentModal(${investment.id})">+ Contribuir</button>
                </div>
            </div>
        `).join("");
    }
}

function resetInvestmentForm() {
    editingInvestmentId = null;
    const title = document.getElementById("modalInvestmentTitle");
    if (title) title.textContent = "Novo Investimento";

    const nameInput = document.getElementById("investmentName");
    if (nameInput) nameInput.value = "";

    const saveBtn = document.querySelector("#investmentModal .btn-primary");
    if (saveBtn) saveBtn.textContent = "Salvar";
}

window.openInvestmentModal = (investmentId = null) => {
    resetInvestmentForm();

    if (investmentId) {
        const investment = investmentsCache.find(i => i.id === investmentId);
        if (investment) {
            editingInvestmentId = investmentId;
            document.getElementById("modalInvestmentTitle").textContent = "Editar Investimento";
            document.getElementById("investmentName").value = investment.name || "";
            const saveBtn = document.querySelector("#investmentModal .btn-primary");
            if (saveBtn) saveBtn.textContent = "Atualizar";
        }
    }

    const modal = document.getElementById("investmentModal");
    if (modal) modal.style.display = "flex";
};

window.saveInvestment = async () => {
    const name = document.getElementById("investmentName")?.value?.trim();
    if (!name) {
        showToast("Informe o nome do investimento.", "error");
        return;
    }

    const isEditing = Boolean(editingInvestmentId);
    const currentAmount = editingInvestmentId
        ? (investmentsCache.find(i => i.id === editingInvestmentId)?.currentAmount || 0)
        : 0;

    const endpoint = isEditing ? `/api/investments/${editingInvestmentId}` : "/api/investments";
    const method = isEditing ? "PUT" : "POST";
    const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, currentAmount })
    });

    if (!response.ok) {
        showToast("Erro ao salvar investimento.", "error");
        return;
    }

    closeModal("investmentModal");
    await loadDashboardData();
    showToast(isEditing ? "Investimento atualizado." : "Investimento criado com sucesso.", "success");
};

window.openContributeInvestmentModal = (investmentId) => {
    const investment = investmentsCache.find(i => i.id === investmentId);
    if (!investment) return;

    contributingInvestmentId = investmentId;
    document.getElementById("contributeInvestmentName").textContent = investment.name;
    document.getElementById("contributeInvestmentAmount").value = "";

    const modal = document.getElementById("contributeInvestmentModal");
    if (modal) modal.style.display = "flex";
};

window.saveInvestmentContribution = async () => {
    if (!contributingInvestmentId) return;

    const amount = Number(document.getElementById("contributeInvestmentAmount")?.value);
    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Informe um valor válido para contribuir.", "error");
        return;
    }

    const response = await fetch(`/api/investments/${contributingInvestmentId}/contribute`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
    });

    if (!response.ok) {
        showToast("Erro ao contribuir com o investimento.", "error");
        return;
    }

    closeModal("contributeInvestmentModal");
    await loadDashboardData();
    showToast("Contribuição registrada com sucesso.", "success");
};

window.requestDeleteInvestment = (investmentId) => {
    const investment = investmentsCache.find(i => i.id === investmentId);
    if (!investment) return;

    deletingInvestmentId = investmentId;
    deletingGoalId = null;
    deletingTransactionId = null;

    const itemName = document.getElementById("deleteItemName");
    if (itemName) itemName.textContent = investment.name || "este investimento";

    const modal = document.getElementById("deleteModal");
    if (modal) modal.style.display = "flex";
};

/* ============================
   SESSÃO E USUÁRIO
============================ */
async function loadUser() {

  try {

    const response = await fetch("/auth/me", {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      window.location.href = "/index.html";
      return;
    }

    const user = await response.json();

    // tenta pegar elementos possíveis
    const emailElement =
      document.getElementById("user-email") ||
      document.getElementById("user-name") ||
      document.querySelector(".user-email") ||
      document.querySelector(".user-info div:last-child");

    if (emailElement) {
      emailElement.textContent = user.email;
    }

  } catch (error) {

    console.error("Erro ao carregar usuário", error);

  }

}

loadUser();

/* ============================
   INICIALIZAÇÃO
============================ */
document.addEventListener("DOMContentLoaded", () => {
    initTheme();

    const themeToggle = document.getElementById("themeToggle");
    themeToggle?.addEventListener("click", () => {
        const nextTheme = document.body.classList.contains("light-theme") ? "dark" : "light";
        localStorage.setItem(THEME_KEY, nextTheme);
        applyTheme(nextTheme);
    });

    setupNav();
    loadDashboardData();

    document.getElementById("btnLogout")?.addEventListener("click", logout);
});

function setupNav() {
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            const section = item.dataset.section;
            document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
            document.getElementById("section-" + section)?.classList.add("active");
        });
    });
}

window.navigateTo = (section) => {
    const targetNav = document.querySelector(`.nav-item[data-section="${section}"]`);
    const targetSection = document.getElementById(`section-${section}`);
    if (!targetNav || !targetSection) return;

    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    targetNav.classList.add("active");

    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
    targetSection.classList.add("active");
};

async function saveTransaction() {

  const descriptionInput = document.getElementById("transDescription");
  const amountInput = document.getElementById("transAmount");
  const typeInput = document.getElementById("transType");
  const categoryInput = document.getElementById("transCategory");
  const dateInput = document.getElementById("transDate");

  if (!descriptionInput || !amountInput || !typeInput || !categoryInput || !dateInput) {
    console.error("Campos do formulário não encontrados");
    showToast("Erro no formulário.", "error");
    return;
  }

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const type = typeInput.value;
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!description || !Number.isFinite(amount) || amount <= 0 || !type || !date) {
    showToast("Preencha os campos obrigatórios corretamente.", "error");
    return;
  }

  try {

    const endpoint = editingTransactionId ? `/api/transactions/${editingTransactionId}` : "/api/transactions";
    const method = editingTransactionId ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description,
        amount,
        type,
        category,
        date
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro ao salvar transação:", errorText);
      showToast("Erro ao salvar transação. Verifique os dados informados.", "error");
      return;
    }

    showToast(editingTransactionId ? "Transação atualizada com sucesso." : "Transação salva com sucesso.", "success");

    closeModal("transactionModal");
    await loadDashboardData();

  } catch (error) {

    console.error(error);
    showToast("Erro ao conectar com servidor.", "error");

  }

}
