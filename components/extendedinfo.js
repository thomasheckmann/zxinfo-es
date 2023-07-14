/**
 * EXTENDED INFO
 *
 * - getSeries(id),
 * - getFeatures(id, "F", "features"),
 * - getFeatures(id, "C", "competition"),
 * - getFeatures(id, "T", "themedGroup"),
 * - getFeatures(id, "U", "unsortedGroup"),
 * - getOtherSystems(id),
 * - getInspiredByTieInLicense(id),
 *
 * Changelog:
 * 12.07.2023: members.series_seq -> members.member_seq
 *        https://spectrumcomputing.co.uk/forums/viewtopic.php?p=120357&sid=6d2b317996fd1ed72fd77cf21d3bf871#p120357
 * 
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

/**
 * Get series

-- (S)equenced - groupname (1942), (LastNinja)

-- This program belongs in the following series (with these other titles)...
SELECT DISTINCT
    prog.id AS id,
    prog.title AS title,
    prog.id AS entry_id,
    pub.NAME AS publisher,
    machinet.text AS machinetype,
    g.name AS groupname,
    groupt.id AS grouptype
FROM
    entries e
INNER JOIN members memb ON
    memb.entry_id = e.id
INNER JOIN groups g ON
    memb.group_id = g.id
INNER JOIN grouptypes groupt ON
    g.grouptype_id = groupt.id AND groupt.id = "S"
INNER JOIN members others ON
    others.group_id = g.id
INNER JOIN entries prog ON
    others.entry_id = prog.id
LEFT JOIN machinetypes machinet ON
    prog.machinetype_id = machinet.id
LEFT JOIN publishers p ON
    p.entry_id = prog.id
LEFT JOIN labels pub ON
    p.label_id = pub.id
WHERE
    e.id = 3012 AND(
        (
            p.label_id IS NOT NULL AND p.release_seq = 0
        ) OR(
            p.label_id IS NULL AND p.release_seq IS NULL
        )
    )
ORDER BY
    g.name,
    others.member_seq ASC


+------+------------------+----------+-----------------------+-----------------+-------------+-----------+
|  id  |      title       | entry_id |       publisher       |   machinetype   |  groupname  | grouptype |
+------+------------------+----------+-----------------------+-----------------+-------------+-----------+
| 3012 | Manic Miner      |     3012 | Bug-Byte Software Ltd | ZX-Spectrum 48K | Miner Willy | S         |
| 2589 | Jet Set Willy    |     2589 | Software Projects Ltd | ZX-Spectrum 48K | Miner Willy | S         |
| 2595 | Jet Set Willy II |     2595 | Software Projects Ltd | ZX-Spectrum 48K | Miner Willy | S         |
+------+------------------+----------+-----------------------+-----------------+-------------+-----------+

 */
var getSeries = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    'SELECT DISTINCT prog.id AS id, prog.title AS title, prog.id AS entry_id, pub.NAME AS publisher, pc1.text AS country, lt.text AS labeltype, machinet.text AS machinetype, g.name AS groupname, groupt.id AS grouptype FROM entries e INNER JOIN members memb ON memb.entry_id = e.id INNER JOIN tags g ON memb.tag_id = g.id INNER JOIN tagtypes groupt ON g.tagtype_id = groupt.id AND groupt.id = "S" INNER JOIN members others ON others.tag_id = g.id INNER JOIN entries prog ON others.entry_id = prog.id LEFT JOIN machinetypes machinet ON prog.machinetype_id = machinet.id LEFT JOIN publishers p ON p.entry_id = prog.id LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id WHERE e.id = ? AND( ( p.label_id IS NOT NULL AND p.release_seq = 0 ) OR( p.label_id IS NULL AND p.release_seq IS NULL ) ) ORDER BY g.name, others.member_seq ASC;',
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
        var entryId = results[i].entry_id;
        if (preId !== entryId) {
          if (item) {
            arr.push(item);
          }
          item = {
            entry_id: results[i].entry_id,
            title: results[i].title,
            publishers: [],
            machineType: results[i].machinetype,
            groupName: results[i].groupname,
          };
        }
        item.publishers.push({ name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype });
        preId = entryId;
      }
      if (item) {
        arr.push(item);
      }
      deferred.resolve({ series: arr });
    }
  );
  return deferred.promise;
};

/**
 * Get features

-- (C)ompetition - Tron256(17819)
-- (F)eature - Lunar Jetman(9372)
-- (N)amed - LED Storm(9369) - Turntype changed to Group 'N'
-- (T)hemed - Valhalla(7152)
-- (U)Unnamed - Alpha-Beth(10966)

-- (M)ajor Clone - Gulpman(2175) -- DEPRECATED

-- This program contains the following features... / participated in the following competitions...
-- Competition, Feature, Major Clone, Themed Group
SELECT
    g.name,
    groupt.id,
    groupt.text
FROM
    members feat
INNER JOIN groups g ON
    feat.group_id = g.id
INNER JOIN grouptypes groupt ON
    g.grouptype_id = groupt.id AND groupt.id = ?
WHERE
    feat.entry_id = ?

+----------------------------+----+----------------------+
|            name            | id |         text         |
+----------------------------+----+----------------------+
| 2001 Minigame Competition  | C  | Competition          |
| Multi-machine Medium       | F  | Feature              |
| Currah Microspeech Support | F  | Feature              |
| Pac-Man                    | M  | Major Clone          |
| Tron                       | M  | Major Clone          |
| Crash cover demo           | N  | Non-sequenced Series |
| Ancient Mythology          | T  | Themed Group         |
| g002                       | U  | Unnamed Group        |
+----------------------------+----+----------------------+

 */
var getFeatures = function (id, grouptype_id, groupname) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "select g.name, groupt.id, groupt.text from members feat inner join tags g on feat.tag_id = g.id inner join tagtypes groupt on g.tagtype_id = groupt.id and groupt.id = ? where feat.entry_id = ?",
    [grouptype_id, id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        var item = {
          name: results[i].name,
        };
        arr.push(item);
      }
      var obj = {};
      obj[groupname] = arr;
      deferred.resolve(obj);
    }
  );
  return deferred.promise;
};

/**
 * Get Other Systems

-- This program is also available on the following platforms... 
SELECT p.link_system, 
       plat.text 
FROM   ports p 
       INNER JOIN platforms plat 
               ON p.platform_id = plat.id 
WHERE  p.entry_id = 4010 
ORDER  BY plat.id; 

+---------------------------------------------------------+--------------------+
| link_system                                             | text               |
+---------------------------------------------------------+--------------------+
| http://www.cpc-power.com/index.php?page=detail&num=1758 | Amstrad CPC        |
| http://www.lemon64.com/?game_id=2084                    | Commodore 64       |
| http://www.smstributes.co.uk/getinfo.asp?gameid=280     | Sega Master System |
+---------------------------------------------------------+--------------------+

*/
var getOtherSystems = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT p.link_system, plat.text FROM ports p INNER JOIN platforms plat ON p.platform_id = plat.id WHERE p.entry_id = ? ORDER BY plat.id",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        var item = {
          name: results[i].text,
          url: results[i].link_system,
        };
        arr.push(item);
      }
      deferred.resolve({ otherSystems: arr });
    }
  );
  return deferred.promise;
};

/**
 * Get inspired / tie-in license

 -- This program was licensed from or inspired by...
SELECT
    ll.name AS name,
    lc1.text AS country,
    lict.text AS type,
    lic.name originalname
FROM
    relatedlicenses rl
INNER JOIN licenses lic ON
    rl.license_id = lic.id
INNER JOIN licensetypes lict ON
    lic.licensetype_id = lict.id
LEFT JOIN licensors lor ON
    lor.license_id = lic.id
LEFT JOIN labels ll ON
    lor.label_id = ll.id
LEFT JOIN countries lc1 ON
    ll.country_id = lc1.id
WHERE
	rl.entry_id = 4010
ORDER BY
	ll.name

1220
+---------------------------+---------+-------+----------------------------+
| name                      | country | type  | originalname               |
+---------------------------+---------+-------+----------------------------+
| Anabasis Investments N.V. | USA     | Movie | Rambo: First Blood Part II |
| Carolco Pictures Inc      | USA     | Movie | Rambo: First Blood Part II |
+---------------------------+---------+-------+----------------------------+

 */
var getInspiredByTieInLicense = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT ll.name AS name, lc1.text AS country, lict.text AS type, lic.name originalname FROM relatedlicenses rl INNER JOIN licenses lic ON rl.license_id = lic.id INNER JOIN licensetypes lict ON lic.licensetype_id = lict.id LEFT JOIN licensors lor ON lor.license_id = lic.id LEFT JOIN labels ll ON lor.label_id = ll.id LEFT JOIN countries lc1 ON ll.country_id = lc1.id WHERE rl.entry_id = ? ORDER BY ll.name",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var doc;
      if (results.length == 0) {
        doc = undefined;
      } else {
        doc = [];
        var i = 0;
        for (; i < results.length; i++) {
          var item = {
            name: results[i].name,
            country: results[i].country,
            type: results[i].type,
            originalName: results[i].originalname,
          };
          doc.push(item);
        }
      }
      deferred.resolve({ licensed: doc });
    }
  );
  return deferred.promise;
};

module.exports = {
  getSeries: getSeries,
  getFeatures: getFeatures,
  getOtherSystems: getOtherSystems,
  getInspiredByTieInLicense: getInspiredByTieInLicense,
};
