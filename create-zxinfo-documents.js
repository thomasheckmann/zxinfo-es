/**

dd.mm.yyyy

Changelog:
20.08.2019 - I'm also planning to remove columns "link" and "link2" from table "magrefs" in the next ZXDB update.
			 https://spectrumcomputing.co.uk/forums/viewtopic.php?f=32&t=636&p=25373&hilit=magrefs.link#p25373
08.07.2019 - In the next upcoming ZXDB update, column "formattype_id" won't be used anymore. This column will still exist in all file-related tables (so it doesn't break SQL queries in sites that were not updated yet), but it will be always NULL.
			 https://spectrumcomputing.co.uk/forums/viewtopic.php?f=32&t=636&start=110
			 https://spectrumcomputing.co.uk/forums/viewtopic.php?f=32&t=636&start=150
		   - table "formattypes" and columns "formattype_id" will be removed in the next ZXDB update.
		     https://spectrumcomputing.co.uk/forums/viewtopic.php?f=32&t=636&start=170

11.03.2019 - Added The Spectrum Show (Youtube) to YouTube links.
11.03.2019 - Column "entries.spanish_price" removed. (No changes needed)
25.02.2019 - Technically table "aliases" now has a composite natural key, instead of artificial key "id". (No changes needed)
			 Inspired_by and Mod_of moved to new relations table(m, i). JSON changed. Mod_of can not be an array, also contains text for relation type.
			 Authored moved to new relations table. No longer uses "frameworks"
15.02.2019 - Table "relatedlinks" was renamed to "webrefs". relatedlinks + webrefs in JSON. Relatedlinks will be deprecated in the future.
			 Table "origintypes" was renamed to "sourcetypes"
			 Column "downloads.origintype_id" was renamed to "downloads.sourcetype_id", and now it's nullable. (No changes nedded)
			 Column "extras.origintype_id" was renamed to "extras.sourcetype_id", and now it's nullable. (No changes nedded)

12.02.2019 - Technically all game licenses are now stored in a new table called "relatedlicenses".
29.01.2019 - Internal definition of table "relatedlinks" was changed. (No changes needed)
19.01.2019 - Technically columns disk_price, microdrive_price, and cartridge_price were moved to table "releases".
10.05.2018 - Controls changed to Group 'J'
10.05.2018 - Turntype changed to Group 'N'
10.05.2018 - Multiplayermode changed to Group 'Y'
08.04.2018 - author_seq removed from roles table, simplified getRoles SQL query
05.04.2018 - Removed dev_alias from author info, removed reference to download.id
20.03.2018 - JSON cleanup - https://github.com/thomasheckmann/zxinfo-services/issues/8
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

SUBLIME: (\s){2,} -> Space

*/

'use strict';

var db = require('./dbConfig');

var json_output_dir = 'data/processed/json/';

var Q = require('q');
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
SELECT
    e.title AS fulltitle,
    aka.title AS alsoknownas,
    r.release_year AS yearofrelease,
    r.release_month AS monthofrelease,
    r.release_day AS dayofrelease,
    machinet.text AS machinetype,
    e.max_players AS numberofplayers,
    (SELECT GROUP_CONCAT(g.name) FROM members turn INNER JOIN groups g ON turn.group_id = g.id and g.grouptype_id = "N" WHERE turn.entry_id = e.id) AS multiplayermode,
    (SELECT GROUP_CONCAT(g.name) FROM members turn INNER JOIN groups g ON turn.group_id = g.id and g.grouptype_id = "Y" WHERE turn.entry_id = e.id) AS multiplayertype,
    e.genretype_id AS genretype,
    entryt.text AS type,
    e.book_isbn AS isbn,
    idm.text AS messagelanguage,
    pubt.text AS originalpublication,
    r.release_price AS originalprice,
    availt.text AS availability,
    e.known_errors AS known_errors,
    e.comments AS remarks,
    e.spot_comments AS spotcomments,
    sc.score AS score,
    sc.votes AS votes
FROM
    entries e
LEFT JOIN releases r ON
    r.entry_id = e.id
LEFT JOIN aliases aka ON
    aka.entry_id = r.entry_id AND aka.release_seq = r.release_seq
LEFT JOIN availabletypes availt ON
    e.availabletype_id = availt.id
LEFT JOIN machinetypes machinet ON
    e.machinetype_id = machinet.id
LEFT JOIN genretypes entryt ON
    e.genretype_id = entryt.id
LEFT JOIN publicationtypes pubt ON
    e.publicationtype_id = pubt.id
LEFT JOIN idioms idm ON
    e.idiom_id = idm.id
LEFT JOIN scores sc ON
    sc.entry_id = e.id
WHERE
    e.id = 722 AND(
        r.release_seq = 0 OR r.release_seq IS NULL
    )

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
    connection.query('SELECT e.title AS fulltitle, aka.title AS alsoknownas, r.release_year AS yearofrelease, r.release_month AS monthofrelease, r.release_day AS dayofrelease, machinet.text AS machinetype, e.max_players AS numberofplayers, (SELECT GROUP_CONCAT(g.name) FROM members turn INNER JOIN groups g ON turn.group_id = g.id and g.grouptype_id = "N" WHERE turn.entry_id = e.id) AS multiplayermode, (SELECT GROUP_CONCAT(g.name) FROM members turn INNER JOIN groups g ON turn.group_id = g.id and g.grouptype_id = "Y" WHERE turn.entry_id = e.id) AS multiplayertype, e.genretype_id AS genretype, entryt.text AS type, e.book_isbn AS isbn, idm.text AS messagelanguage, pubt.text AS originalpublication, r.release_price AS originalprice, availt.text AS availability, e.known_errors AS known_errors, e.comments AS remarks, e.spot_comments AS spotcomments, sc.score AS score, sc.votes AS votes FROM entries e LEFT JOIN releases r ON r.entry_id = e.id LEFT JOIN aliases aka ON aka.entry_id = r.entry_id AND aka.release_seq = r.release_seq LEFT JOIN availabletypes availt ON e.availabletype_id = availt.id LEFT JOIN machinetypes machinet ON e.machinetype_id = machinet.id LEFT JOIN genretypes entryt ON e.genretype_id = entryt.id LEFT JOIN publicationtypes pubt ON e.publicationtype_id = pubt.id LEFT JOIN idioms idm ON e.idiom_id = idm.id LEFT JOIN scores sc ON sc.entry_id = e.id WHERE e.id = ? AND(r.release_seq = 0 OR r.release_seq IS NULL );', [id], function(error, results, fields) {
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
        deferred.resolve(removeEmpty(doc));
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
            arr.push(removeEmpty(item));
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
order  by r.release_seq

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
var getReleases = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('select distinct r.release_seq as seq, e.title as title, aka.title as as_title, pub.name as name, pc1.text as country, r.release_year as yearofrelease, r.release_price as releaseprice, r.budget_price as budgetprice, r.microdrive_price as microdriveprice, r.disk_price as diskprice, r.cartridge_price as cartridgeprice, d.file_size as size, d.file_link as url, filet.text as type, ex.text as format, origint.text as origin, d.file_code as code, d.file_barcode as barcode, d.file_dl as dl, schemet.text as encodingscheme from releases r left join aliases aka on aka.entry_id = r.entry_id and aka.release_seq = r.release_seq inner join entries e on e.id = r.entry_id left join publishers p on p.entry_id = r.entry_id and p.release_seq = r.release_seq left join labels pub on p.label_id = pub.id left join countries pc1 on pub.country_id = pc1.id left join downloads d on d.entry_id = r.entry_id and d.release_seq = r.release_seq and (d.filetype_id IN (46, 47) OR d.filetype_id BETWEEN 8 AND 22) left join filetypes filet on d.filetype_id = filet.id left join extensions ex on right(d.file_link, length(ex.ext)) = ex.ext left join sourcetypes origint on d.sourcetype_id = origint.id left join schemetypes schemet on d.schemetype_id = schemet.id where r.entry_id = ? order by r.release_seq', [id], function(error, results, fields) {
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
                releaseprice: results[i].releaseprice,
                budgetprice: results[i].budgetprice,
                microdriveprice: results[i].microdriveprice,
                diskprice: results[i].diskprice,
                cartridgeprice: results[i].cartridgeprice,
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
            arr.push(removeEmpty(item));
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
    tc1.text AS group_country
FROM
    authors aut
INNER JOIN labels dev ON
    aut.label_id = dev.id
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
    connection.query('SELECT dev.name AS dev_name, ac1.text AS dev_country, team.name AS group_name, tc1.text AS group_country FROM authors aut INNER JOIN labels dev ON aut.label_id = dev.id LEFT JOIN countries ac1 ON dev.country_id = ac1.id LEFT JOIN labels team ON aut.team_id = team.id LEFT JOIN countries tc1 ON team.country_id = tc1.id WHERE aut.entry_id = ? ORDER BY group_name, dev_name', [id], function(error, results, fields) {
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
                authorArray.push(removeEmpty({ name: results[i].dev_name.trim(), country: results[i].dev_country}));
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
SELECT title, l.name, rt.text AS role FROM roles r
INNER JOIN entries e ON e.id = r.entry_id
INNER JOIN labels l ON l.id = r.label_id
INNER JOIN roletypes rt on rt.id = r.roletype_id
WHERE r.entry_id = 26834 ORDER BY name

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
    connection.query('SELECT title, l.name, rt.text AS role FROM roles r INNER JOIN entries e ON e.id = r.entry_id INNER JOIN labels l ON l.id = r.label_id INNER JOIN roletypes rt on rt.id = r.roletype_id WHERE r.entry_id = ? ORDER by name', [id], function(error, results, fields) {
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
SELECT
    tool.title,
    pub.NAME AS publisher
FROM
    relations iaut
INNER JOIN entries tool ON
    iaut.original_id = tool.id
LEFT JOIN publishers p ON
    p.entry_id = tool.id
LEFT JOIN labels pub ON
    p.label_id = pub.id
WHERE
    p.release_seq = 0 AND relationtype_id = 'a' AND iaut.entry_id = 30321

+-----------------+--------------+
| title           | publisher    |
+-----------------+--------------+
| NIRVANA+ ENGINE | Einar Saukas |
+-----------------+--------------+

 */
var getAuthored = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT tool.title, pub.NAME AS publisher FROM relations iaut INNER JOIN entries tool ON iaut.original_id = tool.id LEFT JOIN publishers p ON p.entry_id = tool.id LEFT JOIN labels pub ON p.label_id = pub.id WHERE p.release_seq = 0 AND relationtype_id = "a" AND iaut.entry_id = ?', [id], function(error, results, fields) {
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
SELECT
    prog.title AS title,
    pub.NAME AS publisher
FROM
    relations eaut
INNER JOIN entries prog ON
    eaut.entry_id = prog.id
LEFT JOIN publishers p ON
    p.entry_id = prog.id
LEFT JOIN labels pub ON
    p.label_id = pub.id
WHERE
    eaut.relationtype_id = "a" AND eaut.original_id = 30002;

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
    connection.query('SELECT prog.title AS title, pub.NAME AS publisher FROM relations eaut INNER JOIN entries prog ON eaut.entry_id = prog.id LEFT JOIN publishers p ON p.entry_id = prog.id LEFT JOIN labels pub ON p.label_id = pub.id WHERE eaut.relationtype_id = "a" AND eaut.original_id = ?', [id], function(error, results, fields) {
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
SELECT
    g.name,
    groupt.id,
    groupt.text
FROM
    members feat
INNER JOIN groups g ON
    feat.group_id = g.id
INNER JOIN grouptypes groupt ON
    g.grouptype_id = groupt.id AND groupt.id = 'J'
WHERE
    feat.entry_id = 2259

+---------------------+
| name                |
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
    connection.query('SELECT g.name, groupt.id, groupt.text FROM members feat INNER JOIN groups g ON feat.group_id = g.id INNER JOIN grouptypes groupt ON g.grouptype_id = groupt.id AND groupt.id = \'J\' WHERE feat.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var control = { control: results[i].name };
            arr.push(control);
        }
        deferred.resolve({ controls: arr });
    });
    return deferred.promise;
}

/**
 * Get inspired / tie-in license

 -- This program was licensed from or inspired by...
SELECT
    ll.name AS NAME,
    lc1.text AS country,
    lict.text AS TYPE,
    lic.name originalname
FROM
    relatedlicenses rl
INNER JOIN licenses lic ON
    rl.license_id = lic.id
INNER JOIN licensetypes lict ON
    lic.licensetype_id = lict.id
LEFT JOIN licensors lor ON
    lor.license_id = lic.id
LEFT JOIN labels ll ON
    lor.label_id = ll.id
LEFT JOIN countries lc1 ON
    ll.country_id = lc1.id
WHERE
    rl.entry_id = 4010

1220
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
    connection.query('SELECT ll.name AS name, lc1.text AS country, lict.text AS type, lic.name originalname FROM relatedlicenses rl INNER JOIN licenses lic ON rl.license_id = lic.id INNER JOIN licensetypes lict ON lic.licensetype_id = lict.id LEFT JOIN licensors lor ON lor.license_id = lic.id LEFT JOIN labels ll ON lor.label_id = ll.id LEFT JOIN countries lc1 ON ll.country_id = lc1.id WHERE rl.entry_id = ?', [id], function(error, results, fields) {
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
SELECT DISTINCT
    prog.title AS title,
    prog.id AS entry_id,
    pub.NAME AS publisher,
    g.name AS groupname,
    groupt.id AS grouptype
FROM
    entries e
INNER JOIN members memb ON
    memb.entry_id = e.id
INNER JOIN groups g ON
    memb.group_id = g.id
INNER JOIN grouptypes groupt ON
    g.grouptype_id = groupt.id AND groupt.id = "S"
INNER JOIN members others ON
    others.group_id = g.id
INNER JOIN entries prog ON
    others.entry_id = prog.id
LEFT JOIN publishers p ON
    p.entry_id = prog.id
LEFT JOIN labels pub ON
    p.label_id = pub.id
WHERE
    e.id = 28465 AND(
        (
            p.label_id IS NOT NULL AND p.release_seq = 0
        ) OR(
            p.label_id IS NULL AND p.release_seq IS NULL
        )
    )
ORDER BY
    g.NAME,
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
    connection.query('SELECT DISTINCT prog.title AS title, prog.id as entry_id, pub.NAME AS publisher, g.name as groupname, groupt.id as grouptype FROM entries e INNER JOIN members memb ON memb.entry_id = e.id INNER JOIN groups g ON memb.group_id = g.id INNER JOIN grouptypes groupt ON g.grouptype_id = groupt.id AND groupt.id = "S" INNER JOIN members others ON others.group_id = g.id INNER JOIN entries prog ON others.entry_id = prog.id LEFT JOIN publishers p ON p.entry_id = prog.id LEFT JOIN labels pub ON p.label_id = pub.id WHERE e.id = ? AND ((p.label_id IS NOT NULL AND p.release_seq = 0) OR (p.label_id IS NULL AND p.release_seq IS NULL)) ORDER BY g.NAME, others.series_seq ASC', [id], function(error, results, fields) {
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
LEFT JOIN publishers p ON
    p.entry_id = ecomp.entry_id
LEFT JOIN labels ll ON
    p.label_id = ll.id
LEFT JOIN countries lc1 ON
    ll.country_id = lc1.id
WHERE
    ((p.label_id IS NOT NULL AND p.release_seq = 0) OR (p.label_id IS NULL AND p.release_seq IS NULL)) AND ecomp.compilation_id = 11869
ORDER BY
  tape_side, tape_seq, prog_seq

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
    connection.query('SELECT ecomp.tape_side AS tape_side, ecomp.tape_seq AS tape_seq, ecomp.prog_seq AS prog_seq, item.title AS title, ll.name AS publisher, evart.text as variation FROM compilations ecomp INNER JOIN entries item ON ecomp.entry_id = item.id INNER JOIN variationtypes evart ON ecomp.variationtype_id = evart.id LEFT JOIN publishers p ON p.entry_id = ecomp.entry_id LEFT JOIN labels ll ON p.label_id = ll.id LEFT JOIN countries lc1 ON ll.country_id = lc1.id WHERE ((p.label_id IS NOT NULL AND p.release_seq = 0) OR (p.label_id IS NULL AND p.release_seq IS NULL)) AND ecomp.compilation_id = ? ORDER BY tape_side, tape_seq, prog_seq', [id], function(error, results, fields) {
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

SELECT -- COMPILATIONS
    d.file_link AS url,
    d.file_size AS size,
    filet.text AS type,
    ex.text AS format,
    e.title as title
FROM
    compilations c
INNER JOIN entries e ON
    c.entry_id = e.id
INNER JOIN downloads d ON
    e.id = d.entry_id AND d.release_seq = 0
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like 'Picture%' OR ex.text like 'Screen dump%')
WHERE
    d.filetype_id IN(1, 2) AND c.compilation_id = 11196 
UNION 
SELECT -- GAME
    d.file_link AS url,
    file_size AS size,
    filet.text AS type,
    ex.text AS format,
    null AS title
FROM
    downloads d
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like 'Picture%' OR ex.text like 'Screen dump%')
WHERE
    d.machinetype_id IS NULL AND d.filetype_id IN(1, 2) AND d.entry_id = 11196
UNION 
SELECT -- HARDWARE
    d.file_link AS url,
    file_size AS size,
    filet.text AS type,    
    ex.text AS format,
    null AS title
FROM
    downloads d
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like 'Picture%')
INNER JOIN entries e ON
    d.entry_id = e.id
WHERE
    (e.genretype_id BETWEEN 91 AND 108) AND d.filetype_id IN(53) AND d.entry_id = 1000192 -- 91-108=hardware, 53=hardware thumb
UNION
SELECT -- BOOKS
    d.file_link AS url,
    file_size AS size,
    "Loading screen" as type,
    ex.text AS format,
    null AS title
FROM
    downloads d
INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like 'Picture%')
INNER JOIN entries e ON
    d.entry_id = e.id
WHERE
    (e.genretype_id BETWEEN 83 AND 90) AND d.filetype_id IN(45) AND d.entry_id = 2000237

+---------------------------------------------------------------------+--------+--------------------+-------------------+-----------------------+
| url                                                                 | size   | type               | format            | title                 |
+---------------------------------------------------------------------+--------+--------------------+-------------------+-----------------------+
| /pub/sinclair/screens/in-game/k/Kung-FuMaster.gif                   | 5603   | Running screen     | Picture (GIF)     | Kung-Fu Master        |
| /pub/sinclair/screens/in-game/t/TopGun.gif                          | 3914   | Running screen     | Picture (GIF)     | Top Gun               |
| /pub/sinclair/screens/in-game/j/JackTheNipper.gif                   | 4391   | Running screen     | Picture (GIF)     | Jack the Nipper       |
| /pub/sinclair/screens/in-game/a/AufWiedersehenMonty.gif             | 5878   | Running screen     | Picture (GIF)     | Auf Wiedersehen Monty |
| /pub/sinclair/screens/in-game/s/SuperCycle.gif                      | 4944   | Running screen     | Picture (GIF)     | Super Cycle           |
| /pub/sinclair/screens/in-game/g/Gauntlet.gif                        | 4252   | Running screen     | Picture (GIF)     | Gauntlet              |
| /pub/sinclair/screens/load/k/scr/Kung-FuMaster.scr                  | 6912   | Loading screen     | Screen dump (SCR) | Kung-Fu Master        |
| /pub/sinclair/screens/load/t/scr/TopGun.scr                         | 6912   | Loading screen     | Screen dump (SCR) | Top Gun               |
| /pub/sinclair/screens/load/j/scr/JackTheNipper.scr                  | 6912   | Loading screen     | Screen dump (SCR) | Jack the Nipper       |
| /pub/sinclair/screens/load/a/scr/AufWiedersehenMonty.scr            | 6912   | Loading screen     | Screen dump (SCR) | Auf Wiedersehen Monty |
| /pub/sinclair/screens/load/s/scr/SuperCycle.scr                     | 6912   | Loading screen     | Screen dump (SCR) | Super Cycle           |
| /pub/sinclair/screens/load/g/scr/Gauntlet.scr                       | 6912   | Loading screen     | Screen dump (SCR) | Gauntlet              |
| /pub/sinclair/screens/in-game/123/6GameActionPack.gif               | 23915  | Running screen     | Picture (GIF)     | NULL                  |
| /zxdb/sinclair/pics/hw/ZXInterface1.jpg                             | NULL   | Hardware thumbnail | Picture (JPG)     | NULL                  |
| /pub/sinclair/books-pics/m/MasteringMachineCodeOnYourZXSpectrum.jpg | 179560 | Loading screen     | Picture (JPG)     | NULL                  |
| /zxdb/sinclair/pics/books/MasteringMachineCodeOnYourZXSpectrum.jpg  | NULL   | Loading screen     | Picture (JPG)     | NULL                  |
+---------------------------------------------------------------------+--------+--------------------+-------------------+-----------------------+

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
    connection.query('SELECT d.file_link AS url, d.file_size AS size, filet.text AS type, ex.text AS format, e.title as title FROM compilations c INNER JOIN entries e ON c.entry_id = e.id INNER JOIN downloads d ON e.id = d.entry_id AND d.release_seq = 0 INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like "Picture%" OR ex.text like "Screen dump%") WHERE d.filetype_id IN(1, 2) AND c.compilation_id = ? UNION SELECT d.file_link AS url, file_size AS size, filet.text AS type, ex.text AS format, null AS title FROM downloads d INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like "Picture%" OR ex.text like "Screen dump%") WHERE d.machinetype_id IS NULL AND d.filetype_id IN(1, 2) AND d.entry_id = ? UNION SELECT d.file_link AS url, file_size AS size, filet.text AS type, ex.text AS format, null AS title FROM downloads d INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like "Picture%") INNER JOIN entries e ON d.entry_id = e.id WHERE (e.genretype_id BETWEEN 91 AND 108) AND d.filetype_id IN(53) AND d.entry_id = ? UNION SELECT d.file_link AS url, file_size AS size, "Loading screen" as type, ex.text AS format, null AS title FROM downloads d INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext AND (ex.text like "Picture%") INNER JOIN entries e ON d.entry_id = e.id WHERE (e.genretype_id BETWEEN 83 AND 90) AND d.filetype_id IN(45) AND d.entry_id = ?', [id, id, id, id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            if (results[i].url == undefined) {;
            } else {
                if (results[i].format.startsWith('Picture')) {  // Picture (GIF), Picture (JPG)
                    var downloaditem = {
                        filename: path.basename(results[i].url),
                        url: results[i].url,
                        size: results[i].size,
                        type: results[i].type,
                        format: results[i].format,
                        title: results[i].title
                    }
                    arr.push(removeEmpty(downloaditem));
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
    webrefs rel
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
    connection.query('SELECT relw.name AS sitename,rel.link FROM webrefs rel INNER JOIN websites relw ON rel.website_id = relw.id WHERE relw.name NOT IN ("Freebase","The Tipshop","RZX Archive Channel (YouTube)", "ZX81 videos (Youtube)") AND rel.entry_id = ? ORDER BY sitename', [id], function(error, results, fields) {
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
        deferred.resolve({ relatedlinks: arr, webrefs: arr });
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
    connection.query('SELECT relw.name AS sitename,rel.link FROM webrefs rel INNER JOIN websites relw ON rel.website_id = relw.id WHERE relw.name IN ("RZX Archive Channel (YouTube)", "ZX81 videos (Youtube)", "The Spectrum Show (Youtube)") AND rel.entry_id = ? ORDER BY sitename', [id], function(error, results, fields) {
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

SELECT
    d.file_link AS url,
    file_size AS size,
    filet.text AS type,
    ex.text AS format
FROM
    downloads d
INNER JOIN filetypes filet ON
    d.filetype_id = filet.id
INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext
WHERE
	NOT(filetype_id IN (46, 47) OR filetype_id BETWEEN 8 AND 22) AND d.entry_id = 2259


+-----------------------------------------------------------------------------+---------+-----------------------------------------------+-------------------+
| url                                                                         | size    | type                                          | format            |
+-----------------------------------------------------------------------------+---------+-----------------------------------------------+-------------------+
| /pub/sinclair/games-info/h/HeadOverHeels(ErbeSoftwareS.A.).pdf              | 68634   | Instructions                                  | Document (PDF)    |
| /pub/sinclair/games-info/h/HeadOverHeels.pdf                                | 1827379 | Scanned instructions                          | Document (PDF)    |
| /pub/sinclair/games-info/h/HeadOverHeels.txt                                | 22346   | Instructions                                  | Document (TXT)    |
| /pub/sinclair/games-info/h/HeadOverHeels_2.txt                              | 40501   | Instructions                                  | Document (TXT)    |
| /pub/sinclair/music/ay/games/h/HeadOverHeels.ay.zip                         | 2404    | Ripped in-game and theme music in AY format   | Music (AY)        |
| /pub/sinclair/music/mp3/HeadOverHeels.mp3.zip                               | 4630304 | Sampled in-game and theme music in MP3 format | Music (MP3)       |
| /pub/sinclair/screens/in-game/h/HeadOverHeels.gif                           | 6878    | Running screen                                | Picture (GIF)     |
| /pub/sinclair/games-adverts/h/HeadOverHeels.jpg                             | 282410  | Advertisement                                 | Picture (JPG)     |
| /pub/sinclair/games-inlays/Rereleases/h/HeadOverHeels(ErbeSoftwareS.A.).jpg | 81611   | Re-release cassette inlay                     | Picture (JPG)     |
| /pub/sinclair/games-maps/h/HeadOverHeels.jpg                                | 471394  | Game map                                      | Picture (JPG)     |
| /pub/sinclair/games-maps/h/HeadOverHeels_2.jpg                              | 604773  | Game map                                      | Picture (JPG)     |
| /pub/sinclair/games-maps/h/HeadOverHeels_3.jpg                              | 470666  | Game map                                      | Picture (JPG)     |
| /zxdb/sinclair/entries/0002259/HeadOverHeels(HitSquad).jpg                  | NULL    | Re-release cassette inlay                     | Picture (JPG)     |
| /zxdb/sinclair/entries/0002259/HeadOverHeels.jpg                            | NULL    | Cassette inlay                                | Picture (JPG)     |
| /pub/sinclair/games-maps/h/HeadOverHeels_4.png                              | 1439896 | Game map                                      | Picture (PNG)     |
| /zxdb/sinclair/pokes/h/Head over Heels (1987)(Ocean Software).pok           | NULL    | POK pokes file                                | Pokes (POK)       |
| /pub/sinclair/screens/load/h/scr/HeadOverHeels.scr                          | 6912    | Loading screen                                | Screen dump (SCR) |
+-----------------------------------------------------------------------------+---------+-----------------------------------------------+-------------------+

*/

var getAdditionals = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT d.file_link AS url, file_size AS size, filet.text AS type, ex.text AS format FROM downloads d INNER JOIN filetypes filet ON d.filetype_id = filet.id INNER JOIN extensions ex on right(d.file_link, length(ex.ext)) = ex.ext WHERE NOT(filetype_id IN (46, 47) OR filetype_id BETWEEN 8 AND 22) AND d.entry_id = ?', [id], function(error, results, fields) {
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
                arr.push(removeEmpty(downloaditem));
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
    connection.query('select m.name as magazine, i.date_year as issueyear, i.date_month as issueno, ref.page as pageno, reft.text as magazine_type, f.name as magazine_text, m.link_mask from entries e inner join magrefs ref on ref.entry_id = e.id inner join features f on ref.feature_id = f.id inner join referencetypes reft on ref.referencetype_id = reft.id inner join issues i on ref.issue_id = i.id inner join magazines m on i.magazine_id = m.id where e.id = ? and ref.referencetype_id in (1, 2, 3, 15) order by date_year, date_month, pageno', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                magazine: results[i].magazine,
                issueyear: results[i].issueyear,
                issueno: results[i].issueno,
                page: results[i].pageno + "",
                pageno: results[i].pageno,
                magazine_type: results[i].magazine_type,
                link_mask: results[i].link_mask
            }
            arr.push(removeEmpty(item));
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
    connection.query('SELECT m.name AS magazine,i.date_year AS issueyear,i.date_month AS issuemonth,i.date_day AS issueday, i.volume as issuevolume, i.number AS issueno, ref.page AS pageno,reft.text AS magazine_type,f.name AS magazine_text, m.link_mask FROM entries e INNER JOIN magrefs ref ON ref.entry_id = e.id INNER JOIN features f ON ref.feature_id = f.id INNER JOIN referencetypes reft ON ref.referencetype_id = reft.id INNER JOIN issues i ON ref.issue_id = i.id INNER JOIN magazines m ON i.magazine_id = m.id WHERE e.id = ? AND ref.referencetype_id IN ( 10 ) ORDER BY date_year,date_month,pageno', [id], function(error, results, fields) {
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
                page: results[i].pageno + "",
                pageno: results[i].pageno,
                magazine_type: results[i].magazine_type,
                link_mask: results[i].link_mask
            }
            arr.push(removeEmpty(item));
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
    connection.query('select m.name as magazine, i.date_year as issueyear, i.date_month as issueno, ref.page as pageno, reft.text as magazine_type, f.name as magazine_text, m.link_mask from entries e inner join magrefs ref on ref.entry_id = e.id inner join features f on ref.feature_id = f.id inner join referencetypes reft on ref.referencetype_id = reft.id inner join issues i on ref.issue_id = i.id inner join magazines m on i.magazine_id = m.id where e.id = ? and ref.referencetype_id not in (1, 2, 3, 10, 15) order by magazine_type, date_year, date_month', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                magazine: results[i].magazine,
                issueyear: results[i].issueyear,
                issueno: results[i].issueno,
                page: results[i].pageno + "",
                pageno: results[i].pageno,
                magazine_type: results[i].magazine_type + ' - ' + results[i].magazine_text,
                link_mask: results[i].link_mask
            }
            arr.push(removeEmpty(item));
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

  Ku Ku (9889) - mod of Sabre + project future (multuple)
  MINER WILLY'S NIGHTMARE (30676) - mod of + inspired by

*/
var getModOf = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT r.original_id AS id, e.title AS this_title, rt.text AS is_mod, o.title AS title, pub.name AS publisher, m.text FROM relations r INNER JOIN entries e ON e.id = r.entry_id INNER JOIN entries o ON o.id = r.original_id LEFT JOIN publishers p ON p.entry_id = o.id AND p.release_seq = 0 LEFT JOIN labels pub ON p.label_id = pub.id INNER JOIN relationtypes rt ON rt.id = r.relationtype_id AND rt.id IN("m", "i") INNER JOIN machinetypes m ON m.id = o.machinetype_id WHERE r.entry_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];

        for(var i = 0; i < results.length; i++) {
            var item = {
                id: ('0000000' + results[i].id).slice(-7),
                is_mod: results[i].is_mod === 'Mod from' ? 1 : 0,
                type: results[i].is_mod,
                title: results[i].title,
                publisher: results[i].publisher,
                machinetype: results[i].text
            }
            item = removeEmpty(item);
            arr.push(item);
        }
        deferred.resolve({ mod_of: arr });
    });
    return deferred.promise;

}

/**
  This title Manic Miner (3012) are modified by these titles:  
*/
var getModifiedBy = function(id) {
    var deferred = Q.defer();
    var connection = db.getConnection();
    connection.query('SELECT r.entry_id AS id, e.title AS title, rt.text AS is_mod, pub.name AS publisher, m.text AS TEXT FROM relations r INNER JOIN entries e ON e.id = r.entry_id LEFT JOIN publishers p ON p.entry_id = e.id AND p.release_seq = 0 LEFT JOIN labels pub ON p.label_id = pub.id INNER JOIN relationtypes rt ON rt.id = r.relationtype_id AND rt.id IN("m", "i") INNER JOIN machinetypes m ON m.id = e.machinetype_id WHERE r.original_id = ?', [id], function(error, results, fields) {
        if (error) {
            throw error;
        }
        var arr = [];
        var i = 0;
        for (; i < results.length; i++) {
            var item = {
                id: ('0000000' + results[i].id).slice(-7),
                is_mod: results[i].is_mod === 'Mod from' ? 1 : 0,
                type: results[i].is_mod,
                title: results[i].title,
                publisher: results[i].publisher,
                machinetype: results[i].text
            }
            arr.push(removeEmpty(item));
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
        getSeries(id), // "S", "series"
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
