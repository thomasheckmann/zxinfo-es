/**
 * ZXINFO
 *
 * - getScreens(id),
 * - getRelatedLinks(id),
 * - getRelatedSites(id),
 * - getYouTubeLinks(id),
 * - getAdditionalDownloads(id),
 *
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

var path = require("path");
var allcombinations = require("allcombinations");
var _ = require("lodash");

/**
* If compilation, get loading + in-game screens from content.
  Get rid of animated GIF with screens

COMPILATIONS
GAME
HARDWARE
BOOKS

SELECT -- COMPILATIONS
    d.file_link AS url,
    d.file_size AS size,
    filet.text AS type,
    ex.text AS format,
    e.title as title
FROM
    compilations c
INNER JOIN entries e ON
    c.entry_id = e.id
INNER JOIN downloads d ON
    e.id = d.entry_id AND d.release_seq = 0
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like 'Picture%' OR ex.text like 'Screen dump%')
WHERE
    d.filetype_id IN(1, 2) AND c.compilation_id = 11196 
UNION 
SELECT -- GAME
    d.file_link AS url,
    file_size AS size,
    filet.text AS type,
    ex.text AS format,
    null AS title
FROM
    downloads d
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like 'Picture%' OR ex.text like 'Screen dump%')
WHERE
    d.machinetype_id IS NULL AND d.filetype_id IN(1, 2) AND d.entry_id = 11196
UNION 
SELECT -- HARDWARE
    d.file_link AS url,
    file_size AS size,
    filet.text AS type,    
    ex.text AS format,
    null AS title
FROM
    downloads d
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like 'Picture%')
INNER JOIN entries e ON
    d.entry_id = e.id
WHERE
    (e.genretype_id BETWEEN 91 AND 108) AND d.filetype_id IN(53) AND d.entry_id = 1000192 -- 91-108=hardware, 53=hardware thumb
UNION
SELECT -- BOOKS
    d.file_link AS url,
    file_size AS size,
    "Loading screen" as type,
    ex.text AS format,
    null AS title
FROM
    downloads d
INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like 'Picture%')
INNER JOIN entries e ON
    d.entry_id = e.id
WHERE
    (e.genretype_id BETWEEN 83 AND 90) AND d.filetype_id IN(45) AND d.entry_id = 2000237

+---------------------------------------------------------------------+--------+--------------------+-------------------+-----------------------+
| url                                                                 | size   | type               | format            | title                 |
+---------------------------------------------------------------------+--------+--------------------+-------------------+-----------------------+
| /pub/sinclair/screens/in-game/k/Kung-FuMaster.gif                   | 5603   | Running screen     | Picture (GIF)     | Kung-Fu Master        |
| /pub/sinclair/screens/in-game/t/TopGun.gif                          | 3914   | Running screen     | Picture (GIF)     | Top Gun               |
| /pub/sinclair/screens/in-game/j/JackTheNipper.gif                   | 4391   | Running screen     | Picture (GIF)     | Jack the Nipper       |
| /pub/sinclair/screens/in-game/a/AufWiedersehenMonty.gif             | 5878   | Running screen     | Picture (GIF)     | Auf Wiedersehen Monty |
| /pub/sinclair/screens/in-game/s/SuperCycle.gif                      | 4944   | Running screen     | Picture (GIF)     | Super Cycle           |
| /pub/sinclair/screens/in-game/g/Gauntlet.gif                        | 4252   | Running screen     | Picture (GIF)     | Gauntlet              |
| /pub/sinclair/screens/load/k/scr/Kung-FuMaster.scr                  | 6912   | Loading screen     | Screen dump (SCR) | Kung-Fu Master        |
| /pub/sinclair/screens/load/t/scr/TopGun.scr                         | 6912   | Loading screen     | Screen dump (SCR) | Top Gun               |
| /pub/sinclair/screens/load/j/scr/JackTheNipper.scr                  | 6912   | Loading screen     | Screen dump (SCR) | Jack the Nipper       |
| /pub/sinclair/screens/load/a/scr/AufWiedersehenMonty.scr            | 6912   | Loading screen     | Screen dump (SCR) | Auf Wiedersehen Monty |
| /pub/sinclair/screens/load/s/scr/SuperCycle.scr                     | 6912   | Loading screen     | Screen dump (SCR) | Super Cycle           |
| /pub/sinclair/screens/load/g/scr/Gauntlet.scr                       | 6912   | Loading screen     | Screen dump (SCR) | Gauntlet              |
| /pub/sinclair/screens/in-game/123/6GameActionPack.gif               | 23915  | Running screen     | Picture (GIF)     | NULL                  |
| /zxdb/sinclair/pics/hw/ZXInterface1.jpg                             | NULL   | Hardware thumbnail | Picture (JPG)     | NULL                  |
| /pub/sinclair/books-pics/m/MasteringMachineCodeOnYourZXSpectrum.jpg | 179560 | Loading screen     | Picture (JPG)     | NULL                  |
| /zxdb/sinclair/pics/books/MasteringMachineCodeOnYourZXSpectrum.jpg  | NULL   | Loading screen     | Picture (JPG)     | NULL                  |
+---------------------------------------------------------------------+--------+--------------------+-------------------+-----------------------+

ZXDB Update:
If Screen Dump and Picture both exists, Picture is removed(only scr + ifl references), need to convert to Picture
    {
      "filename": "TopGun.scr",
      "url": "/pub/sinclair/screens/load/t/scr/TopGun.scr",
      "size": 6912,
      "type": "Loading screen",
      "format": "Screen dump",
      "title": "Top Gun"
    },
=>
    {
      "filename": "TopGun.gif",
      "url": "/zxscreens/0011196/TopGun-load.gif", //TopGun-game.gif
      "size": 6912,
      "type": "Loading screen", //In-game screen
      "format": "Picture",
      "title": "Top Gun"
    },

More screens: 0030237

*/
var getScreens = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    'SELECT d.file_link AS url, d.file_size AS size, filet.text AS type, ex.text AS format, e.title as title, d.entry_id FROM contents c INNER JOIN entries e ON c.entry_id = e.id INNER JOIN downloads d ON e.id = d.entry_id AND d.release_seq = 0 INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like "Picture%" OR ex.text like "Screen dump%") WHERE d.filetype_id IN(1, 2) AND c.container_id = ? UNION SELECT d.file_link AS url, file_size AS size, filet.text AS type, ex.text AS format, null AS title, d.entry_id FROM downloads d INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like "Picture%" OR ex.text like "Screen dump%") WHERE d.machinetype_id IS NULL AND d.filetype_id IN(1, 2) AND d.entry_id = ? UNION SELECT d.file_link AS url, file_size AS size, filet.text AS type, ex.text AS format, null AS title, d.entry_id FROM downloads d INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like "Picture%") INNER JOIN entries e ON d.entry_id = e.id WHERE (e.genretype_id BETWEEN 91 AND 108) AND d.filetype_id IN(53) AND d.entry_id = ? UNION SELECT d.file_link AS url, file_size AS size, "Loading screen" as type, ex.text AS format, null AS title, d.entry_id FROM downloads d INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like "Picture%") INNER JOIN entries e ON d.entry_id = e.id WHERE (e.genretype_id BETWEEN 83 AND 90) AND d.filetype_id IN(45) AND d.entry_id = ?',
    [id, id, id, id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        if (results[i].url == undefined) {
        } else {
          if (results[i].format.startsWith("Picture")) {
            // Picture (GIF), Picture (JPG)
            var downloaditem = {
              entry_id: results[i].entry_id,
              filename: path.basename(results[i].url),
              url: results[i].url,
              size: results[i].size,
              type: results[i].type,
              format: results[i].format,
              title: results[i].title,
            };
            arr.push(utils.removeEmpty(downloaditem));
          } else {
            /** screen dump, write info to file (to be processed later) **/
            var zerofilled = ("0000000" + id).slice(-7);
            var zerofilledEntry = ("0000000" + results[i].entry_id).slice(-7);
            var screen_type;

            /** In-game renamed to Running screen **/
            if (results[i].type == "Loading screen") {
              screen_type = "load";
            } else {
              screen_type = "run";
            }
            var new_filename = path.basename(results[i].url, path.extname(results[i].url));
            if (path.basename(results[i].url).indexOf("-" + screen_type + "-") == -1) {
              new_filename = new_filename + "-" + screen_type;
            }
            if (results[i].title == null) {
              results[i].title = "";
            }
            console.error(
              screen_type +
                "\t" +
                zerofilled +
                "\t" +
                zerofilledEntry +
                "\t" +
                results[i].url +
                "\t" +
                ("/zxscreens/" + zerofilled + "/") +
                "\t" +
                new_filename +
                "\t" +
                results[i].title
            );
          }
        }
      }
      deferred.resolve({ screens: arr });
    }
  );
  return deferred.promise;
};

/*
 * #############################################
 * Data for Elasticsearch
 * #############################################
 */

/**
 * Suggestion functions
 */

function createSuggestions(title) {
  // split title by space, comma, dash, colon, semi-colon
  var titlewords = title.toLowerCase().split(/[\: ,-]+/);
  // if more than 5 words, keep first 5 only (to limit combinations)
  if (titlewords.length > 3) {
    var tmpArray = [];
    var ii = 0;
    for (; ii < 4; ii++) {
      tmpArray.push(titlewords[ii]);
    }
    titlewords = tmpArray;
  }

  // clean titlewords
  // remove everything not 0-9, A-Z
  // get rid of 'a', 'of' etc

  var titlewordsCleaned = [];
  titlewords.forEach(function (value) {
    var word = value.replace(/\W/g, "");
    if (word.length > 2) {
      titlewordsCleaned.push(word);
    }
  });

  var cs = Array.from(allcombinations(titlewordsCleaned));
  var input = [title];
  cs.forEach(function (v) {
    var inputLine = "";
    v.forEach(function (w) {
      inputLine += " " + w;
    });
    input.push(inputLine.trim());
  });

  input = _.uniqWith(input, _.isEqual);

  return input;
}

var getTitlesForSuggestions = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT title FROM entries e where e.id = ? UNION SELECT aka.title AS title FROM aliases aka LEFT JOIN entries e ON e.id = aka.entry_id WHERE e.id = ? UNION SELECT aka.entry_title AS title FROM search_by_titles aka LEFT JOIN entries e ON e.id = aka.entry_id WHERE id = ?",
    [id, id, id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        arr.push.apply(arr, createSuggestions(results[i].title));
      }
      deferred.resolve({ titlesuggest: arr });
    }
  );
  return deferred.promise;
};

var getAuthorsForSuggestions = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT DISTINCT dev.id AS id, dev.name AS name, lt.text as labeltype FROM authors aut INNER JOIN labels dev ON aut.label_id = dev.id LEFT JOIN labeltypes lt ON lt.id = dev.labeltype_id where aut.entry_id = ?",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var metadata = [];
      var i = 0;
      for (; i < results.length; i++) {
        // console.log(results[i].id + ": " + results[i].name);
        var autsug = createSuggestions(results[i].name);
        // find all labels for name id
        let aliasnames = getAuthorAlias(results[i].id);
        let aliases = aliasnames.map((a) => a.name);
        autsug = aliases.concat(autsug);
        let alias_ids = aliasnames.map((a) => a.id);
        let searchbyname = getAuthorSearchByName(alias_ids).map((a) => a.name);
        autsug = searchbyname.concat(autsug);
        var labeltype = results[i].labeltype == null ? "" : results[i].labeltype;
        var item = { name: results[i].name, labeltype: labeltype, alias: autsug };
        metadata.push(item);
        arr.push.apply(arr, autsug);
      }
      deferred.resolve({ authorsuggest: arr, metadata_author: metadata });
    }
  );
  return deferred.promise;
};

var getPublishersForSuggestions = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT pub.name AS name, lt.text AS labeltype FROM releases r LEFT JOIN publishers p ON p.entry_id = r.entry_id AND p.release_seq = r.release_seq INNER JOIN labels pub ON p.label_id = pub.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id WHERE p.entry_id = ? ORDER BY r.release_seq",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var metadata = [];
      var i = 0;
      for (; i < results.length; i++) {
        arr = arr.concat(createSuggestions(results[i].name));
        var variations = createSuggestions(results[i].name);
        var item = { name: results[i].name, labeltype: results[i].labeltype, suggest: variations };
        metadata.push(item);
      }
      deferred.resolve({ publishersuggest: arr, metadata_publisher: metadata });
    }
  );
  return deferred.promise;
};

var getAuthorAlias = function (id) {
  var done = false;
  var deferred = Q.defer();
  var connection = db.getConnection();
  var arr = [];
  connection.query(
    "SELECT l.id, l.name, lt.text as labeltype FROM labels l LEFT JOIN labeltypes lt ON lt.id = l.labeltype_id WHERE l.id = ? or l.owner_id = ? UNION SELECT l.id, l.name, lt.text as labeltype FROM labels l LEFT JOIN labeltypes lt ON lt.id = l.labeltype_id WHERE l.id IN (select owner_id from labels where id=? )",
    [id, id, id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }

      for (var i = 0; i < results.length; i++) {
        // console.log(results[i].id + ": " + results[i].name + "(" + results[i].labeltype + ")");
        arr.push({ id: results[i].id, name: results[i].name, labeltype: results[i].labeltype });
      }
      done = true;
    }
  );
  var deasync = require("deasync");
  deasync.loopWhile(function () {
    return !done;
  });
  return arr;
};

var getAuthorSearchByName = function (ids) {
  var done = false;
  var deferred = Q.defer();
  var connection = db.getConnection();
  var arr = [];
  connection.query(
    "SELECT label_id AS id, label_name AS name, '*' as labeltype FROM search_by_names WHERE label_id in (?)",
    [ids],
    function (error, results, fields) {
      if (error) {
        throw error;
      }

      for (var i = 0; i < results.length; i++) {
        // console.log(results[i].id + ": " + results[i].name + "(" + results[i].labeltype + ")");
        arr.push({ id: results[i].id, name: results[i].name, labeltype: results[i].labeltype });
      }
      done = true;
    }
  );
  var deasync = require("deasync");
  deasync.loopWhile(function () {
    return !done;
  });
  return arr;
};

module.exports = {
  getScreens: getScreens,
  getTitlesForSuggestions: getTitlesForSuggestions,
  getAuthorsForSuggestions: getAuthorsForSuggestions,
  getPublishersForSuggestions: getPublishersForSuggestions,
};
