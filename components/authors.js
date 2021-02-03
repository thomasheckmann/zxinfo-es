/**
 * AUTHORS
 *
 * - getAuthors(id)
 *
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

/**

SELECT
    IF(
        r.roletype_id IN('A', 'T'),
        "Contributor",
        "Creator"
    ) AS type,
    author_seq AS authorSeq,
    dev.name AS name,
    ac1.text AS country,
    dlt.text AS labelType,
    r.roletype_id AS roleType,
    rt.text AS roleName,
    team.name AS groupName,
    tc1.text AS groupCountry,
    tlt.text AS groupType,
    n.text,
    n.section,
    nt.id AS notetypes
FROM authors
    aut
INNER JOIN labels dev ON
    aut.label_id = dev.id
LEFT JOIN labeltypes dlt ON
    dlt.id = dev.labeltype_id
LEFT JOIN countries ac1 ON
    dev.country_id = ac1.id
LEFT JOIN labels team ON
    aut.team_id = team.id
LEFT JOIN labeltypes tlt ON
    tlt.id = team.labeltype_id
LEFT JOIN countries tc1 ON
    team.country_id = tc1.id
LEFT JOIN roles r ON
    r.entry_id = aut.entry_id AND aut.label_id = r.label_id
LEFT JOIN roletypes rt ON
    rt.id = r.roletype_id
LEFT JOIN notes n ON
    n.label_id = dev.id
LEFT JOIN notetypes nt ON
    nt.id = n.notetype_id
WHERE
    aut.entry_id = 483
ORDER BY
    authorSeq,
    roleType,
    name

483 - Beach Head II (Group + Contributors)
+-------------+-------------------+-------------+----------------------+---------------+-----------+-----------+-------------+------------------+
|    type     |     dev_name      | dev_country |      group_name      | group_country | labeltype | grouptype | roletype_id |       role       |
+-------------+-------------------+-------------+----------------------+---------------+-----------+-----------+-------------+------------------+
| Creator     | Alan Laird        | UK          | Platinum Productions | UK            | Person    | Company   | NULL        | NULL             |
| Creator     | David J. Anderson | UK          | Platinum Productions | UK            | Person    | Company   | NULL        | NULL             |
| Creator     | Ian Morrison      | UK          | Platinum Productions | UK            | Person    | Company   | NULL        | NULL             |
| Creator     | F. David Thorpe   | UK          | NULL                 | NULL          | Nickname  | NULL      | S           | Load Screen      |
| Contributor | Oliver Frey       | Switzerland | NULL                 | NULL          | Person    | NULL      | A           | Inlay/Poster Art |
+-------------+-------------------+-------------+----------------------+---------------+-----------+-----------+-------------+------------------+

996 - Cobra
+-------------+-------------------+-------------+------------+---------------+-----------+-----------+-------------+------------------+
|    type     |     dev_name      | dev_country | group_name | group_country | labeltype | grouptype | roletype_id |       role       |
+-------------+-------------------+-------------+------------+---------------+-----------+-----------+-------------+------------------+
| Creator     | Jonathan M. Smith | UK          | NULL       | NULL          | Person    | NULL      | NULL        | NULL             |
| Creator     | Martin Galway     | UK          | NULL       | NULL          | Person    | NULL      | NULL        | NULL             |
| Creator     | Steve Cain        | UK          | NULL       | NULL          | Person    | NULL      | NULL        | NULL             |
| Contributor | John Alvin        | NULL        | NULL       | NULL          | Person    | NULL      | A           | Inlay/Poster Art |
+-------------+-------------------+-------------+------------+---------------+-----------+-----------+-------------+------------------+

28171 - FZX (Authors with multiple roles)
+---------+----------------+-------------+------------+---------------+-----------+-----------+-------------+---------------------+
|  type   |    dev_name    | dev_country | group_name | group_country | labeltype | grouptype | roletype_id |        role         |
+---------+----------------+-------------+------------+---------------+-----------+-----------+-------------+---------------------+
| Creator | Andrew S. Owen | NULL        | NULL       | NULL          | Person    | NULL      | D           | Game Design/Concept |
| Creator | Andrew S. Owen | NULL        | NULL       | NULL          | Person    | NULL      | G           | In-game Graphics    |
| Creator | Einar Saukas   | Brazil      | NULL       | NULL          | Person    | NULL      | C           | Code                |
| Creator | Einar Saukas   | Brazil      | NULL       | NULL          | Person    | NULL      | S           | Load Screen         |
| Creator | Einar Saukas   | Brazil      | NULL       | NULL          | Person    | NULL      | W           | Story Writing       |
+---------+----------------+-------------+------------+---------------+-----------+-----------+-------------+---------------------+

*/

var getAuthors = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT IF( r.roletype_id IN('A', 'T'), 'Contributor', 'Creator' ) AS type, author_seq AS authorSeq, dev.name AS name, ac1.text AS country, dlt.text AS labelType, r.roletype_id AS roleType, rt.text AS roleName, team.name AS groupName, tc1.text AS groupCountry, tlt.text AS groupType, n.text, n.section, nt.id AS notetypes FROM authors aut INNER JOIN labels dev ON aut.label_id = dev.id LEFT JOIN labeltypes dlt ON dlt.id = dev.labeltype_id LEFT JOIN countries ac1 ON dev.country_id = ac1.id LEFT JOIN labels team ON aut.team_id = team.id LEFT JOIN labeltypes tlt ON tlt.id = team.labeltype_id LEFT JOIN countries tc1 ON team.country_id = tc1.id LEFT JOIN roles r ON r.entry_id = aut.entry_id AND aut.label_id = r.label_id LEFT JOIN roletypes rt ON rt.id = r.roletype_id LEFT JOIN notes n ON n.label_id = dev.id LEFT JOIN notetypes nt ON nt.id = n.notetype_id WHERE aut.entry_id = ? ORDER BY authorSeq, roleType, name",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      var preName = null;
      var item = {};
      for (; i < results.length; i++) {
        var name = results[i].name;
        if (preName !== name) {
          // NEW ENTRY
          if (preName !== null) {
            arr.push(utils.removeEmpty(item));
          }
          item = {
            type: results[i].type,
            authorSeq: results[i].authorSeq,
            name: results[i].name,
            country: results[i].country,
            labelType: results[i].labelType,
            roles: [],
            groupName: results[i].groupName,
            groupCountry: results[i].groupCountry,
            groupType: results[i].groupType,
            notes: [],
          };
          var note = { text: results[i].text, section: results[i].section, noteType: results[i].notetypes };
          if (note.text !== null || note.section !== null || note.noteType !== null) {
            item.notes.push(utils.removeEmpty(note));
          }

          var role = { roleType: results[i].roleType, roleName: results[i].roleName };
          if (role.roleType !== null || role.roleName !== null) {
            item.roles.push(utils.removeEmpty(role));
          }
        } else {
          var note = { text: results[i].text, section: results[i].section, noteType: results[i].notetypes };
          if (note.text !== null || note.section !== null || note.noteType !== null) {
            item.notes.push(utils.removeEmpty(note));
          }
          var role = { roleType: results[i].roleType, roleName: results[i].roleName };
          if (role.roleType !== null || role.roleName !== null) {
            item.roles.push(utils.removeEmpty(role));
          }
        }
        preName = name;
      }
      arr.push(utils.removeEmpty(item));

      deferred.resolve({ authors: arr });
    }
  );
  return deferred.promise;
};

module.exports = {
  getAuthors: getAuthors,
};
