/**

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
        console.error("ERROR: ", id + " UNKNOWN PRICE: ", price);
    }
    return { amount: amount, currency: currency, license: license };
}

/**
 * Get basic info

--
SELECT e.title AS fulltitle,aka.title AS alsoknownas,
       r.release_year AS yearofrelease,
       machinet.text AS machinetype,e.max_players AS numberofplayers,
       turnt.text AS multiplayermode,multipl.text AS multiplayertype,
       entryt.text AS type, e.book_isbn as isbn, idm.text AS messagelanguage,
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
WHERE  e.id = 4010
   AND r.release_seq = 0; 

+-----------+----------------------------+---------------+-----------------+-----------------+-----------------+-----------------+---------------------+------+-----------------+---------------------+---------------+--------------+---------+-------+-------+
| fulltitle | alsoknownas                | yearofrelease | machinetype     | numberofplayers | multiplayermode | multiplayertype | type                | isbn | messagelanguage | originalpublication | originalprice | availability | remarks | score | votes |
+-----------+----------------------------+---------------+-----------------+-----------------+-----------------+-----------------+---------------------+------+-----------------+---------------------+---------------+--------------+---------+-------+-------+
| Rambo     | Rambo: First Blood Part II | 1985          | ZX-Spectrum 48K | 2               | Alternating     | NULL            | Arcade: Shoot-em-up | NULL | English         | NULL                | �7.95         | Available    | NULL    | 6.80  | 72    |
+-----------+----------------------------+---------------+-----------------+-----------------+-----------------+-----------------+---------------------+------+-----------------+---------------------+---------------+--------------+---------+-------+-------+

 */
var getBasicInfo = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select e.title as fulltitle, aka.title as alsoknownas, r.release_year as yearofrelease, machinet.text as machinetype, e.max_players as numberofplayers, turnt.text as multiplayermode, multipl.text as multiplayertype, entryt.text as type, e.book_isbn as isbn, idm.text as messagelanguage, pubt.text as originalpublication, r.release_price as originalprice, availt.text as availability, e.comments as remarks, e.spot_comments as spotcomments, sc.score as score, sc.votes as votes from entries e inner join releases r on r.entry_id = e.id left join aliases aka on aka.entry_id = r.entry_id and aka.release_seq = r.release_seq left join availabletypes availt on e.availabletype_id = availt.id left join machinetypes machinet on e.machinetype_id = machinet.id left join turntypes turnt on e.turntype_id = turnt.id left join multiplaytypes multipl on e.multiplaytype_id = multipl.id left join genretypes entryt on e.genretype_id = entryt.id left join publicationtypes pubt on e.publicationtype_id = pubt.id left join idioms idm on e.idiom_id = idm.id left join scores sc on sc.entry_id = e.id where e.id = ? and r.release_seq = 0', [id], function(error, results, fields) {
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
            isbn: results[0].isbn,
            messagelanguage: results[0].messagelanguage,
            originalpublication: results[0].originalpublication,
            originalprice: originalprice,
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
SELECT pub.name AS name,pc1.text AS country, aka.title as as_title
FROM   releases r 
       LEFT JOIN aliases aka
              ON aka.entry_id = r.entry_id
                 AND aka.release_seq = r.release_seq
       INNER JOIN publishers p 
               ON p.entry_id = r.entry_id 
                  AND p.release_seq = r.release_seq 
       INNER JOIN labels pub 
               ON p.label_id = pub.id 
       LEFT JOIN countries pc1 
              ON pub.country_id = pc1.id 
WHERE  r.entry_id = 4010
       AND r.release_seq > 0 

ID: 2000011 as title
+--------------------+---------+----------+
| name               | country | as_title |
+--------------------+---------+----------+
| Erbe Software S.A. | Spain   | NULL     |
| IBSA               | Spain   | NULL     |
| The Hit Squad      | UK      | NULL     |
+--------------------+---------+----------+

 */
var getReReleasedBy = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT pub.name AS name,pc1.text AS country, aka.title as as_title FROM releases r LEFT JOIN aliases aka ON aka.entry_id = r.entry_id AND aka.release_seq = r.release_seq INNER JOIN publishers p ON p.entry_id = r.entry_id AND p.release_seq = r.release_seq INNER JOIN labels pub ON p.label_id = pub.id LEFT JOIN countries pc1 ON pub.country_id = pc1.id WHERE r.entry_id = ? AND r.release_seq > 0', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                name: results[i].name,
                country: results[i].country,
                as_title: results[i].as_title
            }
            arr.push(item);
        }
        deferred.resolve({ rereleasedby: arr });
    });
    return deferred.promise;
}

/**
 * Get authors

--
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
WHERE  aut.entry_id = 483

+-------------------+----------------------+
| name              | dev_group            |
+-------------------+----------------------+
| David J. Anderson | Platinum Productions |
| Ian Morrison      | Platinum Productions |
| Alan Laird        | Platinum Productions |
| F. David Thorpe   | NULL                 |
+-------------------+----------------------+

*/
var getAuthors = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
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
            arr.push({ authors: tmparr, group: group })
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
FROM   authorings iaut 
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
        deferred.resolve({ authored: arr });
    });
    return deferred.promise;
}

/**
 * Get Authoring

-- The following programs are known to have been authored with this tool...
SELECT prog.title AS title, 
       pub.NAME   AS publisher 
FROM   authorings eaut 
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
    connection.query('select prog.title as title, pub.name as publisher from authorings eaut inner join entries prog on eaut.entry_id = prog.id left join publishers p on p.entry_id = prog.id left join labels pub on p.label_id = pub.id where eaut.util_id = ?', [id], function(error, results, fields) {
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
SELECT DISTINCT prog.title AS title, 
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
    connection.query('select distinct prog.title as title, pub.name as publisher, g.name as groupname, groupt.id as grouptype from entries e inner join members memb on memb.entry_id = e.id inner join groups g on memb.group_id = g.id inner join grouptypes groupt on g.grouptype_id = groupt.id and groupt.id = "S" inner join members others on others.group_id = g.id inner join entries prog on others.entry_id = prog.id left join publishers p on p.entry_id = prog.id left join labels pub on p.label_id = pub.id where e.id = ? and p.release_seq = 0 order by g.name, others.series_seq ASC', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                title: results[i].title,
                publisher: results[i].publisher,
                groupname: results[i].groupname,
                grouptype: results[i].grouptype,
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
var getFeatures = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select g.name, groupt.id, groupt.text from members feat inner join groups g on feat.group_id = g.id inner join grouptypes groupt on g.grouptype_id = groupt.id and groupt.id <> "S" where feat.entry_id = ?', [id], function(error, results, fields) {
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
WHERE  rel.entry_id = 4010; 

+-----------+-----------------------------------------------------------------+
| sitename  | link                                                            |
+-----------+-----------------------------------------------------------------+
| Freebase  | http://zxspectrum.freebase.com/view/base/zxspectrum/wos/0004010 |
| Wikipedia | http://en.wikipedia.org/wiki/Rambo_%281985_video_game%29        |
+-----------+-----------------------------------------------------------------+

 */
var getSites = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
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

 */
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

/**
 * Get additionals (Everything else that is not machine specific - simple output)

--
SELECT d.file_link AS url,file_size AS size,filet.text AS type, format.text AS format
FROM   downloads d
       INNER JOIN filetypes filet
               ON d.filetype_id = filet.id
       INNER JOIN formattypes format
             ON d.formattype_id = format.id
WHERE  d.machinetype_id IS NULL
   AND d.entry_id = 4010

+--------------------------------------------+------+----------------+-------------+
| url                                        | size | type           | format      |
+--------------------------------------------+------+----------------+-------------+
| /pub/sinclair/screens/load/r/gif/Rambo.gif | 6007 | Loading screen | Picture     |
| /pub/sinclair/screens/load/r/scr/Rambo.scr | 6912 | Loading screen | Screen dump |
| /pub/sinclair/screens/in-game/r/Rambo.gif  | 3978 | In-game screen | Picture     |
+--------------------------------------------+------+----------------+-------------+

 */
var getAdditionals = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT d.file_link AS url,file_size AS size,filet.text AS type, format.text AS format FROM downloads d INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN formattypes format ON d.formattype_id = format.id WHERE d.machinetype_id IS NULL AND d.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            if (results[i].url == undefined) {; // console.log(id + ": empty additionals: ");
            } else {
                var downloaditem = {
                    filename: path.basename(results[i].url),
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
    connection.query('select m.name as magazine, i.date_year as issueyear, i.date_month as issueno, ref.page as pageno, reft.text as magazine_type, f.name as magazine_text, m.link_mask from entries e inner join magrefs ref on ref.entry_id = e.id inner join features f on ref.feature_id = f.id inner join referencetypes reft on ref.referencetype_id = reft.id inner join issues i on ref.issue_id = i.id inner join magazines m on i.magazine_id = m.id where e.id = ? and ref.referencetype_id in (1, 2, 3, 15) order by date_year, date_month, pageno', [id], function(error, results, fields) {
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

/**
 * Get MagazineRefs

 Same as Adverts, just negate IN clause
 */
var getMagazineRefs = function(id) {
        var deferred = Q.defer();
        var connection = db.getConnection();
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
    /*
     * #############################################
     */


var zxdb_doc = function(id) {
    var done = false;
    Q.all([getBasicInfo(id),
        getPublisher(id),
        getReReleasedBy(id),
        getAuthors(id),
        getRoles(id),
        getAuthored(id),
        getAuthoring(id),
        getControls(id),
        getInspiredByTieInLicense(id),
        getSeries(id),
        getOtherSystems(id),
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
    require('deasync').loopWhile(function() {
        return !done;
    });
}

var getAllIDs = function() {
    var connection = db.getConnection();
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
    require('deasync').loopWhile(function() {
        return !done;
    });
    console.log("Finished!");
    db.closeConnection(connection);
}

var getID = function(gameid) {
    var connection = db.getConnection();
    var done = false;
    connection.query('select id from entries where id = ? order by id asc', [gameid], function(error, results, fields) {
        if (error) {
            throw new Error("Can't connect: ", err.stack);
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
    console.log("Usage: " + __filename + " [-all] [game_id]");
    process.exit(-1);
}

if (process.argv[2] === '-all') {
    console.log("Processing ALL games");
    getAllIDs();
} else {
    var gameid = process.argv[2];
    console.log(gameid + ", " + parseInt(gameid))
    if (gameid == parseInt(gameid)) {
        console.log("Processing game: " + gameid);
        getID(gameid);
    } else {
        console.log(gameid + " is NOT a valid gameid");
    }
}
