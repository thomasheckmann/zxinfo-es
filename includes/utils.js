/**
 * UTILITY FUNCTIONS
 *
 */
"use strict";

/**
  Returns content type based on genre type (e.g. Book, Covertape etc...)

  * Software
  * Hardware
  * Books

 */
var contenttype = function (genretype) {
  var result = "SOFTWARE";
  if (genretype < 84) {
    result = "SOFTWARE";
  } else if (genretype < 91) {
    result = "BOOK";
  } else if (genretype < 109) {
    result = "HARDWARE";
  } else {
    result = "SOFTWARE";
  }

  return result;
};

/**
 *
 * @param {*} price
 * @param {*} id
 */
var priceHelper = function (price, id) {
  var amount, currency, license;
  if (price == null) {
    return undefined;
  }

  price = "" + price;
  if (
    [
      "Freeware",
      "P&P only",
      "Public Domain",
      "Rental",
      "GPL",
      "Creative Commons",
      "Commercial",
      "Commercial / Full price",
    ].contains(price)
  ) {
    license = price;
  } else if (price.startsWith("£")) {
    currency = "£";
    amount = price.substring(1, price.length);
  } else if (price.startsWith("$")) {
    currency = "$";
    amount = price.substring(1, price.length);
  } else if (price.startsWith("€")) {
    currency = "€";
    amount = price.substring(1, price.length);
  } else if (price.startsWith("Lit.")) {
    currency = "Lit.";
    amount = price.substring(5, price.length);
  } else if (price.endsWith("ptas.")) {
    amount = price.substring(0, price.indexOf(" ptas."));
    currency = "ptas.";
  } else if (price.endsWith("DM")) {
    amount = price.substring(0, price.indexOf(" DM"));
    currency = "DM";
  } else if (price.endsWith("Sk")) {
    amount = price.substring(0, price.indexOf(" Sk"));
    currency = "Sk";
  } else if (price.endsWith("Fr.")) {
    amount = price.substring(0, price.indexOf(" Fr."));
    currency = "Fr.";
  } else if (price.endsWith("HUF")) {
    amount = price.substring(0, price.indexOf(" HUF"));
    currency = "HUF";
  } else if (price.endsWith("zloty")) {
    amount = price.substring(0, price.indexOf(" zloty"));
    currency = "zloty";
  } else if (price.endsWith("dinarjev")) {
    amount = price.substring(0, price.indexOf(" dinarjev"));
    currency = "dinarjev";
  } else {
    amount = price;
    currency = "N/A";
    // console.error("ERROR: ", id + " UNKNOWN PRICE: ", price);
  }
  return { amount: amount, currency: currency, license: license };
};

/**
 *
 * Remove empty properties from a JSON object. Only first level
 *
 */
var removeEmpty = function (item) {
  return item;

  for (var property in item) {
    if (item.hasOwnProperty(property)) {
      var value = item[property];
      if (
        value === undefined ||
        value === null ||
        value.length === 0 ||
        (Object.keys(value).length === 0 && value.constructor === Object)
      ) {
        delete item[property];
      }
    }
  }

  return item;
};

var isAllPropertiesNull = function (obj) {
  for (var key in obj) {
    if (obj[key] !== null && obj[key] != "") return false;
  }
  return true;
};

Array.prototype.contains = function (element) {
  return this.indexOf(element) > -1;
};

module.exports = {
  contenttype: contenttype,
  removeEmpty: removeEmpty,
  priceHelper: priceHelper,
  isAllPropertiesNull: isAllPropertiesNull,
};
