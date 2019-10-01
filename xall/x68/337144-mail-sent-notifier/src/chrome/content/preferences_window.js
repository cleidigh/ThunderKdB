// ----------------------------------------------------------------------------
// File   : preferences_window.js
// Descr. : Dynamic code for the preferences window (for future use).
// Version: v.0.4.0
// Infos  : 20.10.2013, fjo, fontajos@phpeppershop.com
// ----------------------------------------------------------------------------

Cu.import('resource:///modules/iteratorUtils.jsm');
// ----------------------------------------------------------------------------
// Helper function to receive email addresses of all accounts:
function get_emails_from_accounts() {
  var acctMgr = Components.classes[
    '@mozilla.org/messenger/account-manager;1'
  ].getService(Components.interfaces.nsIMsgAccountManager);
  var accounts = new Array();
  var accounts_gen = fixIterator(
    acctMgr.accounts,
    Components.interfaces.nsIMsgAccount
  );
  do {
    account = accounts_gen.next();
    if (account.done == false) {
      accounts.push(account.value);
    }
  } while (account.done == false);

  var accounts_count = accounts.length;
  var email_addresses = new Object();
  email_addresses.account_keys = new Array();
  email_addresses.account_emails = new Array();
  for (var i = 0; i < accounts_count; i++) {
    var account = accounts[i];

    var accountIdentities = new Array();
    var accountIdentities_gen = fixIterator(
      account.identities,
      Components.interfaces.nsIMsgIdentity
    );
    do {
      var accountIdentity = accountIdentities_gen.next();
      if (accountIdentity.done == false) {
        accountIdentities.push(accountIdentity.value);
      }
    } while (accountIdentity.done == false);

    var accountIdentities_count = accountIdentities.length;
    for (
      var identCount = 0;
      identCount < accountIdentities_count;
      identCount++
    ) {
      var identity = accountIdentities[identCount];
      email_addresses.account_keys.push(account.key);
      email_addresses.account_emails.push(identity.email);
    }
  }
  return email_addresses;
}

// ----------------------------------------------------------------------------
// function which renders the possible account (emails) to the preferences dialog
// eslint-disable-next-line no-unused-vars
function render_possible_accounts(dom_id, delim, do_resize) {
  if (delim == '') delim = '\r\n';
  var possible_accounts = '';
  var accounts = get_emails_from_accounts();
  for (var i = 0; i < accounts.account_keys.length; i++) {
    if (i > 0) possible_accounts += delim;
    possible_accounts += accounts.account_emails[i];
  }
  document.getElementById(dom_id).textContent = possible_accounts;
  if (do_resize)
    document.getElementById(dom_id).style.height =
      accounts.account_keys.length * 17 + 'px';
}

// eslint-disable-next-line no-unused-vars
function fill_settings() {
  var prefs = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService)
    .getBranch('extensions.mail_sent_notifier.');
  document.getElementById('is_active').checked = prefs.getBoolPref('is_active');
  document.getElementById('zeiterfassung_url').value = prefs.getCharPref(
    'zeiterfassung_url'
  );
  document.getElementById('worker_id').value = prefs.getIntPref('worker_id');
}

// eslint-disable-next-line no-unused-vars
function save_settings() {
  var prefs = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService)
    .getBranch('extensions.mail_sent_notifier.');
  prefs.setBoolPref('is_active', document.getElementById('is_active').checked);
  prefs.setCharPref(
    'zeiterfassung_url',
    document.getElementById('zeiterfassung_url').value
  );
  prefs.setIntPref('worker_id', document.getElementById('worker_id').value);
}

// End of file ----------------------------------------------------------------
