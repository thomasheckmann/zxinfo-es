"use strict";
// var zxinfo_suggests_index = 'zxinfo_suggests';
// var zxinfo_suggests_type_title = 'zxinfo_suggests_type_title';

var zxinfo_index = "zxinfo_games_write";
var zxinfo_magazines_index = "zxinfo_magazines_write";

var elasticsearch = require("elasticsearch");
var client = new elasticsearch.Client({
  host: "localhost:9200",
  log: "info",
});

module.exports = {
  client: client,
  zxinfo_index: zxinfo_index,
  zxinfo_magazine: zxinfo_magazines_index,
};
