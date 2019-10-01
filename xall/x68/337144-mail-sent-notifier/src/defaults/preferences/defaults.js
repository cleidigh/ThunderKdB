// ----------------------------------------------------------------------------
// File   : defaults.js
// Descr. : Adds preferences for the mail-sent-notifier extension.
// Version: v.0.2.0
// Infos  : 29.08.2011, fjo, fontajos@phpeppershop.com
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Definition of preferences for this extension
pref(
  'extensions.mail_sent_notifier@phpeppershop.com',
  'chrome://mail_sent_notifier/locale/mail_sent_notifier.properties'
);
pref('extensions.mail_sent_notifier.is_active', false);
pref(
  'extensions.mail_sent_notifier.zeiterfassung_url',
  'https://yourserver.com/notifierscript'
);
pref('extensions.mail_sent_notifier.worker_id', 1);
pref('extensions.mail_sent_notifier.active_accounts', '');

// End of file ----------------------------------------------------------------
