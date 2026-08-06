const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

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
    console.log(`🚀 Error Generator running on http://localhost:${PORT}`);
});