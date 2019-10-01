// ----------------------------------------------------------------------------
// File   : mail_sent_event_handler.js
// Descr. : Function to intercept a mail, that is to be sent and then sends a
//          HTTP-GET request to a defined webservice sending information about
//          this email. This functionality is used to track email support events.
//          Second: If compose window is opened: Write a timestamp with string
//          markings into the status bar. That way it is possible to track the
//          time span how long the editing of the email was.
// Version: v.0.7
// Infos  : 23.06.2015, fjo, fontajos@phpeppershop.com
// ----------------------------------------------------------------------------

Cu.import('resource:///modules/iteratorUtils.jsm');
// ----------------------------------------------------------------------------
// Helper function to do an asynchronous HTTP-GET call
function ajax_async_url_call(
  url,
  check_for_server_script_success = false,
  show_error_messages = false
) {
  var response = '';
  var error_result_string = 'Error loading page\n';
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open('GET', url, true);
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4) {
      if (xmlHttp.status == 200) {
        response = xmlHttp.responseText;
        if (check_for_server_script_success) {
          if (response.trim() != 'mailsentnotifier:success') {
            // There was a server side error - the script could not successfully process the transmitted data
            if (show_error_messages)
              alert('Server Script Error: ' + response.trim());
            return error_result_string;
          }
        }
        return response;
      } else {
        if (show_error_messages)
          alert(
            'HTTP / Communication Error: HTTP Status ' +
              xmlHttp.status +
              ' reurned!'
          );
        return error_result_string;
      }
    }
  };
  xmlHttp.send(null);
}

// ----------------------------------------------------------------------------
// Helper function to receive the from email address:
function get_from_mail_adress_by_identity_key(fromIdentityKey) {
  var acctMgr = Components.classes[
    '@mozilla.org/messenger/account-manager;1'
  ].getService(Components.interfaces.nsIMsgAccountManager);
  var accounts = new Array();
  var accounts_gen = fixIterator(
    acctMgr.accounts,
    Components.interfaces.nsIMsgAccount
  );
  var account;
  var accountIdentity;
  do {
    account = accounts_gen.next();
    if (account.done == false) {
      accounts.push(account.value);
    }
  } while (account.done == false);

  var accounts_count = accounts.length;
  for (var i = 0; i < accounts_count; i++) {
    account = accounts[i];
    var accountIdentities = new Array();
    var accountIdentities_gen = fixIterator(
      account.identities,
      Components.interfaces.nsIMsgIdentity
    );
    do {
      accountIdentity = accountIdentities_gen.next();
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
      if (identity.key == fromIdentityKey) {
        // Identity found!
        return identity.email;
      }
    }
  }

  return 'unknown_sender';
}

// ----------------------------------------------------------------------------
// Helper function to set the timestamp, when the compose window was opened
function set_window_open_timestamp() {
  // write current date and timestamp to compose window id
  var mydate = new Date();
  window.id = mydate.getTime(); // Timestamp with milliseconds since 1971
  // Application.console.log('set: ' + window.id);
  return true;
}

// ----------------------------------------------------------------------------
// Helper function to read the timestamp, when the compose window was opened
function get_window_open_timestamp() {
  // Application.console.log('get: ' + window.id);
  return window.id;
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

// ----------------------------------------------------------------------------
// Helper function which reads the preference for active_accounts: extensions.mail_sent_notifier.active_accounts)
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
// Helper funktion, which checks, wether an account is active or not for the
// mail-sent-notifier Result is an Object with membervars: active and account_key.
function check_account_activation_by_identity_id(identity_id) {
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
  var account_to_identity_key_match = false;
  var result = false;
  for (var i = 0; i < accounts_count; i++) {
    var account = accounts[i];
    // check if the given folder belongs to this account. If so, return the activation info:
    if (account.defaultIdentity) {
      if (identity_id == account.defaultIdentity.key) {
        account_to_identity_key_match = true;
        // see, if this account is already activated for the mail-sent-notifier extension:
        // (pref: extensions.mail_sent_notifier.active_accounts)
        var active_accounts = read_active_accounts_pref();
        if (active_accounts.length > 0) {
          for (var k = 0; k < active_accounts.length; k++) {
            if (account.key == active_accounts[k]) {
              result = true;
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
  }

  // Log an error, if not matched to any account:
  if (account_to_identity_key_match == false) {
    Components.utils.reportError(
      'Could not match identity key: "' + identity_id + '" to an account!'
    );
  }

  return result;
}

// ----------------------------------------------------------------------------
// Core function to handle the event, when an email is sent:
// Code source inspired by: https://developer.mozilla.org/en/Extensions/Thunderbird/HowTos/Common_Thunderbird_Use_Cases/Compose_New_Message#Intercept_Outgoing_Message
function send_mail_event_handler() {
  // Compose window vars
  var msgcomposeWindow = document.getElementById('msgcomposeWindow');
  var msg_type = msgcomposeWindow.getAttribute('msgtype');

  // Import singleton
  // Components.utils.import("chrome://mail_sent_notifier/content/singleton.jsm");

  // Do not continue unless this is an actual send event
  if (
    !(
      msg_type == Components.interfaces.nsIMsgCompDeliverMode.Now ||
      msg_type == Components.interfaces.nsIMsgCompDeliverMode.Later
    )
  ) {
    return;
  }

  // See, if this module is active (preference setting 'is_active')
  if (check_if_extension_is_active() == false) {
    return;
  }

  // Read more preferences
  var prefs = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService)
    .getBranch('extensions.mail_sent_notifier.');
  var worker_id = prefs.getIntPref('worker_id');
  var zeiterfassung_url = prefs.getCharPref('zeiterfassung_url');

  // Get from info
  var identityWidget = document.getElementById('msgIdentity');
  var fromIdentityKey = identityWidget.selectedItem.getAttribute('identitykey'); // Elder thunderbird versions: document.getElementById('msgIdentity');
  var is_account_active = check_account_activation_by_identity_id(
    fromIdentityKey
  );

  if (is_account_active == false) {
    return;
  }

  // Initializing email and zeiterfassung vars
  var subject = '';
  var recipient_emails = '';
  var sender_email = '';
  var send_result = null;

  // Gather email data
  subject = document.getElementById('msgSubject').value;
  recipient_emails = gMsgCompose.compFields.to;
  sender_email = get_from_mail_adress_by_identity_key(fromIdentityKey);

  // Check, if a recipient is here
  if (recipient_emails == '') {
    return;
  }

  // Read timestamp, when window was opened and calculate minutes:
  var window_open_timestamp = new Date();
  window_open_timestamp.setTime(get_window_open_timestamp());
  var now = new Date();
  var diff = now.getTime() - window_open_timestamp.getTime(); // in milliseconds
  // calc diff in minutes, ensure that it is min. 1 minute, using floor to round:
  diff = Math.floor(diff / 1000 / 60);
  if (diff <= 0) {
    diff = 1;
  }

  // Send data to email support ticketing webservice (async call!):
  var log_service_url =
    zeiterfassung_url +
    '?subject=' +
    escape(subject) +
    '&to=' +
    escape(recipient_emails) +
    '&from=' +
    escape(sender_email) +
    '&edit_time=' +
    diff.toString() +
    '&worker_id=' +
    worker_id.toString();
  var check_server_side_script_success = true;
  var show_ajax_error_alert_boxes = true;
  // Info: Please debug async answers inside of ajax_async_url_call function!

  send_result = ajax_async_url_call(
    log_service_url,
    check_server_side_script_success,
    show_ajax_error_alert_boxes
  );
  if (send_result == 'Error loading page\n') {
    return false;
  } else {
    return true;
  }
}

// ----------------------------------------------------------------------------
// Core function to handle the event, when a new compose window is opened (in order to set the timestamp):
function send_mail_new_compose_window_opened_event_handler() {
  gMsgCompose.RegisterStateListener(myStateListener);
}

// ----------------------------------------------------------------------------
// Listener handling:
if (check_if_extension_is_active() == true) {
  window.addEventListener(
    'compose-window-init',
    send_mail_new_compose_window_opened_event_handler,
    true
  );
  window.addEventListener(
    'compose-send-message',
    send_mail_event_handler,
    true
  );
}

// ----------------------------------------------------------------------------
// Class to set the timestamp on opening the compose window:
var myStateListener = {
  NotifyComposeFieldsReady: function() {
    // See, if this module is active (preference setting 'is_active')
    if (check_if_extension_is_active() == false) {
      return;
    }

    // write current date and timestamp to compose window id
    set_window_open_timestamp();
  },

  NotifyComposeBodyReady: function() {},

  ComposeProcessDone: function() {},

  SaveInFolderDone: function() {},
};

// End of file ----------------------------------------------------------------
