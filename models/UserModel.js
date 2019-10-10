const sequelize = require("sequelize");
const db = require("../config/database");

const User = db.define("user", {
  lastname: { type: sequelize.STRING },
  firstname: { type: sequelize.STRING },
  email: { type: sequelize.STRING },
  sex: { type: sequelize.STRING },
  age: { type: sequelize.INTEGER },
  role: { type: sequelize.STRING }
});

module.exports = User;