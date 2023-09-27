const db = require("./db");
async function uploadSR() {
  let SR = [
    { stationid: 1, routeid: 1 },
    { stationid: 1, routeid: 2 },
    { stationid: 2, routeid: 1 },
    { stationid: 2, routeid: 2 },
    { stationid: 2, routeid: 3 },
    { stationid: 2, routeid: 4 },
    { stationid: 3, routeid: 3 },
    { stationid: 3, routeid: 4 },
    { stationid: 3, routeid: 5 },
    { stationid: 3, routeid: 6 },
    { stationid: 3, routeid: 7 },

    { stationid: 3, routeid: 8},

    { stationid: 3, routeid: 12},
    { stationid: 3, routeid: 13},

    { stationid: 4, routeid: 5 },
    { stationid: 4, routeid: 6 },
    { stationid: 4, routeid: 9},
    { stationid: 4, routeid: 10 },
    { stationid: 5, routeid: 9 },
    { stationid: 5, routeid: 10 },
    { stationid: 6, routeid: 7 },
    { stationid: 6, routeid: 8 },
    { stationid: 6, routeid: 11 },
    { stationid: 6, routeid: 12 },
    { stationid: 7, routeid: 11 },
    { stationid: 7, routeid: 12 },


  { stationid: 8, routeid: 12 },
    { stationid: 8, routeid: 13 },
 { stationid: 8, routeid: 14 },
 { stationid: 8, routeid: 15 },

    { stationid: 9, routeid: 14 },
    { stationid: 9, routeid: 15 },
    { stationid: 9, routeid: 16 },
    { stationid: 9, routeid: 17 },

    { stationid: 10, routeid: 16 },
    { stationid: 10, routeid: 17 },

    { stationid: 11, routeid: 28 },
    { stationid: 11, routeid: 29 },

    { stationid: 12 , routeid: 18},
    { stationid: 12, routeid: 19 },
    { stationid: 12, routeid: 20 },
    { stationid: 12, routeid: 21},

    { stationid: 13, routeid: 20 },
    { stationid: 13, routeid: 21 },
    { stationid: 13, routeid: 22},
    { stationid: 13, routeid: 23 },

 { stationid: 14, routeid: 22 },
    { stationid: 14, routeid: 23 },
    { stationid: 14, routeid: 24},
    { stationid: 14, routeid: 25 },

     { stationid: 15, routeid: 24 },
    { stationid: 15, routeid: 25 },
    { stationid: 15, routeid: 26},
    { stationid: 15, routeid: 27 },

{ stationid: 16, routeid: 26},
    { stationid: 16, routeid: 27 },
    
  ];
  for (let i = 0; i < SR.length; i++) {
    const element = SR[i];
    await db("db_sxf5.stationroutes").insert(element).returning("*");
  }
}
async function uploadS() {
  let stations = [
    {
      stationname: "s1",
      stationtype: "normal",
      stationposition: "start",
      stationstatus: "old",
    },
    {
      stationname: "s2",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
    {
      stationname: "s3",
      stationtype: "transfer",
      stationposition: "middle",
      stationstatus: "old",
    },
    {
      stationname: "s4",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
    {
      stationname: "s5",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
    {
      stationname: "s6",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
    {
      stationname: "s7",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
   {
      stationname: "s8",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
   {
      stationname: "s9",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
   {
      stationname: "s10",
      stationtype: "normal",
      stationposition: "end",
      stationstatus: "old",
    },
   {
      stationname: "s11",
      stationtype: "normal",
      stationposition: "end",
      stationstatus: "old",
    },
   {
      stationname: "s12",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
   {
      stationname: "s13",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
  {
      stationname: "s14",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
  {
      stationname: "s15",
      stationtype: "normal",
      stationposition: "middle",
      stationstatus: "old",
    },
  {
      stationname: "s16",
      stationtype: "normal",
      stationposition: "end",
      stationstatus: "old",
    },
  ];

  for (let i = 0; i < stations.length; i++) {
    const element = stations[i];
    await db("db_sxf5.stations").insert(element).returning("*");
  }
}
async function uploadR() {
  let routes = [
    { routename: "hi12", fromstationid: 1, tostationid: 2 },
    { routename: "hi21", fromstationid: 2, tostationid: 1 },
    { routename: "hi23", fromstationid: 2, tostationid: 3 },
    { routename: "hi32", fromstationid: 3, tostationid: 2 },
    { routename: "hi34", fromstationid: 3, tostationid: 4 },
    { routename: "hi43", fromstationid: 4, tostationid: 3 },
    { routename: "hi36", fromstationid: 3, tostationid: 6 },
    { routename: "hi63", fromstationid: 6, tostationid: 3 },
    { routename: "hi45", fromstationid: 4, tostationid: 5 },
    { routename: "hi54", fromstationid: 5, tostationid: 4 },
    { routename: "hi76", fromstationid: 7, tostationid: 6 },
    { routename: "hi67", fromstationid: 6, tostationid: 7 },
{ routename: "hi38", fromstationid: 3, tostationid: 8 },
   { routename: "hi83", fromstationid: 8, tostationid: 3 },
    { routename: "hi89", fromstationid: 8, tostationid: 9 },
    { routename: "hi98", fromstationid: 9, tostationid: 8 },
    { routename: "hi910", fromstationid: 9, tostationid: 10 },
    { routename: "hi109", fromstationid: 10, tostationid: 9 },
    { routename: "hi712", fromstationid: 7, tostationid: 12 },
    { routename: "hi127", fromstationid: 12, tostationid: 7 },
    { routename: "hi1213", fromstationid: 12, tostationid: 13 },
    { routename: "hi1312", fromstationid: 13, tostationid: 12 },
    { routename: "hi1314", fromstationid: 13, tostationid: 14 },
    { routename: "hi1413", fromstationid: 14, tostationid: 13 },
{ routename: "hi1415", fromstationid: 14, tostationid: 15 },
   { routename: "hi1514", fromstationid: 15, tostationid: 14 },
    { routename: "hi1516", fromstationid: 15, tostationid: 16 },
    { routename: "hi1615", fromstationid: 16, tostationid: 15 },
  { routename: "hi511", fromstationid: 5, tostationid: 11 },
    { routename: "hi115", fromstationid: 11, tostationid: 5 },

  ];

  for (let i = 0; i < routes.length; i++) {
    const element = routes[i];
    await db("db_sxf5.routes").insert(element).returning("*");
  }
}
//uploadS(); //first to run
//uploadR();// second
//yuploadSR(); //third