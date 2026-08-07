const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let pool;
let memoryLeakArray = []; // Global array to hold leaked memory

// Initialize MySQL Database
async function initDB() {
    console.log("Connecting to MySQL...");
    
    // We add a small delay and retry logic because the MySQL container 
    // might take a few seconds to be fully ready to accept connections.
    let retries = 5;
    while (retries > 0) {
        try {
            pool = mysql.createPool({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'nexus_store',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            
            // Test connection
            await pool.query('SELECT 1');
            console.log("Connected to MySQL Database.");
            break;
        } catch (err) {
            console.error(`MySQL connection failed. Retries left: ${retries - 1}`, err.message);
            retries -= 1;
            if (retries === 0) throw err;
            await new Promise(res => setTimeout(res, 3000));
        }
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            description TEXT,
            price DECIMAL(10, 2),
            image VARCHAR(255)
        );
    `);

    const [rows] = await pool.query('SELECT COUNT(*) as count FROM products');
    if (rows[0].count === 0) {
        const products = [
            { name: 'UltraBook Pro 15"', description: 'High performance laptop with stunning retina display.', price: 1299.99, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
            { name: 'NoiseCancelling Headphones', description: 'Industry leading noise cancellation.', price: 299.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
            { name: 'Smartwatch Series 8', description: 'Track your fitness and stay connected.', price: 399.99, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
            { name: '4K Monitor 27"', description: 'Crystal clear display for professionals.', price: 450.00, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
            { name: 'Mechanical Keyboard', description: 'Tactile feedback for the best typing experience.', price: 120.00, image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
            { name: 'Wireless Mouse', description: 'Ergonomic and precise tracking.', price: 45.99, image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' }
        ];

        for (const p of products) {
            await pool.query('INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)', [p.name, p.description, p.price, p.image]);
        }
        console.log("Seeded MySQL database with dummy products.");
    }
}

initDB().catch(err => {
    console.error("Database initialization failed. Ensure MySQL is running.", err);
});

// --- REAL E-COMMERCE ENDPOINTS ---

app.get('/api/products', async (req, res, next) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: "Database not connected. Please check MySQL server." });
        }
        const [products] = await pool.query('SELECT * FROM products');
        res.json(products);
    } catch (err) {
        next(err);
    }
});

app.post('/api/cart/add', (req, res) => {
    const { productId } = req.body;
    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }
    res.json({ status: 'success', message: 'Product added to cart' });
});

// --- NEW PREDICTABLE ERROR ENDPOINTS ---

app.get('/api/error/lag', (req, res) => {
    console.warn("⚠️ Lag requested: Simulating heavy CPU load for 5 seconds...");
    const start = Date.now();
    // Synchronous loop blocking the event loop
    while (Date.now() - start < 5000) {
        // Do nothing, just spin
    }
    res.json({ status: "success", message: "CPU load simulation finished after 5 seconds." });
});

app.get('/api/error/memory', (req, res) => {
    console.warn("⚠️ Memory spike requested: Allocating huge objects...");
    for (let i = 0; i < 500000; i++) {
        memoryLeakArray.push({ index: i, data: "A".repeat(1000) }); // Allocate ~500MB string data
    }
    const memoryUsage = process.memoryUsage();
    res.json({ 
        status: "success", 
        message: "Memory leak spiked.", 
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024)
    });
});

app.get('/api/error/freeze', (req, res) => {
    console.warn("⚠️ Server freeze requested: Entering infinite loop...");
    // We send the response FIRST so the frontend knows it was clicked, 
    // but the server will freeze immediately after.
    res.json({ status: "freezing", message: "Server is entering infinite loop now..." });
    
    setTimeout(() => {
        while (true) {
            // Infinite loop, completely freezes the Node.js event loop
        }
    }, 100);
});

// --- ORIGINAL BASIC ERROR ENDPOINTS ---

app.get('/api/sync-error', (req, res) => {
    throw new Error("CRITICAL: Synchronous database connection failed!");
});

app.get('/api/async-error', async (req, res, next) => {
    try {
        await Promise.reject(new Error("FATAL: Unhandled Promise Rejection in payment gateway."));
    } catch (error) {
        next(error);
    }
});

app.get('/api/file-error', (req, res, next) => {
    fs.readFile('/path/to/non/existent/config.json', (err, data) => {
        if (err) return next(err);
        res.send(data);
    });
});

app.get('/api/parse-error', (req, res, next) => {
    try {
        const badData = JSON.parse("{ malformed: true, missingQuotes }");
        res.json(badData);
    } catch (err) {
        next(err);
    }
});

app.use((err, req, res, next) => {
    console.error("\n🔥 SERVER ERROR CAPTURED 🔥");
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.error(err.stack);
    res.status(500).json({ status: "error", message: err.message, stack: err.stack });
});

app.listen(PORT, () => {
    console.log(`🚀 Premium E-Commerce (MySQL) Error Generator running on port ${PORT}`);
});