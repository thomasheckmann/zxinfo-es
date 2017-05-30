/**

RUN:
node create-tosec-references.js TOSEC/XML/ 2>stderr.txt | tee stdout.txt | grep "\"" >missing.txt

<game name="Rambo (1985)(Ocean)">
    <description>Rambo (1985)(Ocean)</description>
    <rom name="Rambo (1985)(Ocean).tap" size="49410" crc="b95f1c45" md5="5d8a67e6a1c27be6bc3c0a1cd7e1b9f4" sha1="aebf5aae30ce07c1068f988943460d436857a8d9"/>
</game>

{
    "tosec": [
        {
            "game": "Rambo (1985)(Ocean)",
            "type": "TAP",
            "url": "Sinclair ZX Spectrum [TOSEC]/Games/[TAP]/Rambo (1985)(Ocean).tap",
            "score": "11.936212"
        },
    ]
}

*/

'use strict';

var tu = require('./tosecUtil');
var fix = require('./tosecFix');
var mia = require('./tosecMissing');

var fs = require('fs');
var jsonfile = require('jsonfile')
var xmldoc = require('xmldoc');
var json_output_dir = 'data/processed/tosec';

var TOSEC = {}; // {filename: "", url: "", size: nnnn, type: ""}

var gamesCount =   0;
var gamesAdded =   0;
var gamesMissing = 0;
var gamesNotFound = 0;
var tosecCount = 0;

function gamesCountInc() {
    gamesCount += 1;
}

function gamesAddedInc() {
    gamesAdded += 1;
}

function gamesMissingInc() {
    gamesMissing += 1;
}

function gamesNotFoundInc() {
    gamesNotFound += 1;
}

function tosecCountInc() {
    tosecCount += 1;
}

function addGame(id, filename, url, size, type) {
    console.error("[ADD][" + id + "][" + filename + "][" + url + "][" + size + "][" + type + "]");
    var toseclist = TOSEC[id];

    if (toseclist == undefined) {
        TOSEC[id] = [{ filename: filename, url: url, size: size, type: type }]
    } else {
        TOSEC[id].push({ filename: filename, url: url, size: size, type: type });
    }
}

/**
A Treat! (demo) (1985)(Firebird Software).tap
Rambo III (1988)(Ocean)[48-128K].tap
Rambo III (1988)(Ocean)[tr cs Luxus Software House][48-128K].tap
Rambo (1985)(Ocean)[cr][t]
*/
var parseRomName = function(rom) {
    var result = {};

    // Fulltitle until first (
    var fileNameEndIdx = rom.indexOf(" (");
    if (fileNameEndIdx == -1) {
        console.error("TITLE - ERROR, ROM not in correct format, ignoring: ", rom);
        result = null;
    } else {
        var fulltitle = rom.substr(0, fileNameEndIdx);
        //console.log("TITLE - [" + fulltitle + "]");
        rom = rom.substr(fileNameEndIdx + 1);
        var year = rom.substr(1, 4);
        rom = rom.substr(6);
        if (year == "demo") {
            year = rom.substr(2, 4);
            rom = rom.substr(7);
        }
        var publisher = rom.substr(1, rom.indexOf(")") - 1);
        result = { fulltitle: fulltitle, year: year, publisher: publisher };
    }

    return result;
}

var processFile = function(filename) {
    var done = false;
    fs.readFile(filename, 'utf8', function(err, data) {
        if (err) {
            return console.log(err);
        }

        var tosecParts = filename.split(" - ");

        var tosecImageType = "";
        var tosecSystem = tosecParts[0];
        var tosecType = tosecParts[1];
        var tosecSubType = "";
        var tosecImageType = "";
        if (tosecParts.length == 3) {
            tosecImageType = tosecParts[2];
            tosecImageType = tosecImageType.substring(1, tosecImageType.indexOf("]"));
        } else if (tosecParts.length == 4) {
            tosecSubType = tosecParts[2];
            tosecImageType = tosecParts[3];
            tosecImageType = tosecImageType.substring(1, tosecImageType.indexOf("]"));
        }
        console.log({ system: tosecSystem, type: tosecType, subtype: tosecSubType, imagetype: tosecImageType });
        var urlsb = "Sinclair ZX Spectrum [TOSEC]/" + tosecType + "/";
        if (tosecSubType.length > 0) {
            urlsb += tosecSubType + "/";
        }
        urlsb += "[" + tosecImageType + "]/";

        // parse XML
        var xml = new xmldoc.XmlDocument(data);
        var games = xml.childrenNamed("game");

        console.log("found " + games.length + " game(s)");
        var i = 0;
        for (; i < games.length; i++) {
            gamesCountInc();

            var game = games[i];
            var rom_name = game.childNamed("rom").attr.name;
            var game_name = game.attr.name;

            if (mia.missing.indexOf(game_name) != -1) {
                console.log("[MIA][" + game_name + "]");
                gamesMissingInc();
            } else {
                if (fix.gamename[game_name] !== undefined) {
                    var newGameName = fix.gamename[game_name];
                    console.log("[ROMNAME]["+game_name+"]->["+newGameName+"]");
                    game_name = newGameName;
                }

                var rObj = parseRomName(game_name);
                if (rObj !== null) {
                    rObj.size = game.childNamed("rom").attr.size;

                    if (fix.publisher[rObj.publisher] !== undefined) {
                        var newPublisher = fix.publisher[rObj.publisher];
                        console.log("[PUBLISHER]["+rObj.publisher+"]->["+newPublisher+"]");
                        rObj.publisher = newPublisher;
                    }
                    // search for game
                    var found = tu.lookUp(game_name, rObj.fulltitle, rObj.publisher);
                    if (found !== null) {
                        gamesAddedInc();
                        for (var j = 0; j < found.length; j++) {
                            addGame(found[j].id, rom_name, urlsb + rom_name, rObj.size, tosecType);
                        }
                    } else {
                        gamesNotFoundInc();
                    }
                }
            }
        }
        done = true;
    });
    require('deasync').loopWhile(function() {
        return !done;
    });
}

if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " [path/to/directory] [path/to/tosecfile]");
    process.exit(-1);
}

var path = process.argv[2];

var stats = fs.statSync(path);

var alldone = false;
if (stats.isDirectory()) {
    console.log("PROCESSING directory: " + path);
    var items = fs.readdirSync(path);
    fs.readdir(path, function(err, items) {
        for (var i = 0; i < items.length; i++) {
            if (items[i].endsWith(".dat")) {
                tosecCountInc();
                console.log("file: ", items[i]);
                processFile(path + items[i])
            }
        }
        alldone = true;
    });
} else if (stats.isFile() && path.endsWith(".json")) {
    var filename = path;
    console.log("PROCESSING file: " + filename);
} else {
    console.log("UNKNOWN - don't know what to do with: " + path);
}

require('deasync').loopWhile(function() {
    return !alldone;
});

var UpdatedID = Object.keys(TOSEC);
for (var j = 0; j < UpdatedID.length; j++) {
    var savedone = false;
    var item = { tosec: TOSEC[UpdatedID[j]] };
    var filename = json_output_dir + "/" + UpdatedID[j] + ".json";
    jsonfile.writeFile(filename, item, { spaces: 2 }, function(err) {
        if (err) {
            throw err;
        }
        savedone = true;
        console.error('saved file: ', filename);
    })
    require('deasync').loopWhile(function() {
        return !savedone;
    });
}

console.log("Total added    : " + gamesAdded);
console.log("Total missing  : " + gamesMissing);
console.log("Total not found: " + gamesNotFound);
console.log("-----------------------------------");
console.log("Total processed: " + gamesCount);
console.log("TOSEC processed: " + tosecCount);
console.log("Entries updated: " + UpdatedID.length);

