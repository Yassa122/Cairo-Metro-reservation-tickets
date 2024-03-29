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
    .from("db_sxf5.sessions")
    .where("token", sessionToken)
    .innerJoin("db_sxf5.users", "db_sxf5.sessions.userid", "db_sxf5.users.id")
    .innerJoin("db_sxf5.roles", "db_sxf5.users.roleid", "db_sxf5.roles.id")
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

  app.put("/api/v1/password/reset", async function (req, res) {
    try {
      const user = await getUser(req);
      const { newpassword } = req.body;
      await db("db_sxf5.users").where("id", user.userid).update({
        password: newpassword,
      });
      return res.status(200).json("Your new password is: " + newpassword);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("error updating password");
    }
  });

  app.get("/api/v1/zones", async function (req, res) {
    try {
      const zones = await db.select("*").from("db_sxf5.zones");
      return res.status(200).json(zones);
    } catch (e) {
      console.log(e.message);
      return res.status(500).send("Error retrieving zones data");
    }
  });

  app.get("/subscriptionss", async function (req, res) {
    try {
      const user = await getUser(req);

      if (!user) {
        return res.status(401).send("Unauthorized");
      }

      const subscriptions = await db("db_sxf5.subscription").where(
        "userid",
        user.userid
      );

      if (subscriptions.length === 0) {
        return res.status(404).send("No subscriptions found for this user");
      }

      return res.status(200).json(subscriptions);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve subscriptions");
    }
  });

  //WORKING
  app.post("/api/v1/payment/subscription", async function (req, res) {
    try {
      const user = await getUser(req);
      if (!user) {
        return res.status(401).send("Unauthorized");
      }

      const { creditCardNumber, holderName, payedAmount, subType, zoneId } =
        req.body;

      if (
        !creditCardNumber ||
        !holderName ||
        !payedAmount ||
        !subType ||
        !zoneId
      ) {
        return res.status(400).send("Missing required fields");
      }

      const paymentId = v4();

      let noOfTickets;
      switch (subType) {
        case "annual":
          noOfTickets = 100;
          break;
        case "quarterly":
          noOfTickets = 50;
          break;
        case "monthly":
          noOfTickets = 10;
          break;
        default:
          return res.status(400).send("Invalid subscription type");
      }

      const subscriptionId = await db("db_sxf5.subscription")
        .insert({
          subtype: subType,
          zoneid: zoneId,
          userid: user.userid,
          nooftickets: noOfTickets,
        })
        .returning("id");

      await db("db_sxf5.transactions").insert({
        // id: paymentId,
        amount: payedAmount,
        userid: user.userid,
        purchasedid: subscriptionId[0], // Use the subscription id as the purchased id
      });

      return res.status(201).json({
        message: "Payment successful",
        paymentId,
      });
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

      const {
        creditCardNumber,
        holderName,
        payedAmount,
        origin,
        destination,
        tripDate,
      } = req.body;

      // Validate input
      if (
        !creditCardNumber ||
        !holderName ||
        !payedAmount ||
        !origin ||
        !destination ||
        !tripDate
      ) {
        return res.status(400).send("Missing required fields");
      }

      const paymentId = v4();

      const ticketId = await db("db_sxf5.tickets")
        .insert({
          origin: origin,
          destination: destination,
          userid: user.userid,
          tripdate: tripDate,
        })
        .returning("id");

      await db("db_sxf5.transactions").insert({
        amount: payedAmount,
        userid: user.userid,
        purchasedid: ticketId[0],
      });

      return res.status(201).json({
        message: "Payment successful",
        paymentId,
      });
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

      if (!subId || !origin || !destination || !tripDate) {
        return res.status(400).send("Missing required fields");
      }

      const subscription = await db("db_sxf5.subscription")
        .where({
          id: subId,
          userid: user.userid,
        })
        .first();

      // Check if subscription exists and has tickets left
      if (!subscription || subscription.nooftickets <= 0) {
        return res
          .status(400)
          .send("Invalid subscription or no tickets left in the subscription.");
      }

      await db("db_sxf5.subscription")
        .where({
          id: subId,
          userid: user.userid,
        })
        .update({
          nooftickets: db.raw("nooftickets - 1"),
        });

      const ticketId = await db("db_sxf5.tickets")
        .insert({
          origin: origin,
          destination: destination,
          userid: user.userid,
          subid: subId, // use the subscription id
          tripdate: tripDate,
        })
        .returning("id");

      // Insert into rides table
      const rideId = await db("db_sxf5.rides")
        .insert({
          status: "upcoming",
          origin: origin,
          destination: destination,
          userid: user.userid,
          ticketid: ticketId[0],
          tripdate: tripDate,
        })
        .returning("id");

      return res.status(201).json({
        message: "Ticket purchased successfully",
        ticketId: ticketId[0],
        rideId: rideId[0],
      });
    } catch (e) {
      console.log(e.message);
      return res.status(500).send("Error processing ticket purchase");
    }
  });

  app.post("/api/v1/refund/:ticketId", async function (req, res) {
    try {
      const user = await getUser(req);
      const { ticketId } = req.params;

      const ticket = await db
        .select("*")
        .from("db_sxf5.tickets")
        .where("id", ticketId)
        .first();

      if (!ticket) {
        return res.status(404).send("Ticket not found");
      }

      if (ticket.userid !== user.userid) {
        return res.status(403).send("Access denied");
      }

      const now = new Date();
      const ticketDate = new Date(ticket.tripdate);
      if (ticketDate.getTime() <= now.getTime()) {
        return res.status(400).send("Cannot refund past dated tickets");
      }

      await db
        .from("db_sxf5.rides")
        .where("ticketid", ticketId)
        .andWhere("tripdate", ">", now)
        .del();

      const subscription = await db
        .select("*")
        .from("db_sxf5.subscription")
        .where("id", ticket.subid)
        .first();

      let refundAmount;

      if (subscription) {
        refundAmount = 0;
      } else {
        const transaction = await db
          .select("amount")
          .from("db_sxf5.transactions")
          .where("", `Ticket ID: ${ticketId}`)
          .first();
        refundAmount = transaction ? transaction.amount : 0;
      }

      await db("db_sxf5.refund_requests").insert({
        status: "pending",
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

      const rideExists = await db("db_sxf5.rides")
        .where({
          origin: origin,
          destination: destination,
          tripdate: tripDate,
          status: "upcoming", // Check if ride is upcoming
        })
        .first();

      if (!rideExists) {
        return res
          .status(404)
          .send("The ride does not exist or is not upcoming.");
      }

      const rideUpdate = await db("db_sxf5.rides")
        .where({
          origin: origin,
          destination: destination,
          tripdate: tripDate,
          status: "upcoming", // Update only upcoming rides
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
          nationalid: nationalId,
        })
        .into("db_sxf5.senior_requests")
        .returning("*")
        .then((rows) => rows[0]);

      res.status(201).send(seniorRequest);
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .send("An error occurred while creating the senior request.");
    }
  });

  //working

  app.put("/api/v1/requests/refunds/:requestId", async function (req, res) {
    try {
      const user = await getUser(req);
      if (!user.isAdmin) {
        return res
          .status(403)
          .send("Only admins can accept or reject refund requests");
      }

      const { requestId } = req.params;
      const { refundStatus } = req.body;

      // Validate input
      if (!requestId || !refundStatus) {
        return res.status(400).send("Missing required fields");
      }

      // Check if the request exists
      const refundRequest = await db("db_sxf5.refund_requests")
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
      await db("db_sxf5.refund_requests")
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

  const updateZonePrice = async function (req, res) {
    try {
      const user = await getUser(req);

      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({
          error: "Only admin can update zone prices.",
        });
      }

      const { price } = req.body;
      const { zoneId } = req.params;

      if (!price || !zoneId) {
        return res.status(400).json({
          error: "Invalid request. Missing required fields.",
        });
      }

      const update = await db("db_sxf5.zones")
        .where({
          id: zoneId,
        })
        .update({
          price: price,
        });

      if (update === 0) {
        return res.status(404).json({
          error: "Zone not found.",
        });
      }

      return res.status(200).json({
        message: "Zone price updated successfully.",
      });
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({
        error: "Internal Server Error",
      });
    }
  };

  app.put("/api/v1/zones/:zoneId", updateZonePrice);

  //

  const createStation = async function (req, res) {
    try {
      const user = await getUser(req);

      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({
          error: "Only admin can create stations.",
        });
      }

      const { stationname, stationposition, stationstatus, stationtype } =
        req.body;

      if (!stationname) {
        return res.status(400).json({
          error: "Invalid request. Missing required fields.",
        });
      }

      const station = await db("db_sxf5.stations").insert({
        stationname: stationname,
        stationposition: "start",
        stationstatus: "new",
        stationtype: "normal",
      });

      return res.status(200).json({
        message: "Station created successfully.",
      });
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({
        error: "Internal Server Error",
      });
    }
  };

  app.post("/api/v1/station", createStation);

  const updateStation = async function (req, res) {
    try {
      const user = await getUser(req);

      if (!user.isAdmin) {
        return res.status(403).json({
          error: "Only admin can update stations.",
        });
      }

      const stationId = req.params.stationId;
      const parsedStationId = parseInt(stationId);

      const { stationName } = req.body;

      if (!stationName) {
        return res.status(400).json({
          error: "Invalid request. Missing required fields.",
        });
      }

      const updatedStation = await db("db_sxf5.stations")
        .where({
          id: parsedStationId,
        })
        .update({
          stationname: stationName,
        })
        .returning("*");

      if (updatedStation.length === 0) {
        return res.status(404).json({
          error: "Station not found.",
        });
      }

      return res.status(200).json(updatedStation);
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({
        error: "Internal Server Error",
      });
    }
  };

  app.put("/api/v1/station/:stationId", updateStation);

  app.get(
    "/api/v1/tickets/price/:originId/:destinationId",
    async function (req, res) {
      try {
        let { originId, destinationId } = req.params;

        originId = parseInt(originId);
        destinationId = parseInt(destinationId);

        const stations = await db.select("*").from("db_sxf5.stations");
        const routes = await db.select("*").from("db_sxf5.routes");
        const stationRoutes = await db
          .select("*")
          .from("db_sxf5.stationroutes");

        const graph = transformDataForBfs(stations, routes, stationRoutes);

        // Run BFS to find shortest path
        const path = bfs(graph, originId, destinationId);

        if (path.length === 0) {
          return res
            .status(404)
            .send("No route found between the specified stations.");
        }

        let price;
        if (path.length <= 5) {
          price = 5;
        } else if (path.length <= 6) {
          price = 7;
        } else {
          price = 10;
        }

        return res.status(200).json({
          price,
        });

        function transformDataForBfs(stations, routes, stationRoutes) {
          let graph = {};

          // Initialize the graph with station ids as keys and empty arrays as values
          for (let station of stations) {
            graph[station.id] = [];
          }

          for (let stationRoute of stationRoutes) {
            let route = routes.find(
              (route) => route.id === stationRoute.routeid
            );
            if (route) {
              let { fromstationid, tostationid } = route;
              // Check if the current station is the fromStation or the toStation in the route
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

          // Start from the starting node
          queue.push([startNode]);
          visited[startNode] = true;

          while (queue.length > 0) {
            let path = queue.shift(); // get the path out from the queue
            let node = path[path.length - 1]; // get the last node from the path

            if (node === endNode) {
              // Path found
              return path;
            }

            for (let neighbor of graph[node]) {
              if (!visited[neighbor]) {
                visited[neighbor] = true; // mark node as visited
                let newPath = [...path]; // create a new path
                newPath.push(neighbor); // push the neighbor to the path
                queue.push(newPath); // insert the new path to the queue
              }
            }
          }

          return [];
        }
      } catch (e) {
        console.error(e.message);
        return res
          .status(500)
          .send("An error occurred while processing your request.");
      }
    }
  );

  app.delete("/api/v1/station/:stationId", async function (req, res) {
    try {
      const { stationId } = req.params;
      const parsedStationId = parseInt(stationId, 10);

      if (isNaN(parsedStationId)) {
        return res.status(400).send("Invalid stationId");
      }

      const station = await db
        .select("*")
        .from("db_sxf5.stations")
        .where("id", parsedStationId)
        .first();

      if (!station) {
        return res.status(404).send("Station not found");
      }

      const routes = await db
        .select("*")
        .from("db_sxf5.routes")
        .where("fromstationid", parsedStationId)
        .orWhere("tostationid", parsedStationId);

      for (let route of routes) {
        let newFromStationId = route.fromstationid;
        let newToStationId = route.tostationid;

        if (
          route.fromstationid === parsedStationId ||
          route.tostationid === parsedStationId
        ) {
          const stationRoutes = await db
            .select("*")
            .from("db_sxf5.stationroutes")
            .where("routeid", route.id)
            .orderBy("id");

          for (let i = 0; i < stationRoutes.length; i++) {
            if (stationRoutes[i].stationid === parsedStationId) {
              if (i < stationRoutes.length - 1) {
                // there is a next station
                if (route.fromstationid === parsedStationId) {
                  newFromStationId = stationRoutes[i + 1].stationid;
                } else {
                  // route.tostationid === parsedStationId
                  newToStationId = stationRoutes[i + 1].stationid;
                }
              }
              break;
            }
          }
        }

        await db("db_sxf5.routes").where("id", route.id).update({
          fromstationid: newFromStationId,
          tostationid: newToStationId,
        });
      }

      await db("db_sxf5.stations").where("id", parsedStationId).delete();

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
        return res.status(403).json({
          error: "Only admin can create routes.",
        });
      }

      const { connectedStationId, newStationId, routename } = req.body;

      if (!connectedStationId || !newStationId || !routename) {
        return res.status(400).json({
          error: "Invalid request. Missing required fields.",
        });
      }

      const toStation = await db("db_sxf5.stations")
        .where({
          id: connectedStationId,
        })
        .first();
      const fromStation = await db("db_sxf5.stations")
        .where({
          id: newStationId,
        })
        .first();

      if (!toStation || !fromStation) {
        return res.status(400).json({
          error: "Invalid request. One or more stations do not exist.",
        });
      }

      // Create the route in the database
      const [routeId] = await db("db_sxf5.routes")
        .insert({
          fromstationid: newStationId,
          tostationid: connectedStationId,
          routename: routename,
        })
        .returning("id");

      // Associate the stations to the route
      await db("db_sxf5.stationroutes").insert([
        {
          stationid: newStationId,
          routeid: routeId,
        },
        {
          stationid: connectedStationId,
          routeid: routeId,
        },
      ]);

      return res.status(201).json({
        message: "Route created successfully.",
      });
    } catch (e) {
      console.error(e.message);
      return res.status(500).json({
        error: "Internal Server Error",
      });
    }
  });

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

      if (!routeName) {
        return res
          .status(400)
          .send("Invalid request. Missing required fields.");
      }

      const updatedRoute = await db("db_sxf5.routes")
        .where({
          id: routeid,
        })
        .update({
          routename: routeName,
        })
        .returning("*");

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

  app.delete("/api/v1/route/:routeId", async (req, res) => {
    try {
      const user = await getUser(req);
      if (user.isAdmin) {
        const routeId = req.params.routeId;
        const routeDelete = await db("db_sxf5.routes").where("id", routeId);
        console.log(routeDelete);
        if (routeDelete.length == 0) {
          return res.status(404).json({
            error: "Route not found",
          });
        }

        const { fromstationid, tostationid } = routeDelete[0];

        console.log(tostationid);
        console.log(fromstationid);
        const nextStation = await db("db_sxf5.routes")
          .where("tostationid", fromstationid)
          .first();
        if (nextStation) {
          await db("db_sxf5.stations")
            .where("id", nextStation.fromstationid)
            .update({
              stationposition: "start",
            });
        }
        console.log(nextStation);
        const prevStation = await db("db_sxf5.routes")
          .where("tostationid", tostationid)
          .first();
        if (prevStation) {
          await db("db_sxf5.stations")
            .where("id", prevStation.fromstationid)
            .update({
              stationposition: "start",
            });
        }
        console.log(prevStation);
        console.log("Route and connected stations deleted successfully");
        await db("db_sxf5.routes").where("id", routeId).del();
        return res.status(200).json({
          message: "Route and connected stations deleted successfully",
        });
      } else {
        return res.status(403).json({
          error: "Unauthorized",
        });
      }
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({
        error: "Cannot delete the route",
      });
    }
  });

  app.get("/users", async function (req, res) {
    try {
      const user = await getUser(req);
      const users = await db.select("*").from("db_sxf5.users");

      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
  });

  app.get("/manage/stationss", async function (req, res) {
    try {
      const stations = await db.select("*").from("db_sxf5.stations");

      return res.status(200).json(stations);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve stations");
    }
  });

  app.get("/manage/routess", async function (req, res) {
    try {
      const routes = await db.select("*").from("db_sxf5.routes");

      return res.status(200).json(routes);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve stations");
    }
  });

  app.get("/manage/requests/refunds", async function (req, res) {
    try {
      const routes = await db.select("*").from("db_sxf5.refund_requests");

      return res.status(200).json(routes);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve stations");
    }
  });

  app.get("/manage/requests/seniors", async function (req, res) {
    try {
      const routes = await db
        .from("db_sxf5.senior_requests")
        .where("status", "pending");

      return res.status(200).json(routes);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve stations");
    }
  });

  app.put("/api/v1/password/reset", async function (req, res) {
    try {
      const user = await getUser(req);
      const { newpassword } = req.body;
      await db("db_sxf5.users").where("id", user.userid).update({
        password: newpassword,
      });
      return res.status(200).json("Your new password is: " + newpassword);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("error updating password");
    }
  });

  app.get("/api/v1/zones", async function (req, res) {
    try {
      const zones = await db.select("*").from("db_sxf5.zones");
      return res.status(200).json(zones);
    } catch (e) {
      console.log(e.message);
      return res.status(500).send("Error retrieving zones data");
    }
  });

  app.put("/api/v1/zones/:zoneId", updateZonePrice);

  app.get("/manage/requests/refunds", async function (req, res) {
    try {
      const routes = await db.select("*").from("db_sxf5.refund_requests");

      return res.status(200).json(routes);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve stations");
    }
  });

  app.get("/manage/requests/seniors", async function (req, res) {
    try {
      const routes = await db
        .select("*")
        .from("db_sxf5.senior_requests")
        .where("status", "pending");

      return res.status(200).json(routes);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve stations");
    }
  });

  const acceptRejectSenior = async function (req, res) {
    try {
      const user = await getUser(req);

      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({
          error: "Only admin can accept or reject senior requests.",
        });
      }

      const { requestId } = req.params;
      const { seniorStatus } = req.body;

      if (!requestId || isEmpty(seniorStatus)) {
        return res.status(400).json({
          error: "Invalid request. Missing required fields.",
        });
      }

      const x = await db("db_sxf5.senior_requests")
        .where("id", requestId)
        .update({
          status: seniorStatus,
        })
        .returning("*");

      await db("db_sxf5.users").where("id", x[0].userid).update({
        roleid: 3,
      });

      return res.status(200).json({
        message: "Senior request updated successfully.",
      });
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({
        error: "Internal Server Error",
      });
    }
  };

  app.put("/api/v1/requests/senior/:requestId", acceptRejectSenior);

  const acceptRejectRefund = async function (req, res) {
    try {
      const user = await getUser(req);

      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({
          error: "Only admin can accept or reject refund requests.",
        });
      }

      const { requestId } = req.params;
      const { refundStatus } = req.body;

      if (!requestId || isEmpty(refundStatus)) {
        return res.status(400).json({
          error: "Invalid request. Missing required fields.",
        });
      }

      await db("db_sxf5.refund_requests").where("id", requestId).update({
        status: refundStatus,
      });

      return res.status(200).json({
        message: "Refund request updated successfully.",
      });
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({
        error: "Internal Server Error",
      });
    }
  };
  app.put("/api/v1/requests/refund/:requestId", acceptRejectRefund);

  // app.get("/tickets", async function (req, res) {
  //   try {
  //     const tickets = await db.select("*").from("db_sxf5.tickets");

  //     return res.status(200).json(tickets);
  //   } catch (e) {
  //     console.log(e.message);
  //     return res.status(400).send("Could not retrieve tickets");
  //   }
  // });

  app.get("/tickets", async function (req, res) {
    try {
      const user = await getUser(req);
      const tickets = await db
        .select("*")
        .from("db_sxf5.tickets")
        .where("userid", user.userid);

      return res.status(200).json(tickets);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve tickets");
    }
  });

  app.get("/ridess", async function (req, res) {
    try {
      const user = await getUser(req);
      const rides = await db
        .select("*")
        .from("db_sxf5.rides")
        .where("userid", user.userid);

      return res.status(200).json(rides);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not retrieve rides");
    }
  });
};
