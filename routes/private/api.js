const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }
  console.log("hi",sessionToken);
  const user = await db
    .select("*")
    .from("se_project.sessions")
    .where("token", sessionToken)
    .innerJoin(
      "se_project.users",
      "se_project.sessions.userid",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleid",
      "se_project.roles.id"
    )
   .first();

  console.log("user =>", user);
  user.isNormal = user.roleid === roles.user;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;
  console.log("user =>", user)
  return user;
};

module.exports = function (app) {
  // example
  app.get("/users", async function (req, res) {
    try {
       const user = await getUser(req);
      const users = await db.select('*').from("se_project.users")
        
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
   
  });

  app.post("/api/v1/users", async function (req, res) {
    try {
      // Retrieve the necessary data from the request body
      const { firstName, lastName, email, password } = req.body;
      
      // Perform any necessary validation on the data
      
      // Insert the new user into the database using the db object
      const newUser = await db("se_project.users").insert({
        firstName,
        lastName,
        email,
        password,
      });
      
      // Return a success message or the newly created user object
      return res.status(201).json(newUser);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not create user");
    }
  });
  
 


  
};
