const sequelize = require("sequelize");

// --- Create database connection for sequelize ---
//-------------------------------------------------
// Option 1: Passing parameters separately
module.exports = new sequelize("postgresql-curved-90429", "postgres", null, {
    host: process.env.DATABASE_URL,
    ssl: true,
    dialect: "postgres",
    // Optional part. Dont forget adding comma to the end
    // of line above when you uncommet this bottom part
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Option 2: Using a connection URI
// format is ('postgres://user:pass@example.com:5432/dbname')
// ("dbEngine://username:pswd@machineAddress/database name")
// ("postgres://postgres:null@localhost:5432/MovieManagement")
/* module.exports = new sequelize(
  "postgres://postgres:null@localhost:5432/MovieManagement"
); */