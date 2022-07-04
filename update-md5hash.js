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

var path = process.argv[2];

fs.readdir(path, function(err, items) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].endsWith(".json")) {
            console.log(`[UPDATE MD5HASH] - insert: ${items[i]}`);
            var id = items[i].substr(0, 7);
            var md5hash = jsonfile.readFileSync(path + items[i]);
            var done = false;

            var body;
            es.client.get({
                    index: es.zxinfo_index,
                    id: id
                },
                function(error, response) {
                    if (error) {
                        console.error(`[WARNING] - NOT FOUND: ${id}`);
                        done = true;
                    } else {
                        body = response._source;

                        body.md5hash = md5hash;

                        es.client.index({
                                index: es.zxinfo_index,
                                id: id,
                                body: body
                            },
                            function(error, response) {
                                if (error) {
                                    throw error;
                                }
                                done = true;
                            });
                    }
                });

            require('deasync').loopWhile(function() {
                return !done;
            });
        }
    }
});
