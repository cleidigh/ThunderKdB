/* Copyright 2016-2018 Julien L. <julienl81@hotmail.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Module modeling the domain.
 */

function Item(reference, title, creator, date, itemContentPromiseFactory) {
  this.reference = function() {
    return reference;
  };

  this.title = function() {
    return title;
  };

  this.creator = function() {
    return creator;
  }

  this.date = function() {
    return date;
  }

  this.itemContentPromise = function() {
    return itemContentPromiseFactory();
  };
}

function Book(title, language, creator, publisher, items) {
  var uuid = UUID.create(4); // Generate a V4 UUID

  this.uuid = function() {
    return uuid.toString();
  };

  this.uri = function() {
    return uuid.toURN();
  };

  this.creator = function() {
    return creator;
  };

  /*
   * Returns the creators of items, order by number of items descending.
   */
  this.itemCreators = function() {
    // Build a map with creator as key, and number of items as value
    var map = new Map();
    for (var item of this.items()) {
      var creator = item.creator();
      var numberOfItems = 1;
      if (map.has(creator)) {
        numberOfItems = map.get(creator) + 1;
      }
      map.set(creator, numberOfItems);
    }

    var array = Array.from(map);
    var language = this.language();
    // Sort by the number of items (map value) descending, then by item author (map key) ascending
    array.sort(function(a, b) {
       var result = b[1] - a[1];
       if (result == 0) {
        result = a[0].localeCompare(b[0], language);
       }
       return result;
    });

    // Map the array of arrays to an array of string
    var result = array.map(function(elt) {
      return elt[0];
    });

    return result;
  };

  this.mainCreators = function() {
    var result = null;
    var creator = this.creator();
    if (creator) {
      result = Array.of(creator);
    } else {
      result = this.itemCreators();
    }
    return result;
  };

  this.title = function() {
    return title;
  };

  this.language = function() {
    return language;
  };

  this.publisher = function() {
    return publisher;
  };

  this.items = function() {
    return items;
  };

  this.itemOf = function(message) {
    var result = null;
    for (var item of this.items()) {
      if (item.message() === message) {
        result = item;
        break;
      }
    }
    return result;
  };

  this.writeToFile = function(file /* nsIFile */) {
    return epubGenerator.generate(this, file);
  };
}

function ItemContent(mimeType, baseURL, content) {
  this.mimeType = function() {
    return mimeType;
  };

  this.baseURL = function() {
    return baseURL;
  };

  this.content = function() {
    return content;
  }
}
