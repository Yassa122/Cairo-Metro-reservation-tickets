const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const { getSessionToken } = require('../../utils/session')
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
  console.log("user =>", user)
  return user;
};


module.exports = function (app) {

  app.post("/api/v1/refund/:ticketId", async function (req, res) {
    console.log("i am hereeee");
    try {
      const user = await getUser(req);
      const { ticketId } = req.params;
      console.log(ticketId);
      // Retrieve the ticket from the database
      const ticket = await db
        .select("*")
        .from("se_project.tickets")
        .where("id", ticketId)
        .first();

      console.log(ticket);
      if (!ticket) {
        return res.status(404).send("Ticket not found");
      }

      // Check if the ticket belongs to the requesting user
      if (ticket.userid !== user.id) {
        return res.status(403).send("Access denied");
      }

      // Check if the ticket is a future dated ticket
      const now = new Date();
      const ticketDate = new Date(ticket.tripdate);
      if (ticketDate.getTime() <= now.getTime()) {
        return res.status(400).send("Cannot refund past dated tickets");
      }

      // Perform the refund process here...
      // Update the ticket status, calculate refund amount, etc.
      // For example:
      console.log("here subid ",ticket.subid);
      const subscription = await db
        .select("*")
        .from("se_project.subsription")
        .where("id", ticket.subid)
        .first()
      console.log(subscription);

      if (subscription != null) {
        const newNoOfTickets = subscription.nooftickets + 1;
        await db("se_project.subsription")
          .select("*")  
          .where("id", ticket.subid)
          .update({
            nooftickets: newNoOfTickets,
          });
      }
      else{
        // do the online logic
      }


      await db
        .from("se_project.tickets")
        .where("id", ticketId)
        .del();


      // Return success response
      return res.status(200).send("Ticket refunded successfully");
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not process ticket refund");
    }
  });



  // Register HTTP endpoint for requesting senior assistance
  app.post("/api/v1/senior/request", async function (req, res) {
    try {
      const user = await getUser(req);
      const { nationalId } = req.body;
      console.log("heree");
      console.log(nationalId);
      await db("se_project.senior_requests").insert({
        status: "pending",
        nationalid: nationalId,
        userid: user.id
      })

      return res.status(200).send("Request sent successfully");
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not process the request");
    }
  });

  app.put("/api/v1/ride/simulate", async function (req, res) {

    try {
      const { origin, destination, tripDate } = req.body;
      const status = "completed";
      // const createRide = await db("se_project.rides").insert({
      //   status,
      //   origin,
      //   destination,
      //   tripDate
      // })
      const rideUpdate = await db("se_project.rides")
        .where({
          "origin": origin,
          "destination": destination,
          "tripdate": tripDate
        })
        .update({
          status: "completed",
        });

      return res.status(200).send("Ride created and completed successfuly");
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not process the ride or create");
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
}