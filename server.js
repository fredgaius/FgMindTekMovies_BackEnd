const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// Database
const db = require("./config/database");

// Test Database connection
db.authenticate()
    .then(() => console.log("Database connected successfully..."))
    .catch(err => console.log("Error: " + err));

// Initialize app and use bodyParser
const app = express();

// bodyParser and cors
app.use(bodyParser.json());
app.use(cors());

// ------------------ ROUTERS ------------------
// Root route
app.get("/", (req, res) => {
    res.status(200).json("API Endpoint is server root");
    console.log("API Endpoint is server root");
});
// User routes
app.use("/users", require("./routers/UsersRouter"));
// Role routes
app.use("/roles", require("./routers/RolesRouter"));
// Login routes
app.use("/logins", require("./routers/LoginsRouter"));
// Movie routes
app.use("/movies", require("./routers/MoviesRouter"));
// ---------------------------------------------

const serverPORT = process.env.PORT || 3000;

app.listen(serverPORT, () => {
    console.log(`Server started. Listening on port ${serverPORT}.`);
});