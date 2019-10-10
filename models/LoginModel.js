const sequelize = require("sequelize");
const db = require("../config/database");

const Login = db.define("login", {
  id: {
    type: sequelize.INTEGER,
    primaryKey: true
  },
  username: { type: sequelize.STRING },
  password: { type: sequelize.STRING },
  email: { type: sequelize.STRING }
});

module.exports = Login;