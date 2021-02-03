/**
 * MODIFICATION INFO
 *
 * - getModOf(id),
 * - getModifiedBy(id),
 *
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

/**
  This title Manic Miner Hard (30440) is a modification of
  Manic Miner (3012)

  Manic Miner ZX81 (0032032)

  Ku Ku (9889) - mod of Sabre + project future (multuple)
  MINER WILLY'S NIGHTMARE (30676) - mod of + inspired by

SELECT
    r.original_id AS id,
    e.title AS this_title,
    rt.text AS is_mod,
    o.title AS title,
    pub.name AS publisher,
    pc1.text AS country,
    lt.text AS labeltype,
    m.text AS machinetype
FROM
    relations r
INNER JOIN entries e ON
    e.id = r.entry_id
INNER JOIN entries o ON
    o.id = r.original_id
LEFT JOIN publishers p ON
    p.entry_id = o.id AND p.release_seq = 0
LEFT JOIN labels pub ON
    p.label_id = pub.id
LEFT JOIN countries pc1 ON
    pub.country_id = pc1.id
LEFT JOIN labeltypes lt ON
    lt.id = pub.labeltype_id
INNER JOIN relationtypes rt ON
    rt.id = r.relationtype_id AND rt.id IN("m", "i")
INNER JOIN machinetypes m ON
    m.id = o.machinetype_id
WHERE
    r.entry_id = 9889
ORDER BY
    o.title,
    pub.name


+------+------------+----------+----------------+------------------------+-----------------+
|  id  | this_title |  is_mod  |     title      |       publisher        |      text       |
+------+------------+----------+----------------+------------------------+-----------------+
| 3899 | Ku-Ku      | Mod from | Project Future | Micromania             | ZX-Spectrum 48K |
| 9408 | Ku-Ku      | Mod from | Sabre Wulf     | Ultimate Play The Game | ZX-Spectrum 48K |
+------+------------+----------+----------------+------------------------+-----------------+


*/
var getModOf = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    'SELECT r.original_id AS id, e.title AS this_title, rt.text AS is_mod, o.title AS title, pub.name AS publisher, pc1.text AS country, lt.text AS labeltype, m.text AS machinetype FROM relations r INNER JOIN entries e ON e.id = r.entry_id INNER JOIN entries o ON o.id = r.original_id LEFT JOIN publishers p ON p.entry_id = o.id AND p.release_seq = 0 LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id INNER JOIN relationtypes rt ON rt.id = r.relationtype_id AND rt.id IN("m", "i") INNER JOIN machinetypes m ON m.id = o.machinetype_id WHERE r.entry_id = ? ORDER BY o.title, pub.name',
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var preId = -1;
      var item = null;

      for (var i = 0; i < results.length; i++) {
        var entryId = results[i].id;

        if (preId !== entryId) {
          if (item) {
            arr.push(item);
          }
          item = {
            entry_id: results[i].id,
            title: results[i].title,
            publishers: [],
            machineType: results[i].machinetype,
            type: results[i].is_mod,
            isMod: results[i].is_mod === "Mod from" ? 1 : 0,
          };
        }
        item.publishers.push({ name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype });
        preId = entryId;
      }
      if (item) {
        arr.push(item);
      }
      deferred.resolve({ modificationOf: arr });
    }
  );
  return deferred.promise;
};

/**
  This title Manic Miner (3012) are modified by these titles:

SELECT
    r.entry_id AS id,
    e.title AS title,
    rt.text AS is_mod,
    pub.name AS publisher,
    pc1.text AS country,
    lt.text AS labeltype,
    m.text AS machinetype
FROM
    relations r
INNER JOIN entries e ON
    e.id = r.entry_id
LEFT JOIN publishers p ON
    p.entry_id = e.id AND p.release_seq = 0
LEFT JOIN labels pub ON
    p.label_id = pub.id
LEFT JOIN countries pc1 ON
    pub.country_id = pc1.id
LEFT JOIN labeltypes lt ON
    lt.id = pub.labeltype_id
INNER JOIN relationtypes rt ON
    rt.id = r.relationtype_id AND rt.id IN("m", "i")
INNER JOIN machinetypes m ON
    m.id = e.machinetype_id
WHERE
    r.original_id = 3012
ORDER BY
    e.title,
    pub.name
	
+-------+-------------------------+-------------+----------------------+------------------------+
|  id   |          title          |   is_mod    |      publisher       |      machinetype       |
+-------+-------------------------+-------------+----------------------+------------------------+
| 14491 | Winer Milly             | Inspired by | Magnum Computing     | ZX-Spectrum 48K        |
| 17539 | Manic Miner ZX81        | Inspired by | Ales Martinik        | ZX-Spectrum 128K       |
| 32113 | Pac Manic Miner Man     | Inspired by | NULL                 | ZX-Spectrum 128 +2A/+3 |
| 34299 | Thoroughly Modern Willy | Inspired by | NULL                 | ZX-Spectrum 48K        |
| 34687 | Manic Pietro            | Inspired by | Cristian M. Gonzalez | ZX-Spectrum 128K       |
|  3014 | Manic Miner 2           | Mod from    | Schultze             | ZX-Spectrum 48K        |
|  ...  |           ...           | ...         | ...                  | ...                    |
+-------+-------------------------+-------------+----------------------+------------------------+

*/
var getModifiedBy = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    'SELECT r.entry_id AS id, e.title AS title, rt.text AS is_mod, pub.name AS publisher, pc1.text AS country, lt.text AS labeltype, m.text AS machinetype FROM relations r INNER JOIN entries e ON e.id = r.entry_id LEFT JOIN publishers p ON p.entry_id = e.id AND p.release_seq = 0 LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id INNER JOIN relationtypes rt ON rt.id = r.relationtype_id AND rt.id IN("m", "i") INNER JOIN machinetypes m ON m.id = e.machinetype_id WHERE r.original_id = ? ORDER BY e.title, pub.name',
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
          item = {
            entry_id: results[i].id,
            title: results[i].title,
            publishers: [],
            machineType: results[i].machinetype,
            type: results[i].is_mod,
            isMod: results[i].is_mod === "Mod from" ? 1 : 0,
          };
        }
        item.publishers.push({ name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype });
        preId = entryId;
      }
      if (item) {
        arr.push(item);
      }
      deferred.resolve({ modifiedBy: arr });
    }
  );
  return deferred.promise;
};

module.exports = {
  getModOf: getModOf,
  getModifiedBy: getModifiedBy,
};
