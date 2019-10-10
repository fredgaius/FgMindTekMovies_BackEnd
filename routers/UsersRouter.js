const express = require("express");
const router = express.Router();
const db = require("../config/database");
const bcrypt = require("bcrypt-nodejs");
const User = require("../models/UserModel");
const Login = require("../models/LoginModel");
const UsersMockData = require("./usersMockData");

// Get root list of all users from the users database table
router.get("/", (req, res) => {
    User.findAll({ order: db.col('lastname') }) // { order: [['id', 'DESC']] }
        .then(users => {
            //console.log(JSON.stringify(users));
            res.status(200).json(users);
        })
        .catch(err => {
            console.log(`Could not find users`);
            res.status(400).json(`Could not find users. ${err}`);
        });
});

// Get record of one user in users table by user id
router.get("/profile/getById/:id", (req, res) => {
    const { id } = req.params;
    const message = "Could not find user id ";
    User.findByPk(id)
        .then(user => {
            if (user) {
                res.status(200).json(user);
                console.log(JSON.stringify(user));
            } else {
                console.log(message + "'" + id + "'");
                res.status(400).json(message + `'${id}'`);
            }
        })
        .catch(err => {
            console.log(`${message}'${id}' \n ${err}`);
            res.status(400).json(`${message}'${id}'. ${err}`);
        });
});

// Insert a user into users and logins table using their sequelize models
router.post("/profile/addNew", (req, res) => {
    // Destructure the properties of data received from reg.body
    let { lastname, firstname, email, sex, age, roleid, username, password } = req.body;

    // Validate all inputs to be sure there is data in each field
    if (!lastname || !firstname || !email || !sex || !age || !username || !password) {

        console.log("Incorrect form submission");
        return res.status(400).json("Incorrect form submission");
    }

    if (lastname.toUpperCase().trim() === 'ADMIN' ||
        firstname.toUpperCase().trim() === 'ADMIN' ||
        age >= 99) {

        console.log('Forbidden names or age!');
        return res.status(400).json('Forbidden names or age!');
    }

    // Default role must be 2 (USER) unless it is entered
    roleid = roleid || 2;
    // Now get the role name from the role table
    require("../models/RoleModel").findByPk(roleid)
        .then(roleData => {
            if (!roleData) {
                console.log("No user role in database!")
                return res.status(400).json("user role not found");
            }

            const role = roleData.role_name;
            console.log('This is role:', role);
            // Encrypt the password
            const hash = bcrypt.hashSync(password);

            // Start sequelize Database.transaction.
            db.transaction().then(t => {
                return User.create(
                    {
                        lastname: lastname.toUpperCase(),
                        firstname: toTitleCase(firstname),
                        email: email.toLowerCase(),
                        sex: toTitleCase(sex),
                        age,
                        role: role.toUpperCase()
                    },
                    { transaction: t }
                )
                    .then(user => {
                        return Login.create(
                            {
                                id: user.id,
                                username: username.toLowerCase(),
                                password: hash,
                                email: user.email
                            },
                            { transaction: t }
                        ).then(login => {
                            if (login.id) {
                                console.log("Result committed:", JSON.stringify(login));
                                res.status(200).json(login);
                            } else {
                                console.log("Result Not committed: 0");
                                res.status(200).json(0);
                            }
                        });
                    })
                    .then(() => {
                        t.commit();
                    })
                    .catch(err => {
                        t.rollback();
                        errorMessage = `Sorry, User not committed:\n ${err}`;
                        console.log(errorMessage);
                        res.status(400).json(errorMessage);
                    });
            });
        });
});

//------------------
/*  This automatically adds a JSON formated list of users to the users table and creates an automatic username and password for each user based on their firstnames. I will use any frontend app or use POSTMAN to send a triggering POST operatio to this endpoint and it will start loading the usersMokeData.js and iterates through the list and then add them to the database. */
router.post("/addNew/bulk", (req, res) => {

    // Validate to see if there is data to be loaded from the 'UsersMockData.js' file.
    if (UsersMockData.length < 1) {
        console.log('No bulk users to load from UsersMockData file.');
        res.status(400).json([0, 'No bulk users to be loaded']);
    }

    const { reqSource } = req.body;

    console.log(`Bulk Insert request from ${reqSource}`);
    console.log("Users Bulk Insert started...");

    let userCount = 0;

    const performInsert = async () => {

        for await (const user of UsersMockData) {

            // Destructure the properties of data received from user object
            let { lastname, firstname, email, sex, age, role } = user;

            // Validate all inputs to be sure there is data in each field
            if (!lastname || !firstname || !email || !sex || !age || !role) {
                console.log([0, "Incorrect user format submission error"]);
                return res.status(400).json([0, "Incorrect user format submission error"]);
            }

            if (lastname.toUpperCase().trim() === 'ADMIN' ||
                firstname.toUpperCase().trim() === 'ADMIN' ||
                age >= 99) {
                console.log([0, 'Forbidden names or age!']);
                return res.status(400).json([0, 'Forbidden names or age!']);
            }

            console.log(`${lastname} ${firstname}, ${email}, ${sex}, ${age}, ${role}`);

            // Create an auto username from firstname for login
            let username = firstname.toLowerCase();
            // Encrypt an auto-created temporary password
            let password = user.firstname.toLowerCase() + "001";
            const hash = bcrypt.hashSync(password);
            // Start sequelize Database.transaction.
            await db.transaction().then(t => {
                return User.create(
                    {
                        lastname: lastname.toUpperCase(),
                        firstname: toTitleCase(firstname),
                        email: email.toLowerCase(),
                        sex: toTitleCase(sex),
                        age,
                        role: role.toUpperCase()
                    },
                    { transaction: t }
                )
                    .then(user => {
                        return Login.create(
                            {
                                id: user.id,
                                username: username, // auto-created
                                password: hash, // auto-created
                                email: user.email
                            },
                            { transaction: t }
                        ).then(login => {
                            if (!login.id) {
                                console.log("User not added: 0");
                            }
                        });
                    })
                    .then(() => {
                        t.commit();
                        console.log("User added:", JSON.stringify(user.lastname) + ' ' + JSON.stringify(user.firstname));
                        userCount = userCount + 1;
                    })
                    .catch(err => {
                        t.rollback();
                        errorMessage = `Sorry, User not committed:\n ${err}`;
                        console.log(errorMessage);
                    });
            });

        }

        if (userCount > 0) {
            console.log(`${userCount} movie(s) successfully added.`);
            res.status(200).json([userCount, "Bulk user addition success"]);
        } else {
            console.log(`No user(s) is added.`);
            res.status(400).json([0, "Bulk user addition failure"]);
        }

    }

    performInsert();

});

// Reset users table index to a specified default in case the table is empty
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
        console.log(`The returned nextID is '${nextID}'`);

        db.query(`SELECT SETVAL ((SELECT pg_get_serial_sequence('users', 'id')), ${nextID}, false)`,
            {
                raw: true,
                type: db.QueryTypes.SELECT
            })
            .then(response => {
                console.log([response[0], "RESET DONE"]);
                res.status(200).json([response[0], "RESET DONE"]);
            }).catch(err => {
                errorMessage = `Sorry, users table index not reset: ${err}`;
                console.log([0, errorMessage]);
                res.status(400).json([0, errorMessage]);
            });
    })();
});

// Helper Method for finding the next available User table ID to reset the table to.
const getNextID = async (defaultID) => {

    // List of all the tableIDS
    let tableIDS = null;

    await User.findAll({ attributes: ['id'], order: ['id'] }).then(usersRes => {
        tableIDS = usersRes;
    }).catch(err => {
        console.log(err);
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

    console.log(`Next Index should be: ${nextID} \nMin: ${minID} \nMax: ${maxID}`);

    return nextID;
}

// Update a users profile data using Users sequelize model
router.put("/profile/update", (req, res) => {
    // Destructure the properties of data received from reg.body
    let { id, lastname, firstname, email, sex, age, role } = req.body;

    // Validate all inputs to be sure there is data in each field
    if (!id || !lastname || !firstname || !email || !sex || !age || !role) {
        return res.status(400).json("Incorrect form user update submission");
    }

    // If user id does not exist then just return here
    User.findByPk(id).then(user => {
        if (!user) {
            console.log(`User id '${id}' not found to be updated!`);
            return res
                .status(400)
                .json(`Invalid user id '${id}' for update submission`);
        } else {
            // Start sequelize Database.transaction.
            db.transaction().then(t => {
                return User.update(
                    {
                        lastname: lastname.toUpperCase(),
                        firstname: toTitleCase(firstname),
                        email: email.toLowerCase(),
                        sex: toTitleCase(sex),
                        age,
                        role: role.toUpperCase()
                    },
                    { where: { id: id } },
                    { transaction: t }
                )
                    .then(user => {
                        return Login.update(
                            {
                                email: email
                            },
                            { where: { id: id } },
                            { transaction: t }
                        ).then(login => {
                            console.log(`${user[0]} user, ${login[0]} login update success!`);
                            const reply = [user[0], login[0]];
                            res.status(200).json(reply);
                        });
                    })
                    .then(() => {
                        t.commit();
                    })
                    .catch(err => {
                        t.rollback();
                        errorMessage = `Sorry, user profile update not committed:\n ${err}`;
                        console.log(errorMessage);
                        res.status(400).json(errorMessage);
                    });
            });
        }
    });
});

// --** Delete a user's profile, login data, and his/her movie_ratings
// Anyone going through this code should bear in mind that the 
// deleting of the login and Movie ratings is handled concurrently
// inside the database server by the cascading delete constraint
// functionaly that had been tried and tested.
router.delete("/profile/deleteById/:id", (req, res) => {

    const { id } = req.params;

    if (!id) {
        return res.status(400).json("No user ID. Bad Request");
    }

    User.destroy({
        where: { id: id }
    })
        .then(response => {
            if (response <= 0) {
                console.log(`${response} record(s) deleted - None`);
                return res.status(200).json(`${response} record(s) deleted - None`);
            }
            console.log(`${response} record(s) deleted!`);
            return res
                .status(200)
                .json(response);
        })
        .catch(err => {
            errorMessage = `Error, user delete not done: \n ${err}`;
            console.log(errorMessage);
            return res.status(200).json(`${err}`);
        });
});

/* Delete all users and their logins at once including all their respective individual ratings associated with each one of them */
router.post("/profile/deleteall", (req, res) => {

    User.destroy({
        where: {}
    }).then(response => {
        if (response > 0) {
            console.log(`${response} deleted.`);
        } else {
            console.log(`${response} deleted.`);
        }
        res.status(200).json([response, 'DELETED']);
    })
        .catch(() => {
            errorMessage = `Error, all users delete not done`;
            console.log(errorMessage);
            res.status(400).json([0, errorMessage]);
        });
});

//---------------------------------------

module.exports = router;

// Helper Method
// TitleCase String Converter
const toTitleCase = str => {
    if (str === null || str === "") return "None";
    else str = str.toString();

    return str.replace(/\w\S*/g, strTxt => {
        return strTxt.charAt(0).toUpperCase() + strTxt.substr(1).toLowerCase();
    });
};