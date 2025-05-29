// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'expense_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// JWT secret
const JWT_SECRET = 'your_jwt_secret_key';

// Create tables if they don't exist
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                date DATE NOT NULL,
                category VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        
        connection.release();
        console.log('Database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

initializeDatabase();

// Auth middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );
        
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Expense routes
app.get('/api/expenses', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/expenses', authenticateToken, async (req, res) => {
    try {
        const { name, amount, date, category } = req.body;
        if (!name || !amount || !date || !category) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO expenses (user_id, name, amount, date, category) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, name, amount, date, category]
        );
        
        const [newExpense] = await pool.query('SELECT * FROM expenses WHERE id = ?', [result.insertId]);
        res.status(201).json(newExpense[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
    try {
        const { name, amount, date, category } = req.body;
        const expenseId = req.params.id;
        
        if (!name || !amount || !date || !category) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const [result] = await pool.query(
            'UPDATE expenses SET name = ?, amount = ?, date = ?, category = ? WHERE id = ? AND user_id = ?',
            [name, amount, date, category, expenseId, req.user.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({ message: 'Expense updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
    try {
        const expenseId = req.params.id;
        
        const [result] = await pool.query(
            'DELETE FROM expenses WHERE id = ? AND user_id = ?',
            [expenseId, req.user.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Dashboard data
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        // Total expenses
        const [totalResult] = await pool.query(
            'SELECT SUM(amount) as total FROM expenses WHERE user_id = ?',
            [req.user.id]
        );
        
        // Monthly expenses
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const [monthlyResult] = await pool.query(
            'SELECT SUM(amount) as monthly FROM expenses WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?',
            [req.user.id, currentMonth, currentYear]
        );
        
        // Top category
        const [categoryResult] = await pool.query(
            'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category ORDER BY total DESC LIMIT 1',
            [req.user.id]
        );
        
        // Recent expenses
        const [recentExpenses] = await pool.query(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC LIMIT 5',
            [req.user.id]
        );
        
        // Category breakdown
        const [categoryBreakdown] = await pool.query(
            'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category',
            [req.user.id]
        );
        
        // Monthly trend
        const [monthlyTrend] = await pool.query(
            'SELECT MONTH(date) as month, SUM(amount) as total FROM expenses WHERE user_id = ? AND YEAR(date) = ? GROUP BY MONTH(date)',
            [req.user.id, currentYear]
        );
        
        res.json({
            totalExpenses: totalResult[0].total || 0,
            monthlyExpenses: monthlyResult[0].monthly || 0,
            topCategory: categoryResult[0]?.category || 'None',
            recentExpenses,
            categories: categoryBreakdown,
            monthlyTrend
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});