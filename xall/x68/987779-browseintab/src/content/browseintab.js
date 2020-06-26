"use strict";

ChromeUtils.import("resource://gre/modules/Services.jsm");

/* globals AppConstants, CopyWebsiteAddress, goDoCommand, gContextMenu,
 *         hRefForClickEvent, makeURI, MozXULElement, MsgHdrToMimeMessage,
 *         nsContextMenu, openLinkExternally, openTab, Services, specialTabs,
 *         urlSecurityCheck */

if (typeof BrowseInTab == "object") {
  BrowseInTab.onUnload();
}

var BrowseInTab = {
  e(element) {
    return document.getElementById(element);
  },

  get addonName() {
    return "BrowseInTab";
  },

  get addonId() {
    return "browseintab@mozdev.org";
  },

  async getResourceURI(relPath) {
    let addonInfo = await AddonManager.getAddonByID(this.addonId);
    return addonInfo.getResourceURI().spec + relPath;
  },

  get obsTopicLocaleMessages() {
    return `extension:${this.addonId}:locale-messages`;
  },

  get obsTopicStorageLocal() {
    return `extension:${this.addonId}:storage-local`;
  },

  get obsNotificationReadyTopic() {
    return `extension:${this.addonId}:ready`;
  },

  /*
   * Preferences.
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

  get maxContentTabsPref() {
    let prefKey = "maxContentTabs";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = specialTabs.contentTabType.modes.contentTab.maxTabs;
    if (prefValue == undefined) {
      return defaultValue;
    }
    specialTabs.contentTabType.modes.contentTab.maxTabs = prefValue;
    return prefValue;
  },

  get loadInBackgroundPref() {
    let prefKey = "tabsLoadInBackground";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = Services.prefs.getBoolPref("mail.tabs.loadInBackground");
    if (prefValue == undefined) {
      return defaultValue;
    }
    Services.prefs.setBoolPref("mail.tabs.loadInBackground", prefValue);
    return prefValue;
  },

  get linkClickLoadsInTabPref() {
    let prefKey = "linkClickLoadsInTab";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = false;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  get linkClickLoadsInBackgroundTabPref() {
    let prefKey = "linkClickLoadsInBackgroundTab";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = false;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  get forceLinkClickLoadsInCurrentTabPref() {
    let prefKey = "forceLinkClickLoadsInCurrentTab";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = true;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  get showContentBasePref() {
    let prefKey = "showContentBase";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = true;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  get contentBaseHeaderPref() {
    let prefKey = "contentBaseHeader";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = this.getLocaleMessage("contentBaseHeader");
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },
  get useFirefoxCompatUserAgentPref() {
    let prefKey = "useFirefoxCompatUserAgent";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = false;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
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

  getLocaleMessage(key) {
    return this.localeMessagesMap.get(key.toLowerCase()) || "";
  },

  onLoad() {
    Services.obs.addObserver(this.Observer, this.obsTopicLocaleMessages);
    Services.obs.addObserver(this.Observer, this.obsTopicStorageLocal);
    Services.obs.notifyObservers(null, this.obsNotificationReadyTopic);
    Services.ww.registerNotification(this.Observer);

    let tabmail = this.e("tabmail");
    if (tabmail) {
      tabmail.registerTabMonitor(this.TabMonitor);
    }

    this.e("messagepane").addEventListener(
      "click",
      event => this.contentAreaClick(event),
      { capture: true }
    );

    AddonManager.addAddonListener(this.AddonListener);

    // console.debug("onLoad: observers added ");

    /* Override Tb native functions *******************************************/
    if ("openLinkExternally" in window) {
      this._openLinkExternally = openLinkExternally;
      // eslint-disable-next-line no-global-assign
      openLinkExternally = (url, event) => {
        this.openLinkExternally(url, event);
      };
    }

    this.InitializeTabs();
  },

  onUnload() {
    // console.debug("onUnload: --> BrowseInTab ");
    this.RemoveObservers();
    this.RestoreOverlayElements();
    this.RestoreOverrideFunctions();
    this.RemoveStyles();
    this.RestoreTabs();

    // console.debug("onUnload: --> BrowseInTab DONE");
  },

  InitializeOverlayElements() {
    // console.debug("InitializeOverlayElements: ");

    // Add the stylesheets.
    this.InitializeStyleSheet(
      window.document,
      "skin/browseintab.css",
      this.addonName,
      false
    );

    // Keys.
    let modifier = AppConstants.platform == "macosx" ? "accel" : "alt";
    this.e("mailKeys").appendChild(
      MozXULElement.parseXULToFragment(`
      <key id="goBackKb_BiT" extension="${this.addonId}"
           keycode="VK_LEFT"
           modifiers="${modifier}"
           oncommand="BrowseInTab.BrowserController.doCommand('Browser:Back_BiT')"/>
      <key id="goForwardKb_BiT" extension="${this.addonId}"
           keycode="VK_RIGHT"
           modifiers="${modifier}"
           oncommand="BrowseInTab.BrowserController.doCommand('Browser:Forward_BiT')"/>
      `)
    );

    // Context menu. Menuitems for links and back/forward.
    /* eslint-disable */
    this.e("mailContext").insertBefore(
      MozXULElement.parseXULToFragment(`
      <menuitem id="mailContext-openLinkInContentTab" extension="${this.addonId}"
                label="${this.getLocaleMessage("openLinkInContentTabLabel")}"
                accesskey="${this.getLocaleMessage("openLinkInContentTabAccesskey")}"
                oncommand="BrowseInTab.openLinkInContentTab(event, 'tab');"/>
      `),
      this.e("mailContext-sep-open-browser")
    );
    this.e("mailContext").insertBefore(
      MozXULElement.parseXULToFragment(`
      <menuitem id="context-back_BiT" extension="${this.addonId}"
                class="menuitem-iconic"
                label="&goBackCmd.label;"
                oncommand="BrowseInTab.BrowserController.doCommand('Browser:Back_BiT')"/>
      <menuitem id="context-forward_BiT" extension="${this.addonId}"
                class="menuitem-iconic"
                label="&goForwardCmd.label;"
                oncommand="BrowseInTab.BrowserController.doCommand('Browser:Forward_BiT')"/>
      `, ["chrome://messenger/locale/messenger.dtd"]
      ),
      this.e("mailContext-reload")
    );
    /* eslint-enable */

    this.e("mailContext").addEventListener(
      "popupshowing",
      this.onMailContextPopupShowing
    );

    // Context menu for link popups.
    /* eslint-disable */
    let popupFragment = `
      <menuitem class="urlpopup" extension="${this.addonId}"
                label="&openLinkInBrowser.label;"
                accesskey="&openLinkInBrowser.accesskey;"
                oncommand="BrowseInTab.openUrlPopupLink(event, 'browser');"/>
      <menuitem class="urlpopup" extension="${this.addonId}"
                label="${this.getLocaleMessage("openLinkInContentTabLabel")}"
                accesskey="${this.getLocaleMessage("openLinkInContentTabAccesskey")}"
                oncommand="BrowseInTab.openUrlPopupLink(event, 'tab');"/>
      <menuitem class="urlpopup" extension="${this.addonId}"
                label="&copyLinkCmd.label;"
                accesskey="&copyLinkCmd.accesskey;"
                oncommand="BrowseInTab.copyLinkLocation(document.popupNode)"/>
      `;
    /* eslint-enable */

    // Context menu for copyUrlPopup. Menuitems for <mail-urlfield> link.
    let copyUrlPopup = this.e("copyUrlPopup");
    copyUrlPopup.setAttribute("linknode", true);
    copyUrlPopup.insertBefore(
      MozXULElement.parseXULToFragment(popupFragment, [
        "chrome://messenger/locale/messenger.dtd",
      ]),
      copyUrlPopup.lastElementChild
    );
    // Add a link context menu to the "urlbar" of each tab.
    document.querySelectorAll(".contentTabUrlbar").forEach(element => {
      element.setAttribute("context", "copyUrlPopup");
    });

    // Context menu for about pages links.
    let aboutPagesPopup = this.e("aboutPagesContext");
    aboutPagesPopup.insertBefore(
      MozXULElement.parseXULToFragment(popupFragment, [
        "chrome://messenger/locale/messenger.dtd",
      ]),
      aboutPagesPopup.firstElementChild
    );
    aboutPagesPopup.addEventListener("popupshowing", this.onLinkPopupShowing);
  },

  /*
   * Inject a stylesheet, either chrome file or addon relative file.
   *
   * @param {Document} doc            - Document for the css injection.
   * @param {String} styleSheetSource - Resource or relative file name.
   * @param {String} styleName        - Name for DOM title.
   * @param {Boolean} isChrome        - Is this a chrome url.
   */
  async InitializeStyleSheet(doc, styleSheetSource, styleName, isChrome) {
    // For 68.
    if (parseInt(AppConstants.MOZ_APP_VERSION) < 70) {
      let styleSheet = document.styleSheets[0];
      for (let rule of this.cssRules) {
        styleSheet.insertRule(rule, styleSheet.rules.length);
      }
      return;
    }

    let href;
    if (isChrome) {
      href = styleSheetSource;
    } else {
      href = await this.getResourceURI(styleSheetSource);
    }

    // console.debug("InitializeStyleSheet: styleSheet - " + styleSheetSource);
    // console.debug("InitializeStyleSheet: href - " + href);
    let link = doc.createElement("link");
    link.setAttribute("id", this.addonId);
    link.setAttribute("title", styleName);
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.setAttribute("href", href);
    doc.documentElement.appendChild(link);
    link.sheet.disabled = false;
  },

  cssRules: [
    `
      #copyUrlPopup[linknode] > menuitem.urlpopup,
      #aboutPagesContext[linknode] > menuitem.urlpopup {
        display: block;
      }
    `,
    `
      #copyUrlPopup > menuitem.urlpopup,
      #aboutPagesContext > menuitem.urlpopup,
      #copyUrlPopup[linknode] > menuitem:not(.urlpopup),
      #aboutPagesContext[linknode] > menuitem:not(.urlpopup) {
        display: none;
      }
    `,
  ],

  RemoveObservers() {
    for (let observer of Services.obs.enumerateObservers(
      this.obsTopicStorageLocal
    )) {
      Services.obs.removeObserver(observer, this.obsTopicStorageLocal);
    }

    Services.ww.unregisterNotification(this.Observer);

    let tabmail = this.e("tabmail");
    if (tabmail) {
      tabmail.unregisterTabMonitor(this.TabMonitor);
    }

    this.e("mailContext").removeEventListener(
      "popupshowing",
      this.onMailContextPopupShowing
    );
    this.e("copyUrlPopup").removeAttribute("linknode");
    this.e("aboutPagesContext").removeAttribute("linknode");
    this.e("aboutPagesContext").removeEventListener(
      "popupshowing",
      this.onLinkPopupShowing
    );

    AddonManager.removeAddonListener(this.AddonListener);
  },

  RestoreOverlayElements() {
    // console.debug("RestoreOverlayElements: ");
    let nodes = document.querySelectorAll(`[extension="${this.addonId}"]`);
    for (let node of nodes) {
      node.remove();
    }

    document.querySelectorAll(".contentTabUrlbar").forEach(element => {
      element.removeAttribute("context");
    });
  },

  RestoreOverrideFunctions() {
    // eslint-disable-next-line no-global-assign
    openLinkExternally = BrowseInTab._openLinkExternally;
  },

  RemoveStyles() {
    let styleSheet = document.querySelector(`link[id="${this.addonId}"]`);
    if (styleSheet) {
      styleSheet.remove();
    }
  },

  InitializeTabs() {
    let tabmail = document.getElementById("tabmail");
    if (!tabmail) {
      return;
    }
    let tabsInfo = tabmail.tabInfo;
    for (let tabInfo of tabsInfo) {
      this.InitializeTab(tabInfo);
    }
  },

  /**
   * Ensure our siteClickHandler is added to the tab.
   *
   * @param {TabInfo} tabInfo - the tabInfo for the tab.
   */
  InitializeTab(tabInfo) {
    // Excluded tab types:
    // - preferencesTab: xul text-link nodes use MailGlue._handleLink().
    if (!["contentTab"].includes(tabInfo.mode.type)) {
      return;
    }
    if (
      tabInfo.clickHandler &&
      tabInfo.clickHandler.startsWith("BrowseInTab.")
    ) {
      return;
    }
    tabInfo.clickHandler = "BrowseInTab.siteClickHandler(event)";
    tabInfo.browser.setAttribute("onclick", tabInfo.clickHandler);
  },

  RestoreTabs() {
    let tabsInfo = document.getElementById("tabmail").tabInfo;
    for (let tabInfo of tabsInfo) {
      if (!["contentTab"].includes(tabInfo.mode.type)) {
        continue;
      }
      if (
        tabInfo.clickHandler &&
        !tabInfo.clickHandler.startsWith("BrowseInTab.")
      ) {
        continue;
      }
      tabInfo.clickHandler = "specialTabs.defaultClickHandler(event);";
      tabInfo.browser.setAttribute("onclick", tabInfo.clickHandler);
    }
  },

  composeWindowSetup(window) {
    if (
      !this.showContentBasePref ||
      Services.prefs.getIntPref("mail.show_headers") == 2
    ) {
      // If pref is off or if set to show all headers this isn't necessary.
      return;
    }
    // console.debug("Observer: " + aTopic + ", aSubject - " + aSubject);
    window.addEventListener("load", event => {
      let composeWin = event.target;
      let winType = composeWin.documentElement.getAttribute("windowtype");
      // console.debug("Observer: load winType - " + winType);
      if (winType != "msgcompose") {
        return;
      }

      composeWin.documentElement.addEventListener(
        "compose-window-init",
        () => {
          // console.debug("compose-window-init");
          composeWin.defaultView.gMsgCompose.RegisterStateListener(
            BrowseInTab.ComposeStateListener
          );
        },
        { once: true }
      );
    });
  },

  Observer: {
    observe(aSubject, aTopic, aData) {
      // console.debug("Observer: " + aTopic + ", data - " + aData);
      if (aTopic == BrowseInTab.obsTopicLocaleMessages) {
        // console.debug("Observer: " + aTopic + ", data - " + aData);
        BrowseInTab.localeMessagesMap = new Map(JSON.parse(aData));
        // Initialize now that we have the locale map, only on startup, once.
        BrowseInTab.InitializeOverlayElements();
        Services.obs.removeObserver(
          BrowseInTab.Observer,
          BrowseInTab.obsTopicLocaleMessages
        );
      } else if (aTopic == BrowseInTab.obsTopicStorageLocal) {
        // console.debug("Observer: " + aTopic + ", data - " + aData);
        BrowseInTab.storageLocalMap = new Map(JSON.parse(aData));
        // Initialize these system 'prefs'.
        BrowseInTab.maxContentTabsPref;
        BrowseInTab.loadInBackgroundPref;
      } else if (aTopic == "domwindowopened" && aSubject instanceof Window) {
        BrowseInTab.composeWindowSetup(aSubject);
      }
    },
  },

  TabMonitor: {
    monitorName: "BrowseInTab",
    onTabTitleChanged() {},
    onTabSwitched(tab, oldTab) {},
    onTabOpened(tab, firstTab, oldTab) {
      // console.debug("onTabOpened: title - " + tab.title);
      BrowseInTab.InitializeTab(tab);
    },
  },

  BrowserController: {
    supportsCommand(command) {
      // console.debug("BrowserController.supportsCommand: command - " + command);
      switch (command) {
        case "Browser:Back_BiT":
        case "Browser:Forward_BiT":
          return true;
        default:
          return false;
      }
    },
    isCommandEnabled(command) {
      // console.debug("BrowserController.isCommandEnabled: command - " + command);
      let tabmail = document.getElementById("tabmail");
      let browser = tabmail ? tabmail.getBrowserForSelectedTab() : null;
      if (!browser || !browser.sessionHistory) {
        return false;
      }
      switch (command) {
        case "Browser:Forward_BiT":
          return browser.canGoForward;
        case "Browser:Back_BiT":
          return browser.canGoBack;
        default:
          return false;
      }
    },
    doCommand(command) {
      if (!this.isCommandEnabled(command)) {
        return;
      }
      // console.debug("BrowserController.doCommand: command - " + command);
      let tabmail = document.getElementById("tabmail");
      let browser = tabmail ? tabmail.getBrowserForSelectedTab() : null;
      if (!browser || !browser.sessionHistory) {
        return;
      }
      switch (command) {
        case "Browser:Forward_BiT":
          browser.goForward();
          break;
        case "Browser:Back_BiT":
          browser.goBack();
          break;
      }
    },
    onEvent(event) {},
  },

  /*
   * Listener for compose window state.
   */
  ComposeStateListener: {
    ComposeProcessDone() {},
    SaveInFolderDone() {},
    NotifyComposeFieldsReady() {},
    NotifyComposeBodyReady() {
      // console.debug("NotifyComposeBodyReady: START");
      let composeWin = Services.wm.getMostRecentWindow("msgcompose");
      let composeDoc = composeWin.document;
      let composeView = composeDoc.defaultView;
      if (composeView.gComposeType != Ci.nsIMsgCompType.ForwardInline) {
        return;
      }

      let msgURI = composeView.gOriginalMsgURI;
      let messageService = composeView.gMessenger.messageServiceFromURI(msgURI);
      let msgHdr = messageService.messageURIToMsgHdr(msgURI);

      let selector = "table.moz-email-headers-table > tbody";
      let tbody = composeDoc
        .getElementById("content-frame")
        .contentDocument.querySelector(selector);
      if (!tbody || !tbody.childElementCount) {
        console.warn("NotifyComposeBodyReady: <tbody> not found - " + selector);
        return;
      }
      tbody.childNodes.forEach(tr => {
        tr.cells[0].removeAttribute("valign");
        tr.cells[1].style.wordBreak = "break-word";
      });
      let tr = tbody.firstElementChild.cloneNode(true);
      let label = BrowseInTab.contentBaseHeaderPref;
      // console.dir(tr);

      try {
        // The message's url is stored in the Content-Base header.
        MsgHdrToMimeMessage(
          msgHdr,
          null,
          (aMsgHdr, aMimeMsg) => {
            let contentBase = aMimeMsg && aMimeMsg.headers["content-base"];
            // console.debug(`NotifyComposeBodyReady: 1${label} ${contentBase}`);
            if (contentBase && contentBase[0]) {
              try {
                makeURI(contentBase);
                contentBase = decodeURIComponent(contentBase);
              } catch (ex) {
                // IDN domains will fail; escape them then decode.
                contentBase = decodeURIComponent(escape(contentBase));
              }
              // console.debug(`NotifyComposeBodyReady: 2${label} ${contentBase}`);
              tr.cells[0].textContent = label;
              tr.cells[1].textContent = contentBase;
              tbody.append(tr);
              // console.dir(tbody);
            }
          },
          false,
          { saneBodySize: true }
        );
      } catch (ex) {
        // Error getting header.
        console.warn("NotifyComposeBodyReady: - " + ex);
      }
    },
  },

  /*
   * Listener for addon status changes.
   */
  AddonListener: {
    resetSession(addon, who) {
      if (addon.id != BrowseInTab.addonId) {
        return;
      }
      // console.debug("AddonListener.resetSession: who - " + who);
      BrowseInTab.onUnload();
      console.info(BrowseInTab.getLocaleMessage("extensionBye"));
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
    onEnabling(addon) {},
    onOperationCancelled(addon) {},
  },

  /**
   * Set up the menuitems. The default onpopupshowing function will create
   * gContextMenu global.
   */
  onMailContextPopupShowing(event) {
    if (!gContextMenu) {
      return;
    }
    // Only show mailContext-openLinkInContentTab if we're on a link and
    // it isn't a mailto link.
    gContextMenu.showItem(
      "mailContext-openLinkInContentTab",
      gContextMenu.onLink &&
        !gContextMenu.onMailtoLink &&
        gContextMenu.linkProtocol != "about" &&
        gContextMenu.linkProtocol != "chrome"
    );

    // Work out if we are a context menu on a special item e.g. an image, link.
    let notOnSpecialItem = !(
      gContextMenu.inMessageArea ||
      gContextMenu.isContentSelected ||
      gContextMenu.onCanvas ||
      gContextMenu.onLink ||
      gContextMenu.onImage ||
      gContextMenu.onPlayableMedia ||
      gContextMenu.onTextInput
    );

    // Ensure these commands are updated with their current status.
    if (notOnSpecialItem) {
      gContextMenu.enableItem(
        "context-back_BiT",
        BrowseInTab.BrowserController.isCommandEnabled("Browser:Back_BiT")
      );
      gContextMenu.enableItem(
        "context-forward_BiT",
        BrowseInTab.BrowserController.isCommandEnabled("Browser:Forward_BiT")
      );
    }
    // These only needs showing if we're not on something special.
    gContextMenu.showItem("context-back_BiT", notOnSpecialItem);
    gContextMenu.showItem("context-forward_BiT", notOnSpecialItem);
  },

  onLinkPopupShowing(event) {
    //document.popupNode.click();
    let popupMenu = event.target;
    let contextMenu = new nsContextMenu(popupMenu, event.shiftKey);
    // console.debug("onLinkPopupShowing: contextMenu -> ");
    // console.debug(contextMenu);
    // console.debug(document.popupNode);
    let show = contextMenu.onLink && !contextMenu.onMailtoLink;
    // console.debug("onLinkPopupShowing: show - " + show);
    if (show) {
      popupMenu.setAttribute("linknode", true);
    } else {
      popupMenu.removeAttribute("linknode");
    }
  },

  /*
   * Get the linkNode since openLinkExternally doesn't pass an event currently.
   */
  contentAreaClick(event) {
    let [href] = hRefForClickEvent(event);
    if (!href) {
      return;
    }

    // console.debug("contentAreaClick: href - " + href);
    this.savedContentAreaClickEvent = event;

    if (["mailto:", "nntp:", "news:"].includes(new URL(href).protocol)) {
      let linkNode = event.target;
      // console.dir(linkNode.attributes);
      if (linkNode.hasAttribute("target")) {
        linkNode.setAttribute("_target", linkNode.getAttribute("target"));
        linkNode.removeAttribute("target");
      }
      // console.dir(linkNode.attributes);
    }
    // console.dir(this.savedContentAreaClickEvent);
  },

  /**
   * Copy a link url, either html or xul (eg. for <mail-urlfield>).
   *
   * @param {Element} linkNode   - An html link node or xul element text-link.
   */
  copyLinkLocation(linkNode) {
    if (linkNode instanceof XULElement) {
      CopyWebsiteAddress(linkNode);
    } else {
      goDoCommand("cmd_copyLink");
    }
  },

  /**
   * Open a link in Tb, via copyUrlPopup contextmenu for <mail-urlfield>, or
   *                        aboutPagesContext contexmenu for about: pages.
   *
   * @param {Event} event   - An event.
   * @param {String} where  - 'tab' or 'browser'.
   */
  openUrlPopupLink(event, where) {
    let linkNode = document.popupNode;
    let url;
    if (linkNode instanceof XULElement) {
      url = linkNode.textContent;
    } else {
      url = linkNode.href;
    }
    // console.debug("openLinkInContentTab: url:where - " + url + ":" + where);
    if (!url || event.detail == 2 || event.button == 2) {
      return;
    }

    if (where == "tab") {
      urlSecurityCheck(url, linkNode.ownerDocument.nodePrincipal);

      let bgLoad = this.loadInBackgroundPref;
      if (event.shiftKey) {
        bgLoad = !bgLoad;
      }

      this.openInTab(url, bgLoad, where);
    } else {
      let contextMenu = new nsContextMenu(event.target, event.shiftKey);
      contextMenu.linkURL = url;
      contextMenu.linkURI = contextMenu.getLinkURI();
      contextMenu.openLinkInBrowser();
    }
  },

  /**
   * Open a link in Tb, via contextmenu.
   *
   * @param {Event} event   - An event.
   * @param {String} where  - 'tab' ('window' is unused).
   */
  openLinkInContentTab(event, where) {
    let linkNode = event.target;
    let linkUrl = gContextMenu.linkURI.spec;
    // console.debug("openLinkInContentTab: START url - " + linkUrl);
    if (!linkUrl || event.detail == 2 || event.button == 2) {
      return;
    }

    urlSecurityCheck(linkUrl, linkNode.ownerDocument.nodePrincipal);

    let bgLoad = this.loadInBackgroundPref;
    if (event.shiftKey) {
      bgLoad = !bgLoad;
    }

    where = where == "window" ? "window" : "tab";
    bgLoad = where == "window" ? false : bgLoad;
    this.openInTab(linkUrl, bgLoad, where);
  },

  openLinkExternally(url, event) {
    event = event || this.savedContentAreaClickEvent;
    let linkNode = event && event.target;
    let loadInTab = this.linkClickLoadsInTabPref;

    // console.debug(
    //   "openLinkExternally: loadInTab:url - " + loadInTab + ":" + url
    // );
    urlSecurityCheck(
      url,
      linkNode
        ? linkNode.ownerDocument.nodePrincipal
        : document.documentElement.ownerDocument.nodePrincipal
    );

    if (event && event.ctrlKey) {
      loadInTab = !loadInTab;
    }
    if (!loadInTab) {
      // console.debug("openLinkExternally: about to openExternally ");
      this._openLinkExternally(url);
      this.savedContentAreaClickEvent = null;
      return;
    }
    // console.debug("openLinkExternally: url - " + url);
    let bgLoad = this.linkClickLoadsInBackgroundTabPref;
    if (event && event.shiftKey) {
      bgLoad = !bgLoad;
    }

    // console.debug("openLinkExternally: about to openInTab ");
    this.openInTab(url, bgLoad, "tab");
  },

  openInTab(url, bgLoad, where) {
    // console.debug(
    //   "openInTab: url:bgLoad:where - " + url + ":" + bgLoad + ":" + where
    // );
    // Use the ua compat pref if desired, but only for links, and set it back
    // to whatever is was before.
    let saveCompatModePref = Services.prefs.getBoolPref(
      "general.useragent.compatMode.firefox"
    );
    if (this.useFirefoxCompatUserAgentPref) {
      Services.prefs.setBoolPref("general.useragent.compatMode.firefox", true);
    }
    openTab(
      "contentTab",
      {
        contentPage: url,
        duplicate: true,
        clickHandler: "BrowseInTab.siteClickHandler(event)",
        background: bgLoad,
      },
      where
    );

    Services.prefs.setBoolPref(
      "general.useragent.compatMode.firefox",
      saveCompatModePref
    );
    this.savedContentAreaClickEvent = null;
  },

  /**
   * This handles web content tabs where the linkNode belongs to an html page.
   * System content tabs such as Preferences and Add-ons Manager where the
   * linkNode element is an XUL text-link element are not supported currently.
   */
  siteClickHandler(event) {
    let linkNode = event.target;
    let url = linkNode.href;
    // console.debug("siteClickHandler: linkNode.href - " + url);

    if (linkNode instanceof XULElement) {
      // This is a custom element is="text-link" xul element that is handled by
      // MailGlue._handleLink() -> tabmail.openTab() or (now old 68) special
      // handling in class="text-link" in aboutAddonsExtra.js.
      // console.debug("siteClickHandler: xul linkNode.value - " + linkNode.value);
      return false;
    }

    if (
      !url ||
      !url.startsWith("http") ||
      event.detail == 2 ||
      event.button == 2
    ) {
      return true;
    }

    if (
      linkNode.ownerDocument.URL.startsWith("about:") ||
      linkNode.ownerDocument.URL.startsWith("chrome:")
    ) {
      // console.debug("siteClickHandler: about: or chrome: html linkNode");
      event.preventDefault();
      this.openLinkExternally(url, event);
      return false;
    }

    // console.dir(linkNode.attributes);

    urlSecurityCheck(url, linkNode.ownerDocument.nodePrincipal);

    let forceInCurrentTab = this.forceLinkClickLoadsInCurrentTabPref;
    if (event.ctrlKey || this.savedCtrlKey) {
      forceInCurrentTab = !forceInCurrentTab;
      this.savedCtrlKey = false;
    }

    // console.debug("siteClickHandler: forceInCurrentTab - " + forceInCurrentTab);
    if (forceInCurrentTab) {
      if (linkNode.getAttribute("target") == "_blank") {
        linkNode.setAttribute("_target", linkNode.getAttribute("target"));
        linkNode.removeAttribute("target");
      }
      if (event.ctrlKey) {
        this.savedCtrlKey = true;
        linkNode.click();
      }
    } else {
      event.preventDefault();
      this.openInTab(url, event && event.shiftKey, "tab");
    }
    // console.dir(linkNode.attributes);
    return false;
  },
}; // BrowseInTab

// console.debug("BrowseInTab: readystate - " + window.document.readyState);

(async function() {
  if (!["interactive", "complete"].includes(window.document.readyState)) {
    await new Promise(resolve =>
      window.addEventListener("load", resolve, { once: true })
    );
  }

  BrowseInTab.onLoad();
})();
