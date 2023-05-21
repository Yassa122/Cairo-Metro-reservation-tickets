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
  module.exports = function (app) {
    // example
    app.get("/users", async function (req, res) {
      // Existing code for retrieving users
      // ...
    });
  
    // Register HTTP endpoint for ticket refund
    app.post("/api/v1/refund/:ticketId", async function (req, res) {
      // Retrieve the ticket ID from the URL parameter
      const { ticketId } = req.params;
  
      // Retrieve the user from the session or authentication token
      const user = await getUser(req);
  
      if (!user) {
        return res.status(401).send("User not authenticated");
      }
  
      try {
        // Retrieve the ticket from the database
        const ticket = await db
          .select("*")
          .from("se_project.tickets")
          .where("id", ticketId)
          .first();
  
        if (!ticket) {
          return res.status(404).send("Ticket not found");
        }
  
        // Check if the ticket belongs to the requesting user
        if (ticket.userid !== user.id) {
          return res.status(403).send("Access denied");
        }
  
        // Perform the refund process here...
        // Update the ticket status, calculate refund amount, etc.
  
        return res.status(200).send("Ticket refunded successfully");
      } catch (e) {
        console.log(e.message);
        return res.status(400).send("Could not process ticket refund");
      }
    });
  };

  module.exports = function (app) {
    // example
    app.get("/users", async function (req, res) {
      // Existing code for retrieving users
      // ...
    });
  
    // Register HTTP endpoint for requesting senior assistance
    app.post("/api/v1/senior/request", async function (req, res) {
      // Retrieve the user from the session or authentication token
      const user = await getUser(req);
  
      if (!user) {
        return res.status(401).send("User not authenticated");
      }
  
      // Extract the nationalId from the request body
      const { nationalId } = req.body;
  
      if (!nationalId) {
        return res.status(400).send("National ID is required");
      }
  
      try {
        // Perform the request senior process here...
        // You can implement your own business logic to handle the request,
        // such as validating the national ID, notifying senior staff, updating user's request status, etc.
        // You can use the user object to access user information.
  
        // Example: Validate the national ID format
        // You can replace this with your own validation logic
        const nationalIdRegex = /^\d{10}$/;
        if (!nationalIdRegex.test(nationalId)) {
          return res.status(400).send("Invalid national ID format");
        }
  
        // Example: Notify senior staff about the request
        // Replace this with your own notification mechanism
        notifySeniorStaff(user, nationalId);
  
        // Example: Update user's request status in the database
        // Replace this with your own database update logic
        await updateRequestStatus(user.id, nationalId);
  
        return res.status(200).send("Request sent successfully");
      } catch (e) {
        console.log(e.message);
        return res.status(400).send("Could not process the request");
      }
    });
  };

  module.exports = function (app) {
    // example
    app.get("/users", async function (req, res) {
      // Existing code for retrieving users
      // ...
    });
  
    // Register HTTP endpoint for simulating a ride
    app.put("/api/v1/ride/simulate", async function (req, res) {
      // Retrieve the user from the session or authentication token
      const user = await getUser(req);
  
      if (!user) {
        return res.status(401).send("User not authenticated");
      }
  
      // Extract the origin, destination, and trip date from the request body
      const { origin, destination, tripDate } = req.body;
  
      if (!origin || !destination || !tripDate) {
        return res.status(400).send("Origin, destination, and trip date are required");
      }
  
      try {
        // Perform the ride simulation here...
        // You can implement your own business logic to simulate the ride,
        // such as validating the station names, calculating the trip duration, updating user's ride history, etc.
        // You can use the user object to access user information.
  
        // Example: Validate the station names
        // You can replace this with your own validation logic
        if (!isValidStationName(origin) || !isValidStationName(destination)) {
          return res.status(400).send("Invalid station name");
        }
  
        // Example: Calculate trip duration
        // Replace this with your own calculation logic based on the given origin, destination, and trip date
  
        const tripDuration = calculateTripDuration(origin, destination, tripDate);
  
        // Example: Update user's ride history in the database
        // Replace this with your own database update logic
        await updateRideHistory(user.id, origin, destination, tripDate, tripDuration);
  
        return res.status(200).send("Ride simulated successfully");
      } catch (e) {
        console.log(e.message);
        return res.status(400).send("Could not simulate the ride");
      }
    });
  };
  
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
