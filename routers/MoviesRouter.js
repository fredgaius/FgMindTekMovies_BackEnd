const router = require("express").Router();
const db = require("../config/database");
const Movie = require("../models/MovieModel");
const View_Movie = require("../models/MovieViewModel.js");
const Movie_Rating = require("../models/MovieRatingModel");
const MoviesMockData = require("./moviesMockData");

router.get("/", (req, res) => {
    Movie.findAll()
        .then(movies => {
            // console.log(JSON.stringify(movies));
            res.status(200).json(movies);
        })
        .catch(err => {
            // console.log(`Could not find movies. \n ${err}`);
            res.status(400).json(`Could not find movies. ${err}`);
        });
});

router.get("/getById/:id", (req, res) => {
    const { id } = req.params;
    const message = "Could not find movie id ";
    Movie.findByPk(id)
        .then(movie => {
            if (movie) {
                res.status(200).json(movie);
                // console.log(JSON.stringify(movie));
            } else {
                // console.log(message + "'" + id + "'");
                res.status(400).json(message + `'${id}'`);
            }
        })
        .catch(err => {
            // console.log(`${message}'${id}'. \n ${err}`);
            res.status(400).json(`${message}'${id}. ${err}'`);
        });
});

// Insert tableIDS new movie data into movies table using its sequelize model
router.post("/addNew", (req, res) => {
    // Destructure the properties of data received from reg.body
    let { title, description, genre, year, movie_director, posterurl } = req.body;

    // Validate all inputs to be sure there is data in each field
    if (!title || !description || !genre || !year || !movie_director || !posterurl) {
        return res.status(400).json("Incorrect form submission");
    }

    // Start sequelize Database.transaction.
    db.transaction().then(t => {
        return Movie.create(
            {
                title,
                description,
                genre,
                movie_director,
                year,
                posterurl
            },
            { transaction: t }
        )
            .then(movie => {
                t.commit();
                // console.log("Movie added:", JSON.stringify(movie.title));
                res.redirect(`/movies/view_movies/getById/${movie.id}`);
            })
            .catch(err => {
                t.rollback();
                errorMessage = `Sorry, Movie not added: \n ${err}`;
                // console.log(errorMessage);
                res.status(400).json(errorMessage);
            });
    });
});

// Insert tableIDS new bulk movie data from tableIDS JSON object formated file into movies 
// table using its sequelize model. The JSON file object name is MoviesMockData
router.post("/addNew/bulk", (req, res) => {

    const { reqSource } = req.body;

    // console.log(`Bulk Insert request from ${reqSource}`);
    // console.log("Movies Bulk Insert started...")

    if (MoviesMockData.length < 1) {
        // console.log('No bulk movies to load from MoviesMockData file.');
        res.status(400).json([0, 'No bulk movies loaded']);
    }

    let movieCount = 0;

    const dd = async () => {

        for await (const movie of MoviesMockData) {
            // Destructure the properties of data received from reg.body
            let { title, description, genre, year, movie_director, posterurl } = movie;

            // Validate all inputs to be sure there is data in each field
            if (!title || !description || !genre || !year || !movie_director || !posterurl) {
                // console.log("Incorrect movie data submission");
            }

            // Start sequelize Database.transaction.
            await db.transaction().then(t => {
                return Movie.create(
                    {
                        title,
                        description,
                        genre,
                        movie_director,
                        year,
                        posterurl
                    },
                    { transaction: t }
                )
                    .then(movie => {
                        t.commit();
                        // console.log("Movie added:", JSON.stringify(movie.title));
                        movieCount = movieCount + 1;
                    })
                    .catch(err => {
                        t.rollback();
                        errorMessage = `Sorry, Movie not added: \n ${err}`;
                        // console.log(errorMessage);
                    });
            });

        }
        // console.log(`${movieCount} movie(s) successfully added.`);
        if (movieCount > 0) {
            // console.log(`${movieCount} movie(s) successfully added.`);
            res.status(200).json([movieCount, "Bulk movie addition success"]);
        } else {
            // console.log(`No movie(s) is added.`);
            res.status(400).json([0, "Bulk movie addition failure"]);
        }
    }

    dd();

});

// Reset movies table index to tableIDS specified default in case the table is empty
router.post("/resetindex", (req, res) => {

    const { resetType } = req.body;

    let defaultID = null;

    // This if for BULK Insertion to start after the maxID
    if (resetType.toUpperCase() === "BULKINSERT") {
        defaultID = 999999;
    } else {
        defaultID = 10001;
    }

    (async () => {

        let nextID = null;

        if (resetType.toUpperCase() === "TONEXTID" ||
            resetType.toUpperCase() === "BULKINSERT") {
            nextID = await getNextID(defaultID);
        }

        if (!nextID) {
            nextID = defaultID;
        }

        // TO BE DELETED
        // console.log(`The returned nextID is '${nextID}'`);

        db.query(`SELECT SETVAL ((SELECT pg_get_serial_sequence('movies', 'id')), ${nextID}, false)`,
            {
                raw: true,
                type: db.QueryTypes.SELECT
            })
            .then(response => {
                // console.log([response[0], "RESET DONE"]);
                res.status(200).json([response[0], "RESET DONE"]);
            }).catch(err => {
                errorMessage = `Sorry, movies table index not reset: ${err}`;
                // console.log([0, errorMessage]);
                res.status(400).json([0, errorMessage]);
            });
    })();
});

// Helper Method for finding the next available Movie table ID to reset the table to.
const getNextID = async (defaultID) => {

    // List of all the tableIDS
    let tableIDS = null;

    await Movie.findAll({ attributes: ['id'], order: ['id'] }).then(moviesRes => {
        tableIDS = moviesRes;
    }).catch(err => {
        // console.log(err);
        return 0;
    });

    var nextID = 0;

    var minID = 0;
    var maxID = 0;
    var nextNum = 0;

    if (tableIDS.length > 0) {
        minID = tableIDS[0].id;
        maxID = tableIDS[tableIDS.length - 1].id;

        // This if for BULK Insertion to start after the maxID
        if (defaultID === 999999) {
            nextID = maxID;
            return nextID;
        }

        if (minID > defaultID) {
            nextID = defaultID;
        } else {

            for (let i = 0; i < tableIDS.length - 1; i++) {

                if (tableIDS[i].id + 1 !== tableIDS[i + 1].id) {
                    nextNum = tableIDS[i].id + 1;
                    break;
                }
            }

            if (nextNum === 0) {
                nextID = maxID + 1;
            } else {
                nextID = nextNum;
            }
        }
    } else if (defaultID === 999999) { // If for BULK Insertion
        nextID = 10001;
    }
    else {
        nextID = defaultID;
    }

    // console.log(`Next Index should be: ${nextID} \nMin: ${minID} \nMax: ${maxID}`);

    return nextID;
}


// Update tableIDS movie's data using Movie sequelize model
router.put("/update", (req, res) => {
    // Destructure the properties of data received from reg.body
    let { id, title, description, genre, year, movie_director, posterurl } = req.body;

    // Validate all inputs to be sure there is data in each field
    if (!id || !title || !description || !genre || !year || !movie_director || !posterurl) {
        return res.status(400).json("Incorrect form submission");
    }

    // Start sequelize Database.transaction.
    db.transaction().then(t => {
        return Movie.update(
            {
                title,
                description,
                genre,
                movie_director,
                year,
                posterurl
            },
            { where: { id: id } },
            { transaction: t }
        )
            .then(movie => {
                if (movie[0] > 0) {
                    t.commit();
                    // console.log(`${movie[0]} movie update success!`);
                    res.status(200).json(movie[0]);
                } else {
                    t.rollback();
                    // console.log(`${movie[0]} not successful! No update performed!`);
                    res.status(200).json(movie[0]);
                }
            })
            .catch(err => {
                t.rollback();
                errorMessage = `Sorry, movie update not committed: ${err}`;
                // console.log(errorMessage);
                res.status(400).json(errorMessage);
            });
    });
});

// Delete tableIDS movie and all individual ratings associated with the movie
router.delete("/deleteById/:id", (req, res) => {

    const { id } = req.params;

    if (!id) {
        return res.status(400).json("Bad request");
    }

    Movie.destroy({
        where: { id: id }
    })
        .then(response => {
            if (response <= 0) {
                // console.log(`${response} record(s) deleted - None`);
                return res.status(200).json(`${response} record(s) deleted - None`);
            }
            // console.log(`${response} record(s) deleted!`);
            return res
                .status(200)
                .json(response);
        })
        .catch(err => {
            errorMessage = `Error, movie delete not done: ${err}`;
            // console.log(errorMessage);
        });
});

// Delete all movies at once and all their respective individual ratings associated 
// with each one of them
router.post("/deleteall", (req, res) => {

    Movie.destroy({
        where: {}
    }).then(response => {
        // console.log(`${response} deleted.`);
        res.status(200).json([response, 'DELETED']);
    })
        .catch(() => {
            errorMessage = `Error, all movies delete not done`;
            // console.log(errorMessage);
            res.status(400).json([0, errorMessage]);
        });
});


//-------------------------
// This is used to get the views created for movies in the database
// and it contains calculated fields also like users ratings
//-------------------------
router.get("/view_movies/getById/:id", (req, res) => {
    const { id } = req.params;
    const message = "Could not find movie id ";
    View_Movie.findOne({ where: { id: id } })
        .then(movie => {
            if (movie) {
                const movieRes = movieClientReturnFormat(movie);
                res.status(200).json(movieRes);
                // console.log(JSON.stringify(movieRes));
            } else {
                // console.log(message + "'" + id + "'");
                res.status(400).json(message + `'${id}'`);
            }
        })
        .catch(err => {
            // console.log(`${message}'${id}'. \n ${err}`);
            res.status(400).json(`${message}'${id}': \n ${err}`);
        });
});

router.get("/view_movies/getAll", (req, res) => {
    const message = "Could not find movies";
    View_Movie.findAll()
        .then(movies => {
            if (movies) {
                const moviesRes = movies.map(movie => {
                    return movieClientReturnFormat(movie);
                });
                res.status(200).json(moviesRes);
                // console.log(JSON.stringify(moviesRes));
            } else {
                // console.log(message);
                res.status(400).json(message);
            }
        })
        .catch(err => {
            // console.log(`${message}`);
            res.status(400).json(`${message}: ${err}`);
        });
});

// This is tableIDS helper method for the above two routers
const movieClientReturnFormat = (movieObject) => {
    let { id, title, description, genre, year, movie_director, posterurl, avg_votes, voters_count, createdAt, updatedAt } = movieObject;
    return {
        id, title, description, genre, year, movie_director, posterurl, avg_votes: Number(avg_votes).toFixed(1), voters_count, createdAt, updatedAt
    };
};
//-------------------------

// This is for updating/inserting movie ratings by different users
router.post("/rating/add_update", (req, res) => {
    // userid, movieid, votes --  Movie_Rating
    let { userid, movieid, votes } = req.body;
    if (!userid || !movieid || !votes) {
        const msg = "Can't add or update movie rating!";
        // console.log(msg);
        return res.status(400).json("Cant add or update movie rating!");
    }
    return db.transaction().then(t => {
        Movie_Rating.findOne({ where: { userid: userid, movieid: movieid } })
            .then(data => {
                if (data) {
                    return Movie_Rating.update(
                        {
                            votes: votes
                        },
                        { where: { userid: userid, movieid: movieid } },
                        { transaction: t }
                    ).then(() => {
                        t.commit();
                        res.redirect(`/movies/view_movies/getById/${movieid}`);

                    });
                } else {
                    return Movie_Rating.create(
                        {
                            userid,
                            movieid,
                            votes
                        },
                        { transaction: t }
                    ).then(rate => {
                        t.commit();
                        // console.log(`Movie id '${movieid}' vote added.`);
                        res.redirect(`/movies/view_movies/getById/${movieid}`);
                    });
                }
            })
            .catch(err => {
                t.rollback();
                // console.log(err);
                res.status(400).json(err);
            });
    });
});

// This is for reading all movie ratings
router.get("/movierating/getAll", (req, res) => {
    const message = "Could not find movies ratings ";
    Movie_Rating.findAll({ order: db.col('movieid') })
        .then(moviesRatingFound => {
            if (moviesRatingFound) {
                res.status(200).json(moviesRatingFound);
            } else {
                res.status(400).json(message);
            }
        })
        .catch(err => {
            // console.log(`${message}`);
            res.status(400).json(`${message}: ${err}`);
        });
});

// This is for reading all movie ratings by one user
router.get("/movierating/getAll/:id", (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(id)) {
        const msg = "Specify valid user ID to get all ratings!";
        // console.log(msg);
        return res.status(400).json("Specify valid user ID to get all ratings!");
    }
    const message = "This user has not rated any movie!";
    Movie_Rating.findAll({
        where: { userid: id },
        order: db.col('movieid')
    })
        .then(userRatingsData => {
            if (userRatingsData.length > 0) {
                res.status(200).json(userRatingsData);
            } else {
                res.status(400).json([{}]);
            }
        })
        .catch(err => {
            // console.log(`${message}`);
            res.status(400).json(`${message}: ${err}`);
        });
});

// Delete tableIDS single user's movie_ratings
router.delete("/movierating/deleteByUserIDmovieID/:id", (req, res) => {

    const idArray = req.params.id.toString().trim().split(",", 2);
    let [uID, mID] = idArray;
    uID = Number(uID);
    mID = Number(mID);

    if (!uID || !mID) {
        return res.status(400).json("Bad request");
    }

    // console.log(`movieID '${mID}' rating for userID '${uID}' received from Client for deleting!`);

    Movie_Rating.destroy({
        where: { userid: uID, movieid: mID }
    })
        .then(response => {
            if (response <= 0) {
                // console.log(`${response} user movie rating deleted - None`);
                return res.status(400).json(`${response}`);
            }
            // console.log(`${response} user movie rating deleted!`);
            return res
                .status(200)
                .json(`${response}`);
        })
        .catch(err => {
            errorMessage = `Error, movie rating delete not done: \n ${err}`;
            // console.log(errorMessage);
            res.status(400).json(`${errorMessage}`);
        });
});

// Get one user view movie list rated or not
router.get('/viewmovies/all/userrate/:id', (req, res) => {
    const { id } = req.params;
    if (!id) {
        // console.log("Invalid userid specified");
        return res.status(400).json("Invalid userid specified");
    }
    const userid = id;

    db.query(`
        SELECT *, v.id, v."createdAt", v."updatedAt",
        CASE WHEN mr.votes > 0 
		    THEN mr.votes 
		    ELSE 0 
	    END 
	    AS yourvote
        FROM public.view_movies AS v
            LEFT JOIN public.movie_ratings AS mr
            ON (mr.movieid = v.id) 
            AND (mr.userid = $userid) 
            ORDER BY v.id`,
        { bind: { userid: userid }, type: db.QueryTypes.SELECT }
    ).then(moviesRes => {
        const viewData = moviesRes.map(movie => {
            return movieViewRateClientReturnFormat(movie);
        });
        // console.log(viewData);
        return res.status(200).json(viewData);
    }).catch(err => {
        // console.log(err);
    })
})

// This is tableIDS helper method for the above two routers
const movieViewRateClientReturnFormat = (movieObject) => {
    let { id, title, description, genre, year, movie_director, posterurl, avg_votes, yourvote, voters_count, createdAt, updatedAt } = movieObject;
    return {
        id, title, description, genre, year, movie_director, posterurl, avg_votes: Number(avg_votes).toFixed(1), yourvote, voters_count, createdAt, updatedAt
    };
};

module.exports = router;