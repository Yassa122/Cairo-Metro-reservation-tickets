const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const { getSessionToken } = require("../../utils/session");
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }
  console.log("hi", sessionToken);
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
  console.log("user =>", user);
  return user;
};

module.exports = function (app) {
  // example

  const createStation = async function (req, res) {
    try {
      const user = await getUser(req);
  
      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only admin can create stations." });
      }
  
      const { stationname, stationposition, stationstatus, stationtype } = req.body;
  
      // Check if the required fields are provided
      if (!stationname ) {
        return res
          .status(400)
          .json({ error: "Invalid request. Missing required fields." });
      }
  
      // Perform any additional validations if needed
  
      // Create the station in the database
      const station = await db("se_project.stations").insert({
        stationname: stationname,
        stationposition: "start",
        stationstatus: "new",
        stationtype: "normal"
      });
  
      return res.status(200).json({ message: "Station created successfully." });
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({ error: "Internal Server Error" });
    }
  };
  
  app.post("/api/v1/station", createStation);
  

  const updateStation = async function (req, res) {
    try {
      const user = await getUser(req);
  
      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only admin can update stations." });
      }
  
      const stationId = req.params.stationId;
      const parsedStationId = parseInt(stationId);
  
      const { stationName } = req.body;
  
      // Check if the required fields are provided
      if (!stationName) {
        return res
          .status(400)
          .json({ error: "Invalid request. Missing required fields." });
      }
  
      // Update the station name in the database
      const updatedStation = await db("se_project.stations")
        .where({ id: parsedStationId })
        .update({ stationname: stationName })
        .returning("*");
  
      // Check if the station was successfully updated
      if (updatedStation.length === 0) {
        return res.status(404).json({ error: "Station not found." });
      }
  
      return res.status(200).json(updatedStation);
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({ error: "Internal Server Error" });
    }
  };
  
  app.put("/api/v1/station/:stationId", updateStation);
  


  const deleteStation = async function (req, res) {
    try {
      const user = await getUser(req);
  
      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only admin can delete stations." });
      }
  
      const stationId = req.params.stationId;
      const parsedStationId = parseInt(stationId);
  
      // Check if the station ID is provided
      if (!parsedStationId) {
        return res.status(400).json({ error: "Invalid request. Station ID is missing or invalid." });
      }
  
      // Delete the station from the database
      const deletedStation = await db("se_project.stations")
        .where({ id: parsedStationId })
        .del();
  
      // Check if the station was successfully deleted
      if (deletedStation === 0) {
        return res.status(404).json({ error: "Station not found." });
      }
  
      // Delete the corresponding station routes from the database
      await db("se_project.stationRoutes")
        .where("startStationId", parsedStationId)
        .orWhere("middleStationId", parsedStationId)
        .orWhere("endStationId", parsedStationId)
        .orWhere("transferStationId", parsedStationId)
        .del();
  
      // Update the route names to substitute the deleted station in the database
      await db("se_project.routes")
        .where("startStationId", parsedStationId)
        .orWhere("middleStationId", parsedStationId)
        .orWhere("endStationId", parsedStationId)
        .orWhere("transferStationId", parsedStationId)
        .update({
          startStationId: null,
          middleStationId: null,
          endStationId: null,
          transferStationId: null,
          routeName: "new"
        });
  
      return res.status(200).json({ message: "Station deleted successfully." });
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({ error: "Internal Server Error" });
    }
  };
  
  app.delete("/api/v1/station/:stationId", deleteStation);
  








  const createRoute = async function (req, res) {
    try {
      const user = await getUser(req);

      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only admin can create routes." });
      }

      const { tostationid, fromstationid, routename } = req.body;

      // Check if the required fields are provided
      if (!tostationid || !fromstationid || !routename) {
        return res
          .status(400)
          .json({ error: "Invalid request. Missing required fields." });
      }

      // Perform any additional validations if needed

      // Create the route in the database
      const route = await db("se_project.routes").insert({
        fromstationid: fromstationid,
        tostationid: tostationid,
        routename: routename,
      });

      return res.status(200).json({ message: "Route created successfully." });
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({ error: "Internal Server Error" });
    }
  };


    app.post("/api/v1/route", createRoute);

    // Rest of your routes
  

  const updateRoute = async function (req, res) {
    try {
      const user = await getUser(req);

      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).send("Only admin can update routes.");
      }

      const routeId = req.params.routeId;
      const routeid = parseInt(routeId);

      const { routeName } = req.body;

      // Check if the required fields are provided
      if (!routeName) {
        return res
          .status(400)
          .send("Invalid request. Missing required fields.");
      }

      // Update the route name in the database
      const updatedRoute = await db("se_project.routes")
        .where({ id: routeid })
        .update({ routename: routeName })
        .returning("*");

      // Check if the route was successfully updated
      if (updatedRoute.rowCount === 0) {
        return res.status(404).send("Route not found.");
      }

      return res.status(200).json(updatedRoute);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Internal Server Error");
    }
  };

  app.put("/api/v1/route/:routeId", updateRoute);

  // Rest of your routes
  const deleteRoute = async function (req, res) {
    try {
      const user = await getUser(req);
  
      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).send("Only admin can delete routes.");
      }
  
      const routeId = req.params.routeId;
      const parsedRouteId = parseInt(routeId);
  
      // Check if the route ID is provided
      if (!parsedRouteId) {
        return res.status(400).send("Invalid request. Route ID is missing or invalid.");
      }
  
      // Delete the route from the database
      const deletedRoute = await db("se_project.routes")
        .where({ id: parsedRouteId })
        .del();
  
      // Check if the route was successfully deleted
      if (deletedRoute === 0) {
        return res.status(404).send("Route not found.");
      }
  
      return res.status(200).json({ message: "Route deleted successfully." });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Internal Server Error");
    }
  };
  
  app.delete("/api/v1/route/:routeId", deleteRoute);
  

  

  app.get("/users", async function (req, res) {
    try {
      const user = await getUser(req);
      const users = await db.select("*").from("se_project.users");

      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
  });


};