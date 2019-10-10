const sequelize = require("sequelize");
const db = require("../config/database");

const Role = db.define("role", {
  role_name: { type: sequelize.STRING }
});

module.exports = Role;