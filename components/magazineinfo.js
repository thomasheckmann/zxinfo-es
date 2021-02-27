/**
 * MAGAZINE INFO
 *
 * - getAwards(id),
 * - getMagazineRefs(id)
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

/**
 * getAwards (as found in ZXSR table)
 * 
 SELECT
    za.text AS awardName,
    m.name AS magazineName,
    page,
    issue_id,
    i.date_year,
    i.date_month,
    i.volume,
    i.number
FROM
    magrefs mr
INNER JOIN zxsr_awards za ON
    za.id = mr.award_id
INNER JOIN magazines m ON
    m.id = za.magazine_id
INNER JOIN issues i ON
    i.id = issue_id
WHERE
    entry_id = 2259 AND award_id IS NOT NULL
ORDER BY date_year, date_month
 * 
 */
var getAwards = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT za.text AS awardName, m.name AS magazineName, page, issue_id, i.date_year, i.date_month, i.volume, i.number FROM magrefs mr INNER JOIN zxsr_awards za ON za.id = mr.award_id INNER JOIN magazines m ON m.id = za.magazine_id INNER JOIN issues i ON i.id = issue_id WHERE entry_id = ? AND award_id IS NOT NULL ORDER BY magazineName, awardName, date_year, date_month, issue_id, page",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        var item = {
          awardName: results[i].awardName,
          magazineName: results[i].magazineName,
          page: results[i].page,
          issueId: results[i].issue_id,
          dateYear: results[i].date_year,
          dateMonth: results[i].date_month,
          volume: results[i].volume,
          number: results[i].number,
        };
        arr.push(item);
      }
      deferred.resolve({ reviewAwards: arr });
    }
  );
  return deferred.promise;
};

/**
 * getMagazineRefs
 * 
SELECT
    r.text AS type,
    f.name AS featureName,
    m.name AS magazineName,
    page,
    issue_id,
    i.date_year,
    i.date_month,
    i.volume,
    i.number,
    zs.score
FROM
    magrefs mr
INNER JOIN referencetypes r ON
    r.id = mr.referencetype_id
INNER JOIN issues i ON
    i.id = issue_id
INNER JOIN magazines m ON
    m.id = i.magazine_id
LEFT JOIN magreffeats mf ON
    mf.magref_id = mr.id
LEFT JOIN features f ON
    f.id = mf.feature_id
LEFT JOIN zxsr_scores zs on zs.magref_id = mr.id and zs.is_overall = 1
WHERE
    entry_id = 2259 and page > 0
ORDER BY
    magazineName,
    date_year,
    date_month,
    volume,
    number,
    page
 * 
 */
var getMagazineRefs = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT r.text AS type, f.name AS featureName, m.name AS magazineName, page, issue_id, i.date_year, i.date_month, i.volume, i.number, zs.score FROM magrefs mr INNER JOIN referencetypes r ON r.id = mr.referencetype_id INNER JOIN issues i ON i.id = issue_id INNER JOIN magazines m ON m.id = i.magazine_id LEFT JOIN magreffeats mf ON mf.magref_id = mr.id LEFT JOIN features f ON f.id = mf.feature_id LEFT JOIN zxsr_scores zs on zs.magref_id = mr.id and zs.is_overall = 1 WHERE entry_id = ? and page > 0 ORDER BY magazineName, date_year, date_month, volume, number, page",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        var item = {
          type: results[i].type,
          featureName: results[i].featureName,
          magazineName: results[i].magazineName,
          page: results[i].page,
          issueId: results[i].issue_id,
          dateYear: results[i].date_year,
          dateMonth: results[i].date_month,
          volume: results[i].volume,
          number: results[i].number,
          score: results[i].score,
        };
        arr.push(item);
      }
      deferred.resolve({ magazineReferences: arr });
    }
  );
  return deferred.promise;
};

module.exports = {
  getAwards: getAwards,
  getMagazineRefs: getMagazineRefs,
};
