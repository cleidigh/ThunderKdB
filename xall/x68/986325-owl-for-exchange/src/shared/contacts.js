/**
 * PreferDisplayName takes a boolean value.
 *
 * However, the address book API only accepts strings, and in fact in
 * Thunderbird 78, local address books convert all property values
 * to strings anyway.
 * So, we need are forced to use strings "1" for true and "0" for false.
 *
 * That works, because booleans in JavaScript can be any of
 * `true`, `1` or `"1"` for true, or
 * `false`, `0` or `"0"` for false.
 */
const kPreferDisplayNameTrue = "1";
const kPreferDisplayNameFalse = "0";

/**
 * Error from a contact operation. Log as normal, but also create a card
 * in the address book with the given id with the exception information.
 */
function ShowContactError(id, ex) {
  logError(ex);
  browser.contacts.create(id, null, {
    PreferDisplayName: kPreferDisplayNameFalse,
    DisplayName: ex.message,
    Notes: ex.stack,
  });
}

/**
 * Report a failure while syncing a contact change to the server.
 *
 * @param ex   {Error}  The exception to report
 */
function ShowContactWriteFailure(ex) {
  logError(ex);
  let message = gStringBundle.get("error.contact-write-failure") + "\n\n" + (ex.message || ex);
  browser.uiTweaks.genericAlert(message, "mail:addressbook");
}
