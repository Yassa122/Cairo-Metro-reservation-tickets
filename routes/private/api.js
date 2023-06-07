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
  return res.status(500).json({ error: 'Cannot delete the route' });
}
});


app.get("/api/v1/tickets/price/:originId/:destinationId", async function (req, res) {
  try {
    let { originId, destinationId } = req.params;

    originId = parseInt(originId);
    destinationId = parseInt(destinationId);


    const stations = await
     db.select('*').from('se_project.stations');
    const routes = await db.select('*').from('se_project.routes');
    const stationRoutes = await db.select('*').from('se_project.stationroutes');

    const graph = transformDataForBfs(stations, routes, stationRoutes);

 
const path = bfs(graph, originId, destinationId);
console.log('Path found:', path);

    if (path.length === 0) {
      return res.status(404).send('No route found between the specified stations.');
    }

    let transitions = path.length - 1;

        let price;
        if (transitions <= 8) {
          price = 5;
        } else if (transitions <= 15) {
          price = 7;
        } else {
          price = 10;
        }

    return res.status(200).json({ price });

    function transformDataForBfs(stations, routes, stationRoutes) {
      let graph = {};
    
      
      for (let station of stations) {
        graph[station.id] = [];
      }
    
      for (let stationRoute of stationRoutes) {
        let route = routes.find(route => route.id === stationRoute.routeid);
        if (route) {
          let { fromstationid, tostationid } = route;
          if (stationRoute.stationid === fromstationid) {
            graph[fromstationid].push(tostationid);
          } else if (stationRoute.stationid === tostationid) {
            graph[tostationid].push(fromstationid);
          }
        }
      }
    
      return graph;
    }
    

    function bfs(graph, startNode, endNode) {
      let queue = [];
      let visited = {};
    
      // start from the starting node
      queue.push([startNode]);
      visited[startNode] = true;
    
      while(queue.length > 0) {
        let path = queue.shift(); // get the path out from the queue
        let node = path[path.length - 1]; // get the last node from the path
    
        if (node === endNode) {
          // path found
          return path;
        }
    
        for(let neighbor of graph[node]) {
          if (!visited[neighbor]) {
            visited[neighbor] = true; // mark node as visited
            let newPath = [...path]; // create a new path
            newPath.push(neighbor); // push the neighbor to the path
            queue.push(newPath); // insert the new path to the queue
          }
        }
      }
    
      // no path found
      return [];
    }
    

  } catch (e) {
    console.error(e.message);
    return res.status(500).send("An error occurred while processing your request.");
  }
});


// in progress
app.post("/api/v1/refund/:ticketId", async function (req, res) {
  try {
    const user = await getUser(req);
    const { ticketId } = req.params;

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
    if (ticket.userid !== user.userid) {
      return res.status(403).send("Access denied");
    }

    // Check if the ticket is a future dated ticket
    const now = new Date();
    const ticketDate = new Date(ticket.tripdate);
    if (ticketDate.getTime() <= now.getTime()) {
      return res.status(400).send("Cannot refund past dated tickets");
    }

    // Delete related future rides before refunding the ticket
    await db.from("se_project.rides").where("ticketid", ticketId).andWhere("tripdate", ">", now).del();

    const subscription = await db.select("*").from("se_project.subscription").where("id", ticket.subid).first();

    let refundAmount;

    // If subscription exists, the ticket was paid by subscription
    if (subscription) {
      refundAmount = 0; // Or calculate based on your subscription rules
    } else {
      // Ticket was paid online, refund full amount
      const transaction = await db.select("amount").from("se_project.transactions").where("purchasediid", `Ticket ID: ${ticketId}`).first();
      refundAmount = transaction ? transaction.amount : 0;
    }

    // Add the refund request with a status of 'pending'
    await db("se_project.refund_requests")
      .insert({
        status: 'pending',
        userid: user.userid,
        refundamount: refundAmount,
        ticketid: ticketId,
      });


    return res.status(200).send("Refund request submitted successfully");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not process ticket refund");
  }
});

//working
app.put("/api/v1/ride/simulate", async function (req, res) {

  try {
    const { origin, destination, tripDate } = req.body;
    const status = "completed";

    // Check if ride exists
    const rideExists = await db("se_project.rides")
      .where({
        "origin": origin,
        "destination": destination,
        "tripdate": tripDate,
        "status": "upcoming" // Check if ride is upcoming
      })
      .first();

    if(!rideExists){
      return res.status(404).send("The ride does not exist or is not upcoming.");
    }

    const rideUpdate = await db("se_project.rides")
      .where({
        "origin": origin,
        "destination": destination,
        "tripdate": tripDate,
        "status": "upcoming" // Update only upcoming rides
      })
      .update({
        status: "completed",
      });

    return res.status(200).send("Ride completed successfuly");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not process the ride");
  }
});

//WORKNG

app.post("/api/v1/senior/request", async function (req, res) {
  try {
    const user = await getUser(req);
    const nationalId = req.body.nationalId;
    const seniorRequest = await db
      .insert({
        status: "pending",
        userid: user.userid,
        nationalid: nationalId 
      })
      .into("se_project.senior_requests")
      .returning("*")
      .then((rows) => rows[0]);

    res.status(201).send(seniorRequest);
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while creating the senior request.");
  }
});

app.post("/api/v1/station", async function (req, res) {
  try {
    const user = await getUser(req);
    if (!user.isAdmin) {
      return res.status(403).send("Only admins can create stations");
    }
    
    const { stationName, stationType, stationPosition, stationStatus } = req.body;
    
    if (!stationName) {
      return res.status(400).send("All fields are required");
    }

    // Create the station in the database
    const station = {
      stationname: stationName,
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "new"
    };

    // Save the station in the database
    await db("se_project.stations").insert(station);

    return res.status(201).json(station);
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not create station");
  }
});


app.put("/api/v1/station/:stationId", async function (req, res) {
  try {
    // Extract the stationId and stationName from the request parameters and body
    const { stationId } = req.params;
    const { stationName } = req.body;

    // Check if stationName is provided
    if (!stationName) {
      return res.status(400).json({ error: "Station name is required" });
    }

    // Update the station in the database
    await db("se_project.stations")
      .where({ id: stationId })
      .update({ stationname: stationName });

    return res.status(200).json({ message: "Station updated successfully" });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});



app.delete("/api/v1/station/:stationId", async function (req, res) {
  try {
    const { stationId } = req.params;
    const parsedStationId = parseInt(stationId, 10);

    if (isNaN(parsedStationId)) {
      return res.status(400).send("Invalid stationId");
    }

    const station = await db
      .select("*")
      .from("se_project.stations")
      .where("id", parsedStationId)
      .first();

    if (!station) {
      return res.status(404).send("Station not found");
    }

    const routes = await db
      .select("*")
      .from("se_project.routes")
      .where("fromstationid", parsedStationId)
      .orWhere("tostationid", parsedStationId);
      
    for(let route of routes) {
      const newRoute = {
        routename: "new",
        fromstationid: route.fromstationid === parsedStationId ? null : route.fromstationid,
        tostationid: route.tostationid === parsedStationId ? null : route.tostationid
      };

      await db("se_project.routes").insert(newRoute);
      const routeId = await db("se_project.routes").max('id');
      
      const stationroutess = await db
        .select("*")
        .from("se_project.stationroutess")
        .where("routeId", route.id);

      for(let sr of stationroutess) {
        await db("se_project.stationroutess").insert({
          stationid: sr.stationId,
          routeid: routeId
        });
      }

      await db("se_project.routes").where("id", route.id).delete();
    }

    await db("se_project.stations").where("id", parsedStationId).delete();

    return res.status(200).send("Station deleted successfully");
  } catch (e) {
    console.log(e.message);
    return res.status(500).send("Could not delete station");
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

// // Rest of your routes
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

//     // Fetch the route to be deleted
//     const route = await db("se_project.routes")
//       .where({ id: parsedRouteId })
//       .first();

//     // Check if the route exists
//     if (!route) {
//       return res.status(404).send("Route not found.");
//     }

//     const { fromstationid, tostationid } = route;

//     // Delete the route from the database
//     const deletedRoute = await db("se_project.routes")
//       .where({ id: parsedRouteId })
//       .del();

//     // Check if the route was successfully deleted
//     if (deletedRoute === 0) {
//       return res.status(404).send("Route not found.");
//     }

//     // Update the unconnected stations' status and position
//     const fromstationroutess = await db("se_project.routes")
//       .where({ fromstationid })
//       .select("id");

//     const tostationroutess = await db("se_project.routes")
//       .where({ tostationid })
//       .select("id");

//     if (isEmpty(fromstationroutess)) {
//       // No routes from the fromstationid, update its status and position
//       await db("se_project.stations")
//         .where({ id: fromstationid })
//         .update({ stationstatus: "unconnected", stationposition: "end" });
//     }

//     if (isEmpty(tostationroutess)) {
//       // No routes to the tostationid, update its status and position
//       await db("se_project.stations")
//         .where({ id: tostationid })
//         .update({ stationstatus: "unconnected", stationposition: "start" });
//     }

//     return res.status(200).json({ message: "Route deleted successfully." });
//   } catch (e) {
//     console.log(e.message);
//     return res.status(400).send("Internal Server Error");
//   }
// };

// app.delete("/api/v1/route/:routeId", deleteRoute);


// app.post("/manage/routes", createRoute);


//working

app.put("/api/v1/requests/refunds/:requestId", async function (req, res) {
  try {
    const user = await getUser(req);
    if (!user.isAdmin) {
      return res.status(403).send("Only admins can accept or reject refund requests");
    }
    
    const { requestId } = req.params;
    const { refundStatus } = req.body;

    // Validate input
    if (!requestId || !refundStatus) {
      return res.status(400).send("Missing required fields");
    }

    // Check if the request exists
    const refundRequest = await db('se_project.refund_requests')
      .where({
        id: requestId,
      })
      .first();

    // If not found, return an error
    if (!refundRequest) {
      return res.status(404).send("Refund request not found");
    }

    // Validate the status field
    if (!["accepted", "rejected"].includes(refundStatus.toLowerCase())) {
      return res.status(400).send("Invalid status");
    }

    // Update the request status
    await db('se_project.refund_requests')
      .where({
        id: requestId,
      })
      .update({
        status: refundStatus,
      });

    return res.status(200).send("Refund request updated successfully");
  } catch (e) {
    console.log(e.message);
    return res.status(500).send("Error processing request");
  }
});
//working
app.put("/api/v1/requests/senior/:requestId", async function (req, res) {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    
    const user = await getUser(req);
    if (!user.isAdmin) {
      return res.status(403).send("Unauthorized");
    }

    const validStatuses = ["accepted", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).send("Invalid status value");
    }

    const parsedRequestId = parseInt(requestId, 10);
    if (isNaN(parsedRequestId)) {
      return res.status(400).send("Invalid requestId");
    }

    const seniorRequest = await db
      .select("*")
      .from("se_project.senior_requests")
      .where("id", parsedRequestId)
      .first();

    if (!seniorRequest) {
      return res.status(404).send("Senior request not found");
    }

    const updatedSeniorRequest = await db
      .update({ status })
      .from("se_project.senior_requests")
      .where("id", parsedRequestId)
      .returning("*")
      .then((rows) => rows[0]);

    return res.status(200).json(updatedSeniorRequest);
  } catch (e) {
    console.log(e.message);
    return res.status(500).send("Could not update senior request");
  }
});

//working

const updateZonePrice = async function (req, res) {
  try {
    const user = await getUser(req);

    // Check if the user is an admin
    if (!user.isAdmin) {
      return res.status(403).json({ error: "Only admin can update zone prices." });
    }

    const { price } = req.body;
    const { zoneId } = req.params;

    // Check if the required fields are provided
    if (!price || !zoneId) {
      return res
        .status(400)
        .json({ error: "Invalid request. Missing required fields." });
    }

    // Perform any additional validations if needed

    // Update the zone price in the database
    const update = await db("se_project.zones")
      .where({ id: zoneId })
      .update({ price: price });

    if (update === 0) {
      return res.status(404).json({ error: "Zone not found." });
    }

    return res.status(200).json({ message: "Zone price updated successfully." });
  } catch (e) {
    console.log(e.message);
    return res.status(400).json({ error: "Internal Server Error" });
  }
};

app.put("/api/v1/zones/:zoneId", updateZonePrice);




app.delete("/api/v1/station/:stationId", async function (req, res) {
  try {
    const { stationId } = req.params;
    const parsedStationId = parseInt(stationId, 10);

    if (isNaN(parsedStationId)) {
      return res.status(400).send("Invalid stationId");
    }

    const station = await db
      .select("*")
      .from("se_project.stations")
      .where("id", parsedStationId)
      .first();

    if (!station) {
      return res.status(404).send("Station not found");
    }

    const routes = await db
      .select("*")
      .from("se_project.routes")
      .where("fromstationid", parsedStationId)
      .orWhere("tostationid", parsedStationId);
      
    for(let route of routes) {
      let newFromStationId = route.fromstationid;
      let newToStationId = route.tostationid;
      
      if(route.fromstationid === parsedStationId || route.tostationid === parsedStationId) {
        const stationroutess = await db
          .select("*")
          .from("se_project.stationroutess")
          .where("routeid", route.id)
          .orderBy('id');  
          
        for(let i = 0; i < stationroutess.length; i++) {
          if(stationroutess[i].stationid === parsedStationId) {
            if(i < stationroutess.length - 1) {  // there is a next station
              if(route.fromstationid === parsedStationId) {
                newFromStationId = stationroutess[i+1].stationid;
              } else {  // route.tostationid === parsedStationId
                newToStationId = stationroutess[i+1].stationid;
              }
            }
            break;
          }
        }
      }

      await db("se_project.routes")
        .where("id", route.id)
        .update({
          fromstationid: newFromStationId,
          tostationid: newToStationId
        });
    }

    await db("se_project.stations").where("id", parsedStationId).delete();

    return res.status(200).send("Station deleted successfully");
  } catch (e) {
    console.log(e.message);
    return res.status(500).send("Could not delete station");
  }
});


};