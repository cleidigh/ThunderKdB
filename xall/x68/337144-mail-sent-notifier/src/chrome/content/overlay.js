// ----------------------------------------------------------------------------
// File   : overlay.js
// Descr. : Opens the preferences window
// Version: v.0.0.1
// Infos  : 17.08.2011, fjo, fontajos@phpeppershop.com
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// define event listener
var mail_sent_notifier_preferences = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
  },

  onMenuItemCommand: function() {
    window.open(
      'chrome://mail_sent_notifier/content/preferences.xul',
      'mail_sent_notifier_preferences_window',
      'chrome,centerscreen'
    );
  },
};

// ----------------------------------------------------------------------------
// Add event listener for "load"
window.addEventListener(
  'load',
  function(e) {
    mail_sent_notifier_preferences.onLoad(e);
  },
  false
);

// End of file ----------------------------------------------------------------
