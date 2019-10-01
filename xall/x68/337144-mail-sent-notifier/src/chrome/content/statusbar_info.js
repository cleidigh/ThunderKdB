// ----------------------------------------------------------------------------
// File   : statusbar_info.js
// Descr. : Registers as an preferences observer and updates the statusbar.
// Version: v.0.2.0
// Infos  : 17.08.2011, fjo, fontajos@phpeppershop.com
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Object statusbar_info_updater:
var statusbar_info_updater = {
  // Membervariables initializing
  prefs: null,
  is_active: false,

  // onStartup
  startup: function() {
    // Register to receive notifications of preference changes
    this.prefs = Components.classes['@mozilla.org/preferences-service;1']
      .getService(Components.interfaces.nsIPrefService)
      .getBranch('extensions.mail_sent_notifier.');
    this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch);
    this.prefs.addObserver('', this, false);

    this.is_active = this.prefs.getBoolPref('is_active');
    this.update_mail_sent_notifier_statusbar_info();
    //window.setInterval(this.update_mail_sent_notifier_statusbar_info, 10*60*1000);
  },

  // onShutdown
  shutdown: function() {
    this.prefs.removeObserver('', this);
  },

  // Observ (update Statusbar info if event catched)
  observe: function(subject, topic, data) {
    if (topic != 'nsPref:changed') {
      return;
    }

    switch (data) {
    case 'is_active':
      this.is_active = this.prefs.getBoolPref('is_active');
      this.update_mail_sent_notifier_statusbar_info();
      break;
    }
  },

  // Update statusbar info data
  update_mail_sent_notifier_statusbar_info: function() {
    // If active: green, else: red
    if (this.is_active == true) {
      document.getElementById('mail_sent_notifier_statusbar').className =
        'green';
    } else {
      document.getElementById('mail_sent_notifier_statusbar').className = 'red';
    }
  },
};

// ----------------------------------------------------------------------------
// Installing event listeners:
window.addEventListener(
  'load',
  function() {
    statusbar_info_updater.startup();
  },
  false
);
window.addEventListener(
  'unload',
  function() {
    statusbar_info_updater.shutdown();
  },
  false
);

// End of file ----------------------------------------------------
