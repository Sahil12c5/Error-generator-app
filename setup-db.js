const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    try {
        console.log('Connecting to database...');
        const connection = await mysql.createConnection({
            host: 'error-generator-sahilchavan-ff75.h.aivencloud.com',
            port: 15953,
            user: 'avnadmin',
            password: process.env.DB_PASSWORD || 'your_password_here',
            database: 'defaultdb',
            ssl: {
                rejectUnauthorized: false
            },
            multipleStatements: true
        });

        console.log('Connected successfully!');

        const sqlFilePath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Executing init.sql...');
        await connection.query(sql);

        console.log('Database and tables created successfully!');
        await connection.end();
    } catch (error) {
        console.error('Error setting up database:', error);
    }
}

setupDatabase();
