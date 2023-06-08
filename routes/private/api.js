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
  


  app.delete("/api/v1/station/:stationId", async function (req, res) {
    try {
      const { stationId } = req.params;
      const user = await getUser(req);
  
      if (!user.isAdmin) {
        return res.status(401).send("Unauthorized");
      }
  
      const station = await db
        .select("*")
        .from("se_project.stations")
        .where("id", stationId)
        .first();
  
      if (!station) {
        return res.status(404).send("Station not found");
      }
  
      const { stationtype } = station;
  
      if (stationtype === "normal") {
        // Delete the routes associated with the station
        await db("se_project.stationroutes")
          .where("stationid", stationId)
          .delete();
  
        // Delete the station from the stations table
        await db("se_project.stations")
          .where("id", stationId)
          .delete();
  
        return res.status(200).send("Station deleted successfully");
      } else {
        return res.status(400).send("Invalid station type");
      }
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not delete the station");
    }
  });

 




  app.post("/api/v1/route", async function (req, res) {
    try {
      const user = await getUser(req);
  
      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only admin can create routes." });
      }
  
      const { connectedStationId, newStationId, routename } = req.body;
  
      // Check if the required fields are provided
      if (!connectedStationId || !newStationId || !routename) {
        return res
          .status(400)
          .json({ error: "Invalid request. Missing required fields." });
      }
  
      // Check if the stations exist
      const toStation = await db('se_project.stations').where({ id: connectedStationId }).first();
      const fromStation = await db('se_project.stations').where({ id: newStationId }).first();
  
      if (!toStation || !fromStation) {
        return res
          .status(400)
          .json({ error: "Invalid request. One or more stations do not exist." });
      }
  
      // Create the route in the database
      const [routeId] = await db("se_project.routes").insert({
        fromstationid: newStationId,
        tostationid: connectedStationId,
        routename: routename,
        // assuming knex returns the ID of the created record
      }).returning('id');
  
      // Associate the stations to the route
      await db('se_project.stationroutes').insert([
        { stationid: newStationId, routeid: routeId },
        { stationid: connectedStationId, routeid: routeId },
      ]);
  
      return res.status(201).json({ message: "Route created successfully." });
    } catch (e) {
      console.error(e.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
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
  // const deleteRoute = async function (req, res) {
  //   try {
  //     const user = await getUser(req);
  
  //     // Check if the user is an admin
  //     if (!user.isAdmin) {
  //       return res.status(403).send("Only admin can delete routes.");
  //     }
  
  //     const routeId = req.params.routeId;
  //     const parsedRouteId = parseInt(routeId);
  
  //     // Check if the route ID is provided
  //     if (!parsedRouteId) {
  //       return res.status(400).send("Invalid request. Route ID is missing or invalid.");
  //     }
  
  //     // Delete the route from the database
  //     const deletedRoute = await db("se_project.routes")
  //       .where({ id: parsedRouteId })
  //       .del();
  
  //     // Check if the route was successfully deleted
  //     if (deletedRoute === 0) {
  //       return res.status(404).send("Route not found.");
  //     }
  
  //     return res.status(200).json({ message: "Route deleted successfully." });
  //   } catch (e) {
  //     console.log(e.message);
  //     return res.status(400).send("Internal Server Error");
  //   }
  // };
  
  // app.delete("/api/v1/route/:routeId", deleteRoute);
  
  app.delete('/api/v1/route/:routeId', async (req, res) => {
    try {
      const user = await getUser(req);
      if (user.isAdmin) {
        const routeId = req.params.routeId;
        //const stationId= req.params.stationId;
        const routeDelete = await db('se_project.routes').where('id', routeId);
        console.log(routeDelete)
        if (routeDelete.length== 0) {
          return res.status(404).json({ error: 'Route not found' });
          
        }
        
        const { fromstationid, tostationid } = routeDelete[0];
        
        
  
        //update position el 1 wla el 2
        //check el route elly 3kso el to bt3to l 1 w from htb2a 2 mowgod wla la w en el 2 tb2a start
        //msh mowgod position null from htkon null
        //mowgod msh h3ml haga
       console.log(tostationid);
       console.log(fromstationid);
      // Updating the position of the stations
      const nextStation = await db('se_project.routes').where('tostationid', fromstationid).first();
      if (nextStation) {
        await db('se_project.stations').where('id', nextStation.fromstationid).update({ stationposition: 'start' });
      
      }
      console.log(nextStation);
      const prevStation = await db('se_project.routes').where('tostationid', tostationid).first();
      if (prevStation) {
        await db('se_project.stations').where('id', prevStation.fromstationid).update({ stationposition: 'start' });
      }
      console.log(prevStation);
      console.log('Route and connected stations deleted successfully');
      await db('se_project.routes').where('id', routeId).del();
      return res.status(200).json({ message: 'Route and connected stations deleted successfully' });
    
    }
    // else if(prevStation == stationposition){
  //}
      else {
      return res.status(403).json({ error: 'Unauthorized' });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'Cannot delete the route' });
  }
  });

  

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

  app.get("/manage/stations", async function (req, res) {
    try {
      const stations = await db.select("*").from("se_project.stations");
  
      return res.status(200).json(stations);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve stations");
    }
  });

  app.get("/manage/routes", async function (req, res) {
    try {
      const routes = await db.select("*").from("se_project.routes");
  
      return res.status(200).json(routes);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve stations");
    }
  });
  


};