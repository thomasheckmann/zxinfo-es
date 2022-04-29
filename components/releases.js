/**
 * RELEASES
 *
 * - getReleases(id)
 *
 */
"use strict";

var utils = require("../includes/utils");
var db = require("../includes/dbConfig");
var Q = require("q");

/**

Get all release info

select distinct r.release_seq  as seq,
                e.title        as title,
                aka.title      as as_title,
                pub.name       as name,
				pc1.text       as country,
				lt.text		   as labeltype,
                r.release_year as yearofrelease,
                r.release_price as releaseprice,
                r.budget_price as budgetprice,
                r.microdrive_price as microdriveprice,
                r.disk_price as diskprice,
                r.cartridge_price as cartridgeprice,
                d.file_size      as size,
                d.file_link      as url,
                filet.text     as type,
                ex.text    as format,
                origint.text   as origin,
                d.file_code    as code,
                d.file_barcode as barcode,
                d.file_dl      as dl,
                schemet.text   as encodingscheme
from   releases r
       left join aliases aka
              on aka.entry_id = r.entry_id
                 and aka.release_seq = r.release_seq
       inner join entries e
               on e.id = r.entry_id
       left join publishers p
               on p.entry_id = r.entry_id
                  and p.release_seq = r.release_seq
       left join labels pub
			   on p.label_id = pub.id
	   left join labeltypes lt
	   		   on lt.id = pub.labeltype_id
       left join countries pc1
              on pub.country_id = pc1.id
       left join downloads d
              on d.entry_id = r.entry_id and d.release_seq = r.release_seq and (d.filetype_id IN (46, 47) OR d.filetype_id BETWEEN 8 AND 22)
       left join filetypes filet
              on d.filetype_id = filet.id
      left join extensions ex on right(d.file_link, length(ex.ext)) = ex.ext
       left join sourcetypes origint
              on d.sourcetype_id = origint.id
       left join schemetypes schemet
              on d.schemetype_id = schemet.id
where  r.entry_id = 2259
order  by r.release_seq, pub.name, pc1.text,url, as_title, format

ID: 2000011 as title
ID: 0003012 releases with year
ID: 0009362 distribution denied (url is null)

+-----+-----------------+---------------------------------------+--------------------+---------+---------------+--------------+-------------+-----------------+-----------+----------------+-------+---------------------------------------------------------------+------------+--------------------+----------------------+------+---------------+--------------+----------------+
| seq | title           | as_title                              | name               | country | yearofrelease | releaseprice | budgetprice | microdriveprice | diskprice | cartridgeprice | size  | url                                                           | type       | format             | origin               | code | barcode       | dl           | encodingscheme |
+-----+-----------------+---------------------------------------+--------------------+---------+---------------+--------------+-------------+-----------------+-----------+----------------+-------+---------------------------------------------------------------+------------+--------------------+----------------------+------+---------------+--------------+----------------+
| 0   | Head over Heels | Foot and Mouth                        | Ocean Software Ltd | UK      | 1987          | £7.95        | NULL        | NULL            | NULL      | NULL           | 38570 | /pub/sinclair/games/h/HeadOverHeels.tzx.zip                   | Tape image | Perfect tape (TZX) | Original release (O) | NULL | 5013156011085 | NULL         | SpeedLock 2    |
| 0   | Head over Heels | Foot and Mouth                        | Ocean Software Ltd | UK      | 1987          | £7.95        | NULL        | NULL            | NULL      | NULL           | 37132 | /pub/sinclair/games/h/HeadOverHeels.tap.zip                   | Tape image | Tape (TAP)         | NULL                 | NULL | NULL          | NULL         | Undetermined   |
| 1   | Head over Heels | NULL                                  | EDOS               | UK      | NULL          | NULL         | NULL        | NULL            | NULL      | NULL           | NULL  | NULL                                                          | NULL       | NULL               | NULL                 | NULL | NULL          | NULL         | NULL           |
| 2   | Head over Heels | NULL                                  | Erbe Software S.A. | Spain   | 1987          | NULL         | NULL        | NULL            | NULL      | NULL           | 37158 | /pub/sinclair/games/h/HeadOverHeels(ErbeSoftwareS.A.).tzx.zip | Tape image | Perfect tape (TZX) | Re-release (R)       | NULL | NULL          | M-11919-1987 | None           |
| 3   | Head over Heels | NULL                                  | IBSA               | Spain   | 1987          | NULL         | NULL        | NULL            | NULL      | NULL           | NULL  | NULL                                                          | NULL       | NULL               | NULL                 | NULL | NULL          | NULL         | NULL           |
| 4   | Head over Heels | ARCADE COLLECTION 12: Head over Heels | The Hit Squad      | UK      | 1990          | £2.99        | NULL        | NULL            | NULL      | NULL           | 38504 | /pub/sinclair/games/h/HeadOverHeels(TheHitSquad).tzx.zip      | Tape image | Perfect tape (TZX) | Re-release (R)       | AC12 | 5013156410802 | NULL         | SpeedLock 2    |
+-----+-----------------+---------------------------------------+--------------------+---------+---------------+--------------+-------------+-----------------+-----------+----------------+-------+---------------------------------------------------------------+------------+--------------------+----------------------+------+---------------+--------------+----------------+

 */
var getReleases = function (id) {
  var deferred = Q.defer();
  var connection = db.getConnection();
  connection.query(
    "select distinct r.release_seq as seq, e.title as title, aka.title as as_title, IFNULL(pub.name, m.name) as name, IFNULL(pc1.text, co.text) as country,IFNULL(lt.text, so.publication) as labeltype,IFNULL(p.publisher_seq, 0) as pseq, r.release_year as yearofrelease, r.release_price as releaseprice, c.name as cur_name, c.symbol as cur_symbol, c.prefix as cur_prefix, r.budget_price as budgetprice, r.microdrive_price as microdriveprice, r.disk_price as diskprice, r.cartridge_price as cartridgeprice, d.file_size as size, d.file_link as url, filet.text as type, ex.text as format, origint.text as origin, d.file_code as code, d.file_barcode as barcode, d.file_dl as dl, schemet.text as encodingscheme from releases r left join currencies c ON c.id = r.currency_id left join aliases aka on aka.entry_id = r.entry_id and aka.release_seq = r.release_seq inner join entries e on e.id = r.entry_id left join publishers p on p.entry_id = r.entry_id and p.release_seq = r.release_seq left join labels pub on p.label_id = pub.id left join labeltypes lt on lt.id = pub.labeltype_id left join countries pc1 on pub.country_id = pc1.id left join downloads d on d.entry_id = r.entry_id and d.release_seq = r.release_seq and (d.filetype_id IN (46, 47) OR d.filetype_id BETWEEN 8 AND 22) left join filetypes filet on d.filetype_id = filet.id left join extensions ex on right(d.file_link, length(ex.ext)) = ex.ext left join sourcetypes origint on d.sourcetype_id = origint.id left join schemetypes schemet on d.schemetype_id = schemet.id left join search_by_origins so ON so.entry_id = r.entry_id left join issues ii ON ii.id = so.issue_id LEFT JOIN magazines m ON m.id = ii.magazine_id LEFT JOIN labels l ON l.id = m.label_id LEFT JOIN countries co ON co.id = l.country_id where r.entry_id = ? order by r.release_seq, p.publisher_seq, as_title, pub.name, pc1.text, url, type, format",
    [id],
    function (error, results, fields) {
      if (error) {
        throw error;
      }
      var arr = [];
      var i = 0;
      var preRelSeq = -1;
      var prePubSeq = -1;

      var item = {};
      for (; i < results.length; i++) {
        var releaseSeq = results[i].seq;
        var pubSeq = results[i].seq;

        if (releaseSeq !== preRelSeq) {
          if (preRelSeq !== -1) {
            arr.push(utils.removeEmpty(item));
          }
          // build new base item for release
          item = {
            releaseSeq: results[i].seq,
            publishers: [],
            releaseTitles: [],
            yearOfRelease: results[i].yearofrelease,
            // releasePrice: results[i].releaseprice,
            releasePrice: utils.priceHelper(
              results[i].releaseprice,
              results[i].cur_name,
              results[i].cur_symbol,
              results[i].cur_prefix
            ),
            // budgetPrice: results[i].budgetprice,
            budgetPrice: utils.priceHelper(
              results[i].budgetprice,
              results[i].cur_name,
              results[i].cur_symbol,
              results[i].cur_prefix
            ),
            // microdrivePrice: results[i].microdriveprice,
            microdrivePrice: utils.priceHelper(
              results[i].microdriveprice,
              results[i].cur_name,
              results[i].cur_symbol,
              results[i].cur_prefix
            ),
            // diskPrice: results[i].diskprice,
            diskPrice: utils.priceHelper(results[i].diskprice, results[i].cur_name, results[i].cur_symbol, results[i].cur_prefix),

            // cartridgePrice: results[i].cartridgeprice,
            cartridgePrice: utils.priceHelper(
              results[i].cartridgeprice,
              results[i].cur_name,
              results[i].cur_symbol,
              results[i].cur_prefix
            ),
            code: results[i].code,
            barcode: results[i].barcode,
            dl: results[i].dl,
            files: [],
          };
        }

        // add release title, if it's not already there
        var releaseTitle = results[i].as_title;
        if (!item.releaseTitles.includes(releaseTitle)) {
          if (releaseTitle) {
            item.releaseTitles.push(releaseTitle);
          }
        }

        // add publisher, if it's not already there
        var publisher = {
          publisherSeq: results[i].pseq,
          name: results[i].name,
          country: results[i].country,
          labelType: results[i].labeltype,
        };

        // lookup publisher name
        var pubLookup = item.publishers.find((e) => e.name == publisher.name);
        if (!pubLookup && !utils.isAllPropertiesNull(publisher)) {
          item.publishers.push(publisher);
        }

        var file = {
          path: results[i].url,
          size: results[i].size,
          type: results[i].type,
          format: results[i].format,
          origin: results[i].origin,
          encodingScheme: results[i].encodingscheme,
        };

        var fileLookup = item.files.find((e) => e.path == file.path);
        if (!fileLookup) {
          if (!utils.isAllPropertiesNull(file)) {
            item.files.push(file);
          }
        }
        preRelSeq = releaseSeq;
        prePubSeq = pubSeq;
      }
      arr.push(utils.removeEmpty(item));

      // console.log(arr);
      deferred.resolve({ releases: arr });
    }
  );
  return deferred.promise;
};

module.exports = {
  getReleases: getReleases,
};
