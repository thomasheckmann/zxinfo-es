/**
 * PUBLISHERS
 *
 * - getPublishers(id)
 *
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

/**
 * Get publisher

(
  SELECT 
    pub.name AS name, 
    pc1.text AS country, 
    lt.text AS labeltype, 
    p.publisher_seq, 
    n.text, 
    nt.id as notetypes 
  FROM 
    publishers p 
    INNER JOIN labels pub ON p.label_id = pub.id 
    LEFT JOIN countries pc1 ON pub.country_id = pc1.id 
    LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id 
    LEFT JOIN notes n ON n.label_id = pub.id 
    LEFT JOIN notetypes nt ON nt.id = n.notetype_id 
  WHERE 
    p.entry_id = 2259 
    AND p.release_seq = 0 
  ORDER BY 
    publisher_seq, 
    pub.name, 
    pc1.text
) 
UNION 
  (
    SELECT 
      m.name, 
      c.text as country, 
      e.publication as labeltype, 
      0 as publisher_seq, 
      NULL as text, 
      NULL as notetypes 
    FROM 
      search_by_origins e 
      INNER JOIN issues i ON i.id = e.issue_id 
      INNER JOIN magazines m ON m.id = i.magazine_id 
      INNER JOIN labels l ON l.id = m.label_id 
      INNER JOIN countries c ON c.id = l.country_id 
    WHERE 
      e.entry_id = 2259
  )



2259 - Head over heels
+--------------------+---------+----------------------------+---------------+------------------------------------------------------+---------+-----------+
|        name        | country |         labeltype          | publisher_seq |                         text                         | section | notetypes |
+--------------------+---------+----------------------------+---------------+------------------------------------------------------+---------+-----------+
| Ocean Software Ltd | UK      | Company: Publisher/Manager |             1 | 2nd Best Software House - 1986 Crash Readers Awards. | Awards  | A         |
| Ocean Software Ltd | UK      | Company: Publisher/Manager |             1 | 1st Best Software House - 1987 Crash Readers Awards. | Awards  | A         |
| Ocean Software Ltd | UK      | Company: Publisher/Manager |             1 | 1st Best Software House - 1989 Crash Readers Awards. | Awards  | A         |
| Ocean Software Ltd | UK      | Company: Publisher/Manager |             1 | 1st Best Software House - 1990 Crash Readers Awards. | Awards  | A         |
+--------------------+---------+----------------------------+---------------+------------------------------------------------------+---------+-----------+

28180 - Two publishers
+----------------+---------+-----------+---------------+------+---------+-----------+
|      name      | country | labeltype | publisher_seq | text | section | notetypes |
+----------------+---------+-----------+---------------+------+---------+-----------+
| Andrew S. Owen | NULL    | Person    |             1 | NULL | NULL    | NULL      |
| Einar Saukas   | Brazil  | Person    |             2 | NULL | NULL    | NULL      |
+----------------+---------+-----------+---------------+------+---------+-----------+

*/
var getPublishers = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "(SELECT pub.name AS name, pc1.text AS country, lt.text AS labeltype, p.publisher_seq, n.text, nt.id as notetypes FROM publishers p INNER JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN notes n ON n.label_id = pub.id LEFT JOIN notetypes nt ON nt.id = n.notetype_id WHERE p.entry_id = ? AND p.release_seq = 0 ORDER BY publisher_seq, pub.name, pc1.text) UNION (SELECT m.name, c.text as country, e.publication as labeltype, 0 as publisher_seq, NULL as text, NULL as notetypes FROM search_by_origins e INNER JOIN issues i ON i.id = e.issue_id INNER JOIN magazines m ON m.id = i.magazine_id INNER JOIN labels l ON l.id = m.label_id INNER JOIN countries c ON c.id = l.country_id WHERE e.entry_id = ?)",
    //"SELECT pub.name AS name, pc1.text AS country, lt.text AS labeltype, p.publisher_seq, n.text, nt.id as notetypes FROM publishers p INNER JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN notes n ON n.label_id = pub.id LEFT JOIN notetypes nt ON nt.id = n.notetype_id WHERE p.entry_id = ? AND p.release_seq = 0 ORDER BY publisher_seq, pub.name, pc1.text",
    [id, id],
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
