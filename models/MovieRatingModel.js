const sequelize = require("sequelize");
const db = require("../config/database");

const Movie_Rating = db.define("movie_rating", {
  userid: { type: sequelize.INTEGER },
  movieid: { type: sequelize.INTEGER },
  votes: { type: sequelize.INTEGER }
});

module.exports = Movie_Rating;
