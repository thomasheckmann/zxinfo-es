/**

Compares JSON files with a remote index

node change-log.js --json_dir data/processed/json/ --esurl http://search.zxinfo.dk --esindex zxinfo_games
node change-log.js --json_dir testdata/ --esurl http://search.zxinfo.dk --esindex zxinfo_games

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
console.log("reading NEW json from directory: " + path);
console.log("comparing aginst OLD jason - Elasticsearch at: " + esURL);
console.log("comparing aginst OLD jason - index: " + esindex);

fs.readdir(path, function (err, items) {
  var changed = new Map();
  for (var i = 0; i < items.length; i++) {
    if (items[i].endsWith(".json")) {
      console.log("processing: " + items[i]);
      var id = items[i].substr(0, 7);
      var new_json = jsonfile.readFileSync(path + items[i]);
      new_json.authorsuggest = null;
      new_json.metadata_author = null;
      new_json.metadata_publisher = null;
      new_json.publishersuggest = null;
      new_json.screens = null;
      new_json.titlesuggest = null;
      // console.log("NEW: \n" + JSON.stringify(new_json));
      //
      var done = false;

      client.get(
        {
          index: esindex,
          type: "zxinfo_games",
          id: id,
        },
        function (error, response) {
          if (error) {
            console.error(id + ": NEW ENTRY(" + new_json.fulltitle + ")");
            done = true;
          } else {
            body = response._source;
            var old_json = body;
            old_json.authorsuggest = null;
            old_json.metadata_author = null;
            old_json.metadata_publisher = null;
            old_json.publishersuggest = null;
            old_json.screens = null;
            old_json.titlesuggest = null;

            var diff = jsonDiff.diff(old_json, new_json);
            if (diff) {
              var found = false;
              if (diff.additionals) {
                console.error(id + " (" + new_json.fulltitle + ") - ADDITIONALS");
                found = true;
              }
              if (diff.adverts) {
                console.error(id + " (" + new_json.fulltitle + ") - ADVERTS");
                found = true;
              }
              if (diff.authoring) {
                console.error(id + " (" + new_json.fulltitle + ") - AUTHORING");
                found = true;
              }
              if (diff.authors) {
                console.error(id + " (" + new_json.fulltitle + ") - AUTHORS");
                found = true;
              }
              if (diff.contents) {
                console.error(id + " (" + new_json.fulltitle + ") - COMPILATION CONTENT");
                found = true;
              }
              if (diff.features) {
                console.error(id + " (" + new_json.fulltitle + ") - FEATURES");
                found = true;
              }
              if (diff.fulltitle) {
                console.error(id + " (" + new_json.fulltitle + ") - FULLTITLE");
                found = true;
              }
              if (diff.licensed__added || diff.licensed) {
                console.error(id + " (" + new_json.fulltitle + ") - LICENSED");
                found = true;
              }
              if (diff.magazinereview) {
                console.error(id + " (" + new_json.fulltitle + ") - MAGAZINEREVIEW");
                found = true;
              }
              if (diff.magrefs) {
                console.error(id + " (" + new_json.fulltitle + ") - MAGREFS");
                found = true;
              }
              if (diff.publisher) {
                console.error(id + " (" + new_json.fulltitle + ") - PUBLISHER");
                found = true;
              }
              if (diff.relatedlinks) {
                console.error(id + " (" + new_json.fulltitle + ") - RELATED LINKS");
                found = true;
              }
              if (diff.releases) {
                console.error(id + " (" + new_json.fulltitle + ") - RELEASES");
                found = true;
              }
              if (diff.remarks) {
                console.error(id + " (" + new_json.fulltitle + ") - REMARKS");
                found = true;
              }
              if (diff.series) {
                console.error(id + " (" + new_json.fulltitle + ") - SERIES");
                found = true;
              }
              if (diff.type__deleted || diff.subtype__deleted) {
                console.error(id + " (" + new_json.fulltitle + ") - TYPE/GENRE");
                found = true;
              }
              if (diff.youtubelinks) {
                console.error(id + " (" + new_json.fulltitle + ") - YOUTUBE LINKS");
                found = true;
              }
              if (diff.webrefs) {
                console.error(id + " (" + new_json.fulltitle + ") - WEB LINKS");
                found = true;
              }

              if (found) changed.set(id, new_json.fulltitle);
              if (!found) console.log(id + ":\n" + JSON.stringify(diff, null, 2));
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
  console.error("");
  console.error("---------------------------------------------------------------");
  console.error("CHANGE SUMMARY - total entries updated: " + changed.size);
  console.error("---------------------------------------------------------------");
  console.error("");
  console.error("Updated entries:");
  console.error("");
  for (const entry of changed.entries()) {
    console.error(entry);
  }
  console.error("===============================================================");
});
