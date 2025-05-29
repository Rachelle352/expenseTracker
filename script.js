// Add Axios to your HTML
// <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

const API_BASE_URL = 'http://localhost:3000/api';

// Helper function to set auth header
function getAuthHeader() {
    const token = localStorage.getItem('token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };
}

// Modified register function
async function register() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        await axios.post(`${API_BASE_URL}/register`, { username, password });
        alert("Registration successful! You can now log in.");
    } catch (error) {
        alert(error.response?.data?.error || "Registration failed");
    }
}

// Modified login function
async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/login`, { username, password });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('loggedInUser', username);
        checkLogin();
    } catch (error) {
        alert(error.response?.data?.error || "Login failed");
    }
}

// Modified loadExpenses function
async function loadExpenses() {
    const user = localStorage.getItem("loggedInUser");
    if (!user) return;

    try {
        const response = await axios.get(`${API_BASE_URL}/expenses`, getAuthHeader());
        expenses = response.data;
        renderExpenses();
    } catch (error) {
        console.error("Error loading expenses:", error);
        alert("Failed to load expenses");
    }
}

// Modified expense form submit handler
expenseForm.addEventListener("submit", async function (e) {
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

    try {
        if (editingId) {
            await axios.put(
                `${API_BASE_URL}/expenses/${editingId}`,
                { name, amount, date, category },
                getAuthHeader()
            );
            editingId = null;
            document.getElementById("save-btn").textContent = "Add Expense";
        } else {
            await axios.post(
                `${API_BASE_URL}/expenses`,
                { name, amount, date, category },
                getAuthHeader()
            );
        }
        
        expenseForm.reset();
        loadExpenses();
    } catch (error) {
        alert(error.response?.data?.error || "Failed to save expense");
    }
});

// Modified deleteExpense function
async function deleteExpense(id) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/expenses/${id}`, getAuthHeader());
        loadExpenses();
    } catch (error) {
        alert(error.response?.data?.error || "Failed to delete expense");
    }
}

// Modified logout function
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("loggedInUser");
    checkLogin();
}

// Modified dashboard functions
async function loadDashboard() {
    try {
        const response = await axios.get(`${API_BASE_URL}/dashboard`, getAuthHeader());
        const data = response.data;
        
        // Update summary cards
        document.getElementById('total-expenses').textContent = `₱${data.totalExpenses.toFixed(2)}`;
        document.getElementById('monthly-expenses').textContent = `₱${data.monthlyExpenses.toFixed(2)}`;
        document.getElementById('top-category').textContent = data.topCategory;
        
        // Prepare data for charts
        prepareChartData(data);
        
        // Show recent expenses
        showRecentExpenses(data.recentExpenses);
    } catch (error) {
        console.error("Error loading dashboard:", error);
        alert("Failed to load dashboard data");
    }
}

function prepareChartData(data) {
    // Category Pie Chart Data
    const categoryLabels = data.categories.map(item => item.category);
    const categoryValues = data.categories.map(item => item.total);
    
    // Monthly Trend Line Chart Data
    const monthlyData = Array(12).fill(0);
    data.monthlyTrend.forEach(item => {
        monthlyData[item.month - 1] = item.total;
    });
    
    // Create charts
    createCategoryChart(categoryLabels, categoryValues);
    createMonthlyTrendChart(monthlyData);
}