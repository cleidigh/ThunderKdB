// Copyright (c) 2015, Jörg Knobloch. All rights reserved.

/* global ExtensionCommon */

const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");

const EXTENSION_NAME = "JorgK@dictionaryforrecipient";

const nsIAbDirectory = Ci.nsIAbDirectory;

const verbose = 0;

function getCardForEmail(emailAddress) {
  // copied from msgHdrViewOverlay.js
  var books = MailServices.ab.directories;
  var result = { book: null, card: null };
  for (let ab of books) {
    try {
      var card = ab.cardForEmailAddress(emailAddress);
      if (card) {
        result.book = ab;
        result.card = card;
        break;
      }
    } catch (ex) {
      if (verbose) console.error(`Error (${ex.message}) fetching card from address book ${ab.dirName} for ${emailAddress}`);
    }
  }
  if (verbose && !result.card) console.log(`No address book entry for ${emailAddress}`);
  if (verbose && result.book) console.log(`${emailAddress} served from address book ${result.book.dirName}`);
  return result;
}

function getDictForAddress(address) {
  var cardDetails = getCardForEmail(address);
  if (!cardDetails.card) return null;
  var dict = cardDetails.card.getProperty("Custom4", "");
  return dict;
}

function setDictionary(window) {
  if (verbose) console.log("Setting Dictionary");

  // Get the first recipient.
  var fields = Components.classes["@mozilla.org/messengercompose/composefields;1"]
    .createInstance(Components.interfaces.nsIMsgCompFields);
  window.Recipients2CompFields(fields);
  var recipients = { length: 0 };

  var fields_content = fields.to;
  if (fields_content) {
    recipients = fields.splitRecipients(fields_content, true, {});
  }

  var firstRecipient = null;
  if (recipients.length > 0) {
    firstRecipient = recipients[0].toString();
  }

  var existingRecipient = window.dictionaryForRecipient;
  if (verbose) console.log(`Found existing recipient |${existingRecipient}|`);

  var infoText = null;
  var storeRecipient = null;
  if (firstRecipient) {
    if (firstRecipient == existingRecipient) {
      // We only set the dictionary once, as long as the recipient doesn't change.
      // This allows the user to change the dictionary, if they want to use a different
      // language as an exception. We don't want to reset the user choice.
      if (verbose) infoText = `Not setting dictionary for unchanged recipient ${firstRecipient}`;
    } else {
      var dict = getDictForAddress(firstRecipient);
      if (dict) {
        infoText = `${firstRecipient} -> ${dict}`;
        storeRecipient = firstRecipient;
        var changeEvent = { target: { value: dict }, stopPropagation() {} };
        window.ChangeLanguage(changeEvent);
      } else {
        if (verbose) infoText = `Setting dictionary: ${firstRecipient} has no dictionary defined`;
        storeRecipient = "-";
      }
    }
  } else {
    if (verbose) infoText = "Setting dictionary: No recipient specified";
    storeRecipient = "-";
  }
  if (verbose) console.log(infoText);

  if (storeRecipient && storeRecipient != existingRecipient) {
    window.dictionaryForRecipient = storeRecipient;
    if (verbose) console.log(`Storing recipient |${storeRecipient}|`);
  }

  if (infoText) {
    var statusText = window.document.getElementById("statusText");
    statusText.label = infoText;
    statusText.setAttribute("value", infoText);  // TB 70 and later, bug 1577659.
    window.setTimeout(() => {
      statusText.label = "";
      statusText.setAttribute("value", "");  // TB 70 and later, bug 1577659.
    }, 2000);
  }
}

function setListener1(window, target, on) {
  // Use closure to carry 'window' and 'on' into the callback function.
  var listener1 = function (evt) {
    if (verbose) console.log(`received event ${on}`);
    // Sadly, when focussing on the subject, the language change doesn't work, if we fire too early.
    // Also, when replying to an e-mail, the recipient sometimes cannot be retrieved, if we fire too early.
    // So wait 500 milliseconds.
    // Note Sept. 2017: Strange things happen: The language indicators switch to the new language
    // but the body remains in the original (default) language. This only happens on the first reply
    // after application start when quoted text is used.
    // Experiments showed that even 1100 ms were not enough, 1300 ms seemed to work.
    window.setTimeout(() => {
      setDictionary(window);
    }, 1300);
  };
  target.addEventListener(on, listener1);
}

/**
 * We prepare the compose window by attaching our listeners and resetting our properties.
 */
function PrepareComposeWindow(window) {
  if (verbose) console.log("Preparing compose window");

  window.dictionaryForRecipient = "-";

  // If these events arrive, we need to derive the dictionary again.
  setListener1(window, window.document.getElementById("msgSubject"), "focus");
  setListener1(window, window, "blur");
}

// Implements the functions defined in the experiments section of schema.json.
var DictionaryForRecipient = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      DictionaryForRecipient: {
        addComposeWindowListener(dummy) {
          // Adds a listener to detect new compose windows.
          if (verbose) console.log("DictionaryForRecipient: addComposeWindowListener");

          ExtensionSupport.registerWindowListener(EXTENSION_NAME, {
            chromeURLs: ["chrome://messenger/content/messengercompose/messengercompose.xul",
              "chrome://messenger/content/messengercompose/messengercompose.xhtml"],
            onLoadWindow: PrepareComposeWindow,
          });
        },
      },
    };
  }

  onShutdown(isAppShutdown) {
    ExtensionSupport.unregisterWindowListener(EXTENSION_NAME);
  }
};
