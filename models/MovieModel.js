const sequelize = require("sequelize");
const db = require("../config/database");

const Movie = db.define("movie", {
  title: { type: sequelize.STRING },
  description: { type: sequelize.STRING },
  genre: { type: sequelize.STRING },
  year: { type: sequelize.INTEGER },
  movie_director: { type: sequelize.STRING },
  posterurl: { type: sequelize.STRING }
});

module.exports = Movie;