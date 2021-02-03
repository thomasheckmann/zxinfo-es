/**
 * BASIC INFO
 *
 * - getBasicInfo(id),
 * - getAwards(id),
 * - getNotes(id),
 * - getControls(id),
 *
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

const perf = require("execution-time")();

/**
 * Get basic info

--
SELECT
    e.title AS fulltitle,
    aka.title AS alsoknownas,
    r.release_year AS yearofrelease,
    r.release_month AS monthofrelease,
    r.release_day AS dayofrelease,
    machinet.text AS machinetype,
    e.max_players AS numberofplayers,
    (SELECT GROUP_CONCAT(g.name) FROM members turn INNER JOIN groups g ON turn.group_id = g.id and g.grouptype_id = "N" WHERE turn.entry_id = e.id) AS multiplayermode,
    (SELECT GROUP_CONCAT(g.name) FROM members turn INNER JOIN groups g ON turn.group_id = g.id and g.grouptype_id = "Y" WHERE turn.entry_id = e.id) AS multiplayertype,
    e.genretype_id AS genretype,
    entryt.text AS type,
    e.book_isbn AS isbn,
    idm.text AS messagelanguage,
    pubt.text AS originalpublication,
    r.release_price AS originalprice,
    availt.text AS availability,
    sc.score AS score,
    sc.votes AS votes
FROM
    entries e
LEFT JOIN releases r ON
    r.entry_id = e.id
LEFT JOIN aliases aka ON
    aka.entry_id = r.entry_id AND aka.release_seq = r.release_seq
LEFT JOIN availabletypes availt ON
    e.availabletype_id = availt.id
LEFT JOIN machinetypes machinet ON
    e.machinetype_id = machinet.id
LEFT JOIN genretypes entryt ON
    e.genretype_id = entryt.id
LEFT JOIN publicationtypes pubt ON
    e.publicationtype_id = pubt.id
LEFT JOIN languages idm ON
    e.language_id = idm.id
LEFT JOIN scores sc ON
    sc.entry_id = e.id
WHERE
    e.id = 722 AND(
        r.release_seq = 0 OR r.release_seq IS NULL
    )

-- full release info

SELECT * FROM `releases` WHERE release_year is not null and release_month is not null and release_day is not null
30438

+-----------+----------------------------+---------------+-----------------+-----------------+-----------------+-----------------+---------------------+------+-----------------+---------------------+---------------+--------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+--------+--------+-----------+-----------+-----------+-----------+-----------+-------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+----------+--+----------------------------------------------+--------+--+--+-------------------------------+-----------+-----------+-----------+-----------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------+------+----+
| fulltitle | alsoknownas                | yearofrelease | machinetype     | numberofplayers | multiplayermode | multiplayertype | type                | isbn | messagelanguage | originalpublication | originalprice | availability | known_errors                                                                                                                                                                                                                                                                                                                                     | remarks        | score     | votes      |            |        |        |           |           |           |           |           |                                                                                                 |                |           |            |            |          |  |                                              |        |  |  |                               |           |           |           |           |           |                                                                                                                                                                                                                                                                      |      |      |    |
+-----------+----------------------------+---------------+-----------------+-----------------+-----------------+-----------------+---------------------+------+-----------------+---------------------+---------------+--------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+--------+--------+-----------+-----------+-----------+-----------+-----------+-------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+----------+--+----------------------------------------------+--------+--+--+-------------------------------+-----------+-----------+-----------+-----------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------+------+----+
| Rambo     | Rambo: First Blood Part II | 1985          | ZX-Spectrum 48K | 2               | Alternating     | NULL            | Arcade: Shoot-em-up | NULL | English         | NULL                | �7.95         | Available    | Bugfixes provided by g00db0y:#<UL><LI> The game crashes when you shot down the Russian gunship at the end. This problem was caused by executing instruction LDIR (setting BC to zero), then instruction LDI twice (setting BC to $FFFE), then another instruction LDIR after setting only C register instead of BC, as follows:#<PRE>$A29C LDIR^ |   LD (IY+0),8^ |   POP HL^ |   LD E,LX^ |   LD D,HX^ |   LDI^ |   LDI^ |   INC HL^ |   INC DE^ |   INC HL^ |   INC DE^ |   LD C,6^ |   LDIR</PRE>The following patch fixes the problem in the same number of bytes:#<PRE>$A29C LDIR^ |   LD (IY+0),8^ |   POP HL^ |   LD E,LX^ |   LD D,HX^ |   LD C,2 |  |   ; Fixed using POKE 41639,14: POKE 41640,2^ |   LDIR |  |  | ; Fixed using POKE 41642,176^ |   INC HL^ |   INC DE^ |   INC HL^ |   INC DE^ |   LD C,6^ |   LDIR</PRE><LI> The original release was incompatible with +2A/+3 (the Hit Squad re-release works fine).#Fixed using POKE 26393,59</UL>#Modified "BUGFIX" files provided by g00db0y (edited TAP image) and jp (SpeedLock 1 loader patch for the original TZX image) | NULL | 6.80 | 72 |
+-----------+----------------------------+---------------+-----------------+-----------------+-----------------+-----------------+---------------------+------+-----------------+---------------------+---------------+--------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+--------+--------+-----------+-----------+-----------+-----------+-----------+-------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+----------+--+----------------------------------------------+--------+--+--+-------------------------------+-----------+-----------+-----------+-----------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------+------+----+

 */
var getBasicInfo = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    'SELECT e.title AS fulltitle, aka.title AS alsoknownas, r.release_year AS yearofrelease, r.release_month AS monthofrelease, r.release_day AS dayofrelease, machinet.text AS machinetype, e.max_players AS numberofplayers, (SELECT GROUP_CONCAT(g.name) FROM members turn INNER JOIN groups g ON turn.group_id = g.id and g.grouptype_id = "N" WHERE turn.entry_id = e.id) AS multiplayermode, (SELECT GROUP_CONCAT(g.name) FROM members turn INNER JOIN groups g ON turn.group_id = g.id and g.grouptype_id = "Y" WHERE turn.entry_id = e.id) AS multiplayertype, e.genretype_id AS genretype, entryt.text AS type, e.book_isbn AS isbn, idm.text AS messagelanguage, pubt.text AS originalpublication, r.release_price AS originalprice, availt.text AS availability, sc.score AS score, sc.votes AS votes, v.version FROM entries e LEFT JOIN zxinfo_version v ON 1=1 LEFT JOIN releases r ON r.entry_id = e.id LEFT JOIN aliases aka ON aka.entry_id = r.entry_id AND aka.release_seq = r.release_seq LEFT JOIN availabletypes availt ON e.availabletype_id = availt.id LEFT JOIN machinetypes machinet ON e.machinetype_id = machinet.id LEFT JOIN genretypes entryt ON e.genretype_id = entryt.id LEFT JOIN publicationtypes pubt ON e.publicationtype_id = pubt.id LEFT JOIN languages idm ON e.language_id = idm.id LEFT JOIN scores sc ON sc.entry_id = e.id WHERE e.id = ? AND(r.release_seq = 0 OR r.release_seq IS NULL );',
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var originalprice = null;
      var orgPrice = utils.priceHelper(results[0].originalprice, id);
      if (orgPrice != undefined) {
        originalprice = orgPrice;
      }

      var entrytypes, type, subtype;
      if (results[0].type == undefined) {
        //console.error("ERROR: ", id + ": MISSING type");
      } else {
        entrytypes = results[0].type.split(": ");
        type = entrytypes[0];
        subtype = entrytypes[1];
      }

      // filter original publication: add 'normal' #19
      var entry_content_type = utils.contenttype(results[0].genretype);
      var originalpublication = results[0].originalpublication;

      // If entry is software and NOT a compilation, default should be "Standard" (will be available in filter)
      if (entry_content_type == "SOFTWARE" && type !== "Compilation") {
        originalpublication = originalpublication == null ? "Standard" : originalpublication;
      }

      var doc = {
        contentType: entry_content_type,
        zxinfoVersion: results[0].version,
        title: results[0].fulltitle,

        originalYearOfRelease: results[0].yearofrelease,
        originalMonthOfRelease: results[0].monthofrelease,
        originalDayOfRelease: results[0].dayofrelease,

        machineType: results[0].machinetype,
        numberOfPlayers: results[0].numberofplayers,
        multiplayerMode: results[0].multiplayermode,
        multiplayerType: results[0].multiplayertype,

        genre: results[0].type,

        genreType: type,
        genreSubType: subtype,

        isbn: results[0].isbn,
        language: results[0].messagelanguage,

        originalPublication: originalpublication,
        originalPrice: originalprice,

        availability: results[0].availability,
        score: {
          score: results[0].score,
          votes: results[0].votes,
        },
      };
      deferred.resolve(utils.removeEmpty(doc));
    }
  );
  return deferred.promise;
};

/*
	Get Awards

	SELECT * FROM notes WHERE notetype_id = 'A' AND entry_id = 996 ORDER BY id
	
	Array of:
	section: "Awards",
	text: "2nd Best Music - 1986 Crash Readers Awards."

*/

var getAwards = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query("SELECT * FROM notes WHERE notetype_id = 'A' AND entry_id = ? ORDER BY id", [id], function (
    error,
    results,
    fields
  ) {
    if (error) {
      throw error;
    }
    var awards = [];
    for (var i = 0; i < results.length; i++) {
      awards.push({ section: results[i].section, text: results[i].text });
    }

    var doc = { awards: awards };
    deferred.resolve(utils.removeEmpty(doc));
  });
  return deferred.promise;
};

/*
	https://spectrumcomputing.co.uk/forums/viewtopic.php?p=44437#p44437


	1000014 - AMX Mouse (2 x Comments (spot_comments) + Hardware_Blurp)
	903 - Chase H. Q. (2 x Comments + Bug fixes)

*/

var getNotes = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT e.id, e.title, GROUP_CONCAT( c.text ORDER BY c.text SEPARATOR '\n\n' ) AS comments, h.text AS hardware_blurb, r.text AS known_errors FROM entries e LEFT JOIN notes c ON e.id = c.entry_id AND c.notetype_id = 'R' LEFT JOIN notes h ON e.id = h.entry_id AND h.notetype_id = 'S' AND h.section = 'Hardware Blurb' LEFT JOIN notes r ON e.id = r.entry_id AND r.notetype_id = 'E' WHERE e.id = ?",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      var remarks = null;
      var blurb = null;
      var errors = null;
      for (; i < results.length; i++) {
        remarks = results[i].comments;
        blurb = results[i].hardware_blurb;
        errors = results[i].known_errors;
      }
      var doc = {
        remarks: remarks,
        hardwareBlurb: blurb,
        knownErrors: errors,
        // --
      };
      deferred.resolve(utils.removeEmpty(doc));
    }
  );
  return deferred.promise;
};

/**
 * Get controls

--
SELECT
    g.name,
    groupt.id,
    groupt.text
FROM
    members feat
INNER JOIN groups g ON
    feat.group_id = g.id
INNER JOIN grouptypes groupt ON
    g.grouptype_id = groupt.id AND groupt.id = 'J'
WHERE
    feat.entry_id = 2259
ORDER BY
	g.name

+---------------------+
| name                |
+---------------------+
| Cursor              |
| Interface 2 (left)  |
| Interface 2 (right) |
| Kempston            |
| Redefineable keys   |
+---------------------+

 */
var getControls = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT g.name, groupt.id, groupt.text FROM members feat INNER JOIN groups g ON feat.group_id = g.id INNER JOIN grouptypes groupt ON g.grouptype_id = groupt.id AND groupt.id = 'J' WHERE feat.entry_id = ? ORDER BY g.name",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        var control = { control: results[i].name };
        arr.push(control);
      }
      deferred.resolve({ controls: arr });
    }
  );
  return deferred.promise;
};

module.exports = {
  getBasicInfo: getBasicInfo,
  getAwards: getAwards,
  getNotes: getNotes,
  getControls: getControls,
};
