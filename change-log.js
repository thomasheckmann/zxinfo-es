/**

Compares JSON files with a remote index

OLD Vn   - localhost:9200 (elasticsearch)
NEW Vn+1 - local JSON files data/entries/
node change-log.js --json_dir data/entries/ --esurl http://localhost:9200 --esindex zxinfo_games

OUTPUT FILES:
change.log - changes (to be published on api.zxinfo.dk)
detailed.log - detailed info about changes (use this to improve change log info)
unhandled.log - info about unhandled changes

cp change.log ../zxinfo-api-v3/public/changelogs/change-1.0.NN-DDMMYYYY.txt

*/

var fs = require("fs");
var jsonfile = require("jsonfile");
JSON.sortify = require("json.sortify");
var jsonDiff = require("json-diff");

var argv = require("minimist")(process.argv.slice(2));

var path;

if (argv.json_dir) {
  path = argv.json_dir;
}

var esURL;
if (argv.esurl) {
  esURL = argv.esurl;
}

var esindex;
if (argv.esindex) {
  esindex = argv.esindex;
}

var elasticsearch = require("elasticsearch");
var client = new elasticsearch.Client({
  host: esURL,
  log: "info",
});

console.log("########## CHANGE LOG CREATOR ");
console.log("reading PREVIOUS json from directory: " + path);
console.log("comparing aginst CURRENT json - Elasticsearch at: " + esURL);
console.log("comparing aginst CURRENT json - index: " + esindex);

var CHANGELOG = fs.createWriteStream("change.log");
var DETAILED = fs.createWriteStream("detailed.log");
var UNHANDLED = fs.createWriteStream("unhandled.log");

fs.readdir(path, function (err, items) {
  var changed = new Map();
  for (var i = 0; i < items.length; i++) {
    if (items[i].endsWith(".json")) {
      console.log("processing: " + items[i]);
      var id = items[i].substr(0, 7);
      var new_json = jsonfile.readFileSync(path + items[i]);

      // ignore the following fields
      new_json.version = null;
      new_json.authorsuggest = null;
      new_json.metadata_author = null;
      new_json.metadata_publisher = null;
      new_json.publishersuggest = null;
      new_json.screens = null;
      new_json.titlesuggest = null;
      new_json.zxinfoVersion = null;
      var done = false;

      client.get(
        {
          index: esindex,
          id: id,
        },
        function (error, response) {
          if (error) {
            DETAILED.write(id + ": NEW ENTRY(" + new_json.title + ")\n");
            CHANGELOG.write(id + ": NEW ENTRY(" + new_json.title + ")\n");
            done = true;
          } else {
            body = response._source;
            var old_json = body;
            // ignore the following fields
            old_json.version = null;
            old_json.authorsuggest = null;
            old_json.metadata_author = null;
            old_json.metadata_publisher = null;
            old_json.publishersuggest = null;
            old_json.screens = null;
            old_json.titlesuggest = null;
            old_json.zxinfoVersion = null;

            var diff = jsonDiff.diff(old_json, new_json);
            if (diff) {
              DETAILED.write(id + ":\n" + JSON.stringify(diff, null, 2) + "\n");
              var found = false;
              if (diff.title) {
                CHANGELOG.write(
                  id + " (" + old_json.title + ") - title [" + diff.title.__old + " -> " + diff.title.__new + "]\n"
                );
                found = true;
              }
              if (diff.monthofrelease__added) {
                CHANGELOG.write(id + " (" + old_json.title + ") - MONTH OF RELEASE\n");
                found = true;
              }
              if (diff.machineType) {
                CHANGELOG.write(
                  id +
                    " (" +
                    old_json.title +
                    ") - MACHINETYPE [" +
                    diff.machineType.__old +
                    " -> " +
                    diff.machineType.__new +
                    "]\n"
                );
                found = true;
              }
              if (diff.type__deleted || diff.subtype__deleted) {
                CHANGELOG.write(id + " (" + old_json.title + ") - TYPE/GENRE\n");
                found = true;
              }
              if (diff.genre) {
                CHANGELOG.write(id + " (" + old_json.title + ") - GENRE\n");
                found = true;
              }
              if (diff.genreSubType) {
                CHANGELOG.write(id + " (" + old_json.title + ") - GENRE/SUBTYPE\n");
                found = true;
              }
              if (diff.originalpublication) {
                CHANGELOG.write(
                  id +
                    " (" +
                    old_json.title +
                    ") - ORIGINALPUBLICATION [" +
                    diff.originalpublication.__old +
                    " -> " +
                    diff.originalpublication.__new +
                    "]\n"
                );
                found = true;
              }
              if (diff.originalpublication__deleted) {
                CHANGELOG.write(id + " (" + old_json.title + ") - ORIGINALPUBLICATION (Deleted)\n");
                found = true;
              }
              if (diff.availability) {
                CHANGELOG.write(
                  id +
                    " (" +
                    old_json.title +
                    ") - AVAILABILITY [" +
                    diff.availability.__old +
                    " -> " +
                    diff.availability.__new +
                    "]\n"
                );
                found = true;
              }
              if (diff.availability__added) {
                CHANGELOG.write(id + " (" + old_json.title + ") - AVAILABILITY (Added)\n");
                found = true;
              }
              if (diff.remarks) {
                CHANGELOG.write(id + " (" + old_json.title + ") - REMARKS\n");
                found = true;
              }
              if (diff.hardwareBlurb) {
                CHANGELOG.write(id + " (" + old_json.title + ") - HARDWARE BLURB\n");
                found = true;
              }
              if (diff.knownErrors) {
                CHANGELOG.write(id + " (" + old_json.title + ") - KNOWN ERRORS\n");
                found = true;
              }
              if (diff.reviewAwards) {
                CHANGELOG.write(id + " (" + old_json.title + ") - REVIEW AWARDS\n");
                found = true;
              }
              if (diff.publishers) {
                CHANGELOG.write(id + " (" + old_json.title + ") - PUBLISHERS\n");
                found = true;
              }
              if (diff.authors) {
                CHANGELOG.write(id + " (" + old_json.title + ") - AUTHORS\n");
                found = true;
              }
              if (diff.releases) {
                CHANGELOG.write(id + " (" + old_json.title + ") - RELEASES\n");
                found = true;
              }
              if (diff.series) {
                CHANGELOG.write(id + " (" + old_json.title + ") - SERIES\n");
                found = true;
              }
              if (diff.features) {
                CHANGELOG.write(id + " (" + old_json.title + ") - FEATURES\n");
                found = true;
              }
              if (diff.themedGroup) {
                CHANGELOG.write(id + " (" + old_json.title + ") - THEMED GROUP INFO\n");
                found = true;
              }
              if (diff.licensed) {
                CHANGELOG.write(id + " (" + old_json.title + ") - LICENSED\n");
                found = true;
              }
              if (diff.inCompilations) {
                CHANGELOG.write(id + " (" + old_json.title + ") - COMPILATION REFERENCE\n");
                found = true;
              }
              if (diff.compilationContents) {
                CHANGELOG.write(id + " (" + old_json.title + ") - COMPILATION CONTENT\n");
                found = true;
              }
              if (diff.authoredWith) {
                CHANGELOG.write(id + " (" + old_json.title + ") - AUTHORED WITH\n");
                found = true;
              }
              if (diff.authoring) {
                CHANGELOG.write(id + " (" + old_json.title + ") - AUTHORING\n");
                found = true;
              }
              if (diff.modificationOf) {
                CHANGELOG.write(id + " (" + old_json.title + ") - MOD OF\n");
                found = true;
              }
              if (diff.modifiedBy) {
                CHANGELOG.write(id + " (" + old_json.title + ") - MODIFIED BY\n");
                found = true;
              }
              if (diff.relatedLinks) {
                CHANGELOG.write(id + " (" + old_json.title + ") - RELATED LINKS\n");
                found = true;
              }
              if (diff.youTubeLinks) {
                CHANGELOG.write(id + " (" + old_json.title + ") - YOUTUBE LINKS\n");
                found = true;
              }
              if (diff.additionalDownloads) {
                CHANGELOG.write(id + " (" + old_json.title + ") - ADDITIONAL DOWNLOADS\n");
                found = true;
              }
              if (diff.magazineReferences) {
                CHANGELOG.write(id + " (" + old_json.title + ") - MAGZINE REFERENCES\n");
                found = true;
              }
              /* */
              if (found) changed.set(id, old_json.title);
              if (!found) UNHANDLED.write(id + ":\n" + JSON.stringify(diff, null, 2) + "\n");
            }
            done = true;
          }
        }
      );
      require("deasync").loopWhile(function () {
        return !done;
      });
    }
  }
  CHANGELOG.write("\n");
  CHANGELOG.write("---------------------------------------------------------------\n");
  CHANGELOG.write("CHANGE SUMMARY - total entries updated: " + changed.size + "\n");
  CHANGELOG.write("---------------------------------------------------------------\n");
  CHANGELOG.write("\n");
  CHANGELOG.write("Updated entries:\n");
  CHANGELOG.write("\n");
  for (const entry of changed.entries()) {
    CHANGELOG.write(entry + "\n");
  }
  CHANGELOG.write("===============================================================\n");
});
