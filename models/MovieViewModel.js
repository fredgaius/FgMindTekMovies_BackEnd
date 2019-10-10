const sequelize = require("sequelize");
const db = require("../config/database");

const View_Movie = db.define("view_movie", {
  title: { type: sequelize.STRING },
  description: { type: sequelize.STRING },
  genre: { type: sequelize.STRING },
  year: { type: sequelize.INTEGER },
  movie_director: { type: sequelize.STRING },
  posterurl: { type: sequelize.STRING },
  avg_votes: { type: sequelize.DECIMAL(3, 1) },
  voters_count: { type: sequelize.INTEGER }
});

module.exports = View_Movie;
