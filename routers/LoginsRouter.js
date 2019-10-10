const router = require("express").Router();
const db = require("../config/database");
const Login = require("../models/LoginModel");
const bcrypt = require("bcrypt-nodejs");

// Get list of all users in login table
router.get("/", (req, res) => {
    Login.findAll()
        .then(logins => {
            // console.log(JSON.stringify(logins));
            res.status(200).json(logins);
        })
        .catch(err => {
            // console.log(`Could not find logins`);
            res.status(400).json(`Could not find logins`);
        });
});

// Get record of one user in login table by login id
router.get("/profile/getById/:id", (req, res) => {
    const { id } = req.params;
    const message = "Could not find login id ";
    Login.findOne({ where: { id: id } })
        .then(login => {
            if (login) {
                const returnedData = {
                    id: login.id,
                    username: login.username,
                    password: '',
                    email: login.email,
                    createdAt: login.createdAt,
                    updatedAt: login.updatedAt
                };
                res.status(200).json(returnedData);
                // console.log(JSON.stringify(returnedData));
            } else {
                // console.log(message + "'" + id + "'");
                res.status(400).json(message + `'${id}'`);
            }
        })
        .catch(err => {
            // console.log(`${message}'${id}'`);
            res.status(400).json(`${message}'${id}'`);
        });
});

// Find and return a user profile by login's username and password
router.post("/profile/login", (req, res) => {
    const { username, password } = req.body;
    // Create a not found message string
    const message = "Could not find login data: ";
    Login.findOne({ where: { username: username } })
        .then(login => {
            if (login && bcrypt.compareSync(password, login.password)) {
                res.redirect(`/users/profile/getById/${login.id}`);

            } else {

                res.status(400).json(message + `'${username}' and '${password}'`);
            }
        })
        .catch(err => {
            res.status(400).json(`${message}'${username}' and '${password}'`);
        });
});

// Update a user's login password and username using its model
router.put("/profile/update", (req, res) => {
    // Destructure the properties of data received from reg.body
    let { email, username, oldPassword, newPassword } = req.body;

    // Validate all inputs to be sure there is data in each field
    if (!email || !username || !oldPassword || !newPassword) {
        return res.status(400).json([0, "Incorrect form login update submission"]);
    }

    // Create a not found message string (Check by email and oldPasword)
    const message = "Could not find login data!";
    Login.findOne({ where: { email: email } }).then(login => {
        if (login && bcrypt.compareSync(oldPassword, login.password)) {
            // Start sequelize Database.transaction.
            db.transaction().then(t => {
                return Login.update(
                    {
                        username: username.toLowerCase(),
                        password: bcrypt.hashSync(newPassword),
                        email: email.toLowerCase()
                    },
                    { where: { email: email } },
                    { transaction: t }
                )
                    .then(login => {
                        t.commit();
                        // console.log(`${login[0]} login update success!`);
                        res.status(200).json([login[0], 'login update success!']);
                    })
                    .catch(err => {
                        t.rollback();
                        errorMessage = `Sorry, login update not committed:\n ${
                            err.original.detail
                            },\n ${err.errors[0].message}`;
                        // console.log(errorMessage);
                        res.status(400).json([0, errorMessage]);
                    });
            });
        } else {
            // console.log([0, message]);
            res.json([0, message]).status(400);
        }
    });
});

module.exports = router;