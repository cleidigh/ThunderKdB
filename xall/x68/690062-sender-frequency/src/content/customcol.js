// This Source Code Form is subject to the terms of the
// GNU General Public License, version 3.0.
var {Services} = ChromeUtils.import('resource://gre/modules/Services.jsm');

var freq;
var numMsgs;
var isSent;
var noFreq;
var compareEmailOnly;

function getAddress(aHeader) {
  // .recipients and .author return the raw message header
  // which can still be RFC 2047 encoded.
  // When using these attributes, we simply extract the e-mail address
  // from between the angle brackets <huhu@huhu.com>.
  // .mime2DecodedRecipients and .mime2DecodedAuthor return the
  // "pretty" version, where RFC 2047 has been decoded.
  // In the case we just remove " from the string so
  // |"huhu" <huhu@huhu.com>| and |huhu <huhu@huhu.com>| are the same thing.
  if (compareEmailOnly) {
    var from = isSent ? aHeader.recipients : aHeader.author;
    from = from.replace(/.*</, "").replace(/>.*/, "");
  } else {
    var from = isSent ? aHeader.mime2DecodedRecipients :
                        aHeader.mime2DecodedAuthor;
    from = from.replace(/\"/g, "");
  }
  return from;
}

var columnHandler = {
  getCellText: function(row, col) {
    if (freq === undefined) return "";
    if (noFreq) return "";
    if (numMsgs != gDBView.numMsgsInView)
      cacheFreq();
    var from = getAddress(gDBView.getMsgHdrAt(row));
    if (freq[from] === undefined) {
      // dump("==== adding new record (1) for |" + from + "|\n");
      freq[from] = 1;
    }
    var c = freq[from];
    return c.toString();
  },
  getSortStringForRow: function(hdr) {
    if (freq === undefined) return "";
    if (noFreq) return "";
    if (numMsgs != gDBView.numMsgsInView)
      cacheFreq();
    var from = getAddress(hdr);
    if (freq[from] === undefined) {
      // dump("==== adding new record (2) for |" + from + "|\n");
      freq[from] = 1;
    }
    var c = freq[from];
    return ("00000000" + c).slice(-8) + "|" + from;
  },
  isString:            function() {return true;},
  getCellProperties:   function(row, col, props){},
  getRowProperties:    function(row, props){},
  getImageSrc:         function(row, col) {return null;},
  getSortLongForRow:   function(hdr) {return 0;}
}

function cacheFreq() {
  freq = [];
  numMsgs = gDBView.numMsgsInView;
  isSent = false;
  noFreq = false;

  if (numMsgs > 0) {
    var folder = gDBView.getFolderForViewIndex(0);
    if (folder.isSpecialFolder(Ci.nsMsgFolderFlags.SentMail, true))
      isSent = true;
  }

  var label   = isSent ? "RFreq" : "SFreq";
  var tooltip = isSent ? "Click to sort by Recipient frequency" : "Click to sort by Sender frequency";
  document.getElementById("fromFreq").setAttribute("label", label);
  document.getElementById("fromFreq").setAttribute("tooltiptext", tooltip);

  // Skip grouped views.
  if (gDBView.viewFlags & Ci.nsMsgViewFlagsType.kGroupBySort) {
    numMsgs = 0;
    noFreq = true;
    return;
  }

  for (let i = 0; i < numMsgs; i++) {
    try {
      var from = getAddress(gDBView.getMsgHdrAt(i));
      if (freq[from] === undefined) {
        // dump("==== adding new record (3) for |" + from + "|\n");
        freq[from] = 1;
      } else {
        freq[from]++;
      }
    } catch (e) {
      dump("Couldn't retrieve header at "+i+"\n");
    }
  }
}

function addCustomColumnHandler() {
  if (gDBView) {
    gDBView.addColumnHandler("fromFreq", columnHandler);
    // Preprocess the view.
    // dump("=== addCustomColumnHandler\n");
    cacheFreq();
  }
}

function doOnceLoaded() {
  // dump("=== doOnceLoaded\n");
  var ObserverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
  ObserverService.addObserver(CreateDbObserver, "MsgCreateDBView", false);

  // Set default preference.
  let defaultsBranch = Services.prefs.getDefaultBranch('extensions.Sfreq.');
  defaultsBranch.setBoolPref("compareEmailOnly", true);
  let valuesBranch = Services.prefs.getBranch('extensions.Sfreq.');
  compareEmailOnly = valuesBranch.getBoolPref("compareEmailOnly");
}

var CreateDbObserver = {
  observe: function(aMsgFolder, aTopic, aData)
  {
    addCustomColumnHandler();
  }
}

window.addEventListener("load", doOnceLoaded, false);