var es = require('./esConfig');
var db = require('./dbConfig');

var json_output_dir = 'data/processed/json/';
var allcombinations = require('allcombinations')

var jsonfile = require('jsonfile')

var getAllIDs = function() {
    var connection = db.getConnection();
    var done = false;
    connection.query('select id, title from entries where 1 order by id asc', function(error, results, fields) {
        if (error) {
            throw new Error("Can't connect: ", error.stack);
        }
        var i = 0;
        for (; i < results.length; i++) {
            var id = ('0000000' + results[i].id).slice(-7);
            // split title by space, comma, dash, colon, semi-colon
            var fulltitle = results[i].title;
            var titlewords = fulltitle.toLowerCase().split(/[\: ,-]+/);

            // if more than 5 words, keep first 5 only (to limit combinations)
            if (titlewords.length > 3) {
                var tmpArray = [];
                var ii = 0;
                for (; ii < 4; ii++) {
                    tmpArray.push(titlewords[ii]);
                }
                titlewords = tmpArray;
            }

            // clean titlewords
            // remove everything not 0-9, A-Z
            // get rid of 'a', 'of' etc

            var titlewordsCleaned = [];
            titlewords.forEach(function(value) {
                var word = value.replace(/\W/g, '');
                if (word.length > 2) {
                    titlewordsCleaned.push(word);
                }
            });

            console.log(results[i].id + " (" + results[i].title + ") => " + titlewordsCleaned);
            var cs = Array.from(allcombinations(titlewordsCleaned));

            var input = [];
            cs.forEach(function(v) {
                var inputLine = "";
                v.forEach(function(w) {
                    inputLine += " " + w;
                });
                input.push(inputLine.trim());
            });

            var item = {
                title: fulltitle,
                suggest: {
                    input: input,
                    output: fulltitle,
                    payload: {
                        title_id: id
                    },
                    weight: 10
                }
            };

            var doneIndex = false;
            es.client.index({
                    index: es.zxinfo_suggests_index,
                    type: es.zxinfo_suggests_type_title,
                    id: id,
                    body: item
                },
                function(error, response) {
                    if (error) {
                        throw error;
                    }
                    doneIndex = true;
                });
            require('deasync').loopWhile(function() {
                return !doneIndex;
            });


        }
        done = true;
    });
    require('deasync').loopWhile(function() {
        return !done;
    });
    console.log("Finished!");
    db.closeConnection(connection);
}

getAllIDs();
