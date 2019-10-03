/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["AccumulatingHistogram", "bin_by_time", "bin_by_day",
                        "MRUArray"];

const HOUR = 60 * 60 * 1000000; // microseconds
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * A memory-efficient histogram, which bins as data gets added.
 *
 * @param binner a binner object containing a bin function |func| and a number
 *        of bins |count|
 */
function AccumulatingHistogram(binner) {
  this.bin_func = binner.func;
  this._data = new Int32Array(binner.count);
}

AccumulatingHistogram.prototype = {
  /**
   * Add a datum to the histogram
   *
   * @param datum value to bin
   */
  add: function(datum) {
    let bin = this.bin_func(datum);
    if (bin !== null) {
      this._data[bin]++;
    }
  },

  /**
   * Remove a datum from the histogram
   *
   * @param datum value to un-bin
   */
  remove: function(datum) {
    let bin = this.bin_func(datum);
    if (bin !== null) {
      this._data[bin]--;
    }
  },

  /**
   * Return an array of counts per bin
   *
   * @return an array of integers, corresponding to the counts per bin.
   */
  data: function() {
    return this._data;
  }
}

/**
 * Create a binner for AccumulatingHistogram that puts elements in bins by
 * a time span in hours; for instance a span of 1 would create 24 bins, one for
 * each hour of the day.
 *
 * @param span the span in hours of each bin
 * @return the newly-created binner
 */
function bin_by_time(span) {
  return {
    func: function(datum) {
      let date = new Date(datum/1000);
      return Math.floor((date.getHours() + date.getMinutes()/60) / span);
    },
    count: 24/span
  };
}

/**
 * Create a binner for AccumulatingHistogram that puts elements in bins by
 * day for a specified number of days.
 *
 * @param days the number of days before today that the binner should stretch
 *        back to
 * @return the newly-created binner
 */
function bin_by_day(days) {
  let now = Date.now() * 1000;
  let then = now - days * DAY;
  return {
    func: function(datum) {
      if (datum < then || datum > now) return null;
      return Math.floor((datum - then) / DAY);
    },
    count: days
  };
}

/**
 * Create an array that store the |maxCache| top-ranked elements for a display
 * that will show at most |minCache| items.
 *
 * @param minCache the minimum amount the cache can safely shrink to
 * @param maxCache the maximum amount the cache can fill up to
 * @param compare a function for comparing two elements (a la strcmp)
 * @param equals a function to determining equality of two elements
 */
function MRUArray(minCache, maxCache, compare, equals) {
  this._data = [];
  this._minCache = minCache;
  this._maxCache = maxCache;
  this._compare = compare;
  this._equals = equals;
}

MRUArray.prototype = {
  /**
   * Add a new element to the array. Assumes that this element is not currently
   * in the array.
   *
   * @param elem the element to add
   * @return the index at which the element was added
   */
  add: function(elem) {
    let index = this._indexOfSorted(elem, true);
    if (index >= this._maxCache)
      return null;

    this._data.splice(index, 0, elem);
    this._truncate();
    return index;
  },

  /**
   * Remove an element from the array.
   *
   * @param elem the element to remove
   * @param stable true if the element's sort position hasn't changed, false
   *        otherwise
   * @return true if the cache is running low, false otherwise
   */
  remove: function(elem, stable) {
    let index = this.indexOf(elem, stable);
    if (index !== null) {
      this._data.splice(index, 1);

      // Warn the caller if our cache is running dangerously low...
      if (this._incomplete && this._data.length == this._minCache-1)
        return true;
    }

    return false;
  },

  /**
   * Update an existing element in the array, potentially changing its sort
   * position. If the element isn't in the array yet, add it.
   *
   * @param elem the element to update
   * @param stable true if the element's sort position hasn't changed, false
   *        otherwise
   * @return the index at which the element was inserted
   */
  update: function(elem, stable) {
    // Get the indices where the element used to be and where it will go.
    let oldIndex = this.indexOf(elem, stable);
    let newIndex = this._indexOfSorted(elem, true);
    let inserted = false;

    // Only add this element if it wouldn't be added at the end (otherwise, we
    // might be skipping some elements that didn't make it into the cache).
    if (newIndex < this._maxCache) {
      if (oldIndex !== null) {
        // If we found an existing element, merge properties into the new one.
        var data = this._data[oldIndex];
        for (let key in data) {
          if (!(key in elem))
            elem[key] = data[key];
        }

        // If we inserted our element before its old spot, update the old index.
        if (newIndex <= oldIndex)
          oldIndex++;
      }

      this._data.splice(newIndex, 0, elem);
      inserted = true;
    }

    if (oldIndex !== null) {
      this._data.splice(oldIndex, 1);

      // If we removed our element before its new spot, update the new index.
      if (newIndex !== null && newIndex > oldIndex)
        newIndex--;
    }

    this._truncate();
    return inserted ? newIndex : null;
  },

  /**
   * Get the ith element from the array.
   */
  get: function(i) {
    return this._data[i];
  },

  /**
   * Get the length of the array
   */
  get length() {
    return this._data.length;
  },

  /**
   * Truncate the array to its maximum size if necessary
   */
  _truncate: function() {
    if (this._data.length > this._maxCache) {
      this._incomplete = true;
      this._data.length = this._maxCache;
    }
  },

  /**
   * Find the closest index of an element in the array. If the element is in
   * the array, return its index. If not, and if nearest is true, return the
   * index it should be inserted before to keep the array sorted.
   *
   * @param elem the element to find
   * @param nearest if true, return the nearest index for the element
   * @return the (nearest) index for the element
   */
  _indexOfSorted: function(elem, nearest) {
    let lo = 0;
    let hi = this._data.length-1;

    while (lo <= hi) {
      let m = lo + Math.floor((hi-lo)/2);
      let c = this._compare(this._data[m], elem);

      if (c == 0)
        return m;
      else if (c > 0)
        hi = m-1;
      else // if (c < 0)
        lo = m+1;
    }

    return nearest ? lo : null;
  },

  /**
   * Find the index of an element in the array, assuming we don't know where it
   * should be sorted (e.g. if the element we're passing in is equal to another
   * element but its sort key has changed).
   *
   * @param elem the element to find
   * @return the index of the element, or null if none is found
   */
  _indexOfUnsorted: function(elem) {
    for (let i = 0; i < this._data.length; i++) {
      if (this._equals(this._data[i], elem))
        return i;
    }
    return null;
  },

  /**
   * Find the index of an element in the array.
   *
   * @param elem the element to update
   * @param stable true if the element's sort position hasn't changed, false
   *        otherwise
   * @return the index of the element, or null if none is found
   */
  indexOf: function(elem, stable) {
    if (stable)
      return this._indexOfSorted(elem);
    else
      return this._indexOfUnsorted(elem);
  },
};

/**
 * Iterate over the first |minCache| number of elements in the array
 */
MRUArray.prototype[Symbol.iterator] = function*() {
  for (let i = 0; i < Math.min(this._data.length, this._minCache); i++)
    yield this._data[i];
};

