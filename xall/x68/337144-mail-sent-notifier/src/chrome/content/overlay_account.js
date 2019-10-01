// ----------------------------------------------------------------------------
// File   : overlay_account.js
// Descr. : Adds the Mail Sent Notifier Item to the account context menu
// Version: v.0.1.0
// Infos  : 29.08.2011, fjo, fontajos@phpeppershop.com
// ----------------------------------------------------------------------------

Cu.import('resource:///modules/iteratorUtils.jsm');
// ----------------------------------------------------------------------------
// Show menu item for account
// eslint-disable-next-line no-unused-vars
function enhance_account_context_menu() {
  // Per default: do not show mail-sent-notifier menuitem and its separator:
  var show = false;
  var enable = false;
  var active = 'false';
  var account_key = '--undefined--'; // Please do not change this
  var check_result = null;

  // we only proceed, if this extension is active
  if (check_if_extension_is_active() == true) {
    // Read selected folder(s):
    var folder_tree_view = gFolderTreeView.getSelectedFolders();

    // check, if only one folder is selected:
    if (folder_tree_view.length == 1) {
      try {
        if (folder_tree_view[0].parent) {
          // sub folders (of an account) -> nothing to do
        } else {
          // top folders ( = accounts)
          var flags = folder_tree_view[0].flags;
          switch (flags) {
          // standard account (enabled)
          case 0:
            show = true;
            enable = true;
            // We do now check for the current account, if it is enabled or not and we get the account_key
            // Info: folder_tree_view[0].name = account.incomingServer.rootFolder.prettiestName
            check_result = check_account_activation(folder_tree_view[0].name);
            account_key = check_result.account_key;
            if (check_result.active == true) {
              active = 'true';
            }
            break;
            // local storage account (disabled)
          case 28:
            show = true;
            enable = false;
            break;
          }
        }
      } catch (e) {
        // Application.console.log(e.message); // Debugging help
      }
    }
  }

  // show / hide menu separator and mail-sent-notifier context menuitem:
  ShowMenuItem('folderPaneContext-mail_sent_notifier_separator', show);
  ShowMenuItem('folderPaneContext-mail_sent_notifier_activation', show);
  EnableMenuItem('folderPaneContext-mail_sent_notifier_activation', enable);

  // set the checked marker and account_key as value to the current menuitem
  if (show == true) {
    document
      .getElementById('folderPaneContext-mail_sent_notifier_activation')
      .setAttribute('autocheck', 'false');
    document
      .getElementById('folderPaneContext-mail_sent_notifier_activation')
      .setAttribute('checked', active);
    document
      .getElementById('folderPaneContext-mail_sent_notifier_activation')
      .setAttribute('data-myAtt', account_key);
  }
}

// ----------------------------------------------------------------------------
// Checks, wether an account is active or not for the mail-sent-notifier
// Result is an Object with membervars: active and account_key.
function check_account_activation(root_folder_name) {
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
  var account_to_folder_match = false;
  var result = new Object();
  result.active = false;
  result.account_key = '--undefined--';
  for (var i = 0; i < accounts_count; i++) {
    var account = accounts[i];
    var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder
    // check if the given folder belongs to this account. If so, return the activation info:
    if (root_folder_name == rootFolder.prettyName) {
      account_to_folder_match = true;
      result.account_key = account.key;
      // see, if this account is already activated for the mail-sent-notifier extension:
      // (pref: extensions.mail_sent_notifier.active_accounts)
      var active_accounts = read_active_accounts_pref();
      if (active_accounts.length > 0) {
        for (var k = 0; k < active_accounts.length; k++) {
          if (account.key == active_accounts[k]) {
            result.active = true;
            return result;
          }
        }
        // The account key was not listet in the active accounts - so this account is currently disabled
        return result;
      } else {
        // No accounts are active!
        return result;
      }
    }
  }

  // Log an error, if not matched to any account:
  if (account_to_folder_match == false) {
    Components.utils.reportError(
      'Could not match root_folder_name: "' +
        root_folder_name +
        '" to an account!'
    );
  }

  return result;
}

// ----------------------------------------------------------------------------
// Read preference for active_accounts: extensions.mail_sent_notifier.active_accounts)
function read_active_accounts_pref() {
  // See, if this module is active (preference setting 'is_active')
  var prefs = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService)
    .getBranch('extensions.mail_sent_notifier.');
  var active_accounts = prefs.getCharPref('active_accounts');
  if (active_accounts != '') {
    active_accounts = active_accounts.split(';');
  } else {
    active_accounts = new Array();
  }

  return active_accounts;
}

// ----------------------------------------------------------------------------
// activate or deactivate an account for the use with mail-sent-notifier (this is done
// by writing the account_key to pref: extensions.mail_sent_notifier.active_accounts)
// eslint-disable-next-line no-unused-vars
function activate_deactivate_mail_sent_notifier_for_account(menuitem) {
  var account_key = '--undefined--';
  if (menuitem.hasAttribute('data-myAtt')) {
    account_key = menuitem.getAttribute('data-myAtt');
  }
  if (account_key == '' || account_key == '--undefined--') {
    // Cannot do anything without a valid account_key!
    return false;
  }
  // Read active_accounts preference
  var active_accounts_old = read_active_accounts_pref();
  var active_accounts_new = new Array();
  var checked = menuitem.getAttribute('checked');
  // different things todo, wether we were active or not:
  if (checked == 'true') {
    // Remove the current account_key from active_accounts preference
    for (var i = 0; i < active_accounts_old.length; i++) {
      if (account_key != active_accounts_old[i]) {
        active_accounts_new.push(active_accounts_old[i]);
      }
    }
  } else {
    // Add the account to active_accounts preference
    active_accounts_new = active_accounts_old;
    active_accounts_new.push(account_key);
  }

  // Transform array elements to one string with ; as delimiter:
  var active_accounts_new_string = '';
  if (active_accounts_new.length > 0) {
    for (i = 0; i < active_accounts_new.length; i++) {
      if (i > 0) {
        active_accounts_new_string += ';';
      }
      active_accounts_new_string += active_accounts_new[i];
    }
  }

  // Save preference 'active_accounts'
  // See, if this module is active (preference setting 'is_active')
  var prefs = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService)
    .getBranch('extensions.mail_sent_notifier.');
  return prefs.setCharPref('active_accounts', active_accounts_new_string);
}

// ----------------------------------------------------------------------------
// Helper function to check, wether this extension is currently activated
function check_if_extension_is_active() {
  // See, if this module is active (preference setting 'is_active')
  var prefs = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService)
    .getBranch('extensions.mail_sent_notifier.');
  return prefs.getBoolPref('is_active');
}

// End of file ----------------------------------------------------------------
