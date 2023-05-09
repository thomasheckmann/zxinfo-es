/**
 * PUBLISHERS
 *
 * - getPublishers(id)
 *
 * CHANGELOG:
 * 06.03.2023
 *  https://spectrumcomputing.co.uk/forums/viewtopic.php?p=108950#p108950
 *  - magazines.label_id -> issues.label_id
 * 
 * IF entry does not have publisher, look into "search_by_origins"
 * origintypes
 *    container   issue
 * C   NULL        x
 * B   x           NULL
 * M   NULL        x
 * A   x           NULL
 * T   x           x
 * E   x           NULL
 * P   x           NULL
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

/**
 * Get publisher

2259 - Head over heels
28180 - Two publishers
10 - T
24 - E
33 - A
39 - M, type-in from Magazine, issue has no label_id
40 - P (now shows publishers)
*/
var getPublishers = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "( SELECT pub.name AS name, pc1.text AS country, lt.text AS labeltype, p.publisher_seq, n.text, nt.id as notetypes FROM publishers p INNER JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN notes n ON n.label_id = pub.id LEFT JOIN notetypes nt ON nt.id = n.notetype_id WHERE p.entry_id =? AND p.release_seq = 0 ) UNION ( SELECT pub.name AS name, pc1.text AS country, lt.text AS labeltype, p.publisher_seq, n.text, nt.id as notetypes FROM search_by_origins s INNER JOIN publishers p ON p.entry_id = s.container_id LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN notes n ON n.label_id = pub.id LEFT JOIN notetypes nt ON nt.id = n.notetype_id WHERE s.entry_id = ? and s.container_id is not NULL AND p.release_seq = 0 ) UNION ( SELECT pub.name AS name, pc1.text AS country, lt.text AS labeltype, 0 as publisher_seq, n.text, nt.id as notetypes FROM search_by_origins s INNER JOIN issues i ON i.id = s.issue_id LEFT JOIN labels pub ON pub.id = i.label_id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN notes n ON n.label_id = pub.id LEFT JOIN notetypes nt ON nt.id = n.notetype_id WHERE s.entry_id = ? AND s.issue_id is not NULL ) ORDER BY publisher_seq, name, text",
    [id, id, id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var publishers = [];
      var i = 0;
      var prevName = null;
      var authorItem = {};
      var note = {};
      for (; i < results.length; i++) {
        var name = results[i].name;

        if (name !== prevName) {
          if (prevName !== null) {
            // Add current note line
            note = { text: results[i].text, noteType: results[i].notetypes };
            if (note.text !== null || note.noteType !== null) {
              authorItem.notes.push(utils.removeEmpty(note));
            }
            publishers.push(utils.removeEmpty(authorItem));
          }

          authorItem = { publisherSeq: 0, name: "", country: "", labelType: "", notes: [] };
          prevName = name;
        }
        authorItem.publisherSeq = results[i].publisher_seq;
        authorItem.name = results[i].name;
        authorItem.country = results[i].country;
        authorItem.labelType = results[i].labeltype;
        note = { text: results[i].text, noteType: results[i].notetypes };
        if (note.text !== null || note.noteType !== null) {
          authorItem.notes.push(utils.removeEmpty(note));
        }
      }
      // Add last entry
      publishers.push(utils.removeEmpty(authorItem));

      var doc = { publishers: publishers };
      // console.log(JSON.stringify(publishers, undefined, 2));
      deferred.resolve(doc);
    }
  );
  return deferred.promise;
};

module.exports = {
  getPublishers: getPublishers,
};
