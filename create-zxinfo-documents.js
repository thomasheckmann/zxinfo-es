'use strict';

var mariadb_username = 'root';
var mariadb_password = 'zxdb1234';
var mariadb_dbname = 'zxdb';

var json_output_dir = 'data/processed/json/';

var mysql = require('mysql');
var Q = require('Q');
var jsonfile = require('jsonfile')
var path = require('path');

var pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: mariadb_username,
    password: mariadb_password,
    database: mariadb_dbname
});

var usedConnection = 0;
pool.on('acquire', function(connection) {
    usedConnection++;
    // console.log('==> Connection %d acquired (%d)', connection.threadId, usedConnection);
});
pool.on('connection', function(connection) {
    console.log('+== Connection %d is made', connection.threadId);
});
pool.on('release', function(connection) {
    usedConnection--;
    //console.log('<== Connection %d released (%d)', connection.threadId, usedConnection);
});

function getConnection() {
    return pool;
}
/**
 * Get basic info

SELECT e.title AS fulltitle,aka.title AS alsoknownas,
       r.release_year AS yearofrelease,
       machinet.text AS machinetype,e.max_players AS numberofplayers,
       turnt.text AS multiplayermode,multipl.text AS multiplayertype,
       entryt.text AS type,idm.text AS messagelanguage,
       pubt.text AS originalpublication,r.release_price AS originalprice,
       availt.text AS availability,e.comments AS remarks,sc.score AS score,
       sc.votes AS votes
FROM   entries e
       INNER JOIN releases r
               ON r.entry_id = e.id
       LEFT JOIN aliases aka
              ON aka.entry_id = r.entry_id
                 AND aka.release_seq = r.release_seq
       LEFT JOIN availabletypes availt
              ON e.availabletype_id = availt.id
       LEFT JOIN machinetypes machinet
              ON e.machinetype_id = machinet.id
       LEFT JOIN turntypes turnt
              ON e.turntype_id = turnt.id
       LEFT JOIN multiplaytypes multipl
              ON e.multiplaytype_id = multipl.id
       LEFT JOIN genretypes entryt
              ON e.genretype_id = entryt.id
       LEFT JOIN publicationtypes pubt
              ON e.publicationtype_id = pubt.id
       LEFT JOIN idioms idm
              ON e.idiom_id = idm.id
       LEFT JOIN scores sc
              ON sc.entry_id = e.id
WHERE  e.id = 2259
   AND r.release_seq = 0; 

 */
var getBasicInfo = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select e.title as fulltitle, aka.title as alsoknownas, r.release_year as yearofrelease, machinet.text as machinetype, e.max_players as numberofplayers, turnt.text as multiplayermode, multipl.text as multiplayertype, entryt.text as type, idm.text as messagelanguage, pubt.text as originalpublication, r.release_price as originalprice, availt.text as availability, e.comments as remarks, e.spot_comments as spotcomments, sc.score as score, sc.votes as votes from entries e inner join releases r on r.entry_id = e.id left join aliases aka on aka.entry_id = r.entry_id and aka.release_seq = r.release_seq left join availabletypes availt on e.availabletype_id = availt.id left join machinetypes machinet on e.machinetype_id = machinet.id left join turntypes turnt on e.turntype_id = turnt.id left join multiplaytypes multipl on e.multiplaytype_id = multipl.id left join genretypes entryt on e.genretype_id = entryt.id left join publicationtypes pubt on e.publicationtype_id = pubt.id left join idioms idm on e.idiom_id = idm.id left join scores sc on sc.entry_id = e.id where e.id = ? and r.release_seq = 0', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }

        var price = results[0].originalprice;
        var amount, currency;
        if (price == null) {
            console.error("ERROR: ", id + " price undefined");
        } else if (price.startsWith("£")) {
            currency = "£";
            amount = price.substring(1, price.length);
        } else {
            console.error("ERROR: ", id + " UNKNOWN PRICE: ", price);
        }

        var entrytypes, type, subtype;
        if (results[0].type == undefined) {
            console.error("ERROR: ", id + ": MISSING type");
        } else {
            entrytypes = results[0].type.split(": ");
            type = entrytypes[0];
            subtype = entrytypes[1];
        }
       var doc = {
            fulltitle: results[0].fulltitle,
            alsoknownas: results[0].alsoknownas,
            yearofrelease: results[0].yearofrelease,
            machinetype: results[0].machinetype,
            numberofplayers: results[0].numberofplayers,
            multiplayermode: results[0].multiplayermode,
            multiplayertype: results[0].multiplayertype,
            type: type,
            subtype: subtype,
            messagelanguage: results[0].messagelanguage,
            originalpublication: results[0].originalpublication,
            originalprice: [{
                // results[0].originalprice,
                amount: amount,
                currency: currency
            }],
            availability: results[0].availability,
            remarks: results[0].remarks,
            spotcomments: results[0].spotcomments,
            score: {
                score: results[0].score,
                votes: results[0].votes
            }
        }
        deferred.resolve(doc);
    });
    return deferred.promise;

    // return deferred.promise;
}

/**
 * Get publisher

 -- Main publisher
SELECT pub.name AS name,pc1.text AS country
FROM   publishers p
       INNER JOIN labels pub
               ON p.label_id = pub.id
       LEFT JOIN countries pc1
              ON pub.country_id = pc1.id
WHERE  p.entry_id = 21343
   AND p.release_seq = 0 

 */
var getPublisher = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select pub.name as name, pc1.text as country from publishers p inner join labels pub on p.label_id = pub.id left join countries pc1 on pub.country_id = pc1.id where p.entry_id = ? and p.release_seq = 0', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                name: results[i].name,
                country: results[i].country,
            }
            arr.push(item);
        }
        deferred.resolve({ publisher: arr });
    });
    return deferred.promise;
}

/**
 * Get re-released by
 */
var getReReleasedBy = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select pub.name as name, pc1.text as country from releases r inner join publishers p on p.entry_id = r.entry_id and p.release_seq = r.release_seq inner join labels pub on p.label_id = pub.id left join countries pc1 on pub.country_id = pc1.id where r.entry_id = ? and r.release_seq > 0', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                name: results[i].name,
                country: results[i].country,
            }
            arr.push(item);
        }
        deferred.resolve({ rereleasedby: arr });
    });
    return deferred.promise;
}

/**
     * Get authors
    David J. Anderson   Platinum Productions
    Ian Morrison        Platinum Productions
    Alan Laird          Platinum Productions
    F. David Thorpe     NULL

SELECT dev.name AS name,team.name AS dev_group
FROM   authors aut
       INNER JOIN labels dev
               ON aut.label_id = dev.id
       LEFT JOIN countries ac1
              ON dev.country_id = ac1.id
       LEFT JOIN labels team
              ON aut.team_id = team.id
       LEFT JOIN countries tc1
              ON team.country_id = tc1.id
WHERE  aut.entry_id = ? 

     */
var getAuthors = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select dev.name as name, team.name as dev_group from authors aut inner join labels dev on aut.label_id = dev.id left join countries ac1 on dev.country_id = ac1.id left join labels team on aut.team_id = team.id left join countries tc1 on team.country_id = tc1.id where aut.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        var group;
        var tmparr = [];
        for (; i < results.length; i++) {
            if (group != results[i].dev_group) {
                if (tmparr.length > 0) {
                    arr.push({ authors: tmparr, group: group })
                }
                group = results[i].dev_group;
                tmparr = [];
            }
            tmparr.push(results[i].name);
        }
        if (tmparr.length > 0) {
            arr.push({ authors: tmparr })
        }
        deferred.resolve({ authors: arr });
    });
    return deferred.promise;
}

/**
 * Get authoring

-- This program was authored with the following tools...
SELECT dev.name AS name,team.name AS dev_group
FROM   authors aut
       INNER JOIN labels dev
               ON aut.label_id = dev.id
       LEFT JOIN countries ac1
              ON dev.country_id = ac1.id
       LEFT JOIN labels team
              ON aut.team_id = team.id
       LEFT JOIN countries tc1
              ON team.country_id = tc1.id
WHERE  aut.entry_id = ? 

 */
var getAuthoring = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select tool.title, pub.name as publisher from authorings iaut inner join entries tool on iaut.util_id = tool.id left join publishers p on p.entry_id = tool.id left join labels pub on p.label_id = pub.id where iaut.entry_id = ? and p.release_seq = 0', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                title: results[i].title,
                publisher: results[i].publisher
            }
            arr.push(item);
        }
        deferred.resolve({ authoring: arr });
    });
    return deferred.promise;
}

/**
 * Get controls

SELECT ctrt.text AS control
FROM   controls ctr
       INNER JOIN controltypes ctrt
               ON ctr.controltype_id = ctrt.id
WHERE  ctr.entry_id = 996 

 */
var getControls = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select ctrt.text as control from controls ctr inner join controltypes ctrt on ctr.controltype_id = ctrt.id where ctr.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var control = { control: results[i].control };
            arr.push(control);
        }
        deferred.resolve({ controls: arr });
    });
    return deferred.promise;
}

/**
 * Get inspired / tie-in license

 -- This program was licensed from or inspired by...
SELECT ll.name AS name,lc1.text AS country,lict.text AS type,lic.name
       originalname
FROM   entries e
       INNER JOIN licenses lic
               ON e.license_id = lic.id
       INNER JOIN licensetypes lict
               ON lic.licensetype_id = lict.id
       LEFT JOIN licensors lor
              ON lor.license_id = lic.id
       LEFT JOIN labels ll
              ON lor.label_id = ll.id
       LEFT JOIN countries lc1
              ON ll.country_id = lc1.id
WHERE  e.id = 996; 

 */
var getInspiredByTieInLicense = function(connection) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select ll.name as name, lc1.text as country, lict.text as type, lic.name as originalname from entries e inner join licenses lic on e.license_id = lic.id inner join licensetypes lict on lic.licensetype_id = lict.id left join licensors lor on lor.license_id = lic.id left join labels ll on lor.label_id = ll.id left join countries lc1 on ll.country_id = lc1.id where e.id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var doc;
        if (results.length == 0) {
            doc = undefined;
        } else {
            doc = [];
            var i = 0;
            for (; i < results.length; i++) {
                var item = {
                    name: results[i].name,
                    country: results[i].country,
                    type: results[i].type,
                    originalname: results[i].originalname
                };
                doc.push(item);
            }

        }
        deferred.resolve({ licensed: doc });
    });
    return deferred.promise;
}

/**
 * Get series

 -- This program belongs in the following series (with these other titles)...
SELECT prog.title AS title,pub.name AS publisher
FROM   entries e
       INNER JOIN members memb
               ON memb.entry_id = e.id
       INNER JOIN groups g
               ON memb.group_id = g.id
       INNER JOIN grouptypes groupt
               ON g.grouptype_id = groupt.id
                  AND groupt.id IN ( "n", "s", "u" )
       INNER JOIN members others
               ON others.group_id = g.id
       INNER JOIN entries prog
               ON others.entry_id = prog.id
       LEFT JOIN publishers p
              ON p.entry_id = e.id
       LEFT JOIN labels pub
              ON p.label_id = pub.id
WHERE  e.id = 9372
   AND p.release_seq = 0
ORDER  BY others.series_seq ASC 

 */
var getSeries = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select prog.title as title, pub.name as publisher from entries e inner join members memb on memb.entry_id = e.id inner join groups g on memb.group_id = g.id inner join grouptypes groupt on g.grouptype_id = groupt.id and groupt.id in ("N", "S", "U") inner join members others on others.group_id = g.id inner join entries prog on others.entry_id = prog.id left join publishers p on p.entry_id = e.id left join labels pub on p.label_id = pub.id where e.id = ? and p.release_seq = 0 order by others.series_seq ASC', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                title: results[i].title,
                publisher: results[i].publisher
            }
            arr.push(item);
        }
        deferred.resolve({ series: arr });
    });
    return deferred.promise;
}

/**
 * Get contents - content of compilation

-- This compilation content
SELECT ecomp.tape_side AS tape_side,ecomp.tape_seq AS tape_seq,
       ecomp.prog_seq AS prog_seq,item.title AS title,ll.name AS publisher
FROM   compilations ecomp
       INNER JOIN entries item
               ON ecomp.entry_id = item.id
       INNER JOIN variationtypes evart
               ON ecomp.variationtype_id = evart.id
       INNER JOIN publishers p
               ON p.entry_id = ecomp.entry_id
       LEFT JOIN labels ll
              ON p.label_id = ll.id
       LEFT JOIN countries lc1
              ON ll.country_id = lc1.id
WHERE  ecomp.compilation_id = 11869
   AND p.release_seq = 0 

 */
var getCompilationContent = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select ecomp.tape_side as tape_side, ecomp.tape_seq as tape_seq, ecomp.prog_seq as prog_seq, item.title as title, ll.name as publisher from compilations ecomp inner join entries item on ecomp.entry_id = item.id inner join variationtypes evart on ecomp.variationtype_id = evart.id inner join publishers p on p.entry_id = ecomp.entry_id left join labels ll on p.label_id = ll.id left join countries lc1 on ll.country_id = lc1.id where ecomp.compilation_id = ? and p.release_seq = 0', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                side: 'Tape ' + results[i].tape_seq + ", side " + results[i].tape_side,
                title: results[i].title,
                publisher: results[0].publisher,
                sequence: results[i].prog_seq
            }
            arr.push(item);
        }
        deferred.resolve({ contents: arr });
    });
    return deferred.promise;
}

/**
 * Get features

-- This program contains the following features... / participated in the following competitions...
-- Competition, Feature, Major Clone, Themed Group
SELECT g.name,groupt.id,groupt.text
FROM   members featinner
       JOIN groups g
         ON feat.group_id = g.idinner
       JOIN grouptypes groupt
         ON g.grouptype_id = groupt.id
            AND groupt.id NOT IN ( 'N', 'S', 'U' )
WHERE  feat.entry_id = 176; 

 */
var getFeatures = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select g.name, groupt.id, groupt.text from members feat inner join groups g on feat.group_id = g.id inner join grouptypes groupt on g.grouptype_id = groupt.id and groupt.id not in ("N", "S", "U") where feat.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                name: results[i].name,
                id: results[i].id,
                text: results[i].text
            }
            arr.push(item);
        }
        deferred.resolve({ features: arr });
    });
    return deferred.promise;
}

/**
 * Get sites

-- This program is also listed in the following sites...
SELECT relw.name AS sitename,rel.link
FROM   relatedlinks rel
       INNER JOIN websites relw
               ON rel.website_id = relw.id
WHERE  rel.entry_id = 176; 

 */
var getSites = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select relw.name as sitename, rel.link from relatedlinks rel inner join websites relw on rel.website_id = relw.id where rel.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                sitename: results[i].sitename,
                link: results[i].link
            }
            arr.push(item);
        }
        deferred.resolve({ sites: arr });
    });
    return deferred.promise;
}

/**
 * Get inCompilation

 -- This program appeared on the following compilations...
SELECT comp.title AS title,pub.name AS publisher,entryt.text AS type
FROM   compilations icomp
       INNER JOIN entries comp
         ON icomp.compilation_id = comp.id
       LEFT JOIN genretypes entryt
         ON comp.genretype_id = entryt.id
       LEFT JOIN publishers p
              ON p.entry_id = comp.id
       LEFT JOIN labels pub
         ON p.label_id = pub.id
WHERE  icomp.entry_id = 176
   AND p.release_seq = 0; 

 */
var getInCompilations = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select comp.title as title, pub.name as publisher, entryt.text as type from compilations icomp inner join entries comp on icomp.compilation_id = comp.id left join genretypes entryt on comp.genretype_id = entryt.id left join publishers p on p.entry_id = comp.id left join labels pub on p.label_id = pub.id where icomp.entry_id = ? and p.release_seq = 0', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                title: results[i].title,
                publisher: results[i].publisher,
                type: results[i].type
            }
            arr.push(item);
        }
        deferred.resolve({ incompilations: arr });
    });
    return deferred.promise;
}

/**
 * Get BookTypeIn

-- This program was published as type-in in the following books...
SELECT *
FROM   booktypeins bti
       INNER JOIN entries book
               ON bti.book_id = book.id
WHERE  bti.entry_id = 770; 

 */
var getBookTypeIns = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select * from booktypeins bti inner join entries book on bti.book_id = book.id where bti.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                title: results[i].title,
                bookid: results[i].book_id
            }
            arr.push(item);
        }
        deferred.resolve({ booktypeins: arr });
    });
    return deferred.promise;
}

/**
 * Get Downloads - game files, does not have a machinetype_id

SELECT d.file_link AS url,file_size AS size,filet.text AS type,
       origint.text AS origin,
       d.file_code AS code,d.file_barcode AS barcode,d.file_dl AS dl,
       schemet.text AS encodingscheme
FROM   downloads d
       INNER JOIN filetypes filet
               ON d.filetype_id = filet.id
       INNER JOIN origintypes origint
               ON d.origintype_id = origint.id
       LEFT JOIN schemetypes schemet
              ON d.schemetype_id = schemet.id
WHERE  d.file_link IS NOT NULL
   AND d.machinetype_id IS NOT NULL
   AND d.entry_id = ? 

 */
var getDownloads = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select d.file_link as url, file_size as size, filet.text as type, origint.text as origin, d.file_code as code, d.file_barcode as barcode, d.file_dl as dl, schemet.text as encodingscheme from downloads d inner join filetypes filet on d.filetype_id = filet.id inner join origintypes origint on d.origintype_id = origint.id left join schemetypes schemet on d.schemetype_id = schemet.id where d.file_link is NOT NULL and d.machinetype_id is not NULL and d.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var downloaditem = {
                filename: path.basename(results[i].url),
                url: results[i].url,
                size: results[i].size,
                type: results[i].type,
                origin: results[i].origin,
                code: results[i].code,
                barcode: results[i].barcode,
                dl: results[i].dl,
                encodingscheme: results[i].encodingscheme
            }
            arr.push(downloaditem);
        }
        deferred.resolve({ downloads: arr });
    });
    return deferred.promise;
}

/**
 * Get additionals (Everything else that is not machine specific - simple output)

SELECT d.file_link AS url,file_size AS size,filet.text AS type
FROM   downloads d
       INNER JOIN filetypes filet
               ON d.filetype_id = filet.id
WHERE  d.machinetype_id IS NULL
   AND d.entry_id = ? 

 */
var getAdditionals = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select d.file_link as url, file_size as size, filet.text as type from downloads d inner join filetypes filet on d.filetype_id = filet.id where d.machinetype_id is NULL and d.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            if (results[i].url == undefined) {
                console.log(id + ": empty additionals: ");
            } else {
                var downloaditem = {
                    filename: path.basename(results[i].url),
                    url: results[i].url,
                    size: results[i].size,
                    type: results[i].type
                }
                arr.push(downloaditem);
            }
        }
        deferred.resolve({ additionals: arr });
    });
    return deferred.promise;
}

/**
 * Get MagazineRefs

 Same as Adverts, just negate IN clause
 */
var getMagazineRefs = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select m.name as magazine, i.date_year as issueyear, i.date_month as issueno, ref.page as pageno, reft.text as magazine_type, f.name as magazine_text, m.link_mask from entries e inner join magrefs ref on ref.entry_id = e.id inner join features f on ref.feature_id = f.id inner join referencetypes reft on ref.referencetype_id = reft.id inner join issues i on ref.issue_id = i.id inner join magazines m on i.magazine_id = m.id where e.id = ? and ref.referencetype_id not in (1, 2, 3, 15) order by date_year, date_month', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                magazine: results[i].magazine,
                issue: results[i].issueno + "." + results[i].issueyear,
                issueyear: results[i].issueyear,
                issueno: results[i].issueno,
                page: results[i].pageno + "",
                pageno: results[i].pageno,
                magazine_type: results[i].magazine_type + ' - ' + results[i].magazine_text,
                link_mask: results[i].link_mask
            }
            arr.push(item);
        }
        deferred.resolve({ magrefs: arr });
    });
    return deferred.promise;
}

/**
 * Get Adverts

-- Magazine references about this program (Adverts)
SELECT m.name AS magazine,i.date_year AS issueyear,i.date_month AS issueno,
       ref.page AS pageno,reft.text AS magazine_type,f.name AS magazine_text,
       m.link_mask
FROM   entries e
       INNER JOIN magrefs ref
               ON ref.entry_id = e.id
       INNER JOIN features f
               ON ref.feature_id = f.id
       INNER JOIN referencetypes reft
               ON ref.referencetype_id = reft.id
       INNER JOIN issues i
               ON ref.issue_id = i.id
       INNER JOIN magazines m
               ON i.magazine_id = m.id
WHERE  e.id = 996
   AND ref.referencetype_id IN ( 1, 2, 3, 15 )
ORDER  BY date_year,date_month 

 */
var getAdverts = function(id) {
    var deferred = Q.defer();
    var connection = getConnection();
    connection.query('select m.name as magazine, i.date_year as issueyear, i.date_month as issueno, ref.page as pageno, reft.text as magazine_type, f.name as magazine_text, m.link_mask from entries e inner join magrefs ref on ref.entry_id = e.id inner join features f on ref.feature_id = f.id inner join referencetypes reft on ref.referencetype_id = reft.id inner join issues i on ref.issue_id = i.id inner join magazines m on i.magazine_id = m.id where e.id = ? and ref.referencetype_id in (1, 2, 3, 15) order by date_year, date_month', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                magazine: results[i].magazine,
                issue: results[i].issueno + "." + results[i].issueyear,
                issueyear: results[i].issueyear,
                issueno: results[i].issueno,
                page: results[i].pageno + "",
                pageno: results[i].pageno,
                magazine_type: results[i].magazine_type + ' - ' + results[i].magazine_text,
                link_mask: results[i].link_mask
            }
            arr.push(item);
        }
        deferred.resolve({ adverts: arr });
    });
    return deferred.promise;
}


/*
 * #############################################
 */


var zxdb_doc = function(id) {
    var done = false;
     Q.all([getBasicInfo(id),
        getPublisher(id),
        getReReleasedBy(id),
        getAuthors(id),
        getAuthoring(id),
        getControls(id),
        getInspiredByTieInLicense(id),
        getSeries(id),
        getCompilationContent(id),
        getFeatures(id),
        getSites(id),
        getInCompilations(id),
        getBookTypeIns(id),
        getDownloads(id),
        getAdditionals(id),
        getMagazineRefs(id),
        getAdverts(id)
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
    require('deasync').loopWhile(function(){return !done;});
}

var getAllIDs = function() {
    var connection = getConnection();
    var done = false;
    connection.query('select id from entries where 1 order by id asc', function(error, results, fields) {
        if (error) {
            throw new Error("Can't connect: ", err.stack);
        }
        var i = 0;
        for (; i < results.length; i++) {
            zxdb_doc(results[i].id);
        }
        done = true;
    });
    require('deasync').loopWhile(function(){return !done;});
    console.log("Finished!");
    pool.end();
}

getAllIDs();
