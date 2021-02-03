/**
 * COMPILATION INFO
 *
 * - getInCompilations(id),
 * - getCompilationContent(id),
 *
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

/**
 * Get inCompilation

 -- This program appeared on the following compilations...
SELECT DISTINCT -- DISTINCT, as it can contained multiple times in a compilation with differet aliaes, eg. Elite 1601
    comp.id AS id,
    comp.title AS title,
    pub.name AS publisher,
    pc1.text as country,
    lt.text as labeltype,
    entryt.text AS type,
    machinet.text AS machinetype
FROM
    compilations icomp
INNER JOIN entries comp ON
    icomp.compilation_id = comp.id
LEFT JOIN genretypes entryt ON
    comp.genretype_id = entryt.id
LEFT JOIN publishers p ON
    p.entry_id = comp.id
LEFT JOIN labels pub ON
    p.label_id = pub.id
LEFT JOIN countries pc1 ON
    pub.country_id = pc1.id
LEFT JOIN labeltypes lt ON
	lt.id = pub.labeltype_id
LEFT JOIN machinetypes machinet ON
    comp.machinetype_id = machinet.id
WHERE
    icomp.entry_id = 2259 AND p.release_seq = 0
ORDER BY
    comp.title,
	pub.name
	
+-------+---------------------------+--------------------+-------------+--------------------+
|  id   |           title           |     publisher      |    type     |    machinetype     |
+-------+---------------------------+--------------------+-------------+--------------------+
| 11348 | Screen Heroes             | Ocean Software Ltd | Compilation | ZX-Spectrum 48K    |
| 11373 | They Sold a Million 3     | The Hit Squad      | Compilation | ZX-Spectrum 48K    |
| 11858 | Live Ammo                 | Ocean Software Ltd | Compilation | ZX-Spectrum 48K    |
| 14250 | Los 40 Principales Vol. 4 | Erbe Software S.A. | Compilation | ZX-Spectrum 128 +3 |
+-------+---------------------------+--------------------+-------------+--------------------+

 */
var getInCompilations = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT DISTINCT comp.id AS id, comp.title AS title, pub.name AS publisher, pc1.text as country, lt.text as labeltype, entryt.text AS type, machinet.text AS machinetype FROM compilations icomp INNER JOIN entries comp ON icomp.compilation_id = comp.id LEFT JOIN genretypes entryt ON comp.genretype_id = entryt.id LEFT JOIN publishers p ON p.entry_id = comp.id LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN machinetypes machinet ON comp.machinetype_id = machinet.id WHERE icomp.entry_id = ? AND p.release_seq = 0 ORDER BY comp.title, pub.name",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;

      var item = null;
      var publishers = [];
      var preId = 0;
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
            type: results[i].type,
          };
        }

        item.publishers.push({ name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype });
        preId = entryId;
      }
      if (item) {
        arr.push(item);
      }
      deferred.resolve({ inCompilations: arr });
    }
  );
  return deferred.promise;
};

/**
 * Get contents - content of compilation

-- This compilation content
SELECT
    ecomp.tape_side AS tape_side,
    ecomp.tape_seq AS tape_seq,
    ecomp.prog_seq AS prog_seq,
    ecomp.alias AS alias,
    item.id AS id,
    item.title AS title,
    ll.name AS publisher,
    lc1.text AS country,
    lt.text AS labeltype,
    evart.text AS variation,
    machinet.text AS machinetype
FROM
    compilations ecomp
LEFT JOIN entries item ON
    ecomp.entry_id = item.id
LEFT JOIN machinetypes machinet ON
    item.machinetype_id = machinet.id
INNER JOIN variationtypes evart ON
    ecomp.variationtype_id = evart.id
LEFT JOIN publishers p ON
    p.entry_id = ecomp.entry_id
LEFT JOIN labels ll ON
    p.label_id = ll.id
LEFT JOIN labeltypes lt ON
    lt.id = ll.labeltype_id
LEFT JOIN countries lc1 ON
    ll.country_id = lc1.id
WHERE
    (
        (
            p.label_id IS NOT NULL AND p.release_seq = 0
        ) OR(
            p.label_id IS NULL AND p.release_seq IS NULL
        )
    ) AND ecomp.compilation_id = 11869
ORDER BY
    tape_side,
    tape_seq,
    prog_seq

+-----------+----------+----------+------+---------------------------+----------------------+--------------+----------------------+
| tape_side | tape_seq | prog_seq |  id  |           title           |      publisher       |  variation   |      machinetype     |
+-----------+----------+----------+------+---------------------------+----------------------+--------------+----------------------+
| A         |        1 |        1 | 5713 | Wizball                   | Ocean Software Ltd   | Full version | ZX-Spectrum 48K/128K |
| A         |        1 |        2 | 2259 | Head over Heels           | Ocean Software Ltd   | Full version | ZX-Spectrum 48K/128K |
| A         |        2 |        1 | 1854 | Frankie Goes to Hollywood | Ocean Software Ltd   | Full version | ZX-Spectrum 48K      |
| A         |        2 |        2 | 2125 | The Great Escape          | Ocean Software Ltd   | Full version | ZX-Spectrum 48K      |
| B         |        1 |        1 |  255 | Arkanoid                  | Imagine Software Ltd | Full version | ZX-Spectrum 48K      |
| B         |        1 |        2 |  996 | Cobra                     | Ocean Software Ltd   | Full version | ZX-Spectrum 48K      |
| B         |        2 |        1 | 4469 | Short Circuit             | Ocean Software Ltd   | Full version | ZX-Spectrum 48K/128K |
| B         |        2 |        2 | 5822 | Yie Ar Kung-Fu            | Imagine Software Ltd | Full version | ZX-Spectrum 48K/128K |
+-----------+----------+----------+------+---------------------------+----------------------+--------------+----------------------+

*/
var getCompilationContent = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT ecomp.tape_side AS tape_side, ecomp.tape_seq AS tape_seq, ecomp.prog_seq AS prog_seq, ecomp.alias AS alias, item.id AS id, item.title AS title, ll.name AS publisher, lc1.text AS country, lt.text AS labeltype, evart.text AS variation, machinet.text AS machinetype FROM compilations ecomp LEFT JOIN entries item ON ecomp.entry_id = item.id LEFT JOIN machinetypes machinet ON item.machinetype_id = machinet.id INNER JOIN variationtypes evart ON ecomp.variationtype_id = evart.id LEFT JOIN publishers p ON p.entry_id = ecomp.entry_id LEFT JOIN labels ll ON p.label_id = ll.id LEFT JOIN labeltypes lt ON lt.id = ll.labeltype_id LEFT JOIN countries lc1 ON ll.country_id = lc1.id WHERE ( ( p.label_id IS NOT NULL AND p.release_seq = 0 ) OR( p.label_id IS NULL AND p.release_seq IS NULL ) ) AND ecomp.compilation_id = ? ORDER BY tape_side, tape_seq, prog_seq",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      var preSeq = -1;
      var item = null;

      for (; i < results.length; i++) {
        var seq = results[i].prog_seq;

        if (preSeq !== seq) {
          if (item) {
            arr.push(item);
          }
          var title = "";
          if (results[i].title && results[i].alias) {
            title = results[i].alias + " [" + results[i].title + "]";
          } else if (results[i].title && !results[i].alias) {
            title = results[i].title;
          } else if (!results[i].title && results[i].alias) {
            title = results[i].alias;
          } else {
            title = "N/A";
          }
          var item = {
            entry_id: results[i].id,
            title: title,
            publishers: [],
            machineType: results[i].machinetype,
            sequence: results[i].prog_seq,
            side: "Tape " + results[i].tape_seq + ", side " + results[i].tape_side,
            variation: results[i].variation,
          };
        }

        item.publishers.push({ name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype });
        preSeq = seq;
      }
      if (item) {
        arr.push(item);
      }

      deferred.resolve({ compilationContents: arr });
    }
  );
  return deferred.promise;
};

module.exports = {
  getInCompilations: getInCompilations,
  getCompilationContent: getCompilationContent,
};
