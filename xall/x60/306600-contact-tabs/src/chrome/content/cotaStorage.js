// A simple object for storing data shared across all browser windows
// (used instead of Application.storage, which was removed in TB58).
var EXPORTED_SYMBOLS = ['cotaStorage'];

var cotaStorage = {
  data: {},

  get: function(key, ignore) {
    return typeof this.data[key] != 'undefined' ? this.data[key] : null;
  },

  set: function(key, val) {
    this.data[key] = val;
  }
};
