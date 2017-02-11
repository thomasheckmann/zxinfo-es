var fs = require('fs');
var jsonfile = require('jsonfile')
var zxinfo_index = 'zxinfo_games_write';
var zxinfo_type = 'zxinfo_games';

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'info'
});

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
            client.index({
                    index: zxinfo_index,
                    type: zxinfo_type,
                    id: id,
                    body: body
                },
                function(error, response) {
                	if(error) {
                		throw error;
                	}
                	done = true;
                });
		    require('deasync').loopWhile(function(){return !done;});

        }
    }
});
