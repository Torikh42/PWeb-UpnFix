const mysql = require("mysql2/promise");
require("dotenv").config();

const schemaSQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    location_detail TEXT NULL,
    image_url VARCHAR(255) NULL,
    category ENUM('LISTRIK', 'AIR', 'BANGUNAN', 'FASILITAS', 'INTERNET', 'LAINNYA') NOT NULL,
    status ENUM('PENDING', 'DIPROSES', 'SELESAI') NOT NULL DEFAULT 'PENDING',
    admin_notes TEXT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

const initializeDatabase = async () => {
  let connection;
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    connection = await mysql.createConnection({
      host: dbUrl.hostname,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.substr(1),
      multipleStatements: true,
    });

    console.log("Successfully connected to the database.");
    console.log("Creating tables...");
    await connection.query(schemaSQL);
    console.log("Tables created successfully!");
  } catch (error) {
    console.error("Failed to initialize database:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      console.log("Closing database connection.");
      await connection.end();
    }
  }
};

initializeDatabase();
