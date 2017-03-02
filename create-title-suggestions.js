/**

SELECT
   e.id,
   aka.title,
   e.title 
FROM
   aliases aka 
   LEFT JOIN
      entries e 
      on e.id = aka.entry_id 
order by
   e.id

*/

var es = require('./esConfig');
var db = require('./dbConfig');

var json_output_dir = 'data/processed/json/';
var allcombinations = require('allcombinations')

var jsonfile = require('jsonfile')

function createSuggestions(id, outputtitle, title) {
    // split title by space, comma, dash, colon, semi-colon
    var titlewords = title.toLowerCase().split(/[\: ,-]+/);
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

    console.log(id + " (" + outputtitle + ") " + title + " => " + titlewordsCleaned);
    var cs = Array.from(allcombinations(titlewordsCleaned));

    var input = [title];
    cs.forEach(function(v) {
        var inputLine = "";
        v.forEach(function(w) {
            inputLine += " " + w;
        });
        input.push(inputLine.trim());
    });

    var item = {
        title: outputtitle,
        suggest: {
            input: input,
            output: outputtitle,
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
        function(error, resp, status) {
            if (error) {
                throw error;
            }
            doneIndex = true;
        });
    require('deasync').loopWhile(function() {
        return !doneIndex;
    });
}

var createSuggestionsForFulltitle = function() {
    console.log('CREATE SUGGESTIONS FOR FULLTITLE');
    var connection = db.getConnection();
    var done = false;
    connection.query('select id, title from entries where 1 order by id asc', function(error, results, fields) {
        if (error) {
            throw new Error("Can't connect: ", error.stack);
        }
        var i = 0;
        for (; i < results.length; i++) {
            var id = ('0000000' + results[i].id).slice(-7);
            var fulltitle = results[i].title;

            createSuggestions(id, fulltitle, fulltitle);
        }
        done = true;
    });
    require('deasync').loopWhile(function() {
        return !done;
    });
    console.log("Finished!");
}

var creageSuggestionsForAlsoKnownAs = function() {
    console.log('CREATE SUGGESTIONS FOR ALSO KNOWN AS');
    var connection = db.getConnection();
    var done = false;
    // connection.query('select id, title from entries where 1 order by id asc', function(error, results, fields) {
    connection.query('SELECT DISTINCT e.id, aka.title as alsoknownas, e.title as title FROM aliases aka LEFT JOIN entries e on e.id = aka.entry_id order by e.id asc', function(error, results, fields) {
        if (error) {
            throw new Error("Can't connect: ", error.stack);
        }
        var i = 0;
        for (; i < results.length; i++) {
            var id = ('0000000' + results[i].id).slice(-7) + '-' + i;
            var fulltitle = results[i].title;

            createSuggestions(id, fulltitle, results[i].alsoknownas);
        }
        done = true;
    });
    require('deasync').loopWhile(function() {
        return !done;
    });
    console.log("Finished!");
    db.closeConnection(connection);
}

createSuggestionsForFulltitle();
creageSuggestionsForAlsoKnownAs();

