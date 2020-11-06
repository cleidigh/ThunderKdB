"use strict";

/* globals AppConstants, ConvertSortTypeToColumnID,
 *         FolderDisplayListenerManager, gDBView, gFolderDisplay,
 *         GetThreadTree, makeURI, messenger, MsgSortThreadPane, MozXULElement,
 *         NetUtil, Services, SessionStoreManager */

var { MimeParser } = ChromeUtils.import("resource:///modules/mimeParser.jsm");

var {
  MsgHdrToMimeMessage,
  MimeMessage,
  MimeContainer,
  MimeBody,
  MimeUnknown,
  MimeMessageAttachment,
} = ChromeUtils.import("resource:///modules/gloda/MimeMessage.jsm");

ChromeUtils.import("resource://gre/modules/Services.jsm");

var MessagePreview = {
  DEBUG: false,
  TRACE: false,

  e(elementId) {
    return document.getElementById(elementId);
  },

  get addonId() {
    return "messagepreview@mozdev.org";
  },

  async addonInfo() {
    let addonInfo = await AddonManager.getAddonByID(this.addonId);
    return addonInfo;
  },

  async getResourceURI(relPath) {
    let addonInfo = await this.addonInfo();
    return addonInfo.getResourceURI().spec + relPath;
  },

  get obsTopicLocaleMessages() {
    return `extension:${this.addonId}:locale-messages`;
  },

  obsTopicLocaleMessagesDeferred: {},

  get obsTopicStorageLocal() {
    return `extension:${this.addonId}:storage-local`;
  },

  get obsNotificationReadyTopic() {
    return `extension:${this.addonId}:ready`;
  },

  get columnId() {
    return "messagePreviewCol";
  },

  get Column() {
    return this.e(this.columnId);
  },

  get TreeColumn() {
    return GetThreadTree().columns[this.columnId];
  },

  get threadTreeChildren() {
    return GetThreadTree().getElementsByTagName("treechildren")[0];
  },

  /*
   *  Preferences.
   */
  get storageLocalMap() {
    return this._storageLocalMap || new Map();
  },

  set storageLocalMap(val) {
    this._storageLocalMap = val;
  },

  getStorageLocal(key) {
    return this.storageLocalMap.get(key);
  },

  updateStorageLocal(newMap) {
    this.DEBUG && console.debug("updateStorageLocal: --> MessagePreview ");
    let storageLocalMapInitialized = this._storageLocalMap != undefined;
    let oldMap = this.storageLocalMap;
    this.storageLocalMap = newMap;
    if (storageLocalMapInitialized) {
      // Update only if initialized on startup.
      this.onPrefChange(oldMap);
    }
  },

  get previewTooltipEnabledPref() {
    let prefKey = "previewTooltipEnabled";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = true;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  kPreviewTooltipMaxSize: 4000,
  get previewTooltipMaxSizePref() {
    let prefKey = "previewTooltipMaxSize";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = this.kPreviewTooltipMaxSize;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  get previewTextEnabledPref() {
    let prefKey = "previewTextEnabled";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = false;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  kPreviewTextMaxSize: 40,
  get previewTextMaxSizePref() {
    let prefKey = "previewTextMaxSize";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = this.kPreviewTextMaxSize;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  kPreviewAuto: 0,
  kPreviewHover: 1,
  get previewGetOptionPref() {
    let prefKey = "previewGetOption";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = this.kPreviewHover;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  // Must be true for preview to be shown (checked in options) unless the
  // message is available offline.
  get imapAllowDownloadPref() {
    let prefKey = "imapAllowDownload";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = true;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  // No reason not to be true.
  get imapSaneBodySize() {
    return true;
  },

  // Must be false for preview to be shown, to allow a download if the message
  // isn't available locally.
  get imapPartsOnDemand() {
    return false;
  },

  // Throws if false for nntp.
  get encryptedParts() {
    return true;
  },

  imapNoAccess(msgHdr) {
    let server = msgHdr.folder.server;
    if (server.type != "imap") {
      return false;
    }
    let imapLoggedIn = server.QueryInterface(Ci.nsIImapServerSink)
      .userAuthenticated;
    return Boolean(!this.imapAllowDownloadPref || !imapLoggedIn);
  },

  onPrefChange(oldMap) {
    // Update actions here if immediately necessary on pref change.
  },

  /*
   * Strings.
   */
  get localeMessagesMap() {
    return this._localeMessagesMap || new Map();
  },

  set localeMessagesMap(val) {
    this._localeMessagesMap = val;
  },

  getLocaleMessage(key, substitutions) {
    let message = this.localeMessagesMap.get(key.toLowerCase()) || "";
    if (substitutions == undefined) {
      return message;
    }

    // We have to do our own substitutions as we don't have access to
    // i18n.getMessage().
    if (!Array.isArray(substitutions)) {
      substitutions = [substitutions];
    }
    let n = 1;
    for (let substitution of substitutions) {
      message = message.replace(`$${n++}`, substitution);
    }
    return message;
  },

  // Preview strings.
  get previewTitle() {
    return this.getLocaleMessage("previewTitle");
  },
  get previewTitleNA() {
    return this.getLocaleMessage("previewTitleNA");
  },
  get previewNoAccess() {
    let preview = ""; //this.previewTitleNA + "\n\n";
    return preview + this.getLocaleMessage("previewNoAccess");
  },
  get previewNoMimeMsg() {
    let preview = ""; //this.previewTitleNA + "\n\n";
    return preview + this.getLocaleMessage("previewNoMimeMsg");
  },
  get previewNNTP() {
    let preview = ""; //this.previewTitleNA + "\n\n";
    return preview + this.getLocaleMessage("previewNNTP");
  },
  previewError(error) {
    let preview = ""; //this.previewTitleNA + "\n\n";
    return preview + this.getLocaleMessage("previewError", error);
  },
  get previewCannotDecrypt() {
    let preview = ""; //this.previewTitleNA + "\n\n";
    return preview + this.getLocaleMessage("previewCannotDecrypt");
  },
  get previewSeparator() {
    return this.getLocaleMessage("previewSeparator");
  },

  onLoad() {
    this.DEBUG && console.debug("onLoad: --> MessagePreview");
    Services.obs.addObserver(this.Observer, "mail-tabs-session-restored");
    Services.obs.addObserver(this.Observer, "threadtree-column-added");
    Services.obs.addObserver(this.Observer, this.obsTopicLocaleMessages);
    this.obsTopicLocaleMessagesDeferred.promise = new Promise(resolve => {
      this.obsTopicLocaleMessagesDeferred.resolve = resolve;
    });
    Services.obs.addObserver(this.Observer, this.obsTopicStorageLocal);
    Services.obs.notifyObservers(null, this.obsNotificationReadyTopic);

    Services.obs.addObserver(this.Observer, "MsgCreateDBView");
    Services.prefs.addObserver("mail.pane_config.dynamic", this.Observer);
    FolderDisplayListenerManager.registerListener(this.FolderDisplayListener);
    let tabmail = this.e("tabmail");
    if (tabmail) {
      tabmail.registerTabMonitor(this.TabMonitor);
    }

    AddonManager.addAddonListener(this.AddonListener);

    this.CompleteInit();

    this.DEBUG && console.debug("onLoad: --> MessagePreview DONE");
  },

  onLoadThreadTree() {
    let threadTreeChildren = this.threadTreeChildren;
    this.onMouseMoveFunc = event => this.onMouseMove(event);
    threadTreeChildren.addEventListener("mousemove", this.onMouseMoveFunc);
    this.onMouseOutFunc = event => this.onMouseOut(event);
    threadTreeChildren.addEventListener("mouseout", this.onMouseOutFunc);

    this.DEBUG && console.debug("onLoadThreadTree: ");
  },

  onUnload() {
    this.DEBUG && console.debug("onUnload: --> MessagePreview ");
    // RemoveObservers()
    if (gDBView) {
      try {
        gDBView.removeColumnHandler(this.columnId);
      } catch (ex) {
        // If not registered, there's an exception; it's ok.
      }
    }
    Services.obs.removeObserver(this.Observer, "threadtree-column-added");
    Services.obs.removeObserver(this.Observer, this.obsTopicStorageLocal);
    Services.obs.removeObserver(this.Observer, "MsgCreateDBView");
    Services.prefs.removeObserver("mail.pane_config.dynamic", this.Observer);

    FolderDisplayListenerManager.unregisterListener(this.FolderDisplayListener);
    let tabmail = this.e("tabmail");
    if (tabmail) {
      tabmail.unregisterTabMonitor(this.TabMonitor);
    }

    this.e("menu_viewSortPopup").removeEventListener(
      "popupshowing",
      this.onViewSortByPopupshowingFunc
    );
    this.e("appMenu-popup").removeEventListener(
      "ViewShowing",
      this.onViewSortByPopupshowingFunc
    );

    let threadTreeChildren = this.threadTreeChildren;
    threadTreeChildren.removeEventListener("mousemove", this.onMouseMoveFunc);
    threadTreeChildren.removeEventListener("mouseout", this.onMouseOutFunc);

    AddonManager.removeAddonListener(this.AddonListener);

    // RestoreOverrideFunctions()

    // RestoreOverlayElements()
    let nodes = document.querySelectorAll(`[extension="${this.addonId}"]`);
    for (let node of nodes) {
      node.remove();
    }

    // Remove iconic column sort indicators.
    let treecols = this.e("threadCols").querySelectorAll("treecol");
    for (let col of treecols) {
      if (col.classList.contains("treecol-image")) {
        if (col.lastElementChild.classList.contains("treecol-sortdirection")) {
          col.lastElementChild.remove();
        }
        if (col.lastElementChild.nodeName == "spring") {
          col.lastElementChild.remove();
        }
      }
    }

    // RemoveStyles()
    let styleSheet = document.querySelector(`style[title="${this.addonId}"]`);
    if (styleSheet) {
      styleSheet.remove();
    }

    this.DEBUG && console.debug("onUnload: --> MessagePreview DONE");
  },

  async CompleteInit() {
    if (this.TreeColumn) {
      return;
    }
    await this.InitializeOverlayElements();
    this.onLoadThreadTree();
    this.UpdateColumnElement();
    this.SetColumnSortIndicator();
    this.onMsgCreateDBView();

    this.DEBUG && console.debug("CompleteInit: --> MessagePreview");
  },

  onMailTabsSessionRestored() {
    this.DEBUG &&
      console.debug("onMailTabsSessionRestored: --> MessagePreview");
    // Make the column header an image now.
    this.UpdateColumnElement();
  },

  onViewSortByPopupshowing(event) {
    let eventType = event.type;
    let columnId = this.columnId;
    this.DEBUG &&
      console.debug("onViewSortByPopupshowing: event.type - " + eventType);
    let sortByMenuItemId;
    if (eventType == "ViewShowing") {
      if (event.target.id != "appMenu-viewSortByView") {
        return;
      }
      sortByMenuItemId = `appmenu_sortBy_${columnId}`;
    } else {
      sortByMenuItemId = `sortBy_${columnId}`;
    }
    let sortByMenuItem = this.e(sortByMenuItemId);
    if (!sortByMenuItem) {
      // Uninstalled/disabled without the popup ever popping up (once).
      return;
    }
    sortByMenuItem.setAttribute(
      "checked",
      this.Column.hasAttribute("sortDirection") &&
        !this.Column.hasAttribute("sortDirectionSecondary")
    );
  },

  async InitializeOverlayElements() {
    this.DEBUG && console.debug("InitializeOverlayElements:");

    // Add the stylesheets.
    this.InitializeStyleSheet();

    await this.obsTopicLocaleMessagesDeferred.promise;
    let label = this.getLocaleMessage("messagePreviewColumnLabel");
    let tooltip = this.getLocaleMessage("messagePreviewColumnTooltip");
    let columnId = this.columnId;

    this.onViewSortByPopupshowingFunc = event =>
      this.onViewSortByPopupshowing(event);

    // Sort menuitem.
    let sortPopup = this.e("menu_viewSortPopup");
    if (sortPopup) {
      // Not for SearchDialog (currently unsupported, needs core patch).
      sortPopup.insertBefore(
        MozXULElement.parseXULToFragment(`
        <menuitem id="sortBy_${columnId}" extension="${this.addonId}"
                  type="radio"
                  name="sortby"
                  label="${label}"
                  oncommand="MessagePreview.MsgSortByThisColumn();"/>
        `),
        this.e("sortAfterAttachmentSeparator")
      );
      sortPopup.addEventListener(
        "popupshowing",
        this.onViewSortByPopupshowingFunc
      );
    }

    // Sort appmenuitem.
    sortPopup = this.e("appmenu_sortAfterAttachmentSeparator").parentNode;
    if (sortPopup) {
      // Not for SearchDialog (currently unsupported, needs core patch).
      sortPopup.insertBefore(
        MozXULElement.parseXULToFragment(`
        <toolbarbutton id="appmenu_sortBy_${columnId}" extension="${this.addonId}"
                       class="subviewbutton subviewbutton-iconic"
                       type="radio"
                       name="sortby"
                       label="${label}"
                       oncommand="MessagePreview.MsgSortByThisColumn();"/>
        `),
        this.e("appmenu_sortAfterAttachmentSeparator")
      );
      this.e("appMenu-popup").addEventListener(
        "ViewShowing",
        this.onViewSortByPopupshowingFunc
      );
    }

    // Column. Don't want custom element |is="treecol-image"| here. We want an
    // image but also a sort indicator and variable width.
    this.e("threadCols").insertBefore(
      MozXULElement.parseXULToFragment(`
      <treecol id="${columnId}" extension="${this.addonId}"
               persist="hidden ordinal sortDirection width"
               width="32"
               closemenu="none"
               label="${label}"
               tooltiptext="${tooltip}">
      </treecol>
      <splitter class="tree-splitter" extension="${this.addonId}"
                resizeafter="farthest"/>
      `),
      this.e("subjectCol").nextElementSibling.nextElementSibling
    );

    // Restore persisted attributes: hidden ordinal sortDirection width.
    let attributes = Services.xulStore.getAttributeEnumerator(
      document.URL,
      columnId
    );
    for (let attribute of attributes) {
      let value = Services.xulStore.getValue(document.URL, columnId, attribute);
      this.DEBUG &&
        console.debug(
          "InitializeOverlayElements: col attribute:value - " +
            attribute +
            ":" +
            value
        );
      if (["ordinal"].includes(attribute)) {
        this.Column[attribute] = value;
        this.Column.nextElementSibling.style.MozBoxOrdinalGroup = value;
      } else {
        this.Column.setAttribute(attribute, value);
      }
    }

    this.DEBUG && console.debug("InitializeOverlayElements: DONE");
  },

  /*
   * Initialize the column display elements, and run on layout change which
   * recreates the custom element and loses this DOM change.
   */
  UpdateColumnElement() {
    let column = this.Column;
    let icon = column.querySelector(".treecol-icon");
    this.DEBUG && console.debug("UpdateColumnElement: " + Boolean(icon));
    if (!icon) {
      // Add the icon if it's not already there.
      column.insertBefore(
        MozXULElement.parseXULToFragment(`
          <image class="treecol-icon"/>
          <spring flex="1"/>
        `),
        column.firstElementChild
      );
    }
  },

  /*
   * Add sort indicator to iconic columns, Bug 323067.
   *
   * @param {String} columnId - Id of the column in threadpane tree, optional.
   */
  SetColumnSortIndicator(columnId) {
    const addSortIndicatorToColumn = column => {
      if (
        !column.lastElementChild.classList.contains("treecol-sortdirection")
      ) {
        column.append(
          MozXULElement.parseXULToFragment(`
            <spring flex="1"/>
            <image class="treecol-sortdirection"/>
          `)
        );
        this.DEBUG &&
          console.debug("SetColumnSortIndicator: columnId - " + column.id);
      }
    };

    let treecols;
    if (columnId) {
      if (GetThreadTree().columns[columnId] instanceof TreeColumn) {
        treecols = [this.e(columnId)];
      } else {
        console.warn(
          "SetColumnSortIndicator: columnId is not valid - " + columnId
        );
        return;
      }
    } else {
      treecols = this.e("threadCols").querySelectorAll("treecol.treecol-image");
    }
    for (let col of treecols) {
      addSortIndicatorToColumn(col);
    }
  },

  /*
   * Set the secondary sort indicator, on MsgCreateDBView, onSortChanged,
   * and on TabSwitched. Take care to handle custom columns.
   */
  async UpdateSecondarySortIndicator() {
    this.DEBUG && console.debug("UpdateSecondarySortIndicator: START ");
    if (!gDBView) {
      return;
    }
    let curSecondarySortCol = this.e("threadCols").querySelector(
      "treecol[sortDirectionSecondary]"
    );
    if (curSecondarySortCol) {
      curSecondarySortCol.removeAttribute("sortDirectionSecondary");
    }

    // For linux Bug 703849; need reflow.
    if (AppConstants.platform == "linux") {
      const sleep = ms => {
        /* eslint-disable mozilla/no-arbitrary-setTimeout */
        return new Promise(resolve => setTimeout(resolve, ms));
      };
      await sleep(0);
    }

    let secondarySortColId;
    let secondarySortOrder =
      gDBView.secondarySortOrder == Ci.nsMsgViewSortOrder.ascending
        ? "ascending"
        : "descending";
    if (gFolderDisplay.view.showGroupedBySort) {
      // No secondary sorts within grouped view. Rather, it is always
      // byDate ascending.
      secondarySortColId = ConvertSortTypeToColumnID(
        Ci.nsMsgViewSortType.byDate
      );
      secondarySortOrder = "ascending";
    } else if (gDBView.secondarySortType == Ci.nsMsgViewSortType.byCustom) {
      secondarySortColId = gDBView.secondaryCustomColumn;
    } else {
      secondarySortColId = ConvertSortTypeToColumnID(gDBView.secondarySortType);
    }

    let secondarySortCol = this.e(secondarySortColId);
    this.DEBUG &&
      console.debug(
        "UpdateSecondarySortIndicator: secondarySortColId:secondarySortOrder " +
          secondarySortColId +
          ":" +
          secondarySortOrder
      );
    if (!secondarySortCol) {
      return;
    }
    if (
      // Make sure two custom column sorts display as expected.
      (gDBView.sortType == Ci.nsMsgViewSortType.byCustom &&
        gDBView.secondarySortType == Ci.nsMsgViewSortType.byCustom &&
        gDBView.curCustomColumn != gDBView.secondaryCustomColumn) ||
      // If sort is other than byId unique key, update secondary sort. Don't
      // show secondary if it's the same as primary (byDate) and if descending
      // byId (Order Received), which is not accurate.
      (gDBView.sortType != Ci.nsMsgViewSortType.byId &&
        gDBView.sortType != gDBView.secondarySortType &&
        !(
          gDBView.secondarySortType == Ci.nsMsgViewSortType.byId &&
          gDBView.secondarySortOrder == Ci.nsMsgViewSortOrder.descending
        ))
    ) {
      if (AppConstants.platform != "macosx") {
        // Cannot use this on osx. But on win/linux, the sort direction icon
        // is handled by css nicely. UpdateSortIndicators() will remove the
        // attribute from all columns before applying it to current sort column.
        secondarySortCol.setAttribute("sortDirection", secondarySortOrder);
      }
      secondarySortCol.setAttribute(
        "sortDirectionSecondary",
        secondarySortOrder
      );
    }
  },

  /*
   * Unfortunately we must use this method of inserting rules that contain
   * prefixed pseudo selectors, as necessary for any nsITree styling, as they
   * are not recognized as valid by the css parser. So we cannot use an href
   * in a <link> element, or in createProcessingInstruction(), or even add an
   * @import url rule for the href in a <style> sheet.
   *
   * Ie, this won't work:
   * //stylesheet = doc.createProcessingInstruction(
   * //  "xml-stylesheet",
   * //  `href="${href}" type="text/css"`
   * //);
   * //document.insertBefore(stylesheet, doc.documentElement);
   * Nor this:
   * // style.sheet.insertRule(`@import url("${href}")`, 0);
   */
  InitializeStyleSheet() {
    let style = document.createElement("style");
    style.title = `${this.addonId}`;
    document.documentElement.appendChild(style);
    let styleSheet = style.sheet;
    if (styleSheet.title != `${this.addonId}`) {
      console.error("InitializeStyleSheet: failed to get styleSheet");
      return;
    }
    // We must do this when setting title else another extension using this
    // technique may have its sheet be the |document.selectedStyleSheetSet|.
    styleSheet.disabled = false;

    let cssRules = this.cssRules.concat(
      this[`cssRules_${AppConstants.platform}`]
    );
    for (let rule of cssRules) {
      styleSheet.insertRule(rule, styleSheet.rules.length);
    }
    this.DEBUG && console.debug(styleSheet);
  },

  cssRules: [
    `
      #messagePreviewCol {
        width: 32px;
        min-width: 32px;
      }
    `,
    `
      #messagePreviewCol > image.treecol-icon {
        list-style-image: url(chrome://messenger/skin/icons/file-item.svg);
        -moz-context-properties: fill;
        fill: currentColor;
      }
    `,
    `
      #messagePreviewCol:not([sortDirection]):not([sortDirectionSecondary]) > image.treecol-sortdirection {
        display: none;
      }
    `,
    `
      #threadTree > treechildren::-moz-tree-image(messagePreviewCol) {
        padding: 0 4px !important;
      }
    `,
    `
      #threadTree > treechildren::-moz-tree-image(messagePreviewCol, unknown) {
        list-style-image: url(chrome://messenger/skin/icons/file-item.svg);
        opacity: 0.1;
      }
    `,
    `
      #threadTree > treechildren::-moz-tree-image(messagePreviewCol, hasOne),
      #threadTree > treechildren::-moz-tree-image(messagePreviewCol, gettingPreview) {
        border-width: 1px !important;
        border-style: solid !important;
        border-color: transparent;
        list-style-image: url(chrome://messenger/skin/icons/file-item.svg);
        opacity: 0.8;
        cursor: pointer;
      }
    `,
    `
      #threadTree > treechildren::-moz-tree-image(messagePreviewCol, previewing) {
        border-color: rgb(118, 118, 118); !important;
      }
    `,
    // Can't be accessed.
    `
      #threadTree > treechildren::-moz-tree-image(messagePreviewCol, allNoAccess) {
        border-color: red !important;
      }
    `,
    // Error.
    `
      #threadTree > treechildren::-moz-tree-image(messagePreviewCol, error) {
        list-style-image: url("chrome://mozapps/skin/extensions/alerticon-error.svg");
      }
    `,
    // Busy (cannot use animated gifs alas or even transitions).
    `
      #threadTree > treechildren::-moz-tree-image(messagePreviewCol, gettingPreview) {
        list-style-image: url("chrome://messenger/skin/icons/waiting.svg") !important;
      }
    `,

    // Extra css rules to fix Bug 323067 (iconic column sort indicator) and
    // also add a secondary sort indicator to all columns.
    `
      #threadCols > treecol.treecol-image {
        width: 32px;
        min-width: 32px;
      }
    `,
    `
      #threadCols > treecol > label.treecol-text {
        text-align: start;
      }
    `,
    `
      #threadCols > treecol.treecol-image > spring,
      #threadCols > treecol.treecol-image > image.treecol-sortdirection {
        display: none;
        visibility: collapse;
        border-width: 0;
        padding: 0;
      }
    `,
    `
      #threadCols > treecol.treecol-image[sortDirection] > spring,
      #threadCols > treecol.treecol-image[sortDirectionSecondary] > spring,
      #threadCols > treecol.treecol-image[sortDirection] > image.treecol-sortdirection,
      #threadCols > treecol.treecol-image[sortDirectionSecondary] > image.treecol-sortdirection {
        display: block;
        visibility: visible;
      }
    `,
    `
      #threadCols > treecol[sortDirectionSecondary] > image.treecol-sortdirection {
        opacity: 0.4;
      }
    `,
    `
      #threadTree > treechildren::-moz-tree-image(attachmentCol, attach) {
        margin-inline-start: 6px !important;
      }
    `,
  ],

  cssRules_linux: [
    `
      #messagePreviewCol > spring {
        max-width: 10px;
      }
    `,

    // Extra css rules to fix Bug 323067 (iconic column sort indicator) and
    // also add a secondary sort indicator to all columns.

    // Extra rules to fix Bug 703849 (linux).
  ],

  cssRules_macosx: [
    `
      #messagePreviewCol {
        width: 28px;
        min-width: 28px;
        padding-inline-start: 6px;
        padding-inline-end: 6px;
      }
    `,
    `
      #messagePreviewCol > image.treecol-icon {
        width: 14px;
      }
    `,
    `
      #messagePreviewCol > spring {
        max-width: 8px;
      }
    `,
    `
      #threadTree > treechildren::-moz-tree-image(messagePreviewCol) {
        width: 14px;
      }
    `,

    // Extra css rules to fix Bug 323067 (iconic column sort indicator) and
    // also add a secondary sort indicator to all columns.

    /* Don't overlap an ellipsis */
    `
      #threadCols > treecol:not([is="treecol-image"])[sortDirection] {
         padding-inline-end: 18px;
      }
    `,
    `
      #threadCols > treecol.treecol-image {
        width: 28px;
        min-width: 28px;
        padding-inline-start: 0;
      }
    `,
    `
      #threadCols > treecol[sortDirectionSecondary="ascending"] > image.treecol-sortdirection {
        list-style-image: url("chrome://global/skin/icons/arrow-up-12.svg");
      }
    `,
    `
      #threadCols > treecol[sortDirectionSecondary="descending"] > image.treecol-sortdirection {
        list-style-image: url("chrome://global/skin/icons/arrow-dropdown-12.svg");
      }
    `,
    /* The list-style-image must be unset as the <image> inherits it, and
       on osx it's visible as the image isn't otherwise used for the sort
       indicator since it is rendered by the cocoa widget. Also need a
       margin adjustment to account for that.*/
    `
      #threadCols > treecol > image.treecol-sortdirection {
        list-style-image: none;
      }
    `,
    `
      #threadCols > treecol.treecol-image[sortDirectionSecondary] {
        padding-inline-end: 3px !important;
      }
    `,
  ],

  cssRules_win: [
    `
      #messagePreviewCol > spring {
        max-width: 6px;
      }
    `,

    // Extra css rules to fix Bug 323067 (iconic column sort indicator) and
    // also add a secondary sort indicator to all columns.
    `
      #threadCols > treecol {
        padding: 0 6px;
      }
    `,
  ],

  /*
   * Observer for custom column, show allBodyParts pref and layout change,
   * localeMessages and storageLocal (from experiments.js).
   */
  Observer: {
    observe(subject, topic, data) {
      if (topic == "mail-tabs-session-restored") {
        MessagePreview.DEBUG &&
          console.debug("Observer: " + topic + ", data - " + data);
        MessagePreview.onMailTabsSessionRestored();
        Services.obs.removeObserver(
          MessagePreview.Observer,
          "mail-tabs-session-restored"
        );
      } else if (topic == "threadtree-column-added") {
        MessagePreview.DEBUG &&
          console.debug("Observer: " + topic + ", data - " + data);
        MessagePreview.SetColumnSortIndicator(data);
      } else if (topic == "MsgCreateDBView") {
        MessagePreview.DEBUG &&
          console.debug("Observer: " + topic + ", data - " + data);
        MessagePreview.onMsgCreateDBView();
      } else if (
        topic == "nsPref:changed" &&
        data == "mail.pane_config.dynamic"
      ) {
        MessagePreview.DEBUG &&
          console.debug("Observer: " + topic + ", data - " + data);
        window.setTimeout(() => {
          MessagePreview.UpdateColumnElement();
          if (AppConstants.platform == "linux") {
            MessagePreview.UpdateSecondarySortIndicator();
          }
        });
      } else if (topic == MessagePreview.obsTopicLocaleMessages) {
        MessagePreview.DEBUG &&
          console.debug("Observer: " + topic + ", data - " + data);
        MessagePreview.localeMessagesMap = new Map(JSON.parse(data));
        Services.obs.removeObserver(
          MessagePreview.Observer,
          MessagePreview.obsTopicLocaleMessages
        );
        MessagePreview.obsTopicLocaleMessagesDeferred.resolve();
      } else if (topic == MessagePreview.obsTopicStorageLocal) {
        MessagePreview.DEBUG &&
          console.debug("Observer: " + topic + ", data - " + data);
        MessagePreview.updateStorageLocal(new Map(JSON.parse(data)));
      }
    },
  },

  TabMonitor: {
    monitorName: "MessagePreview",
    onTabTitleChanged() {},
    onTabSwitched(tab, oldTab) {
      MessagePreview.DEBUG &&
        console.debug("onTabSwitched: title - " + tab.title);
      if (tab.mode.type == "folder" || tab.mode.name == "glodaList") {
        MessagePreview.UpdateSecondarySortIndicator();
      }
    },
  },

  FolderDisplayListener: {
    onSortChanged(folderDisplay) {
      MessagePreview.DEBUG && console.debug("onSortChanged: START ");
      MessagePreview.UpdateSecondarySortIndicator();
    },
  },

  /*
   * Listener for addon status changes.
   */
  AddonListener: {
    resetSession(addon, who) {
      if (addon.id != MessagePreview.addonId) {
        return;
      }
      MessagePreview.DEBUG &&
        console.debug("AddonListener.resetSession: who - " + who);
      MessagePreview.onUnload();
      console.info(MessagePreview.getLocaleMessage("extensionBye"));
    },
    onUninstalling(addon) {
      this.resetSession(addon, "onUninstalling");
    },
    onInstalling(addon) {
      this.resetSession(addon, "onInstalling");
    },
    onDisabling(addon) {
      this.resetSession(addon, "onDisabling");
    },
    // The listener is removed so these aren't run; they aren't needed as the
    // addon is installed by the addon system and runs our backgound.js loader.
    onEnabling(addon) {
      MessagePreview.DEBUG && console.debug("AddonListener.onEnabling");
    },
    onOperationCancelled(addon) {
      MessagePreview.DEBUG &&
        console.debug("AddonListener.onOperationCancelled");
    },
  },

  onMsgCreateDBView() {
    if (!gDBView) {
      return;
    }
    gDBView.addColumnHandler(MessagePreview.columnId, MessagePreview);
    this.DEBUG &&
      console.debug("onMsgCreateDBView: addColumnHandler - messagePreviewCol");
    window.setTimeout(() => {
      MessagePreview.UpdateSecondarySortIndicator();
    });
  },

  MsgSortByThisColumn() {
    if (gDBView && gDBView.db) {
      gDBView.db.dBFolderInfo.setProperty("customSortCol", this.columnId);
    }
    MsgSortThreadPane("byCustom");
  },

  onMouseMove(event) {
    this.TRACE &&
      console.debug(
        "onMouseMove: START name:gettingPreview - " +
          event.target.localName +
          ":" +
          this.gettingPreview
      );
    if (
      this.gettingPreview ||
      !(this.previewTooltipEnabledPref || this.previewTextEnabledPref)
    ) {
      return;
    }

    this.gettingPreview = true;
    let cell = GetThreadTree().getCellAt(event.clientX, event.clientY);
    let row = cell.row;
    let col = cell.col;

    this.TRACE &&
      console.debug(
        "onMouseMove: cX:cY - " + event.clientX + ":" + event.clientY
      );

    let previewRow = this.previewRow >= gDBView.rowCount ? -1 : this.previewRow;

    this.TRACE &&
      console.debug(
        "onMouseMove: ROW name:row:previewRow - " +
          col?.id +
          ":" +
          row +
          ":" +
          previewRow
      );

    if (
      row < 0 ||
      !col ||
      col.id != this.columnId ||
      this.isGroupedBySortHdr(row)
    ) {
      this.removeTooltip(this.columnId);
      this.TRACE && console.debug("onMouseMove: remove tooltip 1 ");
      this.gettingPreview = false;
      if (previewRow == -1) {
        return;
      }
      this.previewRow = -1;
      //this.invalidateCell(previewRow, this.TreeColumn, "onMouseMove:nocol");
      this.invalidateCell(row, this.TreeColumn, "onMouseMove:nocol");
      return;
    }

    this.TRACE &&
      console.debug(
        "onMouseMove: COLUMN name:row:previewRow - " +
          col?.id +
          ":" +
          row +
          ":" +
          previewRow
      );
    if (row != previewRow) {
      // This doesn't work to immediately close the tooltip.
      this.removeTooltip(this.columnId);
      this.previewRow = -1;
      this.invalidateCell(previewRow, col, "onMouseMove:rowchange");
      this.TRACE && console.debug("onMouseMove: remove tooltip 2 ");
    }

    this.TRACE &&
      console.debug(
        "onMouseMove: NEXT name:row:previewRow - " +
          col?.id +
          ":" +
          row +
          ":" +
          previewRow
      );
    if (
      row == previewRow &&
      this.threadTreeChildren.hasAttribute("tooltiptext")
    ) {
      this.gettingPreview = false;
      return;
    }

    let msgHdr = gDBView.getMsgHdrAt(row);
    this.previewRow = row;
    let hasPreview = this.hasPreview(msgHdr);

    this.DEBUG &&
      console.debug("onMouseMove: PREVIEW messageKey - " + msgHdr.messageKey);
    if (!hasPreview) {
      this.DEBUG &&
        console.debug("onMouseMove: GETTING messageKey - " + msgHdr.messageKey);
      this.getPreview(msgHdr, row);
    } else {
      let preview = this.getPreview(msgHdr, row);
      this.setTooltip(preview);
      this.gettingPreview = false;
      this.DEBUG &&
        console.debug("onMouseMove: CACHED messageKey - " + msgHdr.messageKey);
    }

    this.invalidateCell(row, col, "onMouseMove:done");
  },

  onMouseOut(event) {
    this.TRACE && console.debug("onMouseOut: START id - " + event.target.id);
    if (this.gettingPreview) {
      return;
    }

    this.removeTooltip(this.columnId);
    let row = this.previewRow;
    this.previewRow = -1;
    this.invalidateCell(row, this.TreeColumn, "onMouseOut");
  },

  setTooltip(tooltiptext) {
    this.DEBUG && console.debug("setTooltip: ");
    this.threadTreeChildren.setAttribute("tooltiptext", tooltiptext);
    this.threadTreeChildren.setAttribute("tooltiptextowner", this.columnId);
  },

  removeTooltip(owner) {
    this.TRACE && console.debug("removeTooltip: ");
    if (this.threadTreeChildren.getAttribute("tooltiptextowner") == owner) {
      this.DEBUG && console.debug("removeTooltip: owner - " + owner);
      this.threadTreeChildren.removeAttribute("tooltiptext");
      this.threadTreeChildren.removeAttribute("tooltiptextowner");
    }
  },

  /**
   * nsITreeview.
   */
  isString() {
    return true;
  },
  isEditable(row, col) {
    return false;
  },
  cycleCell(row, col) {},
  getRowProperties(row) {
    return "";
  },
  getSortLongForRow(msgHdr) {
    return 0;
  },

  getSortStringForRow(msgHdr) {
    this.TRACE && console.debug("getSortStringForRow: START ");
    if (this.hasPreview(msgHdr)) {
      return this.getPreview(msgHdr).substr(0, 20);
    }

    return "";
  },

  getImageSrc(row, col) {
    return null;
  },

  getCellProperties(row, col) {
    if (
      row < 0 ||
      row >= gDBView.rowCount ||
      !col ||
      col.id != this.columnId ||
      this.isGroupedBySortHdr(row)
    ) {
      return null;
    }

    this.TRACE &&
      console.debug("getCellProperties: row:col.id - " + row + ":" + col.id);

    let msgHdr = gDBView.getMsgHdrAt(row);

    this.TRACE &&
      console.debug(
        "getCellProperties: row:messageKey:gettingPreview - " +
          row +
          ":" +
          msgHdr.messageKey +
          ":" +
          this.getInfo(msgHdr, "gettingPreview")
      );
    if (this.getInfo(msgHdr, "gettingPreview") !== undefined) {
      let properties = this.columnId + " gettingCount";
      this.TRACE &&
        console.debug(
          "getCellProperties: row:messageKey:properties - " +
            row +
            ":" +
            msgHdr.messageKey +
            ":" +
            properties
        );
      return properties;
    }

    let props = [];
    props.push(this.columnId);

    if (this.hasPreview(msgHdr)) {
      props.push("hasOne");
    } else if (this.hasError(msgHdr)) {
      props.push("error");
    } else {
      props.push("unknown");
    }

    // If no imap access show no access decoration.
    if (this.imapNoAccess(msgHdr)) {
      props.push("allNoAccess");
      this.TRACE &&
        console.debug(
          "getCellProperties: row:messageKey:props - " +
            row +
            ":" +
            msgHdr.messageKey +
            ":" +
            props
        );
    }

    if (row == this.previewRow) {
      props.push("previewing");
    }
    this.TRACE &&
      console.debug(
        "getCellProperties: row:messageKey:previewRow - " +
          row +
          ":" +
          msgHdr.messageKey +
          ":" +
          this.previewRow
      );

    return props.join(" ");
  },

  getCellText(row, col) {
    if (
      row < 0 ||
      row >= gDBView.rowCount ||
      !col ||
      col.id != this.columnId ||
      this.isGroupedBySortHdr(row)
    ) {
      return null;
    }
    this.TRACE &&
      console.debug("getCellText: row:col.id - " + row + ":" + col.id);

    let msgHdr = gDBView.getMsgHdrAt(row);

    if (
      this.getInfo(msgHdr, "gettingPreview") !== undefined ||
      this.imapNoAccess(msgHdr)
    ) {
      return null;
    }

    if (this.hasPreview(msgHdr)) {
      if (this.previewTextEnabledPref) {
        let preview = this.getPreview(msgHdr, row);
        return preview.substr(0, this.previewTextMaxSizePref);
      }
    } else if (this.previewGetOptionPref == this.kPreviewAuto) {
      this.getPreview(msgHdr, row);
    }

    return null;
  },

  isGroupedBySortHdr(row) {
    return (
      gFolderDisplay.view.showGroupedBySort &&
      row >= 0 &&
      (gDBView.isContainer(row) || gDBView.getLevel(row) == 0)
    );
  },

  /*
   * Perhaps use a synthetic mouse event instead, as tooltips time out for
   * long attachment reads.
   */
  invalidateCell(row, col, who) {
    if (row == -1) {
      return;
    }
    this.TRACE &&
      console.debug(
        "invalidateCell: DONE row:col.id:who - " +
          row +
          ":" +
          col.id +
          ":" +
          who
      );
    GetThreadTree().invalidateCell(row, col);
  }, // nsITreeview.

  hasPreview(msgHdr) {
    return this.getInfo(msgHdr, "messagePreview") !== undefined;
  },

  hasError(msgHdr) {
    return this.getInfo(msgHdr, "error") !== undefined;
  },

  getPreview(msgHdr, row) {
    // No msgHdr.
    if (!(msgHdr instanceof Ci.nsIMsgDBHdr)) {
      return null;
    }
    this.DEBUG &&
      console.debug("getPreview: START messageKey - " + msgHdr.messageKey);

    // For IMAP, not allowing download throws in MsgHdrToMimeMessage, and if
    // not signed in can't get the message. Show the appropriate tooltip
    // for preview unavailable.
    if (msgHdr.folder.server.type == "imap") {
      if (this.imapNoAccess(msgHdr)) {
        let preview = this.previewNoAccess;
        this.setInfo(msgHdr, "messagePreview", preview);
        this.gettingPreview = false;

        this.DEBUG &&
          console.debug("getPreview: IMAP no access, preview - " + preview);
        return preview;
      }

      // If we have imap access, clear out the old tooltip for when we may not
      // have had access, if it is cached.
      if (this.getInfo(msgHdr, "messagePreview") == this.previewNoAccess) {
        this.delInfo(msgHdr, "messagePreview");
      }
      this.DEBUG &&
        console.debug(
          "getPreview: IMAP OK, preview - " +
            this.getInfo(msgHdr, "messagePreview")
        );
    }

    let hasPreview = this.hasPreview(msgHdr);
    this.DEBUG &&
      console.debug(
        "getPreview: hasPreview:messageKey - " +
          hasPreview +
          ":" +
          msgHdr.messageKey
      );

    // Return the already cached preview.
    if (hasPreview) {
      return this.getInfo(msgHdr, "messagePreview");
    }

    this.DEBUG && console.debug("getPreview: no preview, CONTINUE ");

    // If neither option to display the preview is enabled, don't get it if it
    // isn't already cached.
    if (!this.previewTooltipEnabledPref && !this.previewTextEnabledPref) {
      return null;
    }

    if (this.getInfo(msgHdr, "gettingPreview") !== undefined) {
      return null;
    }
    this.setInfo(msgHdr, "gettingPreview", row);
    this.invalidateCell(row, this.TreeColumn, "getPreview");
    this.DEBUG &&
      console.debug(
        "getPreview: preview, row:previewRow - " + row + ":" + this.previewRow
      );

    if (msgHdr.folder.server.type == "nntp") {
      this.DEBUG && console.debug("getPreview: NNTP message ");
      this.preview(msgHdr);
    } else if (0) {
      this.preview(msgHdr);
    } else {
      // Get the mime body parts.
      // XXX: MsgHdrToMimeMessage used to be crap.  Thanks to protz for
      // fixing the api.  However, it still chokes on nntp.
      MsgHdrToMimeMessage(
        msgHdr,
        null,
        this.mimeMsgCallback.bind(this),
        this.imapAllowDownloadPref,
        {
          saneBodySize: this.imapSaneBodySize,
          partsOnDemand: this.imapPartsOnDemand,
          examineEncryptedParts: this.encryptedParts,
        }
      );
    }

    // Wait for the async call to finish; return null values.
    return null;
  },

  getInfo(msgHdr, info) {
    // No msgHdr.
    if (!(msgHdr instanceof Ci.nsIMsgDBHdr)) {
      return undefined;
    }
    let msgKey = msgHdr.messageKey;
    let folderKey = msgHdr.folder.URI;
    if (
      !this._cache ||
      !(folderKey in this._cache) ||
      !(msgKey in this._cache[folderKey]) ||
      !(info in this._cache[folderKey][msgKey])
    ) {
      return undefined;
    }
    return this._cache[folderKey][msgKey][info];
  },
  setInfo(msgHdr, info, val) {
    let msgKey = msgHdr.messageKey;
    let folderKey = msgHdr.folder.URI;
    if (!this._cache) {
      this._cache = {};
    }
    if (!(folderKey in this._cache)) {
      this._cache[folderKey] = {};
    }
    if (!(msgKey in this._cache[folderKey])) {
      this._cache[folderKey][msgKey] = {};
    }
    this._cache[folderKey][msgKey][info] = val;
  },
  delInfo(msgHdr, info) {
    let msgKey = msgHdr.messageKey;
    let folderKey = msgHdr.folder.URI;
    if (
      !this._cache ||
      !(folderKey in this._cache) ||
      !(msgKey in this._cache[folderKey])
    ) {
      return;
    }
    delete this._cache[folderKey][msgKey][info];
  },

  // Preview.
  _cache: {},
  previewRow: -1,
  gettingPreview: false,

  /*
   * @param {String} url - The url.
   */
  urlHasCredentials(url) {
    let uri = makeURI(url);
    return Boolean(uri.username || uri.userPass);
  },

  /*
   * @param {nsIMsgHdr} msgHdr          - The msgHdr.
   * @returns {String} preview          - The formatted preview string.
   */
  createPreviewHeader(msgHdr) {
    let preview = "";
    return preview;
  },

  /*
   * @param {nsIMsgHdr} msgHdr          - The msgHdr.
   * @param {String} content            - The raw message content.
   * @returns {String} preview          - The formatted preview string.
   */
  createPreview(msgHdr, content) {
    let preview = content.trim() || " "; //this.previewTitle + "\n\n";
    preview = preview.substr(0, this.previewTooltipMaxSizePref) + "\n";
    return preview;
  },

  /*
   * This is the imap://, mailbox://, news:// url for network requests.
   */
  getMsgUrlFromMsgHdr(msgHdr) {
    // No msgHdr.
    if (!(msgHdr instanceof Ci.nsIMsgDBHdr)) {
      return null;
    }
    let msgUri = msgHdr.folder.getUriForMsg(msgHdr);
    let msgService = messenger.messageServiceFromURI(msgUri);
    let urlObj = {};
    msgService.GetUrlForUri(msgUri, urlObj, null);
    let msgUrl = urlObj.value.spec;
    this.DEBUG && console.debug("getMsgUrlFromMsgHdr: msgUrl - " + msgUrl);
    return msgUrl;
  },

  refreshView(msgHdr, preview, who) {
    this.DEBUG &&
      console.debug(
        "refreshView: messageKey:who - " + msgHdr.messageKey + ":" + who
      );
    this.setTooltip(preview);
    this.gettingPreview = false;
    this.DEBUG &&
      console.dir(this._cache[msgHdr.folder.URI][msgHdr.messageKey]);

    let row = this.getInfo(msgHdr, "gettingPreview");
    this.DEBUG &&
      console.debug(
        "refreshView: row:messageKey:who - " +
          row +
          ":" +
          msgHdr.messageKey +
          ":" +
          who
      );

    if (this.hasPreview(msgHdr)) {
      this.delInfo(msgHdr, "error");
    }
    if (this.hasError(msgHdr)) {
      this.delInfo(msgHdr, "messagePreview");
    }
    if (this.hasPreview(msgHdr) || this.hasError(msgHdr)) {
      this.delInfo(msgHdr, "gettingPreview");
    }
    this.invalidateCell(row, this.TreeColumn, who);
  },

  async preview(msgHdr) {
    this.DEBUG &&
      console.debug(
        "preview: START messageKey:Subject - " +
          msgHdr.messageKey +
          ":" +
          msgHdr.mime2DecodedSubject
      );
    let preview;
    let hasPreview = this.hasPreview(msgHdr);
    if (hasPreview) {
      this.DEBUG &&
        console.debug(
          "preview: EXISTS, messageKey:preview - " +
            msgHdr.messageKey +
            "\n" +
            preview
        );
      preview = this.getInfo(msgHdr, "messagePreview");
      this.refreshView(msgHdr, preview, "preview:exists");
      return;
    }

    let msgUrl = this.getMsgUrlFromMsgHdr(msgHdr);

    if (!msgUrl) {
      preview = this.previewTitleNA + "\n\n";
      this.setInfo(msgHdr, "messagePreview", preview);
      this.refreshView(msgHdr, preview, "preview:single info");
      return;
    }

    // NOTE: For internal mailbox://, imap://, news:// urls  get the content
    // with getReader().read(). For urls with credentials (username, userPass)
    // such as imap, use a different method, as Request fails such urls with a
    // MSG_URL_HAS_CREDENTIALS error.
    if (this.urlHasCredentials(msgUrl) || msgHdr.folder.server.type == "nntp") {
      this.DEBUG &&
        console.debug("preview: msgUrl has credentials - " + msgUrl);
      this._asyncFetch(msgHdr, msgUrl);
      return;
    }

    await this._fetch(msgHdr, msgUrl);
  },

  /*
   * Use fetch() api to read an attachment part, if it has no credentials.
   *
   * @param {nsIMsgHdr} msgHdr              - The msgHdr.
   * @param {String} msgUrl                 - The url.
   */
  async _fetch(msgHdr, msgUrl) {
    let options = { method: "GET" };
    let request = new Request(msgUrl, options);
    let preview;
    let errorMessage;

    await fetch(request)
      .then(response => {
        if (!response.ok) {
          errorMessage = response.statusText + ", url - " + response.url;
          this.DEBUG &&
            console.warn("_fetch: fetch response error - " + errorMessage);
          return null;
        }
        this.DEBUG && console.dir(response);
        return response;
      })
      .then(async response => {
        if (!response) {
          return;
        }
        this.DEBUG && console.dir(response);
        // The below reads a stream. The first chunk is more than enough for
        // a preview, so don't bother draining the stream, just cancel it.
        let reader = response.body.getReader();
        let decoder = new TextDecoder("utf-8");
        // let { value: chunk, done: readerDone } = await reader.read();
        let content = ""; // decoder.decode(chunk);
        while (true) {
          //reader.cancel();
          let { value: chunk, done: readerDone } = await reader.read();
          content += decoder.decode(chunk);
          this.DEBUG && console.debug("_fetch: readerDone - " + readerDone);
          if (readerDone) {
            break;
          }
        }
        this.DEBUG && console.debug("_fetch: content - " + content);
        let size = content ? content.length : 0;
        this.DEBUG &&
          console.debug(
            "preview: FETCH, done:Content-Type:Content-Length:size - " +
              //done +
              //":" + // add done to .read() return obj.
              response.headers.get("Content-Type") +
              ":" +
              response.headers.get("Content-Length") +
              ":" +
              size
          );

        // Create the preview.
        let [headers, body] = MimeParser.extractHeadersAndBody(content);
        this.DEBUG &&
          console.debug(
            "_fetch: headers - " + msgHdr.messageKey + ":" + headers
          );
        this.DEBUG && console.dir(headers);
        this.DEBUG && console.debug("_fetch: body - " + body);
        //preview = ""; //this.previewTitle + "\n\n";
        preview = this.createPreview(msgHdr, body);
        //preview = preview + this.previewSeparator + "\n";
        this.DEBUG && console.debug("preview: FETCH, preview - \n" + preview);
        this.setInfo(msgHdr, "messagePreview", preview);
        this.refreshView(msgHdr, preview, "_fetch:success");
      })
      .catch(error => {
        errorMessage = error.message;
        console.warn("_fetch: error - ", errorMessage);
      });

    if (errorMessage) {
      preview = this.previewError(errorMessage);
      this.setInfo(msgHdr, "error", preview);
      this.refreshView(msgHdr, preview, "_fetch:error");
    }
  },

  /*
   * Use xpcom api to read an attachment part, if it has credentials.
   * TODO: maybe one day mailnews urls will be fixed to not have creds and we
   * can use fetch().
   *
   * @param {nsIMsgHdr} msgHdr              - The msgHdr.
   * @param {String} msgUrl                 - The url.
   */
  _asyncFetch(msgHdr, msgUrl) {
    let channel = NetUtil.newChannel({
      uri: msgUrl,
      loadingPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
      securityFlags: Ci.nsILoadInfo.SEC_REQUIRE_SAME_ORIGIN_DATA_INHERITS,
      contentPolicyType: Ci.nsIContentPolicy.TYPE_OTHER,
    });

    NetUtil.asyncFetch(channel, (inputStream, resultCode) => {
      let preview;
      let errorMessage;
      if (Components.isSuccessCode(resultCode)) {
        try {
          let content = NetUtil.readInputStreamToString(
            inputStream,
            inputStream.available(),
            {
              charset: "utf-8",
              replacement:
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER,
            }
          );

          // Create the preview.
          let [headers, body] = MimeParser.extractHeadersAndBody(content);
          this.DEBUG &&
            console.debug(
              "_asyncFetch: headers - " + msgHdr.messageKey + ":" + headers
            );
          this.DEBUG && console.dir(headers);
          this.DEBUG && console.debug("_asyncFetch: body - " + body);
          preview = this.createPreview(msgHdr, body);
          this.setInfo(msgHdr, "messagePreview", preview);
          this.refreshView(msgHdr, preview, "_asyncFetch:success");
        } catch (ex) {
          errorMessage = ex.message;
          console.warn("_asyncFetch: error - " + msgHdr.messageKey, ex);
        }
      } else {
        errorMessage = resultCode;
      }

      if (errorMessage) {
        preview = this.previewError(errorMessage);
        this.setInfo(msgHdr, "error", preview);
        this.refreshView(msgHdr, preview, "_asyncFetch:error");
      }
    });
  },

  async mimeMsgCallback(msgHdr, mimeMsg) {
    this.DEBUG &&
      console.debug(
        "mimeMsgCallback: START messageKey:Subject - " +
          msgHdr.messageKey +
          ":" +
          msgHdr.mime2DecodedSubject
      );
    let count = { c: 0, m: 0, b: 0, a: 0, u: 0 };

    if (mimeMsg == null) {
      this.DEBUG && console.debug("mimeMsgCallback: mimeMsg is null ");
      // Couldn't get a mime message. Always true for nntp.
      let preview;
      if (msgHdr.folder.server.type == "nntp") {
        preview = this.previewNNTP;
      } else {
        preview = this.previewNoMimeMsg;
      }

      preview = this.createPreview(msgHdr, preview);
      this.setInfo(msgHdr, "messagePreview", preview);
      this.refreshView(msgHdr, preview, "mimeMsgCallback: null mimeMsg");
      return;
    }

    this.DEBUG &&
      console.debug("mimeMsgCallback: mimeMsg: " + mimeMsg.prettyString());
    this.TRACE &&
      console.debug("mimeMsgCallback: mimeMsg: " + mimeMsg.toSource());

    // Implement recursive parser ourselves..
    let content = "";
    let errorCannotDecrypt = false;
    let counter = parts => {
      for (let part of parts) {
        this.DEBUG && console.debug("counter: part - " + part.toSource());
        if (part instanceof MimeContainer) {
          count.c++;
          this.DEBUG &&
            console.debug(
              "mimeMsgCallback.counter: MimeContainer " +
                "partName:count:contentType:name - " +
                part.partName +
                " : " +
                count.c +
                " : " +
                part.contentType +
                " : " +
                part.name +
                "\n" +
                part.body
            );
        }

        if (part instanceof MimeMessage) {
          count.m++;
          this.DEBUG &&
            console.debug(
              "mimeMsgCallback.counter: MimeMessage " +
                "partName:count:contentType:name - " +
                part.partName +
                " : " +
                count.m +
                " : " +
                part.contentType +
                " : " +
                part.name +
                "\n" +
                part.body
            );
        }

        if (part instanceof MimeBody) {
          count.b++;
          this.DEBUG &&
            console.debug(
              "mimeMsgCallback.counter: MimeBody " +
                "partName:count:contentType:name - " +
                part.partName +
                " : " +
                count.b +
                " : " +
                part.contentType +
                " : " +
                part.name +
                "\n" +
                part.body
            );

          if (part.contentType == "text/plain" && !content) {
            content = part.body;
          } else if (part.contentType == "text/html" && !content) {
            this.DEBUG &&
              console.debug(
                "mimeMsgCallback.counter: MimeBody body - " + part.body
              );
            // TODO: this will include alt attribute text in <img> tags, which
            // doesn't seem optimal.
            content = part.coerceBodyToPlaintext(msgHdr.folder);

            this.DEBUG &&
              console.debug(
                "mimeMsgCallback.counter: MimeBody content - " + content
              );
          }
        }

        if (part instanceof MimeMessageAttachment) {
          count.a++;
          this.DEBUG &&
            console.debug(
              "mimeMsgCallback.counter: MimeMessageAttachment " +
                "partName:count:contentType:name - " +
                part.partName +
                " : " +
                count.a +
                " : " +
                part.contentType +
                " : " +
                part.name +
                "\n" +
                part.url
            );
        }

        if (part instanceof MimeUnknown) {
          count.u++;
          this.DEBUG &&
            console.debug(
              "mimeMsgCallback.counter: MimeUnknown " +
                "part headers.content-type: " +
                part.headers["content-type"][0]
            );
          this.DEBUG &&
            console.debug(
              "mimeMsgCallback.counter: MimeUnknown " +
                "partName:count:contentType:name - " +
                part.partName +
                " : " +
                count.u +
                " : " +
                part.contentType +
                " : " +
                part.name +
                "\n" +
                part.body
            );

          if (part.contentType == "application/pkcs7-mime") {
            errorCannotDecrypt = true;
          }
        }

        if (!content && part.parts) {
          counter(part.parts);
        }
      } // for
    }; // counter()

    counter(mimeMsg.parts);
    if (count.b < 1) {
      // We didn't find a body. Handle some errors cases.
      if (errorCannotDecrypt) {
        content = this.previewCannotDecrypt;
      }
    }
    let preview = this.createPreview(msgHdr, content);
    this.setInfo(msgHdr, "messagePreview", preview);
    this.refreshView(msgHdr, this.getInfo(msgHdr, "messagePreview"), "mimemsg");

    this.DEBUG &&
      console.debug(
        "mimeMsgCallback: DONE: messageKey:preview - " +
          msgHdr.messageKey +
          ":" +
          preview
      );
  },
}; // MessagePreview

MessagePreview.DEBUG &&
  console.debug(
    "MessagePreview: readystate:session_restored - " +
      window.document.readyState +
      ":" +
      SessionStoreManager._restored
  );

(async function() {
  if (!["interactive", "complete"].includes(window.document.readyState)) {
    await new Promise(resolve =>
      window.addEventListener("load", resolve, { once: true })
    );
  }

  MessagePreview.onLoad();
})();
