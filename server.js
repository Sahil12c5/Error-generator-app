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
                host: process.env.DB_HOST || 'error-generator-sahilchavan-ff75.h.aivencloud.com',
                port: process.env.DB_PORT || 15953,
                user: process.env.DB_USER || 'avnadmin',
                password: process.env.DB_PASSWORD || 'your_password_here',
                database: process.env.DB_NAME || 'defaultdb',
                ssl: {
                    rejectUnauthorized: false
                },
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

// --- PREDICTABLE ERROR SIMULATION ENDPOINTS ---

// 1. CPU Lag Spike
app.get('/api/error/lag', (req, res) => {
    console.error("⚠️ [CRITICAL] CPUStarvationException: Simulating heavy CPU computation blocking event loop...");
    const start = Date.now();
    // Synchronously block the event loop for 4 seconds to demonstrate high latency
    while (Date.now() - start < 4000) {
        Math.sqrt(Math.random() * 1000000);
    }
    const duration = Date.now() - start;
    const logSnippet = `[CRITICAL] CPUStarvationException: EventLoopBlocked - Main thread CPU starved for ${duration}ms due to compute overload.`;
    console.error(logSnippet);

    res.status(503).json({
        status: "error",
        errorType: "CPUStarvationException",
        errorCode: "ERR_CPU_STARVATION",
        statusCode: 503,
        message: `CPUStarvationException: Event loop was blocked for ${duration}ms.`,
        description: "A synchronous compute loop monopolized the single-threaded Node.js event loop for 4s, causing latency spikes and starving concurrent requests.",
        durationMs: duration,
        logSnippet,
        stack: `CPUStarvationException: Event loop blocked for ${duration}ms\n    at computeHeavyWorkload (/app/server.js:115:15)\n    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)`
    });
});

// 2. Memory Leak (Heap Spike)
app.get('/api/error/memory', (req, res) => {
    console.error("⚠️ [CRITICAL] Fatal Memory Leak: OutOfMemoryError: Java heap space in Garbage Collector");
    // Allocate 30,000 objects (~25-30MB) safely to increase heap without crashing the process with OS SIGKILL
    for (let i = 0; i < 30000; i++) {
        memoryLeakArray.push({ index: i, timestamp: Date.now(), data: "X".repeat(1000) });
    }
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const logSnippet = `Fatal Memory Leak: OutOfMemoryError: Java heap space in Garbage Collector (Heap used: ${heapUsedMB}MB, Allocations: ${memoryLeakArray.length})`;
    console.error(logSnippet);

    res.status(500).json({
        status: "error",
        errorType: "OutOfMemoryError",
        errorCode: "ERR_HEAP_EXHAUSTED",
        statusCode: 500,
        message: "Fatal Memory Leak: OutOfMemoryError: Java heap space in Garbage Collector",
        description: `Unmanaged memory accumulated in global array. Current heap usage: ${heapUsedMB}MB across ${memoryLeakArray.length} leaked objects.`,
        heapUsedMB,
        logSnippet,
        stack: `java.lang.OutOfMemoryError: Java heap space\n    at java.base/java.util.Arrays.copyOf(Arrays.java:3522)\n    at com.autoheal.service.LeakService.allocateHeapSpace(LeakService.java:88)\n    at com.autoheal.controller.SimulationServlet.doGet(SimulationServlet.java:45)`
    });
});
app.get('/api/error/memory/reset', (req, res) => {
    memoryLeakArray = [];
    res.json({ status: "success", message: "Memory leak allocations cleared." });
});

// 3. Freeze (Event Loop Deadlock)
app.get('/api/error/freeze', (req, res) => {
    const logSnippet = "[CRITICAL] ServerFreezeException: Infinite execution loop deadlock encountered, event loop is unresponsive.";
    console.error(logSnippet);

    // Simulate event loop freeze for 5 seconds (completely unblocks after 5s so app is not permanently dead)
    const start = Date.now();
    while (Date.now() - start < 5000) {
        // Synchronous deadlock freeze
    }

    res.status(503).json({
        status: "error",
        errorType: "ServerFreezeException",
        errorCode: "ERR_EVENT_LOOP_DEADLOCK",
        statusCode: 503,
        message: "ServerFreezeException: Event loop deadlock encountered. Main thread was completely unresponsive for 5000ms.",
        description: "The execution thread entered a blocking execution loop deadlock, completely locking up the runtime and halting all I/O polling.",
        logSnippet,
        stack: `ServerFreezeException: Event loop thread deadlock detected\n    at infiniteExecutionDeadlock (/app/server.js:160:12)\n    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)`
    });
});

// 4. Connection Pool Exhausted (Database)
app.get('/api/sync-error', (req, res) => {
    const logSnippet = "java.sql.SQLException: Connection pool exhausted (active: 50, idle: 0, max: 50)";
    console.error(`[DATABASE_ERROR] ${logSnippet}`);
    res.status(500).json({
        status: "error",
        errorType: "SQLException",
        errorCode: "ERR_DB_POOL_EXHAUSTED",
        statusCode: 500,
        message: logSnippet,
        description: "All database pool connections are occupied by unclosed transactions. New SQL queries cannot acquire a connection and time out.",
        logSnippet,
        stack: `java.sql.SQLException: Connection pool exhausted\n    at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:213)\n    at org.springframework.jdbc.datasource.DataSourceUtils.getConnection(DataSourceUtils.java:82)`
    });
});
app.get('/api/error/db-pool', (req, res) => res.redirect('/api/sync-error'));

// 5. RedisCacheException (Cache Outage)
app.get('/api/async-error', (req, res) => {
    const logSnippet = "RedisCacheException: Connection refused to Redis server at 127.0.0.1:6379";
    console.error(`[CACHE_ERROR] ${logSnippet}`);
    res.status(500).json({
        status: "error",
        errorType: "RedisCacheException",
        errorCode: "ERR_REDIS_CONNECTION_REFUSED",
        statusCode: 500,
        message: logSnippet,
        description: "The application cannot establish a TCP connection to the Redis server on port 6379, causing session lookups and caching to fail.",
        logSnippet,
        stack: `RedisCacheException: Connection refused to Redis server\n    at RedisClient.onConnectionFailed (/app/node_modules/ioredis/lib/redis.js:412:13)\n    at Socket.emit (node:events:517:28)`
    });
});
app.get('/api/error/redis', (req, res) => res.redirect('/api/async-error'));

// 6. No space left on device (ENOSPC)
app.get('/api/error/enospc', (req, res) => {
    const logSnippet = "Error: ENOSPC: no space left on device, write '/var/log/application/audit.log'";
    console.error(`[STORAGE_CRITICAL] ${logSnippet}`);
    res.status(507).json({
        status: "error",
        errorType: "DiskSpaceExhaustionError",
        errorCode: "ENOSPC",
        statusCode: 507,
        message: "ENOSPC: no space left on device, write error on partition /dev/sda1 (100% full)",
        description: "The primary filesystem partition /dev/sda1 has hit 100% utilization. File append, logging, and temporary data writes fail immediately.",
        logSnippet,
        stack: `Error: ENOSPC: no space left on device, write\n    at SyncWriteStream.write (node:fs:2813:16)\n    at Console.log (node:internal/console/constructor:360:16)\n    at /app/server.js:192:12`
    });
});

// 7. 502 Bad Gateway
app.get('/api/error/bad-gateway', (req, res) => {
    const logSnippet = "HTTP/1.1 502 Bad Gateway: Upstream reverse proxy failed to receive valid response from microservice upstream:5000";
    console.error(`[GATEWAY_ERROR] ${logSnippet}`);
    res.setHeader('Content-Type', 'application/json');
    res.status(502).json({
        status: "error",
        errorType: "BadGatewayError",
        errorCode: "ERR_BAD_GATEWAY",
        statusCode: 502,
        message: "502 Bad Gateway: The proxy server received an invalid or null response from the upstream cluster.",
        description: "The reverse proxy (NGINX/Cloudflare) received an invalid response, TCP reset, or gateway timeout from the upstream service cluster.",
        logSnippet,
        stack: `BadGatewayError: 502 Bad Gateway\n    at ProxyPassHandler.forward (/etc/nginx/router.lua:104)\n    at UpstreamSocket.onClose (node:net:310:14)`
    });
});

// 8. EEXIST (File or lock already exists)
app.get('/api/error/eexist', (req, res) => {
    const logSnippet = "Error: EEXIST: file already exists, open '/var/run/worker-daemon.pid'";
    console.error(`[FILESYSTEM_CONFLICT] ${logSnippet}`);
    res.status(409).json({
        status: "error",
        errorType: "FileExistsConflict",
        errorCode: "EEXIST",
        statusCode: 409,
        message: "EEXIST: file already exists, lockfile '/var/run/worker-daemon.pid' cannot be acquired.",
        description: "A lingering PID lockfile on the filesystem prevents the worker daemon from initializing with an exclusive filesystem mutex.",
        logSnippet,
        stack: `Error: EEXIST: file already exists, open '/var/run/worker-daemon.pid'\n    at Object.openSync (node:fs:600:3)\n    at Object.writeFileSync (node:fs:2221:35)\n    at acquireLock (/app/server.js:210:8)`
    });
});

// 9. Too many open files (EMFILE)
app.get('/api/error/emfile', (req, res) => {
    const logSnippet = "Error: EMFILE: too many open files, open '/app/storage/sessions/sess_91823.dat'";
    console.error(`[OS_RESOURCE_LIMIT] ${logSnippet}`);
    res.status(500).json({
        status: "error",
        errorType: "TooManyOpenFilesError",
        errorCode: "EMFILE",
        statusCode: 500,
        message: "EMFILE: too many open files. Process exceeded OS file descriptor ceiling (ulimit -n 1024).",
        description: "The operating system per-process file descriptor table limit (ulimit -n 1024) is breached, rejecting all subsequent file or socket descriptors.",
        logSnippet,
        stack: `Error: EMFILE: too many open files, open '/app/storage/sessions/sess_91823.dat'\n    at Object.openSync (node:fs:585:18)\n    at SessionStore.read (/app/node_modules/session-file-store/index.js:142:10)`
    });
});

// 10. Defunct (Zombie Process)
app.get('/api/error/defunct', (req, res) => {
    const logSnippet = "ProcessZombieException: Defunct process detected: PID 4092 <defunct> [node <defunct>] parent did not call waitpid()";
    console.error(`[PROCESS_CRITICAL] ${logSnippet}`);
    res.status(500).json({
        status: "error",
        errorType: "ProcessZombieException",
        errorCode: "ERR_PROCESS_DEFUNCT",
        statusCode: 500,
        message: "Defunct process detected: Child process exited unexpectedly and remains in PID process table as zombie.",
        description: "A spawned child worker process exited without the parent process invoking waitpid(), leaving dead zombie entries that pollute the OS PID table.",
        logSnippet,
        stack: `ProcessZombieException: Defunct process detected: PID 4092 <defunct>\n    at ChildProcessSupervisor.inspect (supervisor.js:84:11)\n    at process.on (supervisor.js:120:9)`
    });
});

// 11. Certificate Expired (SSL / TLS)
app.get('/api/error/cert-expired', (req, res) => {
    const logSnippet = "TLSError: CERT_HAS_EXPIRED: certificate has expired for domain nexus-store.internal (Validity: 2023-01-01 to 2026-09-01)";
    console.error(`[SECURITY_ALERT] ${logSnippet}`);
    res.status(526).json({
        status: "error",
        errorType: "CertificateExpiredError",
        errorCode: "CERT_HAS_EXPIRED",
        statusCode: 526,
        message: "CERT_HAS_EXPIRED: SSL/TLS x509 handshake verification rejected expired leaf certificate.",
        description: "The TLS/SSL certificate presented during the cryptographic handshake is past its NotAfter validity timestamp, causing clients to abort.",
        logSnippet,
        stack: `TLSError: CERT_HAS_EXPIRED: certificate has expired\n    at TLSSocket.onConnectSecure (node:_tls_wrap:1540:34)\n    at TLSSocket.emit (node:events:517:28)\n    at TLSSocket._finishInit (node:_tls_wrap:951:8)`
    });
});

// Legacy routes
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

// Central Error Handler Middleware
app.use((err, req, res, next) => {
    console.error("\n🔥 SERVER ERROR CAPTURED 🔥");
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.error(err.stack || err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        status: "error",
        errorType: err.name || "ServerError",
        errorCode: err.code || `ERR_${statusCode}`,
        statusCode,
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Premium E-Commerce (MySQL) Error Generator running on port ${PORT}`);
});