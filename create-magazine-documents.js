/**

DOCUMENTATION HELPER:
docker exec -i zxdb mysql -uroot -pzxdb1234 zxdb -e "select * from controltypes;"

COPY/PASTE into https://ozh.github.io/ascii-tables/

COPY/PASTE RESULT INTO COMMENTS

*/

'use strict';

var db = require('./dbConfig');

var json_output_dir = 'data/magazines/json/';

var Q = require('Q');
var jsonfile = require('jsonfile')
var path = require('path');
var allcombinations = require('allcombinations')
var _ = require('lodash');

/*********************************************
UTILITY FUNCTIONS
*********************************************/

/*
    Remove empty properties from a JSON object. Only first level
 */
var removeEmpty = function(item) {
    for (var property in item) {
        if (item.hasOwnProperty(property)) {
            var value = item[property];
            if (value === undefined || value === null || value.length === 0 ||  (Object.keys(value).length === 0) && value.constructor === Object) {
                delete item[property];
            }
        }
    }

    return item;
}

/**
select m.name, m.is_electronic, i.text as language, m.link_mask, m.archive_mask from magazines m left join idioms i on i.id = m.idiom_id where m.id = 1
*/
var getMagazineInfo = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select m.name, m.is_electronic, i.text as language, m.link_mask, m.archive_mask from magazines m left join idioms i on i.id = m.idiom_id where m.id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }

        var doc = {
            name: results[0].name,
            is_electronic: results[0].is_electronic === '1' ? true : false,
            language: results[0].language,
            link_mask: results[0].link_mask,
            archive_mask: results[0].archive_mask
        }
        deferred.resolve(removeEmpty(doc));
    });
    return deferred.promise;
}

var getIssues = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select * from issues where magazine_id = ?', [id], function(error, results, fields) {
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
                files: magfiles
            }
            arr.push(removeEmpty(issue));
        }
        deferred.resolve({ issues: arr });
    });
    return deferred.promise;
}

/**
id  referencetype_id  entry_id  label_id  topic_id  issue_id  page  is_supplement   link  link2   feature_id  

select
mr.id 
rt.text
from magrefs mr
left join referencetypes rt on rt.id = mr.referencetype_id

*/
var getMagRefs = function(issue_id) {
    var done = false;
    var arr = [];
    var connection = db.getConnection();
    connection.query('SELECT mr.id, rt.text AS referencetype, mr.entry_id, e.title as entry_title, ml.name as magrefs_name, mr.page, mr.is_supplement, mr.link, mr.link2, t.name AS topic, tt.text AS topictype, lt.name as topic_name, t.comment, f.name AS feature, f.version, l.name as feature_name, l2.name as feature_name2, h.title as host_title, h.link as host_link FROM magrefs mr LEFT JOIN referencetypes rt ON rt.id = mr.referencetype_id LEFT JOIN entries e ON e.id = mr.entry_id LEFT JOIN labels ml ON ml.id = mr.label_id LEFT JOIN topics t ON t.id = mr.topic_id LEFT JOIN topictypes tt ON tt.id = t.topictype_id LEFT JOIN labels lt ON lt.id = t.label_id LEFT JOIN features f ON f.id = mr.feature_id LEFT JOIN labels l ON l.id = f.label_id LEFT JOIN labels l2 ON l2.id = f.label2_id LEFT JOIN hosts h on h.id = f.host_id WHERE mr.issue_id = ? ORDER BY page asc', [issue_id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var i = 0;
        for (; i < results.length; i++) {
            var ref = {
                type: results[i].referencetype,
                entry_id: results[i].entry_id,
                entry_title: results[i].entry_title,
                magrefs_name: results[i].magrefs_name,
                page: results[i].page,
                is_supplement: results[i].is_supplement,
                link: results[i].link,
                link2: results[i].link2,
                topic: results[i].topic,
                topictype: results[i].topictype,
                topic_nama: results[i].topic_nama,
                comment: results[i].comment,
                features: results[i].feature,
                version: results[i].version,
                feature_name: results[i].feature_name,
                feature_name2: results[i].feature_name2,
                host_title: results[i].host_title,
                host_link: results[i].host_link
            }
            arr.push(removeEmpty(ref));
        }
        done = true;

    });

    var deasync = require('deasync');
    deasync.loopWhile(function() {
        return !done;
    });
    return arr;
}

/**
SELECT * FROM magfiles mf WHERE issue_id in (select id from issues where magazine_id = 51)
*/
var getMagFiles = function(issue_id) {
    var done = false;
    var arr = [];
    var connection = db.getConnection();
    connection.query('SELECT ft.text as filetype, fmt.text as formattype, mf.page, mf.file_link, mf.file_date, mf.file_size, mf.comments FROM magfiles mf LEFT JOIN filetypes ft on ft.id = mf.filetype_id LEFT JOIN formattypes fmt on fmt.id = mf.formattype_id WHERE issue_id = ?', [issue_id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var i = 0;
        for (; i < results.length; i++) {
            var file = {
                filetype: results[i].filetype,
                formattype: results[i].formattype,
                page: results[i].page,
                file_link: results[i].file_link,
                file_date: results[i].file_date,
                file_size: results[i].file_size,
                comments: results[i].comments
            }
            arr.push(removeEmpty(file));
        }
        done = true;

    });

    var deasync = require('deasync');
    deasync.loopWhile(function() {
        return !done;
    });
    return arr;
}

/**

select * from magrefs where filetype_id = 55

 */
var getMagCover = function(issue_id) {
    var done = false;
    var cover = null;
    var connection = db.getConnection();
    connection.query('select file_link from magfiles where filetype_id = 55 and issue_id = ?', [issue_id], function(error, results, fields) {
        if (error) {
            throw error;
        }

        if (results.length === 0) {
            // console.log("no cover found...");
        } else if (results.length === 1) {
            // console.log("found");
            cover = results[0].file_link;
        } else {
            console.warn("more than one cover, check issue_id = ", issue_id);
        }
        done = true;
    });

    var deasync = require('deasync');
    deasync.loopWhile(function() {
        return !done;
    });
    return cover;
}

/*********************************************
 *
 *
 */
var magazine_doc = function(id) {
    var done = false;
    Q.all([getMagazineInfo(id),
        getIssues(id)
    ]).then(function(results) {
        var i = 0;
        var doc_array = {};
        for (; i < results.length; i++) {
            for (var attributename in results[i]) {
                doc_array[attributename] = results[i][attributename];
            }
        }

        var zerofilled = ('0000000' + id).slice(-7);
        var filename = json_output_dir + zerofilled + ".json";
        jsonfile.writeFile(filename, doc_array, { spaces: 2 }, function(err) {
            if (err) {
                throw err;
            }
            var zerofilled = ('0000000' + id).slice(-7);
            console.log('saved file: ', filename);
            done = true;
        })
    });

    var deasync = require('deasync');
    deasync.loopWhile(function() {
        return !done;
    });
}

var getAllIDs = function() {
    var connection = db.getConnection();
    var done = false;
    connection.query('select id from magazines where 1', function(error, results, fields) {
        if (error) {
            throw error;
        }
        var i = 0;
        for (; i < results.length; i++) {
            magazine_doc(results[i].id);
        }
        done = true;
    });
    require('deasync').loopWhile(function() {
        return !done;
    });
    console.log("Finished!");
    db.closeConnection(connection);
}

var getID = function(zxdb_id) {
    var connection = db.getConnection();
    var done = false;
    connection.query('select id from entries where id = ? order by id asc', [zxdb_id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var i = 0;
        for (; i < results.length; i++) {
            zxdb_doc(results[i].id);
        }
        done = true;
    });
    require('deasync').loopWhile(function() {
        return !done;
    });
    console.log("Finished!");
    db.closeConnection(connection);
}

getAllIDs();