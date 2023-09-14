/**
 updates additionals on existing JSON {id}, with additionals read from JSON file
*/

var es = require('./esConfig');

var fs = require('fs');
var jsonfile = require('jsonfile')
var _ = require('lodash');

if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " path/to/directory");
    process.exit(-1);
}

var consoleControl = require('console-control-strings');
var path = process.argv[2];

console.clear();
console.log(consoleControl.color('black', 'bgWhite', 'bold') + '######### Importing screen info' + consoleControl.color('reset'));
console.log(`# running node ${process.version}`);
console.log(`ZXDB_NEW: ${process.env.ZXDB_NEW}`);
console.log(`ZXDB_OLD: ${process.env.ZXDB_OLD}`);
console.log(`# input folder: ${path}`);

fs.readdir(path, function (err, items) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].endsWith(".json")) {
            process.stdout.write(`[UPDATE SCREEN] - insert: ${i}/${items.length} ${items[i]}` + consoleControl.eraseLine() + consoleControl.gotoSOL());
            var id = items[i].substr(0, 7);
            var screens_new = jsonfile.readFileSync(path + items[i]);
            var done = false;

            var body;
            es.client.get({
                index: es.zxinfo_index,
                id: id
            },
                function (error, response) {
                    if (error) {
                        console.error(`[WARNING] - NOT FOUND: ${id}` + consoleControl.eraseLine());
                        done = true;
                    } else {
                        body = response._source;

                        var j = 0;
                        for (; j < screens_new.screens.length; j++) {
                            body.screens.push(screens_new.screens[j]);
                            body.screens = _.sortBy(body.screens, ["release_seq", "type"]);
                        }
                        // remove duplicates
                        body.screens = _.uniqWith(body.screens, _.isEqual);

                        es.client.index({
                            index: es.zxinfo_index,
                            id: id,
                            body: body
                        },
                            function (error, response) {
                                if (error) {
                                    throw error;
                                }
                                done = true;
                            });
                    }
                });

            require('deasync').loopWhile(function () {
                return !done;
            });
        }
    }
});
