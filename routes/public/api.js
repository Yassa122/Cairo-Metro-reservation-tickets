const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
module.exports = function (app) {
app.post("/api/v1/user", async function (req, res) {

    // Check if user already exists in the system
    const userExists = await db
      .select("*")
      .from("se_project.users")
      .where("email", req.body.email);
    if (!isEmpty(userExists)) {
      return res.status(400).send("user exists");
    }

    const newUser = {
      firstname: req.body.firstName,
      lastname: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      roleid: roles.user,
    };
    try {
      const user = await db("se_project.users").insert(newUser).returning("*");

      return res.status(200).json(user );
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not register user");
    }
  });




  // Register HTTP endpoint to create new user
  app.post("/api/v1/user/login", async function (req, res) {
  // get users credentials from the JSON body
  const { email, password } = req.body;
  if (!email) {
    // If the email is not present, return an HTTP bad request code
    return res.status(400).send("Email is required");
  }
  if (!password) {
    // If the password is not present, return an HTTP bad request code
    return res.status(400).send("Password is required");
  }

  // validate the provided password against the password in the database
  // if invalid, send an unauthorized code
  const user = await db
    .select("*")
    .from("se_project.users")
    .where("email", email)
    .first();
  if (!user) {
    return res.status(400).send("User does not exist");
  }

  if (user.password !== password) {
    return res.status(401).send("Password does not match");
  }

  // Retrieve the role ID from the user object
  const roleId = user.roleid;

  // set the expiry time as 15 minutes after the current time
  const token = v4();
  const currentDateTime = new Date();
  const expiresAt = new Date(+currentDateTime + 900000); // expire in 15 minutes

  // create a session containing information about the user, role ID, and expiry time
  const session = {
    userid: user.id,
    token,
    expiresat: expiresAt,
  };
  try {
    await db("se_project.sessions").insert(session);
    
    if (roleId === 2) {
      // Admin user
      res.cookie("session_token", token, { expires: expiresAt });
      return res.redirect("/admindashboard");
    } else {
      // Non-admin user
      res.cookie("session_token", token, { expires: expiresAt });
      return res.redirect("/userdashboard");
    }
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not register user");
  }
});

}