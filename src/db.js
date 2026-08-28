const mysql = require('mysql2/promise')
require('dotenv').config()

// Il pool tiene aperte alcune connessioni e le riusa a ogni richiesta,
// invece di aprirne una nuova ogni volta e chiuderla subito dopo.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
})

module.exports = pool
