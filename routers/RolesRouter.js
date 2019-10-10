const router = require("express").Router();
const db = require("../config/database");
const Role = require("../models/RoleModel");

router.get("/", (req, res) => {
    Role.findAll()
        .then(roles => {
            // console.log(JSON.stringify(roles));
            res.status(200).json(roles);
        })
        .catch(err => {
            // console.log(`Could not find roles`);
            res.status(400).json(`Could not find roles`);
        });
});

router.get("/getById/:id", (req, res) => {
    const { id } = req.params;
    const message = "Could not find role id ";
    Role.findByPk(id)
        .then(role => {
            if (role) {
                res.status(200).json(role);
                // console.log(JSON.stringify(role));
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

// Insert a new role type data into roles table using its sequelize model
router.post("/addNew", (req, res) => {
    // Destructure the properties of data received from reg.body
    let { role_name } = req.body;

    // Validate all inputs to be sure there is data in each field
    if (!role_name) {
        return res.status(400).json("Incorrect form submission");
    }

    // Start sequelize Database.transaction.
    db.transaction().then(t => {
        return Role.create(
            {
                role_name,
            },
            { transaction: t }
        )
            .then(role => {
                t.commit();
                // console.log("New role type added:", JSON.stringify(role));
                res.redirect(`/roles/getById/${role.id}`);
            })
            .catch(err => {
                t.rollback();
                errorMessage = `Sorry, new role type creation failed:\n ${err.original.detail},\n ${
                    err.errors[0].message
                    }`;
                // console.log(errorMessage);
                res.status(400).json(errorMessage);
            });
    });
});

// Update a role type data using Role's sequelize model
router.put("/update", (req, res) => {
    // Destructure the properties of data received from reg.body
    let { id, role_name } = req.body;

    // Validate all inputs to be sure there is data in each field
    if (!id || !role_name) {
        return res.status(400).json("Incorrect form submission");
    }

    // Start sequelize Database.transaction.
    db.transaction().then(t => {
        return Role.update(
            {
                role_name
            },
            { where: { id: id } },
            { transaction: t }
        )
            .then(role => {
                if (role[0] > 0) {
                    t.commit();
                    // console.log(`${role[0]} role type update success!`);
                    // res.status(200).json(`${movie[0]} movie update success!`);
                    res.redirect(`/roles/getById/${id}`);
                } else {
                    t.rollback();
                    // console.log(`${role[0]} not successful! No update performed!`);
                    res.status(200).json(`${role[0]} successful! No update performed!`);
                }
            })
            .catch(err => {
                t.rollback();
                errorMessage = `Sorry, role type update not committed:\n ${
                    err.original.detail
                    },\n ${err.errors[0].message}`;
                // console.log(errorMessage);
                res.status(400).json(errorMessage);
            });
    });
});

// Delete a role type data
router.delete("/deleteById", (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json("Bad request");
    }
    Role.destroy({
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
                .json(`${response} role(s) deletetion successful`);
        })
        .catch(err => {
            errorMessage = `Error, role type delete not done:\n ${
                err.original.detail
                },\n ${err.errors[0].message}`;
            // console.log(errorMessage);
        });
});


module.exports = router;