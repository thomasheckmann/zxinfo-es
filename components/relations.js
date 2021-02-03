/**
 * relations:
 * 
 * 
 * node create-zxinfo-documents.js --list 11593,9055,1754,35846,7898,1000014,30373,30307,14280,1601,30321,30002,14491,3012,9889,3899,28420,9420,2915,2912
 * 
a,"Authored with"
select * from relations where relationtype_id = 'a' and entry_id = 30321 (Snake Escape)
select * from relations where relationtype_id = 'a' and original_id = 30002 (Nirvana)

e,"Editor of"
select * from relations where relationtype_id = 'e' and entry_id = 14280 (Elite Editor)
select * from relations where relationtype_id = 'e' and original_id = 1601 (Elite)

h,"Requires hardware/interface"
select * from relations where relationtype_id = 'h' and entry_id = 7898
select * from relations where relationtype_id = 'h' and original_id = 1000014

i,"Inspired by"
select * from relations where relationtype_id = 'i' and entry_id = 14491 (Winer Milly) Insp
select * from relations where relationtype_id = 'i' and original_id = 3012 (Manic Miner)

k,"Add-on pack that depends on"  
select * from relations where relationtype_id = 'k' and entry_id = 11593
select * from relations where relationtype_id = 'k' and original_id = 9055

m,"Mod from"
select * from relations where relationtype_id = 'm' and entry_id = 9889 (Ku Ku)
select * from relations where relationtype_id = 'm' and original_id = 3899

p,"Another platform for"
select * from relations where relationtype_id = 'p' and entry_id = 1754
select * from relations where relationtype_id = 'p' and original_id = 35846

r,"Runs with"
select * from relations where relationtype_id = 'r' and entry_id = 28420
select * from relations where relationtype_id = 'r' and original_id = 9420

u,"Derived from"
select * from relations where relationtype_id = 'u' and entry_id = 30373
select * from relations where relationtype_id = 'u' and original_id = 30307

w,"Came bundled with"
select * from relations where relationtype_id = 'w' and entry_id = 7898 - bundledWith
select * from relations where relationtype_id = 'w' and original_id = 1000014

*,"Same as"
select * from relations where relationtype_id = '*' and entry_id = 2915
select * from relations where relationtype_id = '*' and original_id = 2912

 * 
 * 
 * 
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

var getRelationWith = function (id, relationType, name) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    `SELECT tool.id, tool.title, pub.name AS publisher, pc1.text AS country, lt.text AS labeltype, machinet.text AS machinetype FROM relations iaut INNER JOIN entries tool ON iaut.original_id = tool.id LEFT JOIN publishers p ON p.entry_id = tool.id LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN machinetypes machinet ON tool.machinetype_id = machinet.id WHERE ( p.release_seq = 0 OR p.release_seq IS NULL ) AND relationtype_id = "${relationType}" AND iaut.entry_id = ? ORDER BY tool.title, pub.name`,
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      var preId = -1;
      var item = null;
      for (; i < results.length; i++) {
        var entryId = results[i].id;
        if (preId !== entryId) {
          if (item && !utils.isAllPropertiesNull(item)) {
            arr.push(item);
          }
          var item = {
            entry_id: results[i].id,
            title: results[i].title,
            publishers: [],
            machineType: results[i].machinetype,
          };
        }
        var publisher = { name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype };
        if (publisher && !utils.isAllPropertiesNull(publisher)) item.publishers.push(publisher);
        preId = entryId;
      }
      if (item && !utils.isAllPropertiesNull(item)) {
        arr.push(item);
      }
      var obj = {};
      obj[name] = arr;
      deferred.resolve(obj);
    }
  );
  return deferred.promise;
};

var getRelationTo = function (id, relationType, name) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    `SELECT prog.id AS id, prog.title AS title, pub.name AS publisher, pc1.text AS country, lt.text AS labeltype, machinet.text AS machinetype FROM relations eaut INNER JOIN entries prog ON eaut.entry_id = prog.id LEFT JOIN publishers p ON p.entry_id = prog.id AND( p.release_seq = 0 OR p.release_seq IS NULL ) LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN machinetypes machinet ON prog.machinetype_id = machinet.id WHERE eaut.relationtype_id = "${relationType}" AND eaut.original_id = ? ORDER BY prog.title, pub.name`,
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      var preId = -1;
      var item = null;

      for (; i < results.length; i++) {
        var entryId = results[i].id;
        if (preId !== entryId) {
          if (item && !utils.isAllPropertiesNull(item)) {
            arr.push(item);
          }

          var item = {
            entry_id: results[i].id,
            title: results[i].title,
            publishers: [],
            machineType: results[i].machinetype,
          };
        }
        var publisher = { name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype };
        if (publisher && !utils.isAllPropertiesNull(publisher)) item.publishers.push(publisher);
        preId = entryId;
      }
      if (item && !utils.isAllPropertiesNull(item)) {
        arr.push(item);
      }
      var obj = {};
      obj[name] = arr;
      deferred.resolve(obj);
    }
  );
  return deferred.promise;
};
module.exports = {
  getRelationWith: getRelationWith,
  getRelationTo: getRelationTo,
};
