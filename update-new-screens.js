/**
 updates additionals on existing JSON {id}, with additionals read from JSON file
*/

var es = require('./esConfig');

var fs = require('fs');
var jsonfile = require('jsonfile')

if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " path/to/directory");
    process.exit(-1);
}

var path = process.argv[2];

fs.readdir(path, function(err, items) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].endsWith(".json")) {
            console.log("inserting: ", items[i]);
            var id = items[i].substr(0, 7);
            var additionals_new = jsonfile.readFileSync(path + items[i]);
            var done = false;

            var body;
            es.client.get({
                    index: es.zxinfo_index,
                    type: es.zxinfo_type,
                    id: id
                },
                function(error, response) {
                    if (error) {
                        throw error;
                    }
                    body = response._source;
                    done = true;
                });

            require('deasync').loopWhile(function() {
                return !done;
            });

            var j = 0;
            for (; j < additionals_new.additionals.length; j++) {
                body.additionals.push(additionals_new.additionals[j]);
            }

            done = false;
            es.client.index({
                    index: es.zxinfo_index,
                    type: es.zxinfo_type,
                    id: id,
                    body: body
                },
                function(error, response) {
                    if (error) {
                        throw error;
                    }
                    done = true;
                });
            require('deasync').loopWhile(function() {
                return !done;
            });
        }
    }
});
