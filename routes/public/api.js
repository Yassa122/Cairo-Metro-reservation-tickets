const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
module.exports = function (app) {
// Register HTTP endpoint for password reset
app.put("/api/v1/password/reset", async function (req, res) {
  // Get the new password from the JSON body
  const { newPassword } = req.body;

  if (!newPassword) {
    // If the new password is not present, return an HTTP bad request code
    return res.status(400).send("New password is required");
  }

  // Retrieve the admin's user ID from the session or authentication token
  const userId = req.session.userid; // Assuming you have implemented session management

  try {
    // Update the admin's password in the database
    await db("se_project.users")
      .where("id", userId)
      .update({ password: newPassword });

    return res.status(200).send("Password reset successful");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not reset password");
  }
});

// Register HTTP endpoint for admin registration
app.post("/api/v1/admin/register", async function (req, res) {
  // Get admin credentials from the JSON body
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    // If any of the required fields are missing, return an HTTP bad request code
    return res.status(400).send("All fields are required");
  }

  // Check if admin already exists in the system
  const adminExists = await db
    .select("*")
    .from("se_project.users")
    .where("email", email);

  if (!isEmpty(adminExists)) {
    return res.status(400).send("Admin already exists");
  }

  const newAdmin = {
    firstname: firstName,
    lastname: lastName,
    email: email,
    password: password,
    roleid: roles.admin,
  };

  try {
    const admin = await db("se_project.users")
      .insert(newAdmin)
      .returning("*");

    return res.status(200).json(admin);
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not register admin");
  }
});

// Register HTTP endpoint for admin login
app.post("/api/v1/admin/login", async function (req, res) {
  // Get admin credentials from the JSON body
  const { email, password } = req.body;
  if (!email) {
    // If the email is not present, return an HTTP unauthorized code
    return res.status(400).send("Email is required");
  }
  if (!password) {
    // If the password is not present, return an HTTP unauthorized code
    return res.status(400).send("Password is required");
  }

  // validate the provided password against the password in the database
  // if invalid, send an unauthorized code
  const admin = await db
    .select("*")
    .from("se_project.users")
    .where("email", email)
    .where("roleid", roles.admin)
    .first();

  if (isEmpty(admin)) {
    return res.status(401).send("Invalid admin credentials");
  }

  if (admin.password !== password) {
    return res.status(401).send("Password does not match");
  }

  // set the expiry time as 15 minutes after the current time
  const token = v4();
  const currentDateTime = new Date();
  const expiresat = new Date(+currentDateTime + 900000); // expire in 15 minutes

  // create a session containing information about the admin and expiry time
  const session = {
    userid: admin.id,
    token,
    expiresat,
  };

  try {
    await db("se_project.sessions").insert(session);
    // In the response, set a cookie on the client with the name "session_token"
    // and the value as the UUID we generated. We also set the expiration time.
    return res
      .cookie("session_token", token, { expires: expiresat })
      .status(200)
      .send("Admin login successful");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not register admin");
  }
});

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
      // If the email is not present, return an HTTP unauthorized code
      return res.status(400).send("email is required");
    }
    if (!password) {
      // If the password is not present, return an HTTP unauthorized code
      return res.status(400).send("Password is required");
    }

    // validate the provided password against the password in the database
    // if invalid, send an unauthorized code
    const user = await db
      .select("*")
      .from("se_project.users")
      .where("email", email)
      .first();
    if (isEmpty(user)) {
      return res.status(400).send("user does not exist");
    }

    if (user.password !== password) {
      return res.status(401).send("Password does not match");
    }

    // set the expiry time as 15 minutes after the current time
    const token = v4();
    const currentDateTime = new Date();
    const expiresat = new Date(+currentDateTime + 900000); // expire in 15 minutes

    // create a session containing information about the user and expiry time
    const session = {
      userid: user.id,
      token,
      expiresat,
    };
    try {
      await db("se_project.sessions").insert(session);
      // In the response, set a cookie on the client with the name "session_cookie"
      // and the value as the UUID we generated. We also set the expiration time.
      return res
        .cookie("session_token", token, { expires: expiresat })
        .status(200)
        .send("login successful");
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not register user");
    }
  });
}
