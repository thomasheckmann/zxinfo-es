/**

Compares JSON files with a remote index

node change-log.js --json_dir data/processed/json/ --esurl http://search.zxinfo.dk --esindex zxinfo_games
node change-log.js --json_dir testdata/ --esurl http://search.zxinfo.dk --esindex zxinfo_games

OUTPUT FILES:
change.log - changes (to be published on api.zxinfo.dk)
detailed.log - detailed info about changes (use this to improve change log info)
unhandled.log - info about unhandled changes

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
      new_json.version = null;
      new_json.authorsuggest = null;
      new_json.metadata_author = null;
      new_json.metadata_publisher = null;
      new_json.publishersuggest = null;
      new_json.screens = null;
      new_json.titlesuggest = null;
      var done = false;

      client.get(
        {
          index: esindex,
          type: "zxinfo_games",
          id: id,
        },
        function (error, response) {
          if (error) {
            DETAILED.write(id + ": NEW ENTRY(" + new_json.fulltitle + ")\n");
            CHANGELOG.write(id + ": NEW ENTRY(" + new_json.fulltitle + ")\n");
            done = true;
          } else {
            body = response._source;
            var old_json = body;
            old_json.version = null;
            old_json.authorsuggest = null;
            old_json.metadata_author = null;
            old_json.metadata_publisher = null;
            old_json.publishersuggest = null;
            old_json.screens = null;
            old_json.titlesuggest = null;

            var diff = jsonDiff.diff(old_json, new_json);
            if (diff) {
              DETAILED.write(id + ":\n" + JSON.stringify(diff, null, 2) + "\n");
              var found = false;
              if (diff.additionals) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - ADDITIONALS\n");
                found = true;
              }
              if (diff.adverts) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - ADVERTS\n");
                found = true;
              }
              if (diff.authoring) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - AUTHORING\n");
                found = true;
              }
              if (diff.authored) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - AUTHORED\n");
                found = true;
              }
              if (diff.authors) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - AUTHORS\n");
                found = true;
              }
              if (diff.contributors) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - CONTRIBUTORS\n");
                found = true;
              }
              if (diff.contents) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - COMPILATION CONTENT\n");
                found = true;
              }
              if (diff.incompilations) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - COMPILATION REFERENCE\n");
                found = true;
              }
              if (diff.features) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - FEATURES\n");
                found = true;
              }
              if (diff.fulltitle) {
                CHANGELOG.write(
                  id +
                    " (" +
                    old_json.fulltitle +
                    ") - FULLTITLE [" +
                    diff.fulltitle.__old +
                    " -> " +
                    diff.fulltitle.__new +
                    "]\n"
                );
                found = true;
              }
              if (diff.licensed__added || diff.licensed) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - LICENSED\n");
                found = true;
              }
              if (diff.magazinereview) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - MAGAZINEREVIEW\n");
                found = true;
              }
              if (diff.magrefs) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - MAGREFS\n");
                found = true;
              }
              if (diff.publisher) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - PUBLISHER\n");
                found = true;
              }
              if (diff.relatedlinks) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - RELATED LINKS\n");
                found = true;
              }
              if (diff.releases) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - RELEASES\n");
                found = true;
              }
              if (diff.remarks) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - REMARKS\n");
                found = true;
              }
              if (diff.series) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - SERIES\n");
                found = true;
              }
              if (diff.type__deleted || diff.subtype__deleted) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - TYPE/GENRE\n");
                found = true;
              }
              if (diff.youtubelinks) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - YOUTUBE LINKS\n");
                found = true;
              }
              if (diff.webrefs) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - WEB LINKS\n");
                found = true;
              }
              if (diff.themedgroup) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - THEMED GROUP INFO\n");
                found = true;
              }
              if (diff.machinetype) {
                CHANGELOG.write(
                  id +
                    " (" +
                    old_json.fulltitle +
                    ") - MACHINETYPE [" +
                    diff.machinetype.__old +
                    " -> " +
                    diff.machinetype.__new +
                    "]\n"
                );
                found = true;
              }
              if (diff.mod_of) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - MOD OF\n");
                found = true;
              }
              if (diff.modified_by) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - MODIFIED BY\n");
                found = true;
              }
              if (diff.known_errors) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - KNOWN ERRORS\n");
                found = true;
              }
              if (diff.hardware_blurb) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - HARDWARE BLURB\n");
                found = true;
              }

              if (diff.originalpublication) {
                CHANGELOG.write(
                  id +
                    " (" +
                    old_json.fulltitle +
                    ") - ORIGINALPUBLICATION [" +
                    diff.originalpublication.__old +
                    " -> " +
                    diff.originalpublication.__new +
                    "]\n"
                );
                found = true;
              }
              if (diff.originalpublication__deleted) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - ORIGINALPUBLICATION (Deleted)\n");
                found = true;
              }
              if (diff.monthofrelease__added) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - MONTH OF RELEASE\n");
                found = true;
              }
              if (diff.availability) {
                CHANGELOG.write(
                  id +
                    " (" +
                    old_json.fulltitle +
                    ") - AVAILABILITY [" +
                    diff.availability.__old +
                    " -> " +
                    diff.availability.__new +
                    "]\n"
                );
                found = true;
              }
              if (diff.availability__added) {
                CHANGELOG.write(id + " (" + old_json.fulltitle + ") - AVAILABILITY (Added)\n");
                found = true;
              }

              if (found) changed.set(id, old_json.fulltitle);
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
