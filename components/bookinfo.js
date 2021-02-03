/**
 * BOOK INFO
 *
 * - getInBook(id),
 * - getBookContents(id),
 *
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

/**
 * Get TypeInBook

 If this entry is marked type-in, find book

-- This program was published as type-in in the following books...
SELECT
    book_id,
    title,
    label.name AS publisher,
    country.text AS country,
    lt.text AS labeltype
FROM
    booktypeins bti
INNER JOIN entries book ON
    bti.book_id = book.id
LEFT JOIN publishers pub ON
    bti.book_id = pub.entry_id AND pub.release_seq = 0
LEFT JOIN labels label ON
    label.id = pub.label_id
LEFT JOIN labeltypes lt ON
    lt.id = label.labeltype_id
LEFT JOIN countries country ON
    country.id = label.country_id
WHERE
    bti.entry_id = 13305
+-----------------------+---------+
| title                 | bookid  |
+-----------------------+---------+
| ZX Spectrum +3 Manual | 2000448 |
+-----------------------+---------+

 */
var getInBook = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT book_id, title, label.name AS publisher, country.text AS country, lt.text AS labeltype FROM booktypeins bti INNER JOIN entries book ON bti.book_id = book.id LEFT JOIN publishers pub ON bti.book_id = pub.entry_id AND pub.release_seq = 0 LEFT JOIN labels label ON label.id = pub.label_id LEFT JOIN labeltypes lt ON lt.id = label.labeltype_id LEFT JOIN countries country ON country.id = label.country_id WHERE bti.entry_id = ?",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        var item = {
          entry_id: results[i].book_id,
          title: results[i].title,
          publishers: [{ name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype }],
        };
        arr.push(item);
      }
      deferred.resolve({ inBook: arr });
    }
  );
  return deferred.promise;
};

/*

SELECT
    entry.id,
    entry.title,
    pub.name AS publisher,
    country.text AS country,
    lt.text AS labeltype,
    machinet.text AS machinetype,
    book.page
FROM
    booktypeins book
LEFT JOIN entries entry ON
    entry.id = book.entry_id
LEFT JOIN publishers p ON
    p.entry_id = entry.id AND p.release_seq = 0
LEFT JOIN labels pub ON
    p.label_id = pub.id
LEFT JOIN machinetypes machinet ON
    entry.machinetype_id = machinet.id
LEFT JOIN labeltypes lt ON
    lt.id = pub.labeltype_id
LEFT JOIN countries country ON
    country.id = pub.country_id
WHERE
    book.book_id = 2000016
ORDER BY
    entry.title

*/

var getBookContents = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "SELECT entry.id, entry.title, pub.name AS publisher, country.text AS country, lt.text AS labeltype, machinet.text AS machinetype, book.page FROM booktypeins book LEFT JOIN entries entry ON entry.id = book.entry_id LEFT JOIN publishers p ON p.entry_id = entry.id AND p.release_seq = 0 LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN machinetypes machinet ON entry.machinetype_id = machinet.id LEFT JOIN labeltypes lt ON lt.id = pub.labeltype_id LEFT JOIN countries country ON country.id = pub.country_id WHERE book.book_id = ? ORDER BY entry.title",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      for (; i < results.length; i++) {
        var item = {
          entry_id: results[i].id,
          title: results[i].title,
          publishers: [{ name: results[i].publisher, country: results[i].country, labelType: results[i].labeltype }],
          machineType: results[i].machinetype,
          page: results[i].page,
        };
        arr.push(item);
      }
      deferred.resolve({ bookContents: arr });
    }
  );
  return deferred.promise;
};

module.exports = {
  getBookContents: getBookContents,
  getInBook: getInBook,
};
