document.addEventListener("DOMContentLoaded", () => {
    checkLogin();
    loadTheme();
});

function register() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("Please fill in all fields.");
        return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || {};
    if (users[username]) {
        alert("User already exists. Try logging in.");
        return;
    }

    users[username] = password;
    localStorage.setItem("users", JSON.stringify(users));
    alert("Registration successful! You can now log in.");
}

// Login Function
function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    let users = JSON.parse(localStorage.getItem("users")) || {};
    if (users[username] && users[username] === password) {
        localStorage.setItem("loggedInUser", username);
        checkLogin();
    } else {
        alert("Invalid username or password.");
    }
}


function checkLogin() {
    const user = localStorage.getItem("loggedInUser");
    const authSection = document.getElementById("auth-section");
    const trackerSection = document.getElementById("tracker-section");
    const rightSection = document.querySelector(".right-section"); 

    if (user) {
        authSection.classList.add("hidden");
        trackerSection.classList.remove("hidden");
        rightSection.classList.remove("hidden");
        loadExpenses();
    } else {
        authSection.classList.remove("hidden");
        trackerSection.classList.add("hidden");
        rightSection.classList.add("hidden"); 
    }
}

function logout() {
    localStorage.removeItem("loggedInUser");
    checkLogin(); 
}


const expenseForm = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");
const totalExpense = document.getElementById("total-expense");
let expenses = [];
let editingId = null;

expenseForm.addEventListener("submit", function (e) {
    e.preventDefault();
    
    const user = localStorage.getItem("loggedInUser");
    if (!user) return;

    const name = document.getElementById("expense-name").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value);
    const date = document.getElementById("expense-date").value;
    const category = document.getElementById("expense-category").value;

    if (!name || isNaN(amount) || amount <= 0 || !date || !category) {
        alert("Please fill in all fields correctly.");
        return;
    }

    if (editingId) {
        expenses = expenses.map(expense =>
            expense.id === editingId ? { id: editingId, name, amount, date, category } : expense
        );
        editingId = null;
        document.getElementById("save-btn").textContent = "Add Expense";
    } else {
        const expense = { id: Date.now(), name, amount, date, category };
        expenses.push(expense);
    }
    
    localStorage.setItem(`expenses_${user}`, JSON.stringify(expenses));
    expenseForm.reset();
    loadExpenses();
});

function loadExpenses() {
    const user = localStorage.getItem("loggedInUser");
    if (!user) return;

    expenses = JSON.parse(localStorage.getItem(`expenses_${user}`)) || [];
    expenseList.innerHTML = "";
    let total = 0;

    expenses.forEach(expense => {
        total += expense.amount;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${expense.name}</td>
            <td>₱${expense.amount.toFixed(2)}</td>
            <td>${expense.date}</td>
            <td>${expense.category}</td>
            <td>
                <button class="edit-btn" onclick="editExpense(${expense.id})">Edit</button>
                <button class="delete-btn" onclick="deleteExpense(${expense.id})">Delete</button>
            </td>
        `;
        expenseList.appendChild(row);
    });

    totalExpense.textContent = `₱${total.toFixed(2)}`;
}

function deleteExpense(id) {
    const user = localStorage.getItem("loggedInUser");
    if (!user) return;

    expenses = expenses.filter(expense => expense.id !== id);
    localStorage.setItem(`expenses_${user}`, JSON.stringify(expenses));
    loadExpenses();
}

function editExpense(id) {
    const expense = expenses.find(exp => exp.id === id);
    if (expense) {
        document.getElementById("expense-name").value = expense.name;
        document.getElementById("expense-amount").value = expense.amount;
        document.getElementById("expense-date").value = expense.date;
        document.getElementById("expense-category").value = expense.category;

        editingId = id;
        document.getElementById("save-btn").textContent = "Update Expense";
    }
}


document.getElementById("filter-category").addEventListener("change", loadExpenses);

function loadExpenses() {
    const user = localStorage.getItem("loggedInUser");
    if (!user) return;

    expenses = JSON.parse(localStorage.getItem(`expenses_${user}`)) || [];
    expenseList.innerHTML = "";
    let total = 0;

    const filterCategory = document.getElementById("filter-category").value;

    expenses
        .filter(expense => filterCategory === "all" || expense.category === filterCategory)
        .forEach(expense => {
            total += expense.amount;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${expense.name}</td>
                <td>₱${expense.amount.toFixed(2)}</td>
                <td>${expense.date}</td>
                <td>${expense.category}</td>
                <td>
                    <button class="edit-btn" onclick="editExpense(${expense.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteExpense(${expense.id})">Delete</button>
                </td>
            `;
            expenseList.appendChild(row);
        });

    totalExpense.textContent = `₱${total.toFixed(2)}`;
}

const darkModeToggle = document.getElementById("dark-mode-toggle");

if (localStorage.getItem("dark-mode") === "enabled") {
    document.body.classList.add("dark");
    darkModeToggle.textContent = "☀ Light Mode";
}

darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    
    if (document.body.classList.contains("dark")) {
        localStorage.setItem("dark-mode", "enabled");
        darkModeToggle.textContent = "☀ Light Mode";
    } else {
        localStorage.setItem("dark-mode", "disabled");
        darkModeToggle.textContent = "🌙 Dark Mode";
    }
});
