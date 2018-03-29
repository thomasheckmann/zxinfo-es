/**

dd.mm.yyyy

Changelog:
20.04.2018 - JSON cleanup - https://github.com/thomasheckmann/zxinfo-services/issues/8
30.11.2017 - author object changed from simple string, to object {name, country, alias}
06.09.2017 - sites -> relatedlinks (and remove site if it exits as a general ZXDB integrated website)
05.09.2017 - Variations (on Compilations) added to document
24.08.2017 - Table "bases" was renamed to "frameworks". This table associates games with the tools used to build it (like PAW, AGD, NIRVANA, etc).
15.08.2017 - Table "authorings" was renamed to "bases". This table associates games with the tools used to build it (like PAW, AGD, NIRVANA, etc).

MATCH (n) DETACH DELETE n


DOCUMENTATION HELPER:
docker exec -i zxdb mysql -uroot -pzxdb1234 zxdb -e "select * from controltypes;"

COPY/PASTE into https://ozh.github.io/ascii-tables/

COPY/PASTE RESULT INTO COMMENTS

*/

'use strict';

var db = require('./dbConfig');

var json_output_dir = 'data/processed/json/';

var Q = require('Q');
var jsonfile = require('jsonfile')
var path = require('path');
var allcombinations = require('allcombinations')
var _ = require('lodash');

Array.prototype.contains = function(element) {
    return this.indexOf(element) > -1;
};

var priceHelper = function(price, id) {
    var amount, currency, license;
    if (price == null) {
        return undefined;
    } else if (["Freeware", "P&P only", "Public Domain", "Rental", "GPL", "Creative Commons", "Commercial", "Commercial / Full price"].contains(price)) {
        license = price;
    } else if (price.startsWith("£")) {
        currency = "£";
        amount = price.substring(1, price.length);
    } else if (price.startsWith("$")) {
        currency = "$";
        amount = price.substring(1, price.length);
    } else if (price.startsWith("€")) {
        currency = "€";
        amount = price.substring(1, price.length);
    } else if (price.startsWith("Lit.")) {
        currency = "Lit.";
        amount = price.substring(5, price.length);
    } else if (price.endsWith("ptas.")) {
        amount = price.substring(0, price.indexOf(" ptas."));
        currency = "ptas.";
    } else if (price.endsWith("DM")) {
        amount = price.substring(0, price.indexOf(" DM"));
        currency = "DM";
    } else if (price.endsWith("Sk")) {
        amount = price.substring(0, price.indexOf(" Sk"));
        currency = "Sk";
    } else if (price.endsWith("Fr.")) {
        amount = price.substring(0, price.indexOf(" Fr."));
        currency = "Fr.";
    } else if (price.endsWith("HUF")) {
        amount = price.substring(0, price.indexOf(" HUF"));
        currency = "HUF";
    } else if (price.endsWith("zloty")) {
        amount = price.substring(0, price.indexOf(" zloty"));
        currency = "zloty";
    } else if (price.endsWith("dinarjev")) {
        amount = price.substring(0, price.indexOf(" dinarjev"));
        currency = "dinarjev";
    } else {
        amount = price;
        currency = "N/A";
        // console.error("ERROR: ", id + " UNKNOWN PRICE: ", price);
    }
    return { amount: amount, currency: currency, license: license };
}

/**
  Returns content type based on genre type (e.g. Book, Covertape etc...)

  * Software
  * Hardware
  * Books

 */
var contenttype = function(genretype) {
    var result = "SOFTWARE";
    if (genretype < 84) {
        result = "SOFTWARE";
    } else if (genretype < 91) {
        result = "BOOK";
    } else if (genretype < 109) {
        result = "HARDWARE";
    } else {
        result = "SOFTWARE";
    }

    return result;
}

/**
 * Get basic info

--
SELECT e.title AS fulltitle,aka.title AS alsoknownas,
       r.release_year AS yearofrelease,
       r.release_month AS monthofrelease,
       r_release_day AS dayofrelease,
       machinet.text AS machinetype,e.max_players AS numberofplayers,
       turnt.text AS multiplayermode,multipl.text AS multiplayertype,
       e.genretype_id as genretype, entryt.text AS type, e.book_isbn as isbn, idm.text AS messagelanguage,
       pubt.text AS originalpublication,r.release_price AS originalprice,
       availt.text AS availability,e.known_errors as known_errors,e.comments AS remarks,sc.score AS score,
       sc.votes AS votes
FROM   entries e
       LEFT JOIN releases r
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
WHERE  e.id = 4010
   AND (r.release_seq = 0 or r.release_seq is NULL); 

-- full release info

SELECT * FROM `releases` WHERE release_year is not null and release_month is not null and release_day is not null
30438

+-----------+----------------------------+---------------+-----------------+-----------------+-----------------+-----------------+---------------------+------+-----------------+---------------------+---------------+--------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+--------+--------+-----------+-----------+-----------+-----------+-----------+-------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+----------+--+----------------------------------------------+--------+--+--+-------------------------------+-----------+-----------+-----------+-----------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------+------+----+
| fulltitle | alsoknownas                | yearofrelease | machinetype     | numberofplayers | multiplayermode | multiplayertype | type                | isbn | messagelanguage | originalpublication | originalprice | availability | known_errors                                                                                                                                                                                                                                                                                                                                     | remarks        | score     | votes      |            |        |        |           |           |           |           |           |                                                                                                 |                |           |            |            |          |  |                                              |        |  |  |                               |           |           |           |           |           |                                                                                                                                                                                                                                                                      |      |      |    |
+-----------+----------------------------+---------------+-----------------+-----------------+-----------------+-----------------+---------------------+------+-----------------+---------------------+---------------+--------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+--------+--------+-----------+-----------+-----------+-----------+-----------+-------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+----------+--+----------------------------------------------+--------+--+--+-------------------------------+-----------+-----------+-----------+-----------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------+------+----+
| Rambo     | Rambo: First Blood Part II | 1985          | ZX-Spectrum 48K | 2               | Alternating     | NULL            | Arcade: Shoot-em-up | NULL | English         | NULL                | �7.95         | Available    | Bugfixes provided by g00db0y:#<UL><LI> The game crashes when you shot down the Russian gunship at the end. This problem was caused by executing instruction LDIR (setting BC to zero), then instruction LDI twice (setting BC to $FFFE), then another instruction LDIR after setting only C register instead of BC, as follows:#<PRE>$A29C LDIR^ |   LD (IY+0),8^ |   POP HL^ |   LD E,LX^ |   LD D,HX^ |   LDI^ |   LDI^ |   INC HL^ |   INC DE^ |   INC HL^ |   INC DE^ |   LD C,6^ |   LDIR</PRE>The following patch fixes the problem in the same number of bytes:#<PRE>$A29C LDIR^ |   LD (IY+0),8^ |   POP HL^ |   LD E,LX^ |   LD D,HX^ |   LD C,2 |  |   ; Fixed using POKE 41639,14: POKE 41640,2^ |   LDIR |  |  | ; Fixed using POKE 41642,176^ |   INC HL^ |   INC DE^ |   INC HL^ |   INC DE^ |   LD C,6^ |   LDIR</PRE><LI> The original release was incompatible with +2A/+3 (the Hit Squad re-release works fine).#Fixed using POKE 26393,59</UL>#Modified "BUGFIX" files provided by g00db0y (edited TAP image) and jp (SpeedLock 1 loader patch for the original TZX image) | NULL | 6.80 | 72 |
+-----------+----------------------------+---------------+-----------------+-----------------+-----------------+-----------------+---------------------+------+-----------------+---------------------+---------------+--------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+--------+--------+-----------+-----------+-----------+-----------+-----------+-------------------------------------------------------------------------------------------------+----------------+-----------+------------+------------+----------+--+----------------------------------------------+--------+--+--+-------------------------------+-----------+-----------+-----------+-----------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------+------+----+

 */
var getBasicInfo = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select e.title as fulltitle, aka.title as alsoknownas, r.release_year as yearofrelease, r.release_month as monthofrelease, r.release_day as dayofrelease, machinet.text as machinetype, e.max_players as numberofplayers, turnt.text as multiplayermode, multipl.text as multiplayertype, e.genretype_id as genretype, entryt.text as type, e.book_isbn as isbn, idm.text as messagelanguage, pubt.text as originalpublication, r.release_price as originalprice, availt.text as availability, e.known_errors as known_errors, e.comments as remarks, e.spot_comments as spotcomments, sc.score as score, sc.votes as votes from entries e left join releases r on r.entry_id = e.id left join aliases aka on aka.entry_id = r.entry_id and aka.release_seq = r.release_seq left join availabletypes availt on e.availabletype_id = availt.id left join machinetypes machinet on e.machinetype_id = machinet.id left join turntypes turnt on e.turntype_id = turnt.id left join multiplaytypes multipl on e.multiplaytype_id = multipl.id left join genretypes entryt on e.genretype_id = entryt.id left join publicationtypes pubt on e.publicationtype_id = pubt.id left join idioms idm on e.idiom_id = idm.id left join scores sc on sc.entry_id = e.id where e.id = ? and (r.release_seq = 0 or r.release_seq is null);', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }

        var originalprice = [];
        var orgPrice = priceHelper(results[0].originalprice, id);
        if (orgPrice != undefined) { originalprice.push(orgPrice) };

        var entrytypes, type, subtype;
        if (results[0].type == undefined) {; //console.error("ERROR: ", id + ": MISSING type");
        } else {
            entrytypes = results[0].type.split(": ");
            type = entrytypes[0];
            subtype = entrytypes[1];
        }

        // filter original publication: add 'normal' #19
        var entry_content_type = contenttype(results[0].genretype);
        var originalpublication = results[0].originalpublication;

        // If entry is software and NOT a compilation, default should be "Standard" (will be available in filter)
        if (entry_content_type == "SOFTWARE" && type !== "Compilation") {
            originalpublication = originalpublication == null ? "Standard" : originalpublication;
        }

        var doc = {
            contenttype: entry_content_type,
            fulltitle: results[0].fulltitle,
            alsoknownas: results[0].alsoknownas,
            yearofrelease: results[0].yearofrelease,
            monthofrelease: results[0].monthofrelease,
            dayofrelease: results[0].dayofrelease,
            machinetype: results[0].machinetype,
            numberofplayers: results[0].numberofplayers,
            multiplayermode: results[0].multiplayermode,
            multiplayertype: results[0].multiplayertype,
            type: type,
            subtype: subtype,
            isbn: results[0].isbn,
            messagelanguage: results[0].messagelanguage,
            originalpublication: originalpublication,
            originalprice: originalprice,
            availability: results[0].availability,
            knownerrors: results[0].known_errors,
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
WHERE  p.entry_id = 4010
   AND p.release_seq = 0 

+--------------------+---------+
| name               | country |
+--------------------+---------+
| Ocean Software Ltd | UK      |
+--------------------+---------+

 */
var getPublisher = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
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

--
select distinct r.release_seq  as seq,
                e.title        as title,
                aka.title      as as_title,
                pub.name       as name,
                pc1.text       as country,
                r.release_year as yearofrelease,
                file_size      as size,
                file_link      as url,
                filet.text     as type,
                format.text    as format,
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
       left join countries pc1
              on pub.country_id = pc1.id
       left join downloads d
              on r.entry_id = d.entry_id
                 and r.release_seq = d.release_seq
                 and d.machinetype_id is not null
       left join filetypes filet
              on d.filetype_id = filet.id
       left join formattypes format
              on d.formattype_id = format.id
       left join origintypes origint
              on d.origintype_id = origint.id
       left join schemetypes schemet
              on d.schemetype_id = schemet.id
where  r.entry_id = 9408
order  by r.release_seq,
          d.id 

ID: 2000011 as title
ID: 0003012 releases with year
ID: 0009362 distribution denied (url is null)
+-----+------------+----------+------------------------+---------+------+------+--------+----------------------+--------+---------+--------------+----------------------------+
| seq | title      | as_title | name                   | country | size | type | format | origin               | code   | barcode | dl           | encodingscheme             |
+-----+------------+----------+------------------------+---------+------+------+--------+----------------------+--------+---------+--------------+----------------------------+
| 0   | Sabre Wulf | NULL     | Ultimate Play The Game | UK      | NULL | ?    | NULL   | Original release (O) | 481007 | NULL    | NULL         | None                       |
| 0   | Sabre Wulf | NULL     | Ultimate Play The Game | UK      | NULL | ?    | NULL   | Original release (O) | 481007 | NULL    | NULL         | SpeedLock 1                |
| 1   | Sabre Wulf | NULL     | ABC Soft               | Spain   | NULL | ?    | NULL   | Re-release (R)       | SP156  | NULL    | M-13947-1985 | None                       |
| 2   | Sabre Wulf | NULL     | Dro Soft               | Spain   | NULL | ?    | NULL   | Re-release (R)       | 2MT157 | NULL    | M-11303-198? | Alkatraz Protection System |
| 3   | Sabre Wulf | NULL     | Erbe Software S.A.     | Spain   | NULL | ?    | NULL   | Re-release (R)       | NULL   | NULL    | NULL         | None                       |
| 4   | Sabre Wulf | NULL     | Iveson Software S.A.   | Spain   | NULL | ?    | NULL   | Re-release (R)       | 1004   | NULL    | NULL         | None                       |
| 5   | Sabre Wulf | NULL     | Microbyte [1]          | Spain   | NULL | ?    | NULL   | Re-release (R)       | NULL   | NULL    | NULL         | None                       |
+-----+------------+----------+------------------------+---------+------+------+--------+----------------------+--------+---------+--------------+----------------------------+

 */
var getReleases = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select distinct r.release_seq as seq, e.title as title, aka.title as as_title, pub.name as name, pc1.text as country, r.release_year as yearofrelease, file_size as size, file_link as url, filet.text as type, format.text as format, origint.text as origin, d.file_code as code, d.file_barcode as barcode, d.file_dl as dl, schemet.text as encodingscheme from releases r left join aliases aka on aka.entry_id = r.entry_id and aka.release_seq = r.release_seq inner join entries e on e.id = r.entry_id left join publishers p on p.entry_id = r.entry_id and p.release_seq = r.release_seq left join labels pub on p.label_id = pub.id left join countries pc1 on pub.country_id = pc1.id left join downloads d on r.entry_id = d.entry_id and r.release_seq = d.release_seq and d.machinetype_id is not null left join filetypes filet on d.filetype_id = filet.id left join formattypes format on d.formattype_id = format.id left join origintypes origint on d.origintype_id = origint.id left join schemetypes schemet on d.schemetype_id = schemet.id where r.entry_id = ? order by r.release_seq, d.id', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                release: results[i].seq,
                publisher: results[i].name,
                country: results[i].country,
                as_title: results[i].as_title,
                yearofrelease: results[i].yearofrelease,
                url: results[i].url,
                size: results[i].size,
                type: results[i].type,
                format: results[i].format,
                origin: results[i].origin,
                code: results[i].code,
                barcode: results[i].barcode,
                dl: results[i].dl,
                encodingscheme: results[i].encodingscheme

            }
            arr.push(item);
        }
        deferred.resolve({ releases: arr });
    });
    return deferred.promise;
}

/**
 * Get authors

--
SELECT
    dev.name AS dev_name,
    ac1.text AS dev_country,
    team.name AS group_name,
    tc1.text AS group_country,
    devalias.name AS dev_alias
FROM
    authors aut
INNER JOIN labels dev ON
    aut.label_id = dev.id
LEFT JOIN labels devalias ON
    devalias.from_id = dev.id AND devalias.is_company = 0
LEFT JOIN countries ac1 ON
    dev.country_id = ac1.id
LEFT JOIN labels team ON
    aut.team_id = team.id
LEFT JOIN countries tc1 ON
    team.country_id = tc1.id
WHERE
    aut.entry_id = 996
ORDER BY
    group_name,
    dev_name

996 - Cobra (Alias)
483 - Beach Head II (Group)

+-------------------+-------------+------------+---------------+--------------+
| dev_name          | dev_country | group_name | group_country | dev_alias    |
+-------------------+-------------+------------+---------------+--------------+
| Jonathan M. Smith | UK          | NULL       | NULL          | Frobush      |
| Jonathan M. Smith | UK          | NULL       | NULL          | Joffa Smifff |
| Martin Galway     | UK          | NULL       | NULL          | NULL         |
| Steve Cain        | UK          | NULL       | NULL          | NULL         |
+-------------------+-------------+----------------------+---------------+-----------+
+-------------------+-------------+----------------------+---------------+-----------+
| dev_name          | dev_country | group_name           | group_country | dev_alias |
+-------------------+-------------+----------------------+---------------+-----------+
| F. David Thorpe   | UK          | NULL                 | NULL          | NULL      |
| Oliver Frey       | Switzerland | NULL                 | NULL          | NULL      |
| Alan Laird        | UK          | Platinum Productions | UK            | NULL      |
| David J. Anderson | UK          | Platinum Productions | UK            | NULL      |
| Ian Morrison      | UK          | Platinum Productions | UK            | NULL      |
+-------------------+-------------+----------------------+---------------+-----------+

*/
var getAuthors = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT dev.name AS dev_name, ac1.text AS dev_country, team.name AS group_name, tc1.text AS group_country, devalias.name AS dev_alias FROM authors aut INNER JOIN labels dev ON aut.label_id = dev.id LEFT JOIN labels devalias ON devalias.from_id = dev.id AND devalias.is_company = 0 LEFT JOIN countries ac1 ON dev.country_id = ac1.id LEFT JOIN labels team ON aut.team_id = team.id LEFT JOIN countries tc1 ON team.country_id = tc1.id WHERE aut.entry_id = ? ORDER BY group_name, dev_name;', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        var groupArray;
        var authorArray = [];
        for (; i < results.length; i++) {
            if (groupArray != results[i].group_name) {
                if (authorArray.length > 0) {
                    arr.push({ authors: authorArray, group: groupArray })
                }
                groupArray = results[i].group_name;
                authorArray = [];
            }
            if (!authorArray.includes(results[i].dev_name.trim())) {
                authorArray.push({ name: results[i].dev_name.trim(), country: results[i].dev_country, alias: results[i].dev_alias });
            }
        }
        if (authorArray.length > 0) {
            arr.push({ authors: authorArray, group: groupArray })
        }
        deferred.resolve({ authors: arr });
    });
    return deferred.promise;
}

/**
 * Get Roles

--
SELECT dev.name AS name, rt.text as role
FROM   authors aut
       INNER JOIN labels dev
               ON aut.label_id = dev.id
       INNER JOIN roles r
              ON aut.entry_id = r.entry_id AND aut.author_seq = r.author_seq
       LEFT JOIN roletypes rt 
            ON r.roletype_id = rt.id
WHERE  aut.entry_id = 26834
ORDER BY rt.id

+---------------+---------------------+
| name          | role                |
+---------------+---------------------+
| Colin Stewart | Inlay/Poster Art    |
| Colin Stewart | Code                |
| Colin Stewart | Game Design/Concept |
| Colin Stewart | In-Game Graphics    |
| Colin Stewart | Level Design        |
| Einar Saukas  | Load Screen         |
| Colin Stewart | Sound Effects       |
+---------------+---------------------+

*/
var getRoles = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT dev.name AS name, rt.text as role FROM authors aut INNER JOIN labels dev ON aut.label_id = dev.id INNER JOIN roles r ON aut.entry_id = r.entry_id AND aut.author_seq = r.author_seq LEFT JOIN roletypes rt ON r.roletype_id = rt.id WHERE aut.entry_id = ? ORDER BY rt.id', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                name: results[i].name,
                role: results[i].role
            }
            arr.push(item);
        }
        deferred.resolve({ roles: arr });
    });
    return deferred.promise;
}

/**
 * Get authored

-- This program was authored with the following tools...
SELECT tool.title, 
       pub.NAME AS publisher 
FROM   frameworks iaut 
       INNER JOIN entries tool 
               ON iaut.util_id = tool.id 
       LEFT JOIN publishers p 
              ON p.entry_id = tool.id 
       LEFT JOIN labels pub 
              ON p.label_id = pub.id 
WHERE  p.release_seq = 0 
       AND iaut.entry_id = 30321 

+-----------------+--------------+
| title           | publisher    |
+-----------------+--------------+
| NIRVANA+ ENGINE | Einar Saukas |
+-----------------+--------------+

 */
var getAuthored = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select tool.title, pub.name as publisher from frameworks iaut inner join entries tool on iaut.util_id = tool.id left join publishers p on p.entry_id = tool.id left join labels pub on p.label_id = pub.id where iaut.entry_id = ? and p.release_seq = 0', [id], function(error, results, fields) {
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
        deferred.resolve({ authored: arr });
    });
    return deferred.promise;
}

/**
 * Get Authoring

-- The following programs are known to have been authored with this tool...
SELECT prog.title AS title, 
       pub.NAME   AS publisher 
FROM   frameworks eaut 
       INNER JOIN entries prog 
               ON eaut.entry_id = prog.id 
       LEFT JOIN publishers p 
              ON p.entry_id = prog.id 
       LEFT JOIN labels pub 
              ON p.label_id = pub.id 
WHERE  eaut.util_id = 30002;

+--------------+----------------------+
| title        | publisher            |
+--------------+----------------------+
| Snake Escape | Einar Saukas         |
| Pietro Bros  | Cristian M. Gonzalez |
+--------------+----------------------+

*/
var getAuthoring = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select prog.title as title, pub.name as publisher from frameworks eaut inner join entries prog on eaut.entry_id = prog.id left join publishers p on p.entry_id = prog.id left join labels pub on p.label_id = pub.id where eaut.util_id = ?', [id], function(error, results, fields) {
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

--
SELECT ctrt.text AS control
FROM   controls ctr
       INNER JOIN controltypes ctrt
               ON ctr.controltype_id = ctrt.id
WHERE  ctr.entry_id = 4010

+---------------------+
| control             |
+---------------------+
| Cursor              |
| Interface 2 (left)  |
| Interface 2 (right) |
| Kempston            |
| Redefineable keys   |
+---------------------+

 */
var getControls = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
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
WHERE  e.id = 4010; 

+---------------------------+---------+-------+----------------------------+
| name                      | country | type  | originalname               |
+---------------------------+---------+-------+----------------------------+
| Anabasis Investments N.V. | USA     | Movie | Rambo: First Blood Part II |
| Carolco Pictures Inc      | USA     | Movie | Rambo: First Blood Part II |
+---------------------------+---------+-------+----------------------------+

 */
var getInspiredByTieInLicense = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
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

-- (S)equenced - groupname (1942), (LastNinja)

-- This program belongs in the following series (with these other titles)...
SELECT DISTINCT prog.title AS title, prog.id as entry_id,
       pub.NAME   AS publisher, g.name as groupname, groupt.id as grouptype 
FROM   entries e 
       INNER JOIN members memb 
               ON memb.entry_id = e.id 
       INNER JOIN groups g 
               ON memb.group_id = g.id 
       INNER JOIN grouptypes groupt 
               ON g.grouptype_id = groupt.id 
                  AND groupt.id = "S" 
       INNER JOIN members others 
               ON others.group_id = g.id 
       INNER JOIN entries prog 
               ON others.entry_id = prog.id 
       LEFT JOIN publishers p 
              ON p.entry_id = prog.id 
       LEFT JOIN labels pub 
              ON p.label_id = pub.id 
WHERE  e.id = 9297 
       AND p.release_seq = 0 
ORDER  BY g.NAME, 
          others.series_seq ASC 

+-------+-------------------+-----------+-----------+
| title |     publisher     | groupname | grouptype |
+-------+-------------------+-----------+-----------+
|  1942 | Elite Systems Ltd |      1942 | S         |
|  1943 | Go!               |      1942 | S         |
+-------+-------------------+-----------+-----------+

 */
var getSeries = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select distinct prog.title as title, prog.id as entry_id, pub.name as publisher, g.name as groupname, groupt.id as grouptype from entries e inner join members memb on memb.entry_id = e.id inner join groups g on memb.group_id = g.id inner join grouptypes groupt on g.grouptype_id = groupt.id and groupt.id = "S" inner join members others on others.group_id = g.id inner join entries prog on others.entry_id = prog.id left join publishers p on p.entry_id = prog.id left join labels pub on p.label_id = pub.id where e.id = ? and p.release_seq = 0 order by g.name, others.series_seq ASC', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                title: results[i].title,
                entry_id: results[i].entry_id,
                publisher: results[i].publisher,
                groupname: results[i].groupname
            }
            arr.push(item);
        }
        deferred.resolve({ series: arr });
    });
    return deferred.promise;
}

/**
 * Get Other Systems

-- This program is also available on the following platforms... 
SELECT p.link_system, 
       plat.text 
FROM   ports p 
       INNER JOIN platforms plat 
               ON p.platform_id = plat.id 
WHERE  p.entry_id = 4010 
ORDER  BY plat.id; 

+---------------------------------------------------------+--------------------+
| link_system                                             | text               |
+---------------------------------------------------------+--------------------+
| http://www.cpc-power.com/index.php?page=detail&num=1758 | Amstrad CPC        |
| http://www.lemon64.com/?game_id=2084                    | Commodore 64       |
| http://www.smstributes.co.uk/getinfo.asp?gameid=280     | Sega Master System |
+---------------------------------------------------------+--------------------+

*/
var getOtherSystems = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT p.link_system, plat.text FROM ports p INNER JOIN platforms plat ON p.platform_id = plat.id WHERE p.entry_id = ? ORDER BY plat.id', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                name: results[i].text,
                url: results[i].link_system
            }
            arr.push(item);
        }
        deferred.resolve({ othersystems: arr });
    });
    return deferred.promise;
}

/**
 * Get contents - content of compilation

-- This compilation content
SELECT
    ecomp.tape_side AS tape_side,
    ecomp.tape_seq AS tape_seq,
    ecomp.prog_seq AS prog_seq,
    item.title AS title,
    ll.name AS publisher,
    evart.text as variation
FROM
    compilations ecomp
INNER JOIN entries item ON
    ecomp.entry_id = item.id
INNER JOIN variationtypes evart ON
    ecomp.variationtype_id = evart.id
INNER JOIN publishers p ON
    p.entry_id = ecomp.entry_id
LEFT JOIN labels ll ON
    p.label_id = ll.id
LEFT JOIN countries lc1 ON
    ll.country_id = lc1.id
WHERE
    ecomp.compilation_id = 13510 AND p.release_seq = 0

+-----------+----------+----------+---------------------------+----------------------+
| tape_side | tape_seq | prog_seq | title                     | publisher            |
+-----------+----------+----------+---------------------------+----------------------+
| A         | 1        | 1        | Wizball                   | Ocean Software Ltd   |
| A         | 1        | 2        | Head over Heels           | Ocean Software Ltd   |
| B         | 1        | 1        | Arkanoid                  | Imagine Software Ltd |
| B         | 1        | 2        | Cobra                     | Ocean Software Ltd   |
| A         | 2        | 1        | Frankie Goes to Hollywood | Ocean Software Ltd   |
| A         | 2        | 2        | Great Escape, The         | Ocean Software Ltd   |
| B         | 2        | 1        | Short Circuit             | Ocean Software Ltd   |
| B         | 2        | 2        | Yie Ar Kung-Fu            | Imagine Software Ltd |
+-----------+----------+----------+---------------------------+----------------------+

 */
var getCompilationContent = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT ecomp.tape_side AS tape_side, ecomp.tape_seq AS tape_seq, ecomp.prog_seq AS prog_seq, item.title AS title, ll.name AS publisher, evart.text as variation FROM compilations ecomp INNER JOIN entries item ON ecomp.entry_id = item.id INNER JOIN variationtypes evart ON ecomp.variationtype_id = evart.id INNER JOIN publishers p ON p.entry_id = ecomp.entry_id LEFT JOIN labels ll ON p.label_id = ll.id LEFT JOIN countries lc1 ON ll.country_id = lc1.id WHERE ecomp.compilation_id = ? AND p.release_seq = 0', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                side: 'Tape ' + results[i].tape_seq + ", side " + results[i].tape_side,
                title: results[i].title,
                publisher: results[i].publisher,
                sequence: results[i].prog_seq,
                variation: results[i].variation
            }
            arr.push(item);
        }
        deferred.resolve({ contents: arr });
    });
    return deferred.promise;
}

/**
* If compilation, get loading + in-game screens from content.
  Get rid of animated GIF with screens

COMPILATIONS
GAME
HARDWARE
BOOKS

SELECT
    d.file_link AS url,
    d.file_size AS size,
    filet.text AS type,
    FORMAT.text AS format,
    e.title as title
FROM
    compilations c
INNER JOIN entries e ON
    c.entry_id = e.id
INNER JOIN downloads d ON
    e.id = d.entry_id AND d.release_seq = 0
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN formattypes FORMAT ON
    d.formattype_id = FORMAT.id
WHERE
    d.filetype_id IN(1, 2) AND d.formattype_id IN (52, 53) AND c.compilation_id = 11196
UNION 
SELECT
    d.file_link AS url,
    file_size AS size,
    filet.text AS type,
    FORMAT.text AS format,
    null AS title
FROM
    downloads d
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN formattypes FORMAT ON
    d.formattype_id = FORMAT.id
WHERE
    d.machinetype_id IS NULL AND d.filetype_id IN(1, 2) AND d.formattype_id IN (52, 53) AND d.entry_id = 11196
UNION 
SELECT
    d.file_link AS url,
    file_size AS size,
    filet.text AS type,
    FORMAT.text AS format,
    null AS title
FROM
    downloads d
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN formattypes FORMAT ON
    d.formattype_id = FORMAT.id
INNER JOIN entries e ON
    d.entry_id = e.id
WHERE
    (e.genretype_id BETWEEN 91 AND 108) AND d.filetype_id IN(53) AND d.formattype_id IN (53) AND d.entry_id = 1000192 -- 91-108=hardware, 53=hardware thumb
UNION
SELECT
    d.file_link AS url,
    file_size AS size,
    "Loading screen" as type,
    FORMAT.text AS format,
    null AS title
FROM
    downloads d
INNER JOIN formattypes FORMAT ON
    d.formattype_id = FORMAT.id
INNER JOIN entries e ON
    d.entry_id = e.id
WHERE
    (e.genretype_id BETWEEN 83 AND 90) AND d.filetype_id IN(45) AND d.formattype_id IN (53) AND d.entry_id = 2000237

+----------------------------------------------------------+-------+----------------+---------+
| url                                                      | size  | type           | format  |
+----------------------------------------------------------+-------+----------------+---------+
| /pub/sinclair/screens/load/k/gif/Kung-FuMaster.gif       | 6324  | Loading screen | Picture |
| /pub/sinclair/screens/in-game/k/Kung-FuMaster.gif        | 5603  | In-game screen | Picture |
| /pub/sinclair/screens/load/t/gif/TopGun.gif              | 4288  | Loading screen | Picture |
| /pub/sinclair/screens/in-game/t/TopGun.gif               | 3914  | In-game screen | Picture |
| /pub/sinclair/screens/load/j/gif/JackTheNipper.gif       | 5841  | Loading screen | Picture |
| /pub/sinclair/screens/in-game/j/JackTheNipper.gif        | 4391  | In-game screen | Picture |
| /pub/sinclair/screens/load/a/gif/AufWiedersehenMonty.gif | 6632  | Loading screen | Picture |
| /pub/sinclair/screens/in-game/a/AufWiedersehenMonty.gif  | 5878  | In-game screen | Picture |
| /pub/sinclair/screens/load/s/gif/SuperCycle.gif          | 3068  | Loading screen | Picture |
| /pub/sinclair/screens/in-game/s/SuperCycle.gif           | 4944  | In-game screen | Picture |
| /pub/sinclair/screens/load/g/gif/Gauntlet.scr            | 6912  | Loading screen | Screen dump |
| /pub/sinclair/screens/in-game/g/Gauntlet.gif             | 4252  | In-game screen | Picture |
| /pub/sinclair/screens/in-game/123/6GameActionPack.gif    | 23915 | In-game screen | Picture |
+----------------------------------------------------------+-------+----------------+---------+

ZXDB Update:
If Screen Dump and Picture both exists, Picture is removed(only scr + ifl references), need to convert to Picture
    {
      "filename": "TopGun.scr",
      "url": "/pub/sinclair/screens/load/t/scr/TopGun.scr",
      "size": 6912,
      "type": "Loading screen",
      "format": "Screen dump",
      "title": "Top Gun"
    },
=>
    {
      "filename": "TopGun.gif",
      "url": "/zxscreens/0011196/TopGun-load.gif", //TopGun-game.gif
      "size": 6912,
      "type": "Loading screen", //In-game screen
      "format": "Picture",
      "title": "Top Gun"
    },

More screens: 0030237

*/
var getScreens = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT d.file_link AS url, d.file_size AS size, filet.text AS type, FORMAT.text AS format, e.title as title FROM compilations c INNER JOIN entries e ON c.entry_id = e.id INNER JOIN downloads d ON e.id = d.entry_id AND d.release_seq = 0 INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN formattypes FORMAT ON d.formattype_id = FORMAT.id WHERE d.filetype_id IN(1, 2) AND d.formattype_id IN (52, 53) AND c.compilation_id = ? UNION SELECT d.file_link AS url, file_size AS size, filet.text AS type, FORMAT.text AS format, null as title FROM downloads d INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN formattypes FORMAT ON d.formattype_id = FORMAT.id WHERE d.machinetype_id IS NULL AND d.filetype_id IN(1, 2) AND d.formattype_id IN (52, 53) AND d.entry_id = ? UNION SELECT d.file_link AS url, file_size AS size, "Loading screen" AS type, FORMAT.text AS format, null AS title FROM downloads d INNER JOIN formattypes FORMAT ON d.formattype_id = FORMAT.id INNER JOIN entries e ON d.entry_id = e.id WHERE (e.genretype_id BETWEEN 91 AND 108) AND d.filetype_id IN(53) AND d.formattype_id IN (53) AND d.entry_id = ? UNION SELECT d.file_link AS url, file_size AS size, "Loading screen" as type, FORMAT.text AS format, null AS title FROM downloads d INNER JOIN formattypes FORMAT ON d.formattype_id = FORMAT.id INNER JOIN entries e ON d.entry_id = e.id WHERE (e.genretype_id BETWEEN 83 AND 90) AND d.filetype_id IN(45) AND d.formattype_id IN (53) AND d.entry_id = ?', [id, id, id, id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            if (results[i].url == undefined) {;
            } else {
                if (results[i].format == 'Picture') {
                    var downloaditem = {
                        filename: path.basename(results[i].url),
                        url: results[i].url,
                        size: results[i].size,
                        type: results[i].type,
                        format: results[i].format,
                        title: results[i].title
                    }
                    arr.push(downloaditem);
                } else {
                    /** screen dump, write info to file (to be processed later) **/
                    var zerofilled = ('0000000' + id).slice(-7);
                    var screen_type;

                    /** In-game renamed to Running screen **/
                    if (results[i].type == 'Loading screen') {
                        screen_type = 'load';
                    } else {
                        screen_type = 'run';
                    }
                    var new_filename = path.basename(results[i].url, path.extname(results[i].url));
                    if (path.basename(results[i].url).indexOf("-" + screen_type + "-") == -1) {
                        new_filename = new_filename + '-' + screen_type;
                    }
                    if (results[i].title == null) {
                        results[i].title = '';
                    }
                    console.error(screen_type + "\t" + zerofilled + "\t" + results[i].url + "\t" + ('/zxscreens/' + zerofilled + "/") + "\t" + new_filename + "\t" + results[i].title);
                }
            }
        }
        deferred.resolve({ screens: arr });
    });
    return deferred.promise;
}

/**
 * Get features

-- (C)ompetition - Tron256(17819)
-- (F)eature - Lunar Jetman(9372)
-- (M)ajor Clone - Gulpman(2175)
-- (N)amed - LED Storm(9369)
-- (T)hemed - Valhalla(7152)
-- (U)Unnamed - Alpha-Beth(10966)

-- This program contains the following features... / participated in the following competitions...
-- Competition, Feature, Major Clone, Themed Group
SELECT g.name, 
       groupt.id,
       groupt.text 
FROM   members feat 
       INNER JOIN groups g 
               ON feat.group_id = g.id 
       INNER JOIN grouptypes groupt 
               ON g.grouptype_id = groupt.id 
                  AND groupt.id <> "S" 
WHERE  feat.entry_id = 176; 

+----------------------------+----+----------------------+
|            name            | id |         text         |
+----------------------------+----+----------------------+
| 2001 Minigame Competition  | C  | Competition          |
| Multi-machine Medium       | F  | Feature              |
| Currah Microspeech Support | F  | Feature              |
| Pac-Man                    | M  | Major Clone          |
| Tron                       | M  | Major Clone          |
| Crash cover demo           | N  | Non-sequenced Series |
| Ancient Mythology          | T  | Themed Group         |
| g002                       | U  | Unnamed Group        |
+----------------------------+----+----------------------+

 */
var getFeatures = function(id, grouptype_id, groupname) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select g.name, groupt.id, groupt.text from members feat inner join groups g on feat.group_id = g.id inner join grouptypes groupt on g.grouptype_id = groupt.id and groupt.id = ? where feat.entry_id = ?', [grouptype_id, id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                name: results[i].name
            }
            arr.push(item);
        }
        var obj = {};
        obj[groupname] = arr;
        deferred.resolve(obj);
    });
    return deferred.promise;
}

/**
 * Get relatedlinks

-- This program is also listed in the following sites...
-- * exclude sites integrated with ZXDB and YouTube
SELECT
    relw.name AS sitename,
    rel.link
FROM
    relatedlinks rel
INNER JOIN websites relw ON
    rel.website_id = relw.id
WHERE
    relw.name NOT IN('Freebase', 'The Tipshop', 'RZX Archive Channel (YouTube)', 'ZX81 videos (Youtube)') AND rel.entry_id = 4010
ORDER BY
    sitename;

+-----------+-----------------------------------------------------------------+
| sitename  | link                                                            |
+-----------+-----------------------------------------------------------------+
| Freebase  | http://zxspectrum.freebase.com/view/base/zxspectrum/wos/0004010 |
| Wikipedia | http://en.wikipedia.org/wiki/Rambo_%281985_video_game%29        |
+-----------+-----------------------------------------------------------------+

 */
var getRelatedLinks = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT relw.name AS sitename,rel.link FROM relatedlinks rel INNER JOIN websites relw ON rel.website_id = relw.id WHERE relw.name NOT IN ("Freebase","The Tipshop","RZX Archive Channel (YouTube)", "ZX81 videos (Youtube)") AND rel.entry_id = ? ORDER BY sitename', [id], function(error, results, fields) {
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
        deferred.resolve({ relatedlinks: arr });
    });
    return deferred.promise;
}



function replaceMask(input, pattern, value) {
    var result = input;
    var found = input.match(pattern);
    if (found != null) {
        var template = found[0];
        var padding = found[1];
        var zero = ("0".repeat(padding) + value).slice(-padding);
        if (padding == 1) { // N = 1, plain value
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
var getRelatedSites = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT name as sitename, link_mask FROM websites WHERE name NOT IN ("ZXInfo") AND link_mask is NOT NULL ORDER BY sitename', function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var link = replaceMask(results[i].link_mask, /{e(\d)+}/i, parseInt(id));
            var item = {
                sitename: results[i].sitename,
                link: link
            }
            arr.push(item);
        }
        deferred.resolve({ relatedsites: arr });
    });
    return deferred.promise;
}

/**

  YouTube Links

*/
var getYouTubeLinks = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT relw.name AS sitename,rel.link FROM relatedlinks rel INNER JOIN websites relw ON rel.website_id = relw.id WHERE relw.name IN ("RZX Archive Channel (YouTube)", "ZX81 videos (Youtube)") AND rel.entry_id = ? ORDER BY sitename', [id], function(error, results, fields) {
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
        deferred.resolve({ youtubelinks: arr });
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
WHERE  icomp.entry_id = 4010
   AND p.release_seq = 0; 

+----------------------------+--------------------+-------------+
| title                      | publisher          | type        |
+----------------------------+--------------------+-------------+
| Screen Heroes              | Ocean Software Ltd | Compilation |
| They Sold a Million 3      | The Hit Squad      | Compilation |
| Live Ammo                  | Ocean Software Ltd | Compilation |
| 40 Principales Vol. 4, Los | Erbe Software S.A. | Compilation |
+----------------------------+--------------------+-------------+

 */
var getInCompilations = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
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
SELECT book.title AS title, book.id AS bookid 
FROM   booktypeins bti
       INNER JOIN entries book
               ON bti.book_id = book.id
WHERE  bti.entry_id = 770; 

+-----------------------+---------+
| title                 | bookid  |
+-----------------------+---------+
| ZX Spectrum +3 Manual | 2000448 |
+-----------------------+---------+

 */
var getBookTypeIns = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
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
 * DEPRECATED - ALL INFO AVAILABLE IN RELEASES
 * Get Downloads - game files, does not have a machinetype_id

--
SELECT d.file_link    AS url, 
       file_size      AS size, 
       filet.text     AS type, 
       format.text    AS format, 
       origint.text   AS origin, 
       d.file_code    AS code, 
       d.file_barcode AS barcode, 
       d.file_dl      AS dl, 
       schemet.text   AS encodingscheme 
FROM   downloads d 
       INNER JOIN filetypes filet 
               ON d.filetype_id = filet.id 
       INNER JOIN formattypes format 
               ON d.formattype_id = format.id 
       INNER JOIN origintypes origint 
               ON d.origintype_id = origint.id 
       LEFT JOIN schemetypes schemet 
              ON d.schemetype_id = schemet.id 
WHERE  d.file_link IS NOT NULL 
       AND d.machinetype_id IS NOT NULL 
       AND d.entry_id = 4010 

+-------------------------------------------------------+-------+-------------------+--------------------+----------------------+------+---------------+--------------+---------------------------+
| url                                                   | size  | type              | format             | origin               | code | barcode       | dl           | encodingscheme            |
+-------------------------------------------------------+-------+-------------------+--------------------+----------------------+------+---------------+--------------+---------------------------+
| /pub/sinclair/games/r/Rambo.tzx.zip                   | 26743 | Tape image        | Perfect TZX tape   | Original release (O) | NULL | 5013156010088 | NULL         | SpeedLock 1               |
| /pub/sinclair/games/r/Rambo(BUGFIX).tzx.zip           | 25234 | BUGFIX tape image | Perfect TZX tape   | Original release (O) | NULL | 5013156010088 | NULL         | None                      |
| /pub/sinclair/games/r/Rambo.tap.zip                   | 30083 | Tape image        | (non-TZX) TAP tape | (unspecified)        | NULL | NULL          | NULL         | Undetermined              |
| /pub/sinclair/games/r/Rambo(BUGFIX).tap.zip           | 25281 | BUGFIX tape image | (non-TZX) TAP tape | (unspecified)        | NULL | NULL          | NULL         | Undetermined              |
| /pub/sinclair/games/r/Rambo(ErbeSoftwareS.A.).tzx.zip | 27610 | Tape image        | Perfect TZX tape   | Re-release (R)       | NULL | NULL          | M-40060-1985 | Unspecified custom loader |
| /pub/sinclair/games/r/Rambo(IBSA).tzx.zip             | 27822 | Tape image        | Perfect TZX tape   | Re-release (R)       | NULL | NULL          | M-40060-1985 | Unspecified custom loader |
| /pub/sinclair/games/r/Rambo(TheHitSquad).tzx.zip      | 32438 | Tape image        | Perfect TZX tape   | Re-release (R)       | MC01 | 5013156410000 | NULL         | SpeedLock 7               |
+-------------------------------------------------------+-------+-------------------+--------------------+----------------------+------+---------------+--------------+---------------------------+

var getDownloads = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT d.file_link AS url,file_size AS size,filet.text AS type, format.text AS format, origint.text AS origin, d.file_code AS code,d.file_barcode AS barcode,d.file_dl AS dl, schemet.text AS encodingscheme FROM downloads d INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN formattypes format ON d.formattype_id = format.id INNER JOIN origintypes origint ON d.origintype_id = origint.id LEFT JOIN schemetypes schemet ON d.schemetype_id = schemet.id WHERE d.file_link IS NOT NULL AND d.machinetype_id IS NOT NULL AND d.entry_id = ?', [id], function(error, results, fields) {
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
                format: results[i].format,
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
 */

/**
 * Get additionals (Everything else that is not machine specific and not loading/in-game pictures- simple output)

--
SELECT
    d.file_link AS url,
    file_size AS size,
    filet.text AS type,
    format.text AS format
FROM
    downloads d
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN formattypes format ON
    d.formattype_id = format.id
WHERE
    d.machinetype_id IS NULL AND NOT(
        d.filetype_id IN(-1, 1, 2) AND d.formattype_id = 53
    ) AND d.entry_id = 4010

+---------------------------------------------------------------------+--------+---------------------------+---------------+
| url                                                                 | size   | type                      | format        |
+---------------------------------------------------------------------+--------+---------------------------+---------------+
| /pub/sinclair/screens/load/r/scr/Rambo.scr                          | 6912   | Loading screen            | Screen dump   |
| /pub/sinclair/games-info/r/Rambo.txt                                | 5663   | Instructions              | Text document |
| /pub/sinclair/games-maps/r/Rambo.gif                                | 82755  | Game map                  | Picture       |
| /pub/sinclair/games-maps/r/Rambo.jpg                                | 104522 | Game map                  | Picture       |
| /pub/sinclair/games-maps/r/Rambo_3.jpg                              | 560044 | Game map                  | Picture       |
| /pub/sinclair/games-inlays/r/Rambo.jpg                              | 70713  | Cassette inlay            | Picture       |
| /pub/sinclair/games-adverts/r/Rambo.jpg                             | 160897 | Advertisement             | Picture       |
| /pub/sinclair/games-info/r/Rambo(ErbeSoftwareS.A.).txt              | 4725   | Instructions              | Text document |
| /pub/sinclair/games-inlays/Rereleases/r/Rambo(ErbeSoftwareS.A.).jpg | 109930 | Re-release cassette inlay | Picture       |
| /pub/sinclair/games-adverts/r/Rambo(ErbeSoftwareS.A.).jpg           | 247901 | Advertisement             | Picture       |
| /pub/sinclair/games-inlays/Rereleases/r/Rambo(IBSA).jpg             | 65197  | Re-release cassette inlay | Picture       |
| /pub/sinclair/games-inlays/Rereleases/r/Rambo(TheHitSquad).jpg      | 65527  | Re-release cassette inlay | Picture       |
+---------------------------------------------------------------------+--------+---------------------------+---------------+

 */
var getAdditionals = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT d.file_link AS url, file_size AS size, filet.text AS type, format.text AS format FROM downloads d INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN formattypes format ON d.formattype_id = format.id WHERE d.machinetype_id IS NULL AND NOT( d.filetype_id IN(-1, 1, 2) AND d.formattype_id = 53 ) AND d.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            if (results[i].url == undefined) {; // console.log(id + ": empty additionals: ");
            } else {
                var downloaditem = {
                    url: results[i].url,
                    size: results[i].size,
                    type: results[i].type,
                    format: results[i].format
                }
                arr.push(downloaditem);
            }
        }
        deferred.resolve({ additionals: arr });
    });
    return deferred.promise;
}

/**
 * Get Adverts

1, 2, 3, 15
Advert, Full-page ad, Two-page ad, Poster

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
WHERE  e.id = 4010
   AND ref.referencetype_id IN ( 1, 2, 3, 15 )
ORDER  BY date_year,date_month,pageno

+--------------------------+-----------+---------+--------+---------------+----------------------+-------------------------------------------------------------------------------------------------------------------+
| magazine                 | issueyear | issueno | pageno | magazine_type | magazine_text        | link_mask                                                                                                         |
+--------------------------+-----------+---------+--------+---------------+----------------------+-------------------------------------------------------------------------------------------------------------------+
| Computer & Video Games   | 1985      | 10      | 41     | Full-page ad  |                      | /pub/sinclair/magazines/C+VG/Issue{i3}/Pages/CVG{i3}{p5}.jpg                                                      |
| Crash                    | 1985      | 10      | 139    | Full-page ad  |                      | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                                   |
| Sinclair User            | 1985      | 11      | 2      | Full-page ad  |                      | /pub/sinclair/magazines/SinclairUser/Issue{i3}/Pages/SinclairUser{i3}{p5}.jpg                                     |
| Your Computer            | 1985      | 11      | 2      | Full-page ad  |                      | /pub/sinclair/magazines/YourComputer/Issue{y2}{m2}/Pages/YourComputer{y2}{m2}{p5}.jpg                             |
| Popular Computing Weekly | 1985      | 11      | 352    | Full-page ad  |                      | /pub/sinclair/magazines/PopularComputingWeekly/Issue{y2}{m2}{d2}/Pages/PopularComputingWeekly{y2}{m2}{d2}{p5}.jpg |
| Popular Computing Weekly | 1985      | 11      | 455    | Full-page ad  |                      | /pub/sinclair/magazines/PopularComputingWeekly/Issue{y2}{m2}{d2}/Pages/PopularComputingWeekly{y2}{m2}{d2}{p5}.jpg |
| Crash                    | 1985      | 12      | 161    | Full-page ad  |                      | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                                   |
| Popular Computing Weekly | 1986      | 1       | 540    | Full-page ad  |                      | /pub/sinclair/magazines/PopularComputingWeekly/Issue{y2}{m2}{d2}/Pages/PopularComputingWeekly{y2}{m2}{d2}{p5}.jpg |
| Sinclair User            | 1986      | 1       | 23     | Advert        |                      | /pub/sinclair/magazines/SinclairUser/Issue{i3}/Pages/SinclairUser{i3}{p5}.jpg                                     |
| Crash                    | 1986      | 1       | 3      | Advert        |                      | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                                   |
| Computer & Video Games   | 1986      | 1       | 85     | Full-page ad  |                      | /pub/sinclair/magazines/C+VG/Issue{i3}/Pages/CVG{i3}{p5}.jpg                                                      |
| Computer Gamer           | 1986      | 1       | 33     | Full-page ad  |                      | /pub/sinclair/magazines/ComputerGamer/Issue{i2}/Pages/ComputerGamer{i2}{p5}.jpg                                   |
| Your Sinclair            | 1986      | 1       | 113    | Advert        |                      | /pub/sinclair/magazines/YourSinclair/Issue{i2}/Pages/YourSinclair{i2}{p5}.jpg                                     |
| Computer Gamer           | 1986      | 2       | 11     | Advert        |                      | /pub/sinclair/magazines/ComputerGamer/Issue{i2}/Pages/ComputerGamer{i2}{p5}.jpg                                   |
| Crash                    | 1986      | 2       | 43     | Advert        |                      | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                                   |
| Sinclair User            | 1986      | 2       | 51     | Full-page ad  |                      | /pub/sinclair/magazines/SinclairUser/Issue{i3}/Pages/SinclairUser{i3}{p5}.jpg                                     |
| Computer & Video Games   | 1986      | 2       | 11     | Advert        |                      | /pub/sinclair/magazines/C+VG/Issue{i3}/Pages/CVG{i3}{p5}.jpg                                                      |
| Sinclair User            | 1986      | 3       | 3      | Advert        |                      | /pub/sinclair/magazines/SinclairUser/Issue{i3}/Pages/SinclairUser{i3}{p5}.jpg                                     |
| Crash                    | 1986      | 3       | 3      | Advert        |                      | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                                   |
| Computer & Video Games   | 1986      | 4       | 63     | Full-page ad  |                      | /pub/sinclair/magazines/C+VG/Issue{i3}/Pages/CVG{i3}{p5}.jpg                                                      |
| Crash                    | 1986      | 4       | 7      | Advert        |                      | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                                   |
| Your Sinclair            | 1986      | 4       | 97     | Advert        |                      | /pub/sinclair/magazines/YourSinclair/Issue{i2}/Pages/YourSinclair{i2}{p5}.jpg                                     |
| Crash                    | 1986      | 6       | 2      | Advert        |                      | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                                   |
| Your Sinclair            | 1986      | 7       | 96     | Advert        |                      | /pub/sinclair/magazines/YourSinclair/Issue{i2}/Pages/YourSinclair{i2}{p5}.jpg                                     |
| Computer Gamer           | 1986      | 8       | 42     | Advert        |                      | /pub/sinclair/magazines/ComputerGamer/Issue{i2}/Pages/ComputerGamer{i2}{p5}.jpg                                   |
| Crash                    | 1986      | 8       | 4      | Advert        |                      | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                                   |
| Your Sinclair            | 1986      | 8       | 96     | Advert        |                      | /pub/sinclair/magazines/YourSinclair/Issue{i2}/Pages/YourSinclair{i2}{p5}.jpg                                     |
| Computer & Video Games   | 1986      | 8       | 6      | Advert        |                      | /pub/sinclair/magazines/C+VG/Issue{i3}/Pages/CVG{i3}{p5}.jpg                                                      |
| Your Sinclair            | 1986      | 10      | 104    | Advert        |                      | /pub/sinclair/magazines/YourSinclair/Issue{i2}/Pages/YourSinclair{i2}{p5}.jpg                                     |
| Computer & Video Games   | 1989      | 7       | 115    | Advert        | The Hit Squad advert | /pub/sinclair/magazines/C+VG/Issue{i3}/Pages/CVG{i3}{p5}.jpg                                                      |
| Sinclair User            | 1989      | 7       | 57     | Advert        | The Hit Squad advert | /pub/sinclair/magazines/SinclairUser/Issue{i3}/Pages/SinclairUser{i3}{p5}.jpg                                     |
| Games Machine            | 1989      | 7       | 19     | Advert        | The Hit Squad advert | NULL                                                                                                              |
| Your Sinclair            | 1989      | 7       | 48     | Advert        | The Hit Squad advert | /pub/sinclair/magazines/YourSinclair/Issue{i2}/Pages/YourSinclair{i2}{p5}.jpg                                     |
| Sinclair User            | 1989      | 8       | 9      | Advert        | The Hit Squad advert | /pub/sinclair/magazines/SinclairUser/Issue{i3}/Pages/SinclairUser{i3}{p5}.jpg                                     |
| Your Sinclair            | 1989      | 10      | 66     | Advert        | The Hit Squad advert | /pub/sinclair/magazines/YourSinclair/Issue{i2}/Pages/YourSinclair{i2}{p5}.jpg                                     |
| Sinclair User            | 1989      | 10      | 69     | Advert        | The Hit Squad advert | /pub/sinclair/magazines/SinclairUser/Issue{i3}/Pages/SinclairUser{i3}{p5}.jpg                                     |
| Crash                    | 1989      | 10      | 23     | Advert        | The Hit Squad advert | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                                   |
+--------------------------+-----------+---------+--------+---------------+----------------------+-------------------------------------------------------------------------------------------------------------------+

 */
var getAdverts = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select m.name as magazine, i.date_year as issueyear, i.date_month as issueno, ref.page as pageno, reft.text as magazine_type, f.name as magazine_text, m.link_mask, ref.link as link from entries e inner join magrefs ref on ref.entry_id = e.id inner join features f on ref.feature_id = f.id inner join referencetypes reft on ref.referencetype_id = reft.id inner join issues i on ref.issue_id = i.id inner join magazines m on i.magazine_id = m.id where e.id = ? and ref.referencetype_id in (1, 2, 3, 15) order by date_year, date_month, pageno', [id], function(error, results, fields) {
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
                magazine_type: results[i].magazine_type,
                link_mask: results[i].link_mask,
                link: results[i].link
            }
            arr.push(item);
        }
        deferred.resolve({ adverts: arr });
    });
    return deferred.promise;
}

/**
Reviews: referencetype = 10
SELECT m.name AS magazine,
       i.date_year AS issueyear,
       i.date_month AS issuemonth,
       i.date_day AS issueday, 
       i.volume as issuevolume, 
       i.number AS issueno,
       ref.page AS pageno,
       reft.text AS magazine_type,
       f.name AS magazine_text,
       m.link_mask, ref.link as link
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
WHERE  e.id = 9362
   AND ref.referencetype_id IN ( 10 )
ORDER  BY date_year,date_month,date_day,pageno

+--------------------------+-----------+------------+----------+-------------+---------+--------+---------------+----------------------------------------------+-----------------------------------------------------------------------------------------------------------+-------------------------------------------------------------------+
|         magazine         | issueyear | issuemonth | issueday | issuevolume | issueno | pageno | magazine_type |                magazine_text                 |                                                 link_mask                                                 |                               link                                |
+--------------------------+-----------+------------+----------+-------------+---------+--------+---------------+----------------------------------------------+-----------------------------------------------------------------------------------------------------------+-------------------------------------------------------------------+
| Home Computing Weekly    |      1983 |          6 | NULL     | NULL        | NULL    |    315 | Review        |                                              | /pub/sinclair/magazines/HomeComputingWeekly/Issue{i3}/Pages/HomeComputingWeekly{i3}{p5}.jpg               | NULL                                                              |
| Computer & Video Games   |      1983 |          7 | NULL     | NULL        | 21      |    136 | Review        |                                              | /pub/sinclair/magazines/C+VG/Issue{i3}/Pages/CVG{i3}{p5}.jpg                                              | NULL                                                              |
| Personal Computing Today |      1983 |          8 | NULL     | NULL        | NULL    |     49 | Review        |                                              | /pub/sinclair/magazines/PersonalComputingToday/Issue{y2}{m2}/Pages/PersonalComputingToday{y2}{m2}{p5}.jpg | NULL                                                              |
| ZX Computing             |      1983 |          8 | NULL     | NULL        | 8       |    106 | Review        |                                              | /pub/sinclair/magazines/ZXComputing/Issue{y2}{m2}/Pages/ZXComputing{y2}{m2}{p5}.jpg                       | NULL                                                              |
| Crash                    |      1984 |          2 | NULL     | NULL        | 1       |     47 | Review        |                                              | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                           | http://www.zxspectrumreviews.co.uk/review.aspx?gid=2811&rid=12097 |
| TV Gamer                 |      1984 |          3 | NULL     | NULL        | NULL    |     15 | Review        |                                              | NULL                                                                                                      | NULL                                                              |
| Crash                    |      1984 |          3 | NULL     | NULL        | 2       |     47 | Review        |                                              | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                           | http://www.zxspectrumreviews.co.uk/review.aspx?gid=2811&rid=12359 |
| Sinclair User            |      1984 |          3 | NULL     | NULL        | 24      |     54 | Review        |                                              | /pub/sinclair/magazines/SinclairUser/Issue{i3}/Pages/SinclairUser{i3}{p5}.jpg                             | http://www.zxspectrumreviews.co.uk/review.aspx?gid=2811&rid=14044 |
| Crash                    |      1984 |          4 | NULL     | NULL        | 3       |     64 | Review        |                                              | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                           | http://www.zxspectrumreviews.co.uk/review.aspx?gid=2811&rid=12676 |
| Crash                    |      1984 |          5 | NULL     | NULL        | 4       |     56 | Review        | http://www.crashonline.org.uk/04/reviews.htm | /pub/sinclair/magazines/Crash/Issue{i2}/Pages/Crash{i2}{p5}.jpg                                           | NULL                                                              |
| Sinclair User            |      1987 |         12 | NULL     | NULL        | 69      |     48 | Review        |                                              | /pub/sinclair/magazines/SinclairUser/Issue{i3}/Pages/SinclairUser{i3}{p5}.jpg                             | http://www.zxspectrumreviews.co.uk/review.aspx?gid=2811&rid=15981 |
+--------------------------+-----------+------------+----------+-------------+---------+--------+---------------+----------------------------------------------+-----------------------------------------------------------------------------------------------------------+-------------------------------------------------------------------+

*/
var getMagazineReviews = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT m.name AS magazine,i.date_year AS issueyear,i.date_month AS issuemonth,i.date_day AS issueday, i.volume as issuevolume, i.number AS issueno, ref.page AS pageno,reft.text AS magazine_type,f.name AS magazine_text, m.link_mask, ref.link as link FROM entries e INNER JOIN magrefs ref ON ref.entry_id = e.id INNER JOIN features f ON ref.feature_id = f.id INNER JOIN referencetypes reft ON ref.referencetype_id = reft.id INNER JOIN issues i ON ref.issue_id = i.id INNER JOIN magazines m ON i.magazine_id = m.id WHERE e.id = ? AND ref.referencetype_id IN ( 10 ) ORDER BY date_year,date_month,pageno', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                magazine: results[i].magazine,
                issueyear: results[i].issueyear,
                issuemonth: results[i].issuemonth,
                issueday: results[i].issueday,
                issueno: results[i].issueno,
                issuevolume: results[i].issuevolume,
                issue: results[i].issuemonth + "." + results[i].issueyear,
                page: results[i].pageno + "",
                pageno: results[i].pageno,
                magazine_type: results[i].magazine_type,
                link_mask: results[i].link_mask,
                link: results[i].link
            }
            arr.push(item);
        }
        deferred.resolve({ magazinereview: arr });
    });
    return deferred.promise;
}

/**
 * Get MagazineRefs

The rest, not IN (1, 2, 3, 10, 15)
 */
var getMagazineRefs = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select m.name as magazine, i.date_year as issueyear, i.date_month as issueno, ref.page as pageno, reft.text as magazine_type, f.name as magazine_text, m.link_mask, ref.link as link from entries e inner join magrefs ref on ref.entry_id = e.id inner join features f on ref.feature_id = f.id inner join referencetypes reft on ref.referencetype_id = reft.id inner join issues i on ref.issue_id = i.id inner join magazines m on i.magazine_id = m.id where e.id = ? and ref.referencetype_id not in (1, 2, 3, 10, 15) order by magazine_type, date_year, date_month', [id], function(error, results, fields) {
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
                link_mask: results[i].link_mask,
                link: results[i].link
            }
            arr.push(item);
        }
        deferred.resolve({ magrefs: arr });
    });
    return deferred.promise;
}


/**
  get tosec references, requires temporary table 'tmp_tosec'
*/

var getTOSEC = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT * FROM tmp_tosec WHERE zxdb_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                url: results[i].path
            }
            arr.push(item);
        }
        deferred.resolve({ tosec: arr });
    });
    return deferred.promise;
}


/**
  This title Manic Miner Hard (30440) is a modification of
  Manic Miner (3012)

  Manic Miner ZX81 (0032032)
*/
var getModOf = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT o.id, e.title AS this_title, e.is_mod, o.title AS title, pub.name AS publisher, m.text, e.original_id FROM entries e INNER JOIN entries o ON e.original_id = o.id LEFT JOIN publishers p ON p.entry_id = o.id LEFT JOIN labels pub ON p.label_id = pub.id LEFT JOIN machinetypes m ON m.id = o.machinetype_id WHERE e.id = ? order by p.release_seq limit 1', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var item = {};
        if (results.length > 0) {
            item = {
                id: ('0000000' + results[0].id).slice(-7),
                is_mod: results[0].is_mod,
                title: results[0].title,
                publisher: results[0].publisher,
                machinetype: results[0].text
            }
        }
        deferred.resolve({ mod_of: item });
    });
    return deferred.promise;

}

/**
  This title Manic Miner (3012) are modified by these titles:  
*/
var getModifiedBy = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT e.id, e.title, e.is_mod, pub.name AS publisher, m.text FROM entries e LEFT JOIN publishers p ON p.entry_id = e.id LEFT JOIN labels pub ON p.label_id = pub.id INNER JOIN machinetypes m ON m.id = e.machinetype_id WHERE e.original_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                id: ('0000000' + results[i].id).slice(-7),
                is_mod: results[i].is_mod,
                title: results[i].title,
                publisher: results[i].publisher,
                machinetype: results[i].text
            }
            arr.push(item);
        }
        deferred.resolve({ modified_by: arr });
    });
    return deferred.promise;

}

var getTitlesForSuggestions = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT title FROM entries e where e.id = ? UNION SELECT aka.title AS title FROM aliases aka LEFT JOIN entries e ON e.id = aka.entry_id WHERE e.id = ? UNION SELECT aka.entry_title AS title FROM search_by_titles aka LEFT JOIN entries e ON e.id = aka.entry_id WHERE id = ?', [id, id, id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            arr.push.apply(arr, createSuggestions(results[i].title));
        }
        deferred.resolve({ titlesuggest: arr });
    });
    return deferred.promise;

}

var getAuthorsForSuggestions = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT DISTINCT dev.id AS id, dev.name AS name FROM authors aut INNER JOIN labels dev ON aut.label_id = dev.id WHERE aut.entry_id = ? ORDER BY dev.name ASC', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var metadata = [];
        var i = 0;
        for (; i < results.length; i++) {
            var autsug = createSuggestions(results[i].name);
            var item = { name: results[i].name, alias: autsug };
            metadata.push(item);
            arr.push.apply(arr, autsug);
        }
        deferred.resolve({ authorsuggest: arr, "metadata_author": metadata });
    });
    return deferred.promise;

}

/**
 * Suggestion functions
 */

function createSuggestions(title) {
    // split title by space, comma, dash, colon, semi-colon
    var titlewords = title.toLowerCase().split(/[\: ,-]+/);
    // if more than 5 words, keep first 5 only (to limit combinations)
    if (titlewords.length > 3) {
        var tmpArray = [];
        var ii = 0;
        for (; ii < 4; ii++) {
            tmpArray.push(titlewords[ii]);
        }
        titlewords = tmpArray;
    }

    // clean titlewords
    // remove everything not 0-9, A-Z
    // get rid of 'a', 'of' etc

    var titlewordsCleaned = [];
    titlewords.forEach(function(value) {
        var word = value.replace(/\W/g, '');
        if (word.length > 2) {
            titlewordsCleaned.push(word);
        }
    });

    var cs = Array.from(allcombinations(titlewordsCleaned));
    var input = [title];
    cs.forEach(function(v) {
        var inputLine = "";
        v.forEach(function(w) {
            inputLine += " " + w;
        });
        input.push(inputLine.trim());
    });

    input = _.uniqWith(input, _.isEqual);

    return input;
}


/*
 * #############################################
 */


var zxdb_doc = function(id) {
    var done = false;
    Q.all([getBasicInfo(id),
        getPublisher(id),
        getReleases(id),
        getAuthors(id),
        getRoles(id),
        getAuthored(id),
        getAuthoring(id),
        getControls(id),
        getInspiredByTieInLicense(id),
        getOtherSystems(id),
        getCompilationContent(id),
        getScreens(id),
        getSeries(id),
        getFeatures(id, "F", "features"),
        getFeatures(id, "C", "competition"),
        getFeatures(id, "M", "majorclone"),
        getFeatures(id, "T", "themedgroup"),
        getFeatures(id, "U", "unsortedgroup"),
        getRelatedLinks(id),
        getRelatedSites(id),
        getYouTubeLinks(id),
        getInCompilations(id),
        getBookTypeIns(id),
        getMagazineReviews(id),
        getAdditionals(id),
        getMagazineRefs(id),
        getAdverts(id),
        getTOSEC(id),
        getModOf(id),
        getModifiedBy(id),
        getTitlesForSuggestions(id),
        getAuthorsForSuggestions(id)
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

var getAllIDs = function(min_id) {
    var connection = db.getConnection();
    var done = false;
    connection.query('select id from entries where id >= ? order by id asc', [min_id], function(error, results, fields) {
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

if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " [-all] | [-from] [zxdb_id]");
    process.exit(-1);
}

var zxdb_id = null;
var process_all = false;
var process_from = false;

process.argv.forEach((val, index) => {
    if (val === '-all' && index > 1) {
        process_all = true;
    } else if (val === '-from' && index > 1) {
        process_from = true;
    } else if (Number.isInteger(parseInt(val)) && index > 1) {
        zxdb_id = val;
    }
});

if (process_all) {
    console.log("Processing ALL games");
    getAllIDs(0);
} else if (zxdb_id !== null && !process_from) {
    console.log("Processing game: " + zxdb_id);
    getID(zxdb_id);
} else if (zxdb_id !== null && process_from) {
    console.log("Processing from game: " + zxdb_id);
    getAllIDs(zxdb_id);
} else {
    console.log("Usage: " + __filename + " [-all] | [-from] [game_id]");
    process.exit(-1);
}