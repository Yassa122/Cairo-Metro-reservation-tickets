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
  app.post("/api/v1/station", async function (req, res) {
    try {
      const user = await getUser(req);
      if (!user.isAdmin) {
        return res.status(403).send("Only admins can create stations");
      }

      const { stationName } = req.body;
      if (!stationName) {
        return res.status(400).send("Station name is required");
      }

      // Create the station in the database
      const station = {
        id: v4(), // Generate a unique ID for the station
        name: stationName,
      };

      // Save the station in the database
      await db("se_project.stations").insert(station);

      return res.status(201).json(station);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not create station");
    }
  });

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
  
};
