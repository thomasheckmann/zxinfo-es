var es = require("./includes/esConfig");

var fs = require("fs");
var jsonfile = require("jsonfile");
var pathx = require("path");

if (process.argv.length <= 2) {
  console.log("Usage: " + __filename + " [path/to/directory] [path/to/jsonfile]");
  process.exit(-1);
}

var consoleControl = require('console-control-strings');
var path = process.argv[2];

console.clear();
console.log(consoleControl.color('black', 'bgWhite', 'bold') + '######### Importing entries' + consoleControl.color('reset'));
console.log(`# running node ${process.version}`);

var stats = fs.statSync(path);

if (stats.isDirectory()) {
  console.log("PROCESSING directory: " + path);
  fs.readdir(path, function (err, items) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].endsWith(".json")) {
        process.stdout.write(`[IMPORT ENTRIES] - insert: ${i}/${items.length} ${items[i]}` + consoleControl.eraseLine() + consoleControl.gotoSOL());
        var id = items[i].substr(0, 7);
        var body = jsonfile.readFileSync(path + items[i]);
        var done = false;
        es.client.index(
          {
            index: es.zxinfo_index,
            id: id,
            body: body,
          },
          function (error, response) {
            if (error) {
              console.log(id + " - ERROR importing into elasticsearch" + consoleControl.eraseLine());
              throw error;
            }
            done = true;
          }
        );
        require("deasync").loopWhile(function () {
          return !done;
        });
      }
    }
  });
} else if (stats.isFile() && path.endsWith(".json")) {
  var filename = path;
  console.log("PROCESSING file: " + filename);
  console.log("inserting: ", filename);
  var id = pathx.basename(filename).substr(0, 7);
  var body = jsonfile.readFileSync(filename);
  var done = false;
  es.client.index(
    {
      index: es.zxinfo_index,
      id: id,
      body: body,
    },
    function (error, response) {
      if (error) {
        throw error;
      }
      // console.log(id + ' => ', response);
      done = true;
    }
  );
} else {
  console.log("UNKNOWN - don't know what to do with: " + path);
}
