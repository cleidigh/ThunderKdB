// Copyright (c) 2016, Jörg Knobloch. All rights reserved.

var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

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
  let from;
  if (compareEmailOnly) {
    from = isSent ? aHeader.recipients : aHeader.author;
    from = from.replace(/.*</, "").replace(/>.*/, "");
  } else {
    from = isSent ? aHeader.mime2DecodedRecipients
      : aHeader.mime2DecodedAuthor;
    from = from.replace(/"/g, "");
  }
  return from;
}

const columnHandler = {
  init(win) {
    this.win = win;
  },
  getCellText(row, col) {
    if (freq === undefined) return "";
    if (noFreq) return "";
    if (numMsgs != this.win.gDBView.numMsgsInView) this.cacheFreq();
    let from = getAddress(this.win.gDBView.getMsgHdrAt(row));
    if (freq[from] === undefined) {
      // dump("==== adding new record (1) for |" + from + "|\n");
      freq[from] = 1;
    }
    let c = freq[from];
    return c.toString();
  },
  getSortStringForRow(hdr) {
    if (freq === undefined) return "";
    if (noFreq) return "";
    if (numMsgs != this.win.gDBView.numMsgsInView) this.cacheFreq();
    let from = getAddress(hdr);
    if (freq[from] === undefined) {
      // dump("==== adding new record (2) for |" + from + "|\n");
      freq[from] = 1;
    }
    let c = freq[from];
    return `${(`00000000${c}`).slice(-8)}|${from}`;
  },
  isString() { return true; },
  getCellProperties(row, col, props) {},
  getRowProperties(row, props) {},
  getImageSrc(row, col) { return null; },
  getSortLongForRow(hdr) { return 0; },

  cacheFreq() {
    freq = [];
    numMsgs = this.win.gDBView.numMsgsInView;
    isSent = false;
    noFreq = false;

    if (numMsgs > 0) {
      let folder = this.win.gDBView.getFolderForViewIndex(0);
      if (folder.isSpecialFolder(Ci.nsMsgFolderFlags.SentMail, true)) isSent = true;
    }

    let label   = isSent ? "RFreq" : "SFreq";
    let tooltip = isSent ? "Click to sort by Recipient frequency" : "Click to sort by Sender frequency";
    this.win.document.getElementById("fromFreq").setAttribute("label", label);
    this.win.document.getElementById("fromFreq").setAttribute("tooltiptext", tooltip);

    // Skip grouped views.
    if (this.win.gDBView.viewFlags & Ci.nsMsgViewFlagsType.kGroupBySort) {
      numMsgs = 0;
      noFreq = true;
      return;
    }

    for (let i = 0; i < numMsgs; i++) {
      try {
        let from = getAddress(this.win.gDBView.getMsgHdrAt(i));
        if (freq[from] === undefined) {
          // dump("==== adding new record (3) for |" + from + "|\n");
          freq[from] = 1;
        } else {
          freq[from]++;
        }
      } catch (e) {
        dump(`Couldn't retrieve header at ${i}\n`);
      }
    }
  },
};

const columnOverlay = {
  init(win) {
    this.win = win;
    this.addColumn(win);
  },

  destroy() {
    this.destroyColumn();
  },

  observe(aMsgFolder, aTopic, aData) {
    try {
      columnHandler.init(this.win);
      this.win.gDBView.addColumnHandler("fromFreq", columnHandler);
      columnHandler.cacheFreq();
    } catch (ex) {
      console.error(ex);
      throw new Error("Cannot add column handler");
    }
  },

  addColumn(win) {
    if (win.document.getElementById("fromFreq")) return;

    const treeCol = win.document.createXULElement("treecol");
    treeCol.setAttribute("id", "fromFreq");
    treeCol.setAttribute("persist", "hidden ordinal sortDirection width");
    treeCol.setAttribute("flex", "2");
    treeCol.setAttribute("closemenu", "none");
    treeCol.setAttribute("label", "SFreq");
    treeCol.setAttribute("tooltiptext", "Click to sort by Sender frequency");

    const threadCols = win.document.getElementById("threadCols");
    threadCols.appendChild(treeCol);

    // Restore persisted attributes.
    let attributes = Services.xulStore.getAttributeEnumerator(
      this.win.document.URL,
      "fromFreq",
    );
    for (let attribute of attributes) {
      let value = Services.xulStore.getValue(this.win.document.URL, "fromFreq", attribute);
      // See Thunderbird bug 1607575 and bug 1612055.
      if (attribute != "ordinal" || parseInt(AppConstants.MOZ_APP_VERSION, 10) < 74) {
        treeCol.setAttribute(attribute, value);
      } else {
        treeCol.ordinal = value;
      }
    }

    Services.obs.addObserver(this, "MsgCreateDBView", false);
  },

  destroyColumn() {
    const treeCol = this.win.document.getElementById("fromFreq");
    if (!treeCol) return;
    treeCol.remove();
    Services.obs.removeObserver(this, "MsgCreateDBView");
  },
};

var SFreqHdrView = {
  init(win) {
    this.win = win;

    // Set default preference.
    let defaultsBranch = Services.prefs.getDefaultBranch("extensions.Sfreq.");
    defaultsBranch.setBoolPref("compareEmailOnly", true);
    let valuesBranch = Services.prefs.getBranch("extensions.Sfreq.");
    compareEmailOnly = valuesBranch.getBoolPref("compareEmailOnly");
    columnOverlay.init(win);

    // Usually the column handler is added when the window loads.
    // In our setup it's added later and we may miss the first notification.
    // So we fire one ourserves.
    if (win.gDBView && win.document.documentElement.getAttribute("windowtype") == "mail:3pane") {
      Services.obs.notifyObservers(null, "MsgCreateDBView");
    }
  },

  destroy() {
    columnOverlay.destroy();
  },
};
