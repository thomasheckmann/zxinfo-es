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
            var body = jsonfile.readFileSync(path + items[i]);
            var done = false;
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
                    // console.log(id + ' => ', response);
                    done = true;
                });
            require('deasync').loopWhile(function() {
                return !done; });

        }
    }
});
