/**
 * AUTHORING INFO
 *
 * - getAuthoredWith(id),
 * - getAuthoring(id),
 *
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

/**
 * Get authored
   -- This program was authored with the following tools...

SELECT
    tool.id,
    tool.title,
    pub.name AS publisher,
    pc1.text AS country,
    lt.text AS labeltype,
    machinet.text AS machinetype
FROM
    relations iaut
INNER JOIN entries tool ON
    iaut.original_id = tool.id
LEFT JOIN publishers p ON
    p.entry_id = tool.id
LEFT JOIN labels pub ON
    p.label_id = pub.id
LEFT JOIN countries pc1 ON
    pub.country_id = pc1.id
LEFT JOIN labeltypes lt ON
    lt.id = pub.labeltype_id
LEFT JOIN machinetypes machinet ON
    tool.machinetype_id = machinet.id
WHERE
    p.release_seq = 0 AND relationtype_id = "a" AND iaut.entry_id = 28181
ORDER BY
    tool.title,
    pub.name   

*/
var getAuthoredWith = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    'SELECT tool.id, tool.title, pub.name AS publisher, pc1.text as country, lt.text as labeltype, machinet.text AS machinetype FROM relations iaut INNER JOIN entries tool ON iaut.original_id = tool.id LEFT JOIN publishers p ON p.entry_id = tool.id LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN machinetypes machinet ON tool.machinetype_id = machinet.id WHERE p.release_seq = 0 AND relationtype_id = "a" AND iaut.entry_id = ? ORDER BY tool.title, pub.name',
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
          if (item) {
            arr.push(item);
          }
          var item = {
            entry_id: results[i].id,
            title: results[i].title,
            publishers: [],
            machineType: results[i].machinetype,
          };
        }
        item.publishers.push({ name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype });
        preId = entryId;
      }
      if (item) {
        arr.push(item);
      }
      deferred.resolve({ authoredWith: arr });
    }
  );
  return deferred.promise;
};

/**
 * Get Authoring

-- The following programs are known to have been authored with this tool...
SELECT
    prog.id AS id,
    prog.title AS title,
    pub.name AS publisher,
    pc1.text AS country,
    lt.text AS labeltype,
    machinet.text AS machinetype
FROM
    relations eaut
INNER JOIN entries prog ON
    eaut.entry_id = prog.id
LEFT JOIN publishers p ON
    p.entry_id = prog.id AND p.release_seq = 0
LEFT JOIN labels pub ON
    p.label_id = pub.id
LEFT JOIN countries pc1 ON
    pub.country_id = pc1.id
LEFT JOIN labeltypes lt ON
    lt.id = pub.labeltype_id
LEFT JOIN machinetypes machinet ON
    prog.machinetype_id = machinet.id
WHERE
    eaut.relationtype_id = "a" AND eaut.original_id = 27996
ORDER BY
    prog.title,
    pub.name

+-------+--------------+----------------------+----------------------+
|  id   |    title     |      publisher       |     machinetype      |
+-------+--------------+----------------------+----------------------+
| 30321 | Snake Escape | Einar Saukas         | ZX-Spectrum 48K/128K |
| 30347 | Pietro Bros  | Cristian M. Gonzalez | ZX-Spectrum 48K/128K |
| 30426 | Bomberman    | NULL                 | ZX-Spectrum 48K      |
| 32231 | Gandalf      | Cristian M. Gonzalez | ZX-Spectrum 128K     |
| 34687 | Manic Pietro | Cristian M. Gonzalez | ZX-Spectrum 128K     |
+-------+--------------+----------------------+----------------------+

*/
var getAuthoring = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    'SELECT prog.id AS id, prog.title AS title, pub.name AS publisher, pc1.text AS country, lt.text AS labeltype, machinet.text AS machinetype FROM relations eaut INNER JOIN entries prog ON eaut.entry_id = prog.id LEFT JOIN publishers p ON p.entry_id = prog.id AND p.release_seq = 0 LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN machinetypes machinet ON prog.machinetype_id = machinet.id WHERE eaut.relationtype_id = "a" AND eaut.original_id = ? ORDER BY prog.title, pub.name',
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
          if (item) {
            arr.push(item);
          }

          var item = {
            entry_id: results[i].id,
            title: results[i].title,
            publishers: [],
            machineType: results[i].machinetype,
          };
        }
        item.publishers.push({ name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype });
        preId = entryId;
      }
      if (item) {
        arr.push(item);
      }
      deferred.resolve({ authoring: arr });
    }
  );
  return deferred.promise;
};

module.exports = {
  getAuthoredWith: getAuthoredWith,
  getAuthoring: getAuthoring,
};
