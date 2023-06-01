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
      const users = await db.select("*").from("se_project.users");
        
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
   
  });
 
  app.put("/api/v1/password/reset", async function (req, res) {
    try {
      const user = await getUser(req);
      const { newpassword } = req.body;
      await db("se_project.users")
        .where("id", user.userid)
        .update({ password: newpassword });
      return res.status(200).json("Your new password is: " + newpassword);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("error updating password");
    }
  });

  app.get("/api/v1/zones", async function (req, res) {
    try {
      const zones = await db.select('*').from("se_project.zones");
      return res.status(200).json(zones);
    }   catch (e) {
      console.log(e.message);
      return res.status(500).send("Error retrieving zones data");
    }
  });
// in progress
  app.get("/api/v1/tickets/price/:originId/:destinationId", async function (req, res) {
    try {
      const { originId, destinationId } = req.params;
      const origin = await db
        .select("*")
        .from("stations")
        .where("id", originId)
        .first();
      if (!origin) {
        return res.status(400).send("Origin not found");
      }
      const destination = await db
        .select("*")
        .from("stations")
        .where("id", destinationId)
        .first();
      if (!destination) {
        return res.status(400).send("Destination not found");
      }
  
      // Find the route that includes the origin and destination
      const route = await db
        .select("routes.id", "routes.price")
        .from("routes")
        .join("stationRoutes", "routes.id", "=", "stationRoutes.routeId")
        .whereIn("stationRoutes.stationId", [originId, destinationId])
        .groupBy("routes.id", "routes.price")
        .having(db.raw("count(distinct stationRoutes.stationId)"), "=", 2)
        .first();
  
      if (!route) {
        return res.status(400).send("Route not found");
      }
      return res.status(200).json(route.price);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get price");
    }
  });
  
//WORKING
app.post("/api/v1/payment/subscription", async function (req, res) {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const { creditCardNumber, holderName, payedAmount, subType, zoneId } = req.body;

    // Validate input
    if (!creditCardNumber || !holderName || !payedAmount || !subType || !zoneId) {
      return res.status(400).send("Missing required fields");
    }

    const paymentId = v4();

    let noOfTickets;
    switch (subType) {
      case 'annual':
        noOfTickets = 100;
        break;
      case 'quarterly':
        noOfTickets = 50;
        break;
      case 'monthly':
        noOfTickets = 10;
        break;
      default:
        return res.status(400).send("Invalid subscription type");
    }

    // Insert into subscription table
    const subscriptionId = await db("se_project.subscription")
      .insert({
        subtype: subType,
        zoneid: zoneId,
        userid: user.userid,
        nooftickets: noOfTickets
      })
      .returning('id');

    // Insert into transactions table
    await db("se_project.transactions")
      .insert({
        // id: paymentId,
        amount: payedAmount,
        userid: user.userid,
        purchasediid: subscriptionId[0] // Use the subscription id as the purchased id
      });

    return res.status(201).json({ message: "Payment successful", paymentId });
  } catch (e) {
    console.log(e.message);
    return res.status(500).send("Error processing payment");
  }
});
//WORKNG
app.post("/api/v1/payment/ticket", async function (req, res) {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const { creditCardNumber, holderName, payedAmount, origin, destination, tripDate } = req.body;

    // Validate input
    if (!creditCardNumber || !holderName || !payedAmount || !origin || !destination || !tripDate) {
      return res.status(400).send("Missing required fields");
    }

    const paymentId = v4();

    // Insert into tickets table
    const ticketId = await db("se_project.tickets")
      .insert({
        origin: origin,
        destination: destination,
        userid: user.userid,
        tripdate: tripDate
      })
      .returning('id');

    // Insert into transactions table
    await db("se_project.transactions")
      .insert({
        amount: payedAmount,
        userid: user.userid,
        purchasediid: ticketId[0] // Use the ticket id as the purchased id
      });

    return res.status(201).json({ message: "Payment successful", paymentId });
  } catch (e) {
    console.log(e.message);
    return res.status(500).send("Error processing payment");
  }
});


//working
app.post("/api/v1/tickets/purchase/subscription", async function (req, res) {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const { subId, origin, destination, tripDate } = req.body;

    // Validate input
    if (!subId || !origin || !destination || !tripDate) {
      return res.status(400).send("Missing required fields");
    }

    // Fetch user's subscription
    const subscription = await db('se_project.subscription')
      .where({
        id: subId,
        userid: user.userid,
      })
      .first();

    // Check if subscription exists and has tickets left
    if (!subscription || subscription.nooftickets <= 0) {
      return res.status(400).send("Invalid subscription or no tickets left in the subscription.");
    }

    // Deduct ticket from subscription
    await db('se_project.subscription')
      .where({
        id: subId,
        userid: user.userid,
      })
      .update({
        nooftickets: db.raw('nooftickets - 1')
      });

    // Insert into tickets table
    const ticketId = await db("se_project.tickets")
      .insert({
        origin: origin,
        destination: destination,
        userid: user.userid,
        subid: subId, // use the subscription id
        tripdate: tripDate
      })
      .returning('id');

    // Insert into rides table
    const rideId = await db("se_project.rides")
      .insert({
        status: "upcoming",
        origin: origin,
        destination: destination,
        userid: user.userid,
        ticketid: ticketId[0],
        tripdate: tripDate
      })
      .returning('id');

    return res.status(201).json({ message: "Ticket purchased successfully", ticketId: ticketId[0], rideId: rideId[0] });
  } catch (e) {
    console.log(e.message);
    return res.status(500).send("Error processing ticket purchase");
  }
});


};