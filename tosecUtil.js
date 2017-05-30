'use strict';

var es = require('./esConfig');

var lookUp = function(tosec_rom, title, publisher) {
    var found = null;
    var done = false;
    es.client.search({
            index: es.zxinfo_index,
            type: es.zxinfo_type,
            body: {
                "query": {
                    "filtered": {
                        "query": {
                            "bool": {
                                "should": [{
                                    "multi_match": {
                                        "query": title,
                                        "fields": [
                                            "fulltitle^4",
                                            "alsoknownas"
                                        ]
                                    }
                                }, {
                                    "nested": {
                                        "path": "rereleasedby",
                                        "query": {
                                            "bool": {
                                                "must": [{
                                                    "match_phrase_prefix": {
                                                        "rereleasedby.as_title": title
                                                    }
                                                }]
                                            }
                                        }
                                    }
                                }]
                            }
                        },
                        "filter": {
                            "bool": {
                                "should": [{
                                    "nested": {
                                        "path": "authors",
                                        "query": {
                                            "bool": {
                                                "must": [{
                                                    "match_phrase_prefix": {
                                                        "authors.group.raw": publisher
                                                    }
                                                }]
                                            }
                                        }
                                    }
                                }, {
                                    "nested": {
                                        "path": "authors",
                                        "query": {
                                            "bool": {
                                                "must": [{
                                                    "match_phrase_prefix": {
                                                        "authors.authors.raw": publisher
                                                    }
                                                }]
                                            }
                                        }
                                    }
                                }, {
                                    "nested": {
                                        "path": "publisher",
                                        "query": {
                                            "bool": {
                                                "must": [{
                                                    "match_phrase_prefix": {
                                                        "publisher.name.raw": publisher
                                                    }
                                                }]
                                            }
                                        }
                                    }
                                }, {
                                    "nested": {
                                        "path": "rereleasedby",
                                        "query": {
                                            "bool": {
                                                "must": [{
                                                    "match_phrase_prefix": {
                                                        "rereleasedby.name": publisher
                                                    }
                                                }],
                                                "must_not": [{
                                                    "match": {
                                                        "seq": 0
                                                    }
                                                }]
                                            }
                                        }
                                    }
                                }]
                            }
                        }
                    }
                }

            }
        },
        function(error, response) {
            if (error) {
                throw error;
            } else {
                var hits = response.hits.total;
                if (hits == 1) {
                    var doc = response.hits.hits[0]._source;
                    var p = doc.publisher[0] !== undefined ? doc.publisher[0].name : "";
                    console.log("[EXACT][" + tosec_rom + "] -  FOUND: " + response.hits.hits[0]._id + ", [" + doc.fulltitle + "](" + p + ") USING: [" + title + "](" + publisher + ")(" + response.hits.hits[0]._score + ")");
                    found = [{ id: response.hits.hits[0]._id, title: response.hits.hits[0].fulltitle }];
                    done = true;
                } else if (hits > 1) {
                    //console.log("[MULTIPLE][" + title + "](" + publisher + ") FOUND: " + response.hits.total);
                    found = [];
                    var i = 0;
                    // only show multiple within 70% of max score
                    var min_score = response.hits.hits[0]._score * 0.70;
                    for (; i < response.hits.hits.length; i++) {
                        var doc = response.hits.hits[i]._source;
                        var p = doc.publisher[0] !== undefined ? doc.publisher[0].name : "";
                        if (response.hits.hits[i]._score > min_score) {
                            found.push({ id: response.hits.hits[i]._id, title: response.hits.hits[i].fulltitle });
                            console.log("[MULTIPLE][" + tosec_rom + "] -  FOUND: " + response.hits.hits[i]._id + ", [" + doc.fulltitle + "](" + p + ") USING: [" + title + "](" + publisher + ")(" + response.hits.hits[i]._score + ")");
                        } else {
                            console.error("[MULTIGNORE][" + tosec_rom + "] -  FOUND: " + response.hits.hits[i]._id + ", [" + doc.fulltitle + "](" + p + ") USING: [" + title + "](" + publisher + ")(" + response.hits.hits[i]._score + ") < " + min_score);
                        }
                    }
                    done = true;
                } else {
                    done = true;
                    console.log("[NOT FOUND][" + tosec_rom + "] USING: [" + title + "](" + publisher + ")");
                    console.log("\"" + tosec_rom + "\", ");
                }
            }
        });

    require('deasync').loopWhile(function() {
        return !done;
    });

    return found;
}

module.exports = {
    lookUp: lookUp,
}
