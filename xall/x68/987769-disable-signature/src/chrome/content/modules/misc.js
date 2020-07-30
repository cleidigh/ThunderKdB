var EXPORTED_SYMBOLS = ["entries"];

/* copied from thunderbird-stdlib's misc.js */
/* https://github.com/protz/thunderbird-stdlib /*

/**
 * Helper function to simplify iteration over key/value store objects.
 * From https://esdiscuss.org/topic/es6-iteration-over-object-values
 * @param {Object} anObject
 */
function* entries(anObject) {
  for (let key of Object.keys(anObject)) {
    yield [key, anObject[key]];
  }
}
