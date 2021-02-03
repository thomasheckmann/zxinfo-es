"use strict";

var mariadb_username = "root";
var mariadb_password = "zxdb1234";
var mariadb_dbname = "zxdb";

var mysql = require("mysql");

var pool = mysql.createPool({
  connectionLimit: 150, // current max for mariaDB
  host: "localhost",
  user: mariadb_username,
  password: mariadb_password,
  database: mariadb_dbname,
});

var usedConnection = 0;
pool.on("acquire", function (connection) {
  usedConnection++;
  //console.log("==> Connection %d acquired (%d)", connection.threadId, usedConnection);
});
pool.on("connection", function (connection) {
  //console.log('+== Connection %d is made', connection.threadId);
});
pool.on("release", function (connection) {
  usedConnection--;
  //console.log('<== Connection %d released (%d)', connection.threadId, usedConnection);
});

function getConnection() {
  return pool;
}

function closeConnection(c) {
  c.end();
}

module.exports = {
  getConnection: getConnection,
  closeConnection: closeConnection,
};
