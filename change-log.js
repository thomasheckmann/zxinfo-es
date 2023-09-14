/**

Compares JSON files for different versions of ZXInfo API

check .env for ZXDB versions to compare


OUTPUT FILES:
change.log - changes (to be published on api.zxinfo.dk)
detailed.log - detailed info about changes (use this to improve change log info)
unhandled.log - info about unhandled changes

cp change.log ../zxinfo-api-v3/public/changelogs/change-1.0.NN-DDMMYYYY.txt

*/

require("dotenv").config();

const fs = require("fs");
const jsonfile = require("jsonfile");
const jsonDiff = require("json-diff");
JSON.sortify = require("json.sortify");
var argv = require("minimist")(process.argv.slice(2));

const _ = require("lodash");

const consoleControl = require("console-control-strings");

const ZXDB_NEW_DIR = `/Users/kolbeck/Public/ZXINFO/zxinfo-data/release-${process.env.ZXDB_NEW}/entries`;
const ZXDB_OLD_DIR = `/Users/kolbeck/Public/ZXINFO/zxinfo-data/release-${process.env.ZXDB_OLD}/entries`;
// const ZXDB_NEW_DIR = `data/entries_${process.env.ZXDB_NEW}`;
// const ZXDB_OLD_DIR = `data/entries_${process.env.ZXDB_OLD}`;

var CHANGELOG = fs.createWriteStream("change.log");
var NEW_ENTRIES_JSON = fs.createWriteStream("news.json");
var DETAILED = fs.createWriteStream("detailed.log");
var UNHANDLED = fs.createWriteStream("unhandled.log");

function readJSONFiles(newFile, oldFile) {
  var new_json = jsonfile.readFileSync(newFile);
  var old_json = jsonfile.readFileSync(oldFile);
  // ignore the following fields
  new_json.version = null;
  new_json.authorsuggest = null;
  new_json.metadata_author = null;
  new_json.metadata_publisher = null;
  new_json.publishersuggest = null;
  new_json.screens = null;
  new_json.titlesuggest = null;
  new_json.zxinfoVersion = null;
  old_json.version = null;
  old_json.authorsuggest = null;
  old_json.metadata_author = null;
  old_json.metadata_publisher = null;
  old_json.publishersuggest = null;
  old_json.screens = null;
  old_json.titlesuggest = null;
  old_json.zxinfoVersion = null;

  return { title: new_json.title, diff: jsonDiff.diff(old_json, new_json, { sort: true }) };
}

/** simple property value */
function diffProperty(id, title, item, prop, section) {
  // console.log(id + ", " + title + ", " + JSON.stringify(item) + ", " + prop + ", " + section);

  if (!item[prop]) { return; }
  if (prop.endsWith('__added')) {
    DETAILED.write(`${id} (${title}) - "${prop}" added\n`);
    CHANGELOG.write(`\t"${section ? section + "." + prop : prop}" added: ${item[prop]}\n`);
  } else {
    DETAILED.write(`${id} (${title}) - "${prop}" changed\n`);
    CHANGELOG.write(`\t"${section ? section + "." + prop : prop}" changed: ${item[prop].__old} => ${item[prop].__new}\n`);
  }
}

/** simple property value */
function addProperty(id, title, item, prop, section) {
  if (item[prop] === null) return;
  DETAILED.write(`${id} (${title}) - "${prop}" added\n`);
  CHANGELOG.write(`\t"${section ? section + "." + prop : prop}" added: ${prop} = "${item[prop]}"\n`);
}

function deleteProperty(id, title, item, prop, section) {
  if (item[prop] === null) return;
  DETAILED.write(`${id} (${title}) - "${prop}" removed\n`);
  CHANGELOG.write(`\t"${section ? section + "." + prop : prop}" removed: ${prop} = "${item[prop]}"\n`);
}

function compareVersions(id, diffObj) {
  const diff = diffObj.diff;
  CHANGELOG.write(`${id} (${diffObj.title})\n`);

  /** HANDLE CHANGES IN title */
  if (diff.title) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in title\n`);
    diffProperty(id, diffObj.title, diffObj.diff, 'title');
  }
  
   /** HANDLE CHANGES IN availability */
   if (diff.availability) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in availability\n`);
    diffProperty(id, diffObj.title, diffObj.diff, 'availability');
  }

  /** HANDLE CHANGES IN originalPublication */
  if (diff.originalPublication) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in originalPublication\n`);
    diffProperty(id, diffObj.title, diffObj.diff, 'originalPublication');
  }

  /** HANDLE CHANGES IN originalPrice */
  if (diff.originalPrice) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in originalPrice\n`);
    diffProperty(id, diffObj.title, diffObj.diff, 'originalPrice');
  }

  /** HANDLE CHANGES IN remarks */
  if (diff.remarks) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in remarks\n`);
    diffProperty(id, diffObj.title, diffObj.diff, 'remarks');
  }

  /** HANDLE CHANGES IN releases */
  if (diff.releases) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in releases\n`);
    diff.releases.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - releases INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'releaseSeq', 'releases');
        r[1].publishers.forEach(function (p, ii) {
          addProperty(id, diffObj.title, p, 'name', 'publishers');
        })
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - RELEASE INFO CHANGED\n`);
        diffProperty(id, diffObj.title, r[1], 'releasePrice__added', 'releases');
        if (r[1].publishers) {
          r[1].publishers.forEach(function (p, ii) {
            if (p[0] === "+") {  // Handle changes in publisher info
              DETAILED.write(`${id} (${diffObj.title}) - PUBLISHER INFO ADDED\n`);
              addProperty(id, diffObj.title, p[1], 'publisherSeq', 'publishers');
              addProperty(id, diffObj.title, p[1], 'name', 'publishers');
            } else if (p[0] === "~") {
              DETAILED.write(`${id} (${diffObj.title}) - PUBLISHER INFO CHANGED\n`);
              diffProperty(id, diffObj.title, p[1], 'name', 'publishers');
              diffProperty(id, diffObj.title, p[1], 'country', 'publishers');
              diffProperty(id, diffObj.title, p[1], 'labelType', 'publishers');
            } else if (p[0] === "-") {
              CHANGELOG.write(`${id} (${diffObj.title}) - PUBLISHER INFO DELETED (UNHANDLED)\n`);
              DETAILED.write(`${id} (${diffObj.title}) - PUBLISHER INFO DELETED\n`);
            } else if (p[0] === " ") {
            } else {
              UNHANDLED.write(`${id} (${diffObj.title}) - PUBLISHER ${JSON.stringify(diff, null, 2)}\n`);
              DETAILED.write(`${id} (${diffObj.title}) - PUBLISHER INFO UNHANDLED\n`);
            }
          });
        }
        if (r[1].files) {
          r[1].files.forEach(function (p, ii) {
            if (p[0] === "+") {  // Handle changes in publisher info
              DETAILED.write(`${id} (${diffObj.title}) - FILES INFO ADDED\n`);
              addProperty(id, diffObj.title, p[1], 'path', 'files');
              addProperty(id, diffObj.title, p[1], 'type', 'files');
            } else if (p[0] === "~") {
              DETAILED.write(`${id} (${diffObj.title}) - FILES INFO CHANGED (UNHANDLED)\n`);
            } else if (p[0] === "-") {
              CHANGELOG.write(`${id} (${diffObj.title}) - FILES INFO DELETED\n`);
              DETAILED.write(`${id} (${diffObj.title}) - FILES INFO DELETED\n`);
              deleteProperty(id, diffObj.title, p[1], 'path', 'files');
              deleteProperty(id, diffObj.title, p[1], 'type', 'files');
            } else if (p[0] === " ") {
            } else {
              UNHANDLED.write(`${id} (${diffObj.title}) - FILES ${JSON.stringify(diff, null, 2)}\n`);
              DETAILED.write(`${id} (${diffObj.title}) - FILES INFO UNHANDLED\n`);
            }
          });
        }
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - RELEASE INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - RELEASE\n${JSON.stringify(diff, null, 2)}\n`);
      }
    });
  }

  /** HANDLE CHANGES IN features */
  if (diff.features) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in features\n`);
    diff.features.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - features INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'name', 'features');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - features INFO CHANGED (UNHANDLED)\n`);
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - features INFO DELETED\n`);
        deleteProperty(id, diffObj.title, r[1], 'name', 'features');
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - features\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN relatedLinks */
  if (diff.relatedLinks) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in relatedLinks\n`);
    diff.relatedLinks.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - relatedLinks INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'siteName', 'relatedLinks');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - relatedLinks INFO CHANGED (UNHANDLED)\n`);
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - relatedLinks INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - relatedLinks\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN authors */
  if (diff.authors) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in authors\n`);
    diff.authors.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - authors INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'name', 'authors');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - authors INFO CHANGED\n`);
        diffProperty(id, diffObj.title, r[1], 'name__added', 'authors');
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - authors INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - authors\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN authoring */
  if (diff.authoring) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in authoring\n`);
    diff.authoring.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - authoring INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'title', 'authoring');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - authoring INFO CHANGED\n`);
        if (r[1].publishers) {
          r[1].publishers.forEach(function (p, ii) {
            if (p[0] === "+") {  // Handle changes in publisher info
              CHANGELOG.write(`${id} (${diffObj.title}) - authoring.publishers INFO DELETED (UNHANDLED)\n`);
              DETAILED.write(`${id} (${diffObj.title}) - authoring.publishers INFO ADDED (UNHANDLED)\n`);
            } else if (p[0] === "~") {
              DETAILED.write(`${id} (${diffObj.title}) - authoring.publishers INFO CHANGED\n`);
              diffProperty(id, diffObj.title, p[1], 'name', 'authoring.publishers');
              diffProperty(id, diffObj.title, p[1], 'country', 'authoring.publishers');
              diffProperty(id, diffObj.title, p[1], 'labelType', 'authoring.publishers');
            } else if (p[0] === "-") {
              CHANGELOG.write(`${id} (${diffObj.title}) - authoring.publishers INFO DELETED (UNHANDLED)\n`);
              DETAILED.write(`${id} (${diffObj.title}) - authoring.publishers INFO DELETED\n`);
            } else if (p[0] === " ") {
            } else {
              UNHANDLED.write(`${id} (${diffObj.title}) - authoring.publishers ${JSON.stringify(diff, null, 2)}\n`);
              DETAILED.write(`${id} (${diffObj.title}) - authoring.publishers INFO UNHANDLED\n`);
            }
          });
        }
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - authoring INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - authoring\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN licensed */
  if(diff.licensed__added) {
    DETAILED.write(`${id} (${diffObj.title}) - licensed INFO ADDED\n`);
    DETAILED.write(`${id} (${diffObj.title}) - "originalName" added\n`);
    CHANGELOG.write(`\t"licensed" added: originalName = "${diff.licensed__added[0].originalName}"\n`);
    CHANGELOG.write(`\t"licensed" added: type = "${diff.licensed__added[0].type}"\n`);
    }
  if (diff.licensed) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in licensed\n`);
    diff.licensed.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - licensed INFO ADDED (UNHANDLED)\n`);
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - licensed INFO CHANGED\n`);
        diffProperty(id, diffObj.title, r[1], 'originalName', 'licensed');
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - licensed INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - licensed\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN additionalDownloads */
  if (diff.additionalDownloads) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in additionalDownloads\n`);
    diff.additionalDownloads.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - additionalDownloads INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'path', 'additionalDownloads');
        addProperty(id, diffObj.title, r[1], 'type', 'additionalDownloads');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - additionalDownloads INFO CHANGED\n`);
        diffProperty(id, diffObj.title, r[1], 'path', 'additionalDownloads');
        diffProperty(id, diffObj.title, r[1], 'size', 'additionalDownloads');
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - additionalDownloads INFO DELETED\n`);
        deleteProperty(id, diffObj.title, r[1], 'path', 'additionalDownloads');
        deleteProperty(id, diffObj.title, r[1], 'type', 'additionalDownloads');
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - additionalDownloads\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN themedGroup */
  if (diff.themedGroup) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in themedGroup\n`);
    diff.themedGroup.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - themedGroup INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'name', 'themedGroup');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - themedGroup INFO CHANGED\n`);
        diffProperty(id, diffObj.title, r[1], 'name', 'themedGroup');
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - themedGroup INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - themedGroup\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN magazineReferences */
  if (diff.magazineReferences) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in magazineReferences\n`);
    diff.magazineReferences.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - magazineReferences INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'magazineName', 'magazineReferences');
        addProperty(id, diffObj.title, r[1], 'type', 'magazineReferences');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - magazineReferences INFO CHANGED\n`);
        diffProperty(id, diffObj.title, r[1], 'magazineName', 'magazineReferences');
        diffProperty(id, diffObj.title, r[1], 'page', 'magazineReferences');
        diffProperty(id, diffObj.title, r[1], 'issueId', 'magazineReferences');
        diffProperty(id, diffObj.title, r[1], 'number', 'magazineReferences');
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - magazineReferences INFO DELETED\n`);
        deleteProperty(id, diffObj.title, r[1], 'magazineName', 'magazineReferences');
        deleteProperty(id, diffObj.title, r[1], 'type', 'magazineReferences');
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - magazineReferences\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN series */
  if (diff.series) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in series\n`);
    diff.series.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - series INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'title', 'series');
        addProperty(id, diffObj.title, r[1], 'groupName', 'series');
        addProperty(id, diffObj.title, r[1], 'machineType', 'series');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - series INFO CHANGED\n`);
        diffProperty(id, diffObj.title, r[1], 'groupName', 'series');
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - series INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - series\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN inspirationFor */
  if (diff.inspirationFor) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in inspirationFor\n`);
    diff.inspirationFor.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - inspirationFor INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'title', 'inspirationFor');
        addProperty(id, diffObj.title, r[1], 'publishers', 'inspirationFor');
        addProperty(id, diffObj.title, r[1], 'machineType', 'inspirationFor');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - inspirationFor INFO CHANGED\n`);
        diffProperty(id, diffObj.title, r[1], 'title', 'inspirationFor');
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - inspirationFor INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - inspirationFor\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN inspiredBy */
  if (diff.inspiredBy) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in inspiredBy\n`);
    diff.inspiredBy.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - inspiredBy INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'title', 'inspiredBy');
        addProperty(id, diffObj.title, r[1], 'publishers', 'inspiredBy');
        addProperty(id, diffObj.title, r[1], 'machineType', 'inspiredBy');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - inspiredBy INFO CHANGED\n`);
        diffProperty(id, diffObj.title, r[1], 'title', 'inspiredBy');
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - inspiredBy INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - inspiredBy\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN inCompilations */
  if (diff.inCompilations) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in inCompilations\n`);
    diff.inCompilations.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - inCompilations INFO ADDED\n`);
        addProperty(id, diffObj.title, r[1], 'title', 'inCompilations');
        addProperty(id, diffObj.title, r[1], 'type', 'inCompilations');
        addProperty(id, diffObj.title, r[1], 'machineType', 'inCompilations');
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - inCompilations INFO CHANGED (UNHANDLED)\n`);
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - inCompilations INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - inCompilations\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }

  /** HANDLE CHANGES IN XXXX (TEMPLATE) */
  if (diff.newProperty) {
    DETAILED.write(`${id} (${diffObj.title}) - diff found in newProperty\n`);
    diff.releases.forEach(function (r, i) {
      if (r[0] === "+") {
        DETAILED.write(`${id} (${diffObj.title}) - newProperty INFO ADDED (UNHANDLED)\n`);
      } else if (r[0] === "~") {
        DETAILED.write(`${id} (${diffObj.title}) - newProperty INFO CHANGED (UNHANDLED)\n`);
      } else if (r[0] === "-") {
        DETAILED.write(`${id} (${diffObj.title}) - newProperty INFO DELETED (UNHANDLED)\n`);
      } else if (r[0] === " ") {
        // just ignore these
      } else {
        UNHANDLED.write(`${id} (${diffObj.title}) - newProperty\n${JSON.stringify(diff, null, 2)}\n`);
      }
    })
  }
  /** HANDLE CHANGES IN XXXX (TEMPLATE) */


}

function compareId(entryId) {
  var id = ("0000000" + entryId).slice(-7);
  console.log(`comparing single ID: ${id}`);
  const newFileName = `${ZXDB_NEW_DIR}/${id}.json`;
  const oldFileName = `${ZXDB_OLD_DIR}/${id}.json`;

  process.stdout.write(`${consoleControl.gotoSOL()}processing: [${id}] - ${newFileName}`);
  const diff = readJSONFiles(newFileName, oldFileName);
  if (diff.diff) {
    DETAILED.write(id + ":\n" + JSON.stringify(diff.diff, null, 2) + "\n");
    compareVersions(id, diff);
  } else {
  }
}

function compareAll(isDebug) {
  const newFiles = fs.readdirSync(ZXDB_NEW_DIR).filter((e) => e.endsWith(".json"));
  const oldFiles = fs.readdirSync(ZXDB_OLD_DIR).filter((e) => e.endsWith(".json"));

  const deletedFiles = _.difference(oldFiles, newFiles);
  const addedFiles = _.difference(newFiles, oldFiles);

  // files to check, all new files - excluding added
  const filesToCheck = _.difference(newFiles, addedFiles);

  console.log(`Total files to check: ${filesToCheck.length}, new: ${newFiles.length}, old: ${oldFiles.length}, added: ${addedFiles.length}, deleted: ${deletedFiles.length}`);

  // write news.json with addedFiles
  var news = [];
  for (var n = 0; n < addedFiles.length; n++) {
    const new_json = JSON.parse(JSON.sortify(jsonfile.readFileSync(`${ZXDB_NEW_DIR}/${addedFiles[n]}`), null, 2));
    news.push({ id: addedFiles[n].substr(0, 7), title: new_json.title });
  }
  NEW_ENTRIES_JSON.write(JSON.stringify(news));

  for (var i = 0; i < filesToCheck.length; i++) {
    const newFileName = `${ZXDB_NEW_DIR}/${filesToCheck[i]}`;
    const oldFileName = `${ZXDB_OLD_DIR}/${filesToCheck[i]}`;

    const id = filesToCheck[i].substr(0, 7);

    process.stdout.write(`${consoleControl.gotoSOL()}processing: ${i}/${filesToCheck.length} [${id}] - ${newFileName}`);

    const diff = readJSONFiles(newFileName, oldFileName);
    if (diff.diff) {
      if (isDebug) {
        console.log(`${id}\n${JSON.stringify(diff.diff, null, 2)}\n`);
      } else {
        DETAILED.write(id + ":\n" + JSON.stringify(diff.diff, null, 2) + "\n");
        compareVersions(id, diff);
      }
    } else {
    }
  }
}

function main() {
  console.log("########## CHANGE LOG CREATOR ");

  if (!process.env.ZXDB_NEW) {
    console.error("ZXDB_NEW is missing, please check .env");
    process.exit();
  }

  if (!process.env.ZXDB_OLD) {
    console.error("ZXDB_OLD is missing, please check .env");
    process.exit();
  }

  console.log(`comparing current v${process.env.ZXDB_NEW} with previous v${process.env.ZXDB_OLD}`);
  console.log(`${process.env.ZXDB_NEW}: ${ZXDB_NEW_DIR}`);
  console.log(`${process.env.ZXDB_OLD}: ${ZXDB_OLD_DIR}`);

  if (argv.id) {
    compareId(argv.id);
  } else if (argv.debug) {
    compareAll(true);
  } else {
    compareAll();
  }

  console.log(consoleControl.color("reset") + consoleControl.showCursor());
}

main();
