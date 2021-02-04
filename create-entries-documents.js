/**


# clean-up
find data/processed/ -type f -name "*.json" -exec rm -rf {} \;
node create-entries-documents.js --list 483,722,903,2115,2259,28180,30438,1000014,2000076
curl -XDELETE 'http://localhost:9200/_all'


# TEST CASES
find data/processed/ -type f -name "*.json" -exec rm -rf {} \; && node create-zxinfo-documents.js --list 483,718,722,903,996,2115,2259,9408,9889,11869,13305,25005,27996,28180,30321,30438,1000014,2000016

# ALL
find data/processed/ -type f -name "*.json" -exec rm -rf {} \; && node create-zxinfo-documents.js --all


(cd scripts/ && ./entries.sh)

dd.mm.yyyy

Changelog:
XX.XX.2021 - New JSON structure

DOCUMENTATION HELPER:
docker exec -i zxdb mysql -uroot -pzxdb1234 zxdb -e "select * from controltypes;"

COPY/PASTE into https://ozh.github.io/ascii-tables/

COPY/PASTE RESULT INTO COMMENTS

SUBLIME: (\s){2,} -> Space

*/

"use strict";

var db = require("./includes/dbConfig");
var settings = require("./includes/settings");

var Q = require("q");

var json_output_dir = settings.prefixEntries;
var jsonfile = require("jsonfile");

var BI = require("./components/basicinfo");
var PI = require("./components/publishers");
var AI = require("./components/authors");
var RI = require("./components/releases");
var EI = require("./components/extendedinfo");
var MI = require("./components/magazineinfo");
var CI = require("./components/compilation");
var RE = require("./components/relations");
var BB = require("./components/bookinfo");
var LI = require("./components/linksinfo");
var ZX = require("./components/zxinfoonly");

const perf = require("execution-time")();

/*
 * #############################################
 */

var zxdb_doc = function (id) {
  var done = false;
  Q.all([
    /* BASIC INFO */
    BI.getBasicInfo(id),
    BI.getControls(id),
    BI.getAwards(id),
    BI.getNotes(id),
    MI.getAwards(id),

    /* PUBLISHERS */
    PI.getPublishers(id),

    /* AUHTORS */
    AI.getAuthors(id),

    /* RELEASES */
    RI.getReleases(id),

    /* EXTENDED INFO */
    EI.getSeries(id),
    EI.getFeatures(id, "F", "features"),
    EI.getFeatures(id, "C", "competition"),
    EI.getFeatures(id, "T", "themedGroup"),
    EI.getFeatures(id, "U", "unsortedGroup"),

    EI.getOtherSystems(id),
    EI.getInspiredByTieInLicense(id),

    /* COMPILATION INFO */
    CI.getInCompilations(id),
    CI.getCompilationContent(id),

    /**
     * RELATIONS
     */

    /* Authored with */
    RE.getRelationWith(id, "a", "authoredWith"),
    RE.getRelationTo(id, "a", "authoring"),

    /* Editor of */
    RE.getRelationWith(id, "e", "editorOf"),
    RE.getRelationTo(id, "e", "editBy"),

    /* Requires hardware/interface */
    RE.getRelationWith(id, "h", "requiresHardware"),
    RE.getRelationTo(id, "h", "requiredByHardware"),

    /* Inspired by */
    RE.getRelationWith(id, "i", "inspiredBy"),
    RE.getRelationTo(id, "i", "inspirationFor"),

    /* Add-on pack that depends on */
    RE.getRelationWith(id, "k", "addOnDependsOn"),
    RE.getRelationTo(id, "k", "addOnAvailable"),

    /* Mod from */
    RE.getRelationWith(id, "m", "modificationOf"),
    RE.getRelationTo(id, "m", "modifiedBy"),

    /* Another platform for  */
    RE.getRelationWith(id, "p", "otherPlatform"),
    RE.getRelationTo(id, "p", "otherPlatformX"),

    /* Runs with  */
    RE.getRelationWith(id, "r", "runsWith"),
    RE.getRelationTo(id, "r", "requiredToRun"),

    /* Derived from */
    RE.getRelationWith(id, "u", "derivedFrom"),
    RE.getRelationTo(id, "u", "originOf"),

    /* Came bundled with */
    RE.getRelationWith(id, "w", "bundledWith"),
    RE.getRelationTo(id, "w", "bundleContent"),

    /* Same as */
    RE.getRelationWith(id, "*", "duplicateOf"),
    RE.getRelationTo(id, "*", "duplicatedBy"),

    /**
     * END RELATIONS
     */

    /* BOOK INFO */
    BB.getInBook(id),
    BB.getBookContents(id),

    /* LINKS INFO */
    LI.getTOSEC(id),
    LI.getRelatedLinks(id),
    LI.getRelatedSites(id),
    LI.getYouTubeLinks(id),
    LI.getAdditionalDownloads(id),

    MI.getMagazineRefs(id),

    /* ZXINFO */
    ZX.getScreens(id),
    ZX.getTitlesForSuggestions(id),
    ZX.getAuthorsForSuggestions(id),
    ZX.getPublishersForSuggestions(id),
  ]).then(function (results) {
    var i = 0;
    var doc_array = {};
    for (; i < results.length; i++) {
      for (var attributename in results[i]) {
        if (attributename === "otherPlatformX") {
          if (results[i][attributename].length > 0) {
            doc_array["otherPlatform"] = results[i][attributename];
          }
        } else {
          doc_array[attributename] = results[i][attributename];
        }
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

var getAllIDs = function (min_id, max_id) {
  var connection = db.getConnection();
  var done = false;
  connection.query("select id from entries where id >= ? and id <= ? order by id asc", [min_id, max_id], function (
    error,
    results,
    fields
  ) {
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

var getID = function (zxdb_id) {
  var connection = db.getConnection();
  var done = false;
  connection.query("select id from entries where id in (?) order by id asc", [zxdb_id], function (error, results, fields) {
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

var argv = require("minimist")(process.argv.slice(2));
if (argv.all) {
  getAllIDs(0, 99999999);
} else if (argv.from && argv.to) {
  getAllIDs(argv.from, argv.to);
} else if (argv.from && !argv.to) {
  getAllIDs(argv.from, 99999999);
} else if (argv.id) {
  getID(argv.id);
} else if (argv.list) {
  var listOfIDs = argv.list.split(",");
  getID(listOfIDs);
} else {
  console.log("Usage: " + __filename + " [--all] [--id id] | [--list id1,id2,..] | [--from id] [--to id]");
  process.exit(-1);
}
process.exit(0);
