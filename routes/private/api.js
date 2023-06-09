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
  // PUT /api/v1/requests/senior/:requestId
app.put('/api/v1/requests/senior/', (req, res) => {
  const { requestId } = req.params;
  const { seniorStatus } = req.body;

  // Handle acceptance
  if (seniorStatus === 'accepted') {
    // Perform actions for accepting the request
    // Update the request status in the database accordingly

    return res.status(200).json({ message: 'Request accepted successfully' });
  }

  // Handle rejection
  if (seniorStatus === 'rejected') {
    // Perform actions for rejecting the request
    // Update the request status in the database accordingly

    return res.status(200).json({ message: 'Request rejected successfully' });
  }

  // Invalid seniorStatus value
  return res.status(400).json({ message: 'Invalid seniorStatus value' });
});

// PUT /api/v1/requests/refunds/:requestId
app.put('/api/v1/requests/refunds/:requestId', (req, res) => {
  const { requestId } = req.params;
  const { refundStatus } = req.body;

  if (refundStatus === 'accepted') {
    // Perform actions for accepting the refund request
    // Update the refund request status in the database accordingly

    return res.status(200).json({ message: 'Refund request accepted successfully', redirect: '/' });
  }

  if (refundStatus === 'rejected') {
    // Perform actions for rejecting the refund request
    // Update the refund request status in the database accordingly

    return res.status(200).json({ message: 'Refund request rejected successfully', redirect: '/' });
  }

  return res.status(400).json({ message: 'Invalid refundStatus value' });
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
        purchasedid: ticketId[0] // Use the ticket id as the purchased id
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
  
  const updateZonePrice = async function (req, res) {
    try {
      const user = await getUser(req);
  
      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only admin can update zone price." });
      }
  
      const zoneId = req.params.zoneId;
      const parsedZoneId = parseInt(zoneId);
  
      const { price } = req.body;
  
      // Check if the required fields are provided
      if (!price) {
        return res
          .status(400)
          .json({ error: "Invalid request. Missing required fields." });
      }
  
      // Update the zone price in the database
      const updatedZone = await db("se_project.zones")
        .where({ id: parsedZoneId })
        .update({ price })
        .returning("*");
  
      // Check if the zone was successfully updated
      if (updatedZone.length === 0) {
        return res.status(404).json({ error: "Zone not found." });
      }
  
      return res.status(200).json(updatedZone);
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({ error: "Internal Server Error" });
    }
  };
  
  app.put("/api/v1/zones/:zoneId", updateZonePrice);
  
  app.post("/api/v1/senior/request", async function (req, res) {
    try {
      console.log("heree in req");
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




  
};
