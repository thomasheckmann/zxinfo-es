/**
 * LINKS INFO
 *
 * - getTOSEC(id),
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

/**
  get tosec references, requires temporary table 'tmp_tosec'
*/

var getTOSEC = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query("SELECT * FROM tmp_tosec WHERE zxdb_id = ?", [id], function (error, results, fields) {
    if (error) {
      throw error;
    }
    var arr = [];
    var i = 0;
    for (; i < results.length; i++) {
      var item = {
        path: results[i].path,
      };
      arr.push(item);
    }
    deferred.resolve({ tosec: arr });
  });
  return deferred.promise;
};

/**
 * Get relatedlinks

-- This program is also listed in the following sites...
-- * exclude sites integrated with ZXDB and YouTube
SELECT
    relw.name AS sitename,
    rel.link
FROM
    webrefs rel
INNER JOIN websites relw ON
    rel.website_id = relw.id
WHERE
    relw.name NOT IN('Freebase', 'The Tipshop', 'RZX Archive Channel (YouTube)', 'ZX81 videos (Youtube)') AND rel.entry_id = 4010
ORDER BY
    sitename, link;

+-----------+-----------------------------------------------------------------+
| sitename  | link                                                            |
+-----------+-----------------------------------------------------------------+
| Freebase  | http://zxspectrum.freebase.com/view/base/zxspectrum/wos/0004010 |
| Wikipedia | http://en.wikipedia.org/wiki/Rambo_%281985_video_game%29        |
+-----------+-----------------------------------------------------------------+

 */
var getRelatedLinks = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    'SELECT relw.name AS sitename,rel.link FROM webrefs rel INNER JOIN websites relw ON rel.website_id = relw.id WHERE relw.name NOT IN ("Freebase","The Tipshop","RZX Archive Channel (YouTube)", "ZX81 videos (Youtube)") AND rel.entry_id = ? ORDER BY sitename, link',
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        var item = {
          siteName: results[i].sitename,
          url: results[i].link,
        };
        arr.push(item);
      }
      deferred.resolve({ relatedLinks: arr });
    }
  );
  return deferred.promise;
};

function replaceMask(input, pattern, value) {
  var result = input;
  var found = input.match(pattern);
  if (found != null) {
    var template = found[0];
    var padding = found[1];
    var zero = ("0".repeat(padding) + value).slice(-padding);
    if (padding == 1) {
      // N = 1, plain value
      zero = value;
    }
    var re = new RegExp(template, "g");
    result = input.replace(re, zero);
  }
  return result;
}

/**

  Other sites integrated with ZXDB

*/
var getRelatedSites = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query("SELECT name as sitename, link_mask FROM websites WHERE link_mask is NOT NULL ORDER BY sitename", function (
    error,
    results,
    fields
  ) {
    if (error) {
      throw error;
    }
    var arr = [];
    var i = 0;
    for (; i < results.length; i++) {
      var link = replaceMask(results[i].link_mask, /{e(\d)+}/i, parseInt(id));
      var item = {
        siteName: results[i].sitename,
        url: link,
      };
      arr.push(item);
    }
    deferred.resolve({ relatedSites: arr });
  });
  return deferred.promise;
};

/**

  YouTube Links

	"ZX81 videos (Youtube)" - 12369
	"The Spectrum Show - Youtube" - 15
	"TV Advert (YouTube)" - 2383

*/
var getYouTubeLinks = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    'SELECT relw.name AS sitename, rel.link FROM webrefs rel INNER JOIN websites relw ON rel.website_id = relw.id WHERE relw.name IN( "RZX Archive - YouTube", "ZX81 videos (Youtube)", "The Spectrum Show - Youtube", "TV Advert (YouTube)" ) AND rel.entry_id = ? ORDER BY sitename',
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        var item = {
          siteName: results[i].sitename,
          url: results[i].link,
        };
        arr.push(item);
      }
      deferred.resolve({ youTubeLinks: arr });
    }
  );
  return deferred.promise;
};

/**

SELECT
    d.file_link AS url,
    file_size AS size,
    filet.text AS type,
    ex.text AS format
FROM
    downloads d
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN extensions ex ON
    INSTR(file_link, ex.ext) > 1
WHERE NOT
    (
        filetype_id IN(46, 47) OR filetype_id BETWEEN 8 AND 22
	) AND d.entry_id = 12596
ORDER BY filet.text, ex.text, url

+-----------------------------------------------------------------------------+---------+-----------------------------------------------+-------------------+
| url                                                                         | size    | type                                          | format            |
+-----------------------------------------------------------------------------+---------+-----------------------------------------------+-------------------+
| /pub/sinclair/games-info/h/HeadOverHeels(ErbeSoftwareS.A.).pdf              | 68634   | Instructions                                  | Document (PDF)    |
| /pub/sinclair/games-info/h/HeadOverHeels.pdf                                | 1827379 | Scanned instructions                          | Document (PDF)    |
| /pub/sinclair/games-info/h/HeadOverHeels.txt                                | 22346   | Instructions                                  | Document (TXT)    |
| /pub/sinclair/games-info/h/HeadOverHeels_2.txt                              | 40501   | Instructions                                  | Document (TXT)    |
| /pub/sinclair/music/ay/games/h/HeadOverHeels.ay.zip                         | 2404    | Ripped in-game and theme music in AY format   | Music (AY)        |
| /pub/sinclair/music/mp3/HeadOverHeels.mp3.zip                               | 4630304 | Sampled in-game and theme music in MP3 format | Music (MP3)       |
| /pub/sinclair/screens/in-game/h/HeadOverHeels.gif                           | 6878    | Running screen                                | Picture (GIF)     |
| /pub/sinclair/games-adverts/h/HeadOverHeels.jpg                             | 282410  | Advertisement                                 | Picture (JPG)     |
| /pub/sinclair/games-inlays/Rereleases/h/HeadOverHeels(ErbeSoftwareS.A.).jpg | 81611   | Re-release cassette inlay                     | Picture (JPG)     |
| /pub/sinclair/games-maps/h/HeadOverHeels.jpg                                | 471394  | Game map                                      | Picture (JPG)     |
| /pub/sinclair/games-maps/h/HeadOverHeels_2.jpg                              | 604773  | Game map                                      | Picture (JPG)     |
| /pub/sinclair/games-maps/h/HeadOverHeels_3.jpg                              | 470666  | Game map                                      | Picture (JPG)     |
| /zxdb/sinclair/entries/0002259/HeadOverHeels(HitSquad).jpg                  | NULL    | Re-release cassette inlay                     | Picture (JPG)     |
| /zxdb/sinclair/entries/0002259/HeadOverHeels.jpg                            | NULL    | Cassette inlay                                | Picture (JPG)     |
| /pub/sinclair/games-maps/h/HeadOverHeels_4.png                              | 1439896 | Game map                                      | Picture (PNG)     |
| /zxdb/sinclair/pokes/h/Head over Heels (1987)(Ocean Software).pok           | NULL    | POK pokes file                                | Pokes (POK)       |
| /pub/sinclair/screens/load/h/scr/HeadOverHeels.scr                          | 6912    | Loading screen                                | Screen dump (SCR) |
+-----------------------------------------------------------------------------+---------+-----------------------------------------------+-------------------+

*/

var getAdditionalDownloads = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT d.release_seq, d.file_link AS url, file_size AS size, filet.text AS type, ex.text AS format, l.id as language_id, l.text as language FROM downloads d INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN extensions ex ON INSTR(file_link, ex.ext) > 1 LEFT JOIN languages l on l.id = d.language_id WHERE NOT ( filetype_id IN(46, 47) OR filetype_id BETWEEN 8 AND 22 ) AND d.entry_id = ? ORDER BY d.release_seq, field(filet.text, 'POK pokes file', 'Game map', 'Instructions', 'Running screen', 'Opening screen', 'Loading screen', 'Inlay - Side','Inlay - Back', 'Inlay - Front') DESC, filet.text, ex.text, url;",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        if (results[i].url == undefined) {
          // console.log(id + ": empty additionals: ");
        } else {
          var downloaditem = {
            path: results[i].url,
            size: results[i].size,
            type: results[i].type,
            format: results[i].format,
            language: results[i].language,
          };
          arr.push(utils.removeEmpty(downloaditem));
        }
      }
      deferred.resolve({ additionalDownloads: arr });
    }
  );
  return deferred.promise;
};

module.exports = {
  getAdditionalDownloads: getAdditionalDownloads,
  getRelatedLinks: getRelatedLinks,
  getRelatedSites: getRelatedSites,
  getTOSEC: getTOSEC,
  getYouTubeLinks: getYouTubeLinks,
};
