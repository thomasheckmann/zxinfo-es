/**
 updates additionals on existing JSON {id}, with additionals read from JSON file
*/

var es = require('./includes/esConfig');

var fs = require('fs');
var jsonfile = require('jsonfile')
var _ = require('lodash');

if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " path/to/directory");
    process.exit(-1);
}

var path = process.argv[2];

console.clear();
console.log(`######### Importing md5hash`);
console.log(`# running node ${process.version}`);
console.log(`ZXDB_NEW: ${process.env.ZXDB_NEW}`);
console.log(`ZXDB_OLD: ${process.env.ZXDB_OLD}`);
console.log(`# input folder: ${path}`);

fs.readdir(path, function (err, items) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].endsWith(".json")) {
            console.log(`[UPDATE MD5HASH] - insert: ${i}/${items.length} ${items[i]}`);

            var id = items[i].substr(0, 7);
            var md5hashJson = jsonfile.readFileSync(path + items[i]);
            var done = false;

            var body;
            es.client.get({
                index: es.zxinfo_index,
                id: id
            },
                function (error, response) {
                    if (error) {
                        console.error(`[WARNING] - NOT FOUND: ${id}`);
                        done = true;
                    } else {
                        body = response._source;
                        var current = body.md5hash
                        if (current) {
                            console.log(`[UPDATE MD5HASH] (${response._id}) - MD5 section exists, merging and remove duplicates...`);
                            let newMD5 = current.concat(md5hashJson);
                            const cleanMD5 = newMD5.filter((value, index, self) =>
                                index === self.findIndex((t) => (
                                    t.archive === value.archive && t.filename === value.filename && t.source === value.source && t.md5 === value.md5 && t.sha512 === value.sha512
                                ))
                            )
                            console.log(`[UPDATE MD5HASH] (${response._id}) - jsonFile: ${md5hashJson.length}, existing: ${current.length}, combined objects: ${newMD5.length} - reduced: ${cleanMD5.length}`);

                            body.md5hash = cleanMD5;
                        } else {
                            console.log(`[UPDATE MD5HASH] (${response._id}) - new MD5 section, inserting...`);
                            body.md5hash = md5hashJson;
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

                    }
                });

            require('deasync').loopWhile(function () {
                return !done;
            });
        }
    }
});
