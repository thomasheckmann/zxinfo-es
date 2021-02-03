/**

*/

"use strict";

var db = require("./includes/dbConfig");
var settings = require("./includes/settings");

var json_output_dir = settings.prefixMagazines;

var Q = require("Q");
var jsonfile = require("jsonfile");
var path = require("path");
var allcombinations = require("allcombinations");
var _ = require("lodash");

/*********************************************
UTILITY FUNCTIONS
*********************************************/

/*
    Remove empty properties from a JSON object. Only first level
 */
var removeEmpty = function (item) {
  for (var property in item) {
    if (item.hasOwnProperty(property)) {
      var value = item[property];
      if (
        value === undefined ||
        value === null ||
        value.length === 0 ||
        (Object.keys(value).length === 0 && value.constructor === Object)
      ) {
        delete item[property];
      }
    }
  }

  return item;
};

/**
SELECT
    m.name,
    l.text AS language,
    m.link_mask,
    m.archive_mask
FROM
    magazines m
LEFT JOIN languages l ON
    l.id = m.language_id
WHERE
	m.id = 1

*/
var getMagazineInfo = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT m.name, l.text AS language, p.name AS publisher, c.text as country, m.link_mask, m.archive_mask FROM magazines m LEFT JOIN labels p ON p.id = m.label_id LEFT join countries c on c.id = p.country_id LEFT JOIN languages l ON l.id = m.language_id WHERE m.id = ?",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }

      var type = "?";

      var link_mask = results[0].link_mask ? results[0].link_mask.toLowerCase() : "";
      var archive_mask = results[0].archive_mask ? results[0].archive_mask.toLowerCase() : "";
      if (
        link_mask.endsWith(".pdf") ||
        link_mask.endsWith(".jpg") ||
        link_mask.endsWith(".png") ||
        archive_mask.endsWith(".pdf") ||
        archive_mask.endsWith(".jpg") ||
        archive_mask.endsWith(".png")
      ) {
        type = "PAPER";
      } else if (link_mask.endsWith(".txt") || archive_mask.endsWith(".txt")) {
        type = "TEXT";
      } else if (
        link_mask.endsWith(".tzx.zip") ||
        link_mask.endsWith(".tap.zip") ||
        link_mask.endsWith(".z80.zip") ||
        archive_mask.endsWith(".tzx.zip") ||
        archive_mask.endsWith(".tap.zip") ||
        archive_mask.endsWith(".z80.zip")
      ) {
        type = "TAPE";
      } else if (
        link_mask.endsWith(".mgt.zip") ||
        link_mask.endsWith(".trd.zip") ||
        link_mask.endsWith(".disk.zip") ||
        archive_mask.endsWith(".mgt.zip") ||
        archive_mask.endsWith(".trd.zip") ||
        archive_mask.endsWith(".disk.zip")
      ) {
        type = "DISK";
      }
      var doc = {
        name: results[0].name.trim(),
        type: type,
        language: results[0].language,
        publisher: results[0].publisher,
        country: results[0].country,
        link_mask: results[0].link_mask,
        archive_mask: results[0].archive_mask,
      };
      deferred.resolve(removeEmpty(doc));
    }
  );
  return deferred.promise;
};

var getIssues = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query("select * from issues where magazine_id = ?", [id], function (error, results, fields) {
    if (error) {
      throw error;
    }
    var arr = [];
    var i = 0;
    for (; i < results.length; i++) {
      var coverImage = getMagCover(results[i].id);
      var magrefs = getMagRefs(results[i].id);
      var magfiles = getMagFiles(results[i].id);
      var issue = {
        id: results[i].id,
        cover_image: coverImage,
        date_year: results[i].date_year,
        date_month: results[i].date_month,
        date_day: results[i].date_day,
        volume: results[i].volume,
        number: results[i].number,
        special: results[i].special,
        references: magrefs,
        files: magfiles,
      };
      arr.push(removeEmpty(issue));
    }
    deferred.resolve({ issues: arr });
  });
  return deferred.promise;
};

/**
SELECT
    mr.id,
    rt.text AS referencetype,
    mr.entry_id,
    e.title AS entry_title,
    ml.name AS magrefs_name,
    mr.page,
    mr.is_supplement,
    mr.link,
    mr.link2,
    t.name AS topic,
    tt.text AS topictype,
    lt.name AS topic_name,
    t.comments,
    f.name AS feature,
    f.version,
    l.name AS feature_name,
    l2.name AS feature_name2,
    h.title AS host_title,
    h.link AS host_link
FROM
    magrefs mr
LEFT JOIN referencetypes rt ON
    rt.id = mr.referencetype_id
LEFT JOIN entries e ON
    e.id = mr.entry_id
LEFT JOIN labels ml ON
    ml.id = mr.label_id
LEFT JOIN topics t ON
    t.id = mr.topic_id
LEFT JOIN topictypes tt ON
    tt.id = t.topictype_id
LEFT JOIN labels lt ON
    lt.id = t.label_id
LEFT JOIN features f ON
    f.id = mr.feature_id
LEFT JOIN labels l ON
    l.id = f.label_id
LEFT JOIN labels l2 ON
    l2.id = f.label2_id
LEFT JOIN hosts h ON
    h.id = f.host_id
WHERE
    mr.issue_id = 1
ORDER BY PAGE ASC

*/
var getMagRefs = function (issue_id) {
  var done = false;
  var arr = [];
  var connection = db.getConnection();
  connection.query(
    "SELECT mr.id, rt.text AS referencetype, mr.entry_id, e.title AS entrytitle, l.name AS labelname, tl.name AS topicname, tt.text AS topictype, mr.page, f.name AS featurename, fl.name AS featurelabelname, ml.link AS link, h.title AS hosttitle, h.link AS hostlink FROM magrefs mr INNER JOIN referencetypes rt ON rt.id = mr.referencetype_id LEFT JOIN entries e ON e.id = mr.entry_id LEFT JOIN labels l ON l.id = label_id LEFT JOIN topics t ON t.id = mr.topic_id LEFT JOIN labels tl ON tl.id = t.label_id LEFT JOIN topictypes tt ON tt.id = t.topictype_id LEFT JOIN magreffeats feat ON feat.magref_id = mr.id LEFT JOIN features f ON f.id = feat.feature_id LEFT JOIN labels fl ON fl.id = f.label_id LEFT JOIN magreflinks ml ON ml.magref_id = mr.id LEFT JOIN HOSTS h ON h.id = ml.host_id WHERE mr.issue_id = ? ORDER BY mr.page",
    [issue_id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var i = 0;
      for (; i < results.length; i++) {
        var ref = {
          type: results[i].referencetype,
          entry_id: results[i].entry_id,
          entry_title: results[i].entrytitle,
          name: results[i].labelname,
          topic: results[i].topicname,
          topictype: results[i].topictype,
          page: results[i].page,
          featurename: results[i].featurename,
          featurelabelname: results[i].featurelabelname,
          link: results[i].link,
          hosttitle: results[i].hosttitle,
          hostlink: results[i].hostlink,
        };
        arr.push(removeEmpty(ref));
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

/**

SELECT
    ft.text AS filetype,
    mf.page,
    mf.file_link,
    mf.file_date,
    mf.file_size,
    mf.comments
FROM
    magfiles mf
LEFT JOIN filetypes ft ON
    ft.id = mf.filetype_id
WHERE
    issue_id = 2065

*/
var getMagFiles = function (issue_id) {
  var done = false;
  var arr = [];
  var connection = db.getConnection();
  connection.query(
    "SELECT ft.text AS filetype, mf.file_link, mf.file_date, mf.file_size, mf.comments FROM files mf LEFT JOIN filetypes ft ON ft.id = mf.filetype_id WHERE issue_id = ?",
    [issue_id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var i = 0;
      for (; i < results.length; i++) {
        var file = {
          filetype: results[i].filetype,
          page: results[i].page,
          file_link: results[i].file_link,
          file_date: results[i].file_date,
          file_size: results[i].file_size,
          comments: results[i].comments,
        };
        arr.push(removeEmpty(file));
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

/**

select * from magrefs where filetype_id = 55

 */
var getMagCover = function (issue_id) {
  var done = false;
  var cover = null;
  var connection = db.getConnection();
  connection.query("select file_link from files where filetype_id = 55 and issue_id = ?", [issue_id], function (
    error,
    results,
    fields
  ) {
    if (error) {
      throw error;
    }

    if (results.length === 0) {
      // console.log("no cover found...");
    } else if (results.length === 1) {
      cover = results[0].file_link;
    } else {
      console.warn("more than one cover, check issue_id = ", issue_id);
    }
    done = true;
  });

  var deasync = require("deasync");
  deasync.loopWhile(function () {
    return !done;
  });
  return cover;
};

/*********************************************
 *
 *
 */
var magazine_doc = function (id) {
  var done = false;
  Q.all([getMagazineInfo(id), getIssues(id)]).then(function (results) {
    var i = 0;
    var doc_array = {};
    for (; i < results.length; i++) {
      for (var attributename in results[i]) {
        doc_array[attributename] = results[i][attributename];
      }
    }

    var zerofilled = ("0000000" + id).slice(-7);
    var filename = json_output_dir + zerofilled + ".json";
    jsonfile.writeFile(filename, doc_array, { spaces: 2 }, function (err) {
      if (err) {
        throw err;
      }
      var zerofilled = ("0000000" + id).slice(-7);
      console.log("saved file: ", filename);
      done = true;
    });
  });

  var deasync = require("deasync");
  deasync.loopWhile(function () {
    return !done;
  });
};

var getAllIDs = function () {
  var connection = db.getConnection();
  var done = false;
  connection.query("select id from magazines where 1", function (error, results, fields) {
    if (error) {
      throw error;
    }
    var i = 0;
    for (; i < results.length; i++) {
      magazine_doc(results[i].id);
    }
    done = true;
  });
  require("deasync").loopWhile(function () {
    return !done;
  });
  console.log("Finished!");
  db.closeConnection(connection);
};

var getID = function (zxdb_id) {
  var connection = db.getConnection();
  var done = false;
  connection.query("select id from entries where id = ? order by id asc", [zxdb_id], function (error, results, fields) {
    if (error) {
      throw error;
    }
    var i = 0;
    for (; i < results.length; i++) {
      zxdb_doc(results[i].id);
    }
    done = true;
  });
  require("deasync").loopWhile(function () {
    return !done;
  });
  console.log("Finished!");
  db.closeConnection(connection);
};

getAllIDs();
