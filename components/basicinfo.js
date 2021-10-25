/**
 * BASIC INFO
 *
 * - getBasicInfo(id),
 * - getAwards(id),
 * - getNotes(id),
 * - getControls(id),
 *
 * CHANGELOG:
 * 01.01.2021
 *  https://spectrumcomputing.co.uk/forums/viewtopic.php?p=69233#p69233
 *   - groups, grouptypes -> tags, tagtypes
 *   - members.group_id -> members.tag_id
 *
 *  https://spectrumcomputing.co.uk/forums/viewtopic.php?p=71429#p71429
 *   - publicationtypes table removed
 *
 *  https://spectrumcomputing.co.uk/forums/viewtopic.php?p=67399#p67399
 *   - entrries.book_isbn -> releases.book_isbn (as per release)
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

const perf = require("execution-time")();

/**
 * Get basic info
 *
 */
var getBasicInfo = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    'SELECT e.title AS fulltitle, aka.title AS alsoknownas, r.release_year AS yearofrelease, r.release_month AS monthofrelease, r.release_day AS dayofrelease, machinet.text AS machinetype, e.max_players AS numberofplayers, (SELECT GROUP_CONCAT(g.name) FROM members turn INNER JOIN tags g ON turn.tag_id = g.id and g.tagtype_id = "N" WHERE turn.entry_id = e.id) AS multiplayermode, (SELECT GROUP_CONCAT(g.name) FROM members turn INNER JOIN tags g ON turn.tag_id = g.id and g.tagtype_id = "Y" WHERE turn.entry_id = e.id) AS multiplayertype, e.genretype_id AS genretype, entryt.text AS type, r.book_isbn AS isbn, idm.text AS messagelanguage, r.release_price AS originalprice, c.name AS cur_name, c.symbol AS cur_symbol, c.prefix AS cur_prefix, availt.text AS availability, sc.score AS score, sc.votes AS votes, v.version FROM entries e LEFT JOIN zxinfo_version v ON 1=1 LEFT JOIN releases r ON r.entry_id = e.id LEFT JOIN currencies c ON r.currency_id = c.id LEFT JOIN aliases aka ON aka.entry_id = r.entry_id AND aka.release_seq = r.release_seq LEFT JOIN availabletypes availt ON e.availabletype_id = availt.id LEFT JOIN machinetypes machinet ON e.machinetype_id = machinet.id LEFT JOIN genretypes entryt ON e.genretype_id = entryt.id LEFT JOIN languages idm ON e.language_id = idm.id LEFT JOIN scores sc ON sc.entry_id = e.id WHERE e.id = ? AND(r.release_seq = 0 OR r.release_seq IS NULL );',
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var originalprice = null;
      var orgPrice = utils.priceHelper(
        results[0].originalprice,
        results[0].cur_name,
        results[0].cur_symbol,
        results[0].cur_prefix
      );
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
      var originalpublication = "N/A"; // removed, just set a default value

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
    "SELECT e.id, e.title, GROUP_CONCAT( c.text ORDER BY c.text SEPARATOR '\n\n' ) AS comments, h.text AS hardware_blurb, r.text AS known_errors FROM entries e LEFT JOIN notes c ON e.id = c.entry_id AND c.notetype_id = 'R' LEFT JOIN notes h ON e.id = h.entry_id AND h.notetype_id = 'S' LEFT JOIN notes r ON e.id = r.entry_id AND r.notetype_id = 'E' WHERE e.id = ?",
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
 *
 */
var getControls = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT g.name, groupt.id, groupt.text FROM members feat INNER JOIN tags g ON feat.tag_id = g.id INNER JOIN tagtypes groupt ON g.tagtype_id = groupt.id AND groupt.id = 'J' WHERE feat.entry_id = ? ORDER BY g.name",
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
