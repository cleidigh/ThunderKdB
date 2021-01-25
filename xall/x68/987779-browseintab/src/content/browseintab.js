"use strict";

ChromeUtils.import("resource://gre/modules/Services.jsm");

/* globals AppConstants, BrowserUtils, CopyWebsiteAddress, ExtensionParent,
 *         getBrowser, goDoCommand, gContextMenu, hRefForClickEvent, makeURI,
 *         messagePaneOnResize, MozXULElement, MsgHdrToMimeMessage, NetUtil,
 *         nsContextMenu, openLinkExternally, openTab, PrivateBrowsingUtils,
 *         ReloadMessage, Services, SessionStoreManager, ShortcutUtils,
 *         specialTabs, urlSecurityCheck, XPCOMUtils, ZoomManager */

var BrowseInTab = {
  DEBUG: false,
  TRACE: false,

  e(element) {
    return document.getElementById(element);
  },

  get addonName() {
    return "BrowseInTab";
  },

  get addonId() {
    return "browseintab@mozdev.org";
  },

  get extensionInfo() {
    return ExtensionParent.GlobalManager.getExtension(this.addonId);
  },

  getBaseURL(relPath) {
    return this.extensionInfo.baseURL + relPath;
  },

  getWXAPI(extension, name, sync = false) {
    function implementation(api) {
      let impl = api.getAPI({ extension })[name];

      if (name == "storage") {
        impl.local.get = (...args) =>
          impl.local.callMethodInParentProcess("get", args);
        impl.local.set = (...args) =>
          impl.local.callMethodInParentProcess("set", args);
        impl.local.remove = (...args) =>
          impl.local.callMethodInParentProcess("remove", args);
        impl.local.clear = (...args) =>
          impl.local.callMethodInParentProcess("clear", args);
      }
      return impl;
    }

    if (sync) {
      let api = extension.apiManager.getAPI(name, extension, "addon_parent");
      return implementation(api);
    }
    return extension.apiManager
      .asyncGetAPI(name, extension, "addon_parent")
      .then(api => {
        return implementation(api);
      });
  },

  getMessenger(extension) {
    if (!extension) {
      extension = this.extensionInfo;
    }

    let messenger = {};
    XPCOMUtils.defineLazyGetter(messenger, "i18n", () =>
      this.getWXAPI(extension, "i18n", true)
    );
    XPCOMUtils.defineLazyGetter(messenger, "storage", () =>
      this.getWXAPI(extension, "storage", true)
    );
    return messenger;
  },

  get obsTopicStorageLocalChanged() {
    return `extension:${this.addonId}:storage-local-changed`;
  },

  /*
   * Strings.
   */
  getLocaleMessage(key, substitutions) {
    return this.getMessenger().i18n.getMessage(key, substitutions);
  },

  /*
   * Preferences.
   *
   * Initialize a map from storage.local for sync pref retrieval.
   */
  async InitializeStorageLocalMap() {
    if (this.storageLocalMap) {
      return;
    }
    this.DEBUG && console.debug("InitializeStorageLocalMap: START");
    this.storageLocalMap = new Map();
    const setCurrentPrefs = result => {
      this.DEBUG && console.debug("InitializeStorageLocalMap: result ->");
      this.DEBUG && console.debug(result);
      for (let prefKey of Object.keys(result)) {
        let storageLocalData = {};
        storageLocalData[prefKey] = { newValue: result[prefKey] };
        this.onStorageLocalChanged(storageLocalData);
      }

      this.DEBUG && console.debug("InitializeStorageLocalMap: DONE");
    };
    let onError = error => {
      console.error(`BrowseInTab.InitializeStorageLocalMap: ${error}`);
      console.error(error);
    };

    let getting = this.getMessenger().storage.local.get([
      "lastSelectedTabPanelId",
      "tabsLoadInBackground",
      "linkClickLoadsInTab",
      "linkClickLoadsInBackgroundTab",
      "forceLinkClickLoadsInCurrentTab",
      "showContentBase",
      "contentBaseHeader",
      "useFirefoxCompatUserAgent",
      "maxContentTabs",
      "showMailToolbar",
      "showUrlToolbar",
      "customZoomEnabled",
      "zoomIncrement",
      "chromeZoomFactor",
      "globalZoomEnabled",
      "imageZoomEnabled",
      "mousebuttonZoomEnabled",
      "mousebuttonZoomImageOnlyEnabled",
    ]);
    await getting.then(setCurrentPrefs, onError);
  },

  /*
   * The notification in background.js will only send a true pref change in the
   * storage local database.
   *
   * @param {Object} storageLocalData - The key-value pair that changed; the
   *                                    value contains an |oldValue| property
   *                                    and perhaps a |newValue| property.
   */
  onStorageLocalChanged(storageLocalData) {
    this.DEBUG && console.debug("onStorageLocalChanged:storageLocalData ->");
    this.DEBUG && console.debug(storageLocalData);
    let key = Object.keys(storageLocalData)[0];
    let values = Object.values(storageLocalData)[0];
    if ("newValue" in values) {
      this.storageLocalMap.set(key, values.newValue);
    } else {
      this.storageLocalMap.delete(key);
    }

    let tabmail = this.e("tabmail");

    switch (key) {
      // Set this system 'pref' if changed.
      case "tabsLoadInBackground":
        this.loadInBackgroundPref;
        break;
      // Set this system 'pref' if changed.
      case "maxContentTabs":
        this.maxContentTabsPref;
        break;
      case "showMailToolbar":
        this.setMailToolbar(tabmail.currentTabInfo);
        break;
      case "showUrlToolbar":
        this.setUrlToolbar(tabmail.currentTabInfo);
        break;
      case "customZoomEnabled":
        this.updateZoomValues();
        break;
      case "chromeZoomFactor":
        this.setChromeZoomFontSize(storageLocalData.chromeZoomFactor.newValue);
        break;
      case "globalZoomEnabled":
        if (storageLocalData.globalZoomEnabled.newValue) {
          this.globalZoomFactor = this.tabZoomFactor;
        }
        break;
      default:
        break;
    }
  },

  getStorageLocal(key) {
    return this.storageLocalMap?.get(key);
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

  get DEFAULT_CONTENTTAB_MAXTABS() {
    if (this._DEFAULT_CONTENTTAB_MAXTABS) {
      return this._DEFAULT_CONTENTTAB_MAXTABS;
    }
    return (this._DEFAULT_CONTENTTAB_MAXTABS =
      specialTabs.contentTabType.modes.contentTab.maxTabs);
  },
  get maxContentTabsPref() {
    let prefKey = "maxContentTabs";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = this.DEFAULT_CONTENTTAB_MAXTABS;
    if (prefValue == undefined) {
      return defaultValue;
    }
    specialTabs.contentTabType.modes.contentTab.maxTabs = prefValue;
    return prefValue;
  },

  kShowMailToolbarDefault: 0,
  kShowMailToolbarWebPage: 1,
  kShowMailToolbarAll: 2,
  get showMailToolbarPref() {
    let prefKey = "showMailToolbar";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = this.kShowMailToolbarDefault;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  kShowUrlToolbarWebPage: 0,
  kShowUrlToolbarAll: 1,
  get showUrlToolbarPref() {
    let prefKey = "showUrlToolbar";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = this.kShowUrlToolbarWebPage;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  kCustomZoomEnabledDefault: false,
  get customZoomEnabledPref() {
    let prefKey = "customZoomEnabled";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = this.kCustomZoomEnabledDefault;
    if (prefValue == undefined) {
      return defaultValue;
    }

    return prefValue;
  },

  updateZoomValues() {
    if (this.customZoomEnabledPref) {
      this.setChromeZoomFontSize(this.chromeZoomFactorPref);
    } else {
      // Reset chrome zoom.
      this.setChromeZoomFontSize(100);
    }
  },

  kZoomIncrementDefault: 10,
  get zoomIncrementPref() {
    let prefKey = "zoomIncrement";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = this.kZoomIncrementDefault;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  get chromeZoomFactorPref() {
    let prefKey = "chromeZoomFactor";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = 100;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return prefValue;
  },

  set chromeZoomFactorPref(val) {
    let prefKey = "chromeZoomFactor";
    if (val == 100) {
      this.storageLocalMap.delete(prefKey, val);
    } else {
      this.storageLocalMap.set(prefKey, val);
      let storageLocalData = {};
      storageLocalData[prefKey] = val;
      this.getMessenger().storage.local.set(storageLocalData);
    }
    this.setChromeZoomFontSize(val);
  },

  get DEFAULT_FONTSIZE() {
    if (this._DEFAULT_FONTSIZE) {
      return this._DEFAULT_FONTSIZE;
    }
    // Reset chrome zoom, if changed, for the real default.
    Services.prefs.clearUserPref("layout.css.devPixelsPerPx");
    window.top.document.documentElement.style.fontSize = "";
    return (this._DEFAULT_FONTSIZE = Number(
      window.top
        .getComputedStyle(window.document.documentElement)
        .getPropertyValue("font-size")
        .split("px")[0]
    ));
  },

  setChromeZoomFontSize(val) {
    this.DEBUG &&
      console.debug(
        "setChromeZoomFontSize: val:DEF - " + val + ":" + this.DEFAULT_FONTSIZE
      );
    val = val ? val : 100;
    if (val == 100) {
      for (let win of Services.ww.getWindowEnumerator()) {
        if ("style" in win.top.document.documentElement) {
          this.DEBUG && console.debug(win);
          win.top.document.documentElement.style.fontSize = "";
          win.top.document.documentElement.removeAttribute("browseintabzoom");
        }
      }
      Services.prefs.clearUserPref("layout.css.devPixelsPerPx");
    } else {
      let chromeFontSizeZoom = this.DEFAULT_FONTSIZE * (val / 100) + "px";
      for (let win of Services.ww.getWindowEnumerator()) {
        if ("style" in win.top.document.documentElement) {
          win.top.document.documentElement.style.fontSize = chromeFontSizeZoom;
          // eslint-disable-next-line prettier/prettier
          win.top.document.documentElement.setAttribute("browseintabzoom", true);
        }
      }
      Services.prefs.setStringPref("layout.css.devPixelsPerPx", val / 100);
    }
  },

  get globalZoomEnabledPref() {
    let prefKey = "globalZoomEnabled";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = false;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return this.customZoomEnabledPref && prefValue;
  },

  get imageZoomEnabledPref() {
    let prefKey = "imageZoomEnabled";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = false;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return this.customZoomEnabledPref && prefValue;
  },

  get mousebuttonZoomEnabledPref() {
    let prefKey = "mousebuttonZoomEnabled";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = false;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return this.customZoomEnabledPref && prefValue;
  },

  get mousebuttonZoomImageOnlyEnabledPref() {
    let prefKey = "mousebuttonZoomImageOnlyEnabled";
    let prefValue = this.getStorageLocal(prefKey);
    let defaultValue = false;
    if (prefValue == undefined) {
      return defaultValue;
    }
    return this.mousebuttonZoomEnabledPref && prefValue;
  },

  onLoad() {
    this.DEBUG && console.debug("onLoad: --> START");
    Services.obs.addObserver(this.Observer, "mail-tabs-session-restored");

    Services.obs.addObserver(this.Observer, this.obsTopicStorageLocalChanged);
    Services.ww.registerNotification(this.Observer);

    let tabmail = this.e("tabmail");
    tabmail?.registerTabMonitor(this.TabMonitor);

    this.contentAreaClickFunc = event => this.contentAreaClick(event);
    this.e("messagepane").addEventListener("click", this.contentAreaClickFunc, {
      capture: true,
    });

    this.onWheelFunc = event => this.onWheel(event);
    // eslint-disable-next-line prettier/prettier
    window.addEventListener("wheel", this.onWheelFunc, { capture: true, passive: false });
    this.onClickImageFunc = event => this.onClickImage(event);
    window.addEventListener("click", this.onClickImageFunc, { capture: true });
    window.addEventListener("FullZoomChange", this.onZoomChange);
    window.addEventListener("TextZoomChange", this.onZoomChange);

    AddonManager.addAddonListener(this.AddonListener);

    /* Override Tb native functions *******************************************/
    if ("openLinkExternally" in window) {
      this._openLinkExternally = openLinkExternally;
      // eslint-disable-next-line no-global-assign
      openLinkExternally = (url, event) => {
        this.openLinkExternally(url, event);
      };
    }
    if ("ZoomManager" in window) {
      ZoomManager._enlarge = ZoomManager.enlarge;
      ZoomManager.enlarge = this.enlarge;
      ZoomManager._reduce = ZoomManager.reduce;
      ZoomManager.reduce = this.reduce;

      ZoomManager._scrollZoomEnlarge = ZoomManager.scrollZoomEnlarge;
      this.scrollZoomEnlargeFunc = event => this.scrollZoomEnlarge(event);
      ZoomManager.scrollZoomEnlarge = this.scrollZoomEnlargeFunc;

      ZoomManager._scrollReduceEnlarge = ZoomManager.scrollReduceEnlarge;
      this.scrollReduceEnlargeFunc = event => this.scrollReduceEnlarge(event);
      ZoomManager.scrollReduceEnlarge = this.scrollReduceEnlargeFunc;
    }
    if ("messagePaneOnResize" in window) {
      this._messagePaneOnResize = messagePaneOnResize;
      // eslint-disable-next-line no-global-assign
      messagePaneOnResize = event => {
        this.DEBUG && console.debug("messagePaneOnResize: noop");
      };
    }

    this.CompleteInit();

    this.DEBUG && console.debug("onLoad: --> BrowseInTab DONE");
  },

  onUnload() {
    this.DEBUG && console.debug("onUnload: --> BrowseInTab ");
    this.RemoveObservers();
    this.RestoreOverlayElements();
    this.RestoreOverrideFunctions();
    this.RemoveStyles();
    this.RestoreTabs();

    this.DEBUG && console.debug("onUnload: --> BrowseInTab DONE");
  },

  async CompleteInit() {
    // This really is just the firstTab at this point, pre session restore.
    this.InitializeTabs();

    this.InitializeOverlayElements();
    this.gURLBar.constructr({ textbox: this.e("urlbar") });

    // Initialize the prefs.
    await this.InitializeStorageLocalMap();

    if (SessionStoreManager._restored) {
      BrowseInTab.onMailTabsSessionRestored(true);
    }

    this.DEBUG && console.debug("CompleteInit: --> BrowseInTab");
  },

  /**
   * Run after all tabs have been restored on startup event, or if initializing
   * the extension post startup.
   *
   * @param {Boolean} postStartup - True if already restored post startup, ie
   *                                in case of extension enable or install.
   */
  onMailTabsSessionRestored(postStartup) {
    this.DEBUG && console.debug("onMailTabsSessionRestored: --> BrowseInTab");

    let tabmail = this.e("tabmail");
    let tabInfo = tabmail?.currentTabInfo;
    if (tabInfo.tabNode.selected && this.globalZoomEnabledPref) {
      // Restore the globalZoomFactor in the selected tab.
      this.globalZoomFactor = this.tabZoomFactor;
    }
    this.setMailToolbar(tabInfo);

    // For tab types that don't send a progress event after initialization,
    // update url toolbar now. For postStartup, this is effectively the
    // about:addons page.
    if (
      postStartup ||
      ["folder", "message", "chat", "calendar", "tasks", "chromeTab"].includes(
        tabInfo?.mode.type
      ) ||
      tabInfo?.browser.contentDocument.URL.match(/^about:|^moz-extension:/)
    ) {
      BrowseInTab.setUrlToolbar(tabInfo);

      let uri = tabInfo.browser?.currentURI ?? document.documentURIObject;
      let isInternalOverride = this.isInternalOverride(tabInfo, uri);
      BrowseInTab.gIdentityHandler.updateIdentity(
        tabInfo.securityState,
        uri,
        isInternalOverride
      );
    }
  },

  /*
   * Custom zoom functions.
   */
  enlarge() {
    BrowseInTab.DEBUG && console.debug("enlarge:");
    if (BrowseInTab.customZoomEnabledPref) {
      ZoomManager.zoom += BrowseInTab.zoomIncrementPref / 100;
    } else {
      ZoomManager._enlarge();
    }
  },

  reduce() {
    BrowseInTab.DEBUG && console.debug("reduce:");
    if (BrowseInTab.customZoomEnabledPref) {
      ZoomManager.zoom -= BrowseInTab.zoomIncrementPref / 100;
    } else {
      ZoomManager._reduce();
    }
  },

  scrollZoomEnlarge(event) {
    let browser = event instanceof XULElement ? event : event?.target;
    BrowseInTab.DEBUG &&
      console.debug("scrollZoomEnlarge: browser - " + browser?.id);
    if (!browser) {
      return;
    }
    let zoom = browser.fullZoom;
    if (BrowseInTab.customZoomEnabledPref) {
      zoom += BrowseInTab.zoomIncrementPref / 100;
    } else {
      zoom += 0.1;
    }
    let zoomMax = Services.prefs.getIntPref("zoom.maxPercent") / 100;
    if (zoom > zoomMax) {
      zoom = zoomMax;
    }
    browser.fullZoom = zoom;
  },

  scrollReduceEnlarge(event) {
    let browser = event instanceof XULElement ? event : event?.target;
    BrowseInTab.DEBUG &&
      console.debug("scrollReduceEnlarge: browser - " + browser?.id);
    if (!browser) {
      return;
    }
    let zoom = browser.fullZoom;
    if (BrowseInTab.customZoomEnabledPref) {
      zoom -= BrowseInTab.zoomIncrementPref / 100;
    } else {
      zoom -= 0.1;
    }
    let zoomMin = Services.prefs.getIntPref("zoom.minPercent") / 100;
    if (zoom < zoomMin) {
      zoom = zoomMin;
    }
    browser.fullZoom = zoom;
  },

  get tabZoomFactor() {
    let tabmail = this.e("tabmail");
    return tabmail.currentTabInfo._ext?.BrowseInTab?.zoomFactor ?? 1;
  },

  set tabZoomFactor(val) {
    let tabmail = this.e("tabmail");
    if (!tabmail.currentTabInfo._ext.BrowseInTab) {
      tabmail.currentTabInfo._ext.BrowseInTab = {};
    }
    tabmail.currentTabInfo._ext.BrowseInTab.zoomFactor = val;
  },

  onWheel(event) {
    if (!this.customZoomEnabledPref) {
      return;
    }
    let t = event.target;
    // Allow ctrl and left mouse button down + mousewheel to zoom.
    if (
      !event.ctrlKey &&
      (event.buttons != 1 ||
        (event.buttons == 1 &&
          (!this.mousebuttonZoomEnabledPref ||
            (!(t instanceof HTMLImageElement) &&
              this.mousebuttonZoomImageOnlyEnabledPref))))
    ) {
      return;
    }

    // Hack to prevent mouseup click for openLinkExternally().
    if (event.buttons == 1) {
      this.inMouseWheelZoom = true;
    } else {
      delete this.inMouseWheelZoom;
    }

    if (!(t instanceof HTMLImageElement)) {
      let tabInfo = this.e("tabmail")?.currentTabInfo;
      let browser = tabInfo?.browser;
      // This is for lame chat tab, after user connect creating browser.
      if (tabInfo?.mode.name == "chat" && t instanceof HTMLElement) {
        browser = tabInfo.browser ?? tabInfo?.mode?.tabType.getBrowser(tabInfo);
        if (browser) {
          tabInfo.browser = browser;
        } else {
          return;
        }
      }
      if (!browser) {
        browser = getBrowser();
      }
      BrowseInTab.DEBUG &&
        console.debug("onWheel: browser.id:target -> " + browser?.id);
      BrowseInTab.DEBUG && console.debug(t);

      // Don't zoom "content" if cursor is on chrome.
      if (
        t.ownerGlobal.isChromeWindow &&
        t.ownerGlobal == t.ownerGlobal.window.top
      ) {
        return;
      }
      if (!browser) {
        return;
      }

      event.preventDefault();

      if (event.deltaY > 0) {
        this.scrollReduceEnlarge(browser);
      } else {
        this.scrollZoomEnlarge(browser);
      }

      // Hack to clear false selection with left button down mousewheel.
      let frameElement = t.ownerGlobal.window.frameElement;
      if (frameElement) {
        frameElement.contentDocument.getSelection().removeAllRanges();
      } else {
        browser.contentDocument.getSelection().removeAllRanges();
      }
      return;
    }

    if (!this.imageZoomEnabledPref) {
      return;
    }

    event.preventDefault();

    if (!(t._origClientWidth ?? false)) {
      t._origClientWidth = t.clientWidth;
    }
    if (!(t._origClientHeight ?? false)) {
      t._origClientHeight = t.clientHeight;
    }
    let curZoom = event.target._curZoom ?? 1;
    let zoomIncrement = BrowseInTab.zoomIncrementPref / 100;
    zoomIncrement = event.deltaY > 0 ? -zoomIncrement : zoomIncrement;
    let zoomFactor = Math.round((curZoom + zoomIncrement) * 100) / 100;

    BrowseInTab.DEBUG &&
      console.debug("onWheel: image zoomFactor:img - " + zoomFactor + ":" + t);

    t.style.width = t._origClientWidth * zoomFactor + "px";
    t.style.height = t._origClientHeight * zoomFactor + "px";
    t._curZoom = zoomFactor;
    // When zooming, don't use native shrinktofit and overflowing handling.
    t.removeAttribute("overflowing");
    t.removeAttribute("shrinktofit");
  },

  onClickImage(event) {
    let t = event.target;
    if (
      !this.imageZoomEnabledPref ||
      !(t instanceof HTMLImageElement) ||
      !event.ctrlKey
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    BrowseInTab.DEBUG &&
      console.debug("onClickImage: reset target - " + event.target);
    t.style.width = t.style.height = "";
    delete t._curZoom;
    delete t._origClientWidth;
    delete t._origClientHeight;
    if (
      t.clientWidth - t.ownerDocument.body.offsetWidth >= 0 &&
      (t.clientWidth <= t.naturalWidth || !t.naturalWidth)
    ) {
      t.setAttribute("overflowing", true);
      t.setAttribute("shrinktofit", true);
    }
    //if (t.clientWidth > t.parentNode.clientWidth) {
    //  t.setAttribute("overflowing", "true");
    //  t.setAttribute("shrinktofit", "true");
    //}
  },

  onZoomChange(event) {
    let zoomFactor = ZoomManager.zoom;
    if (BrowseInTab.globalZoomEnabledPref) {
      BrowseInTab.globalZoomFactor = zoomFactor;
    } else {
      BrowseInTab.tabZoomFactor = zoomFactor;
    }
    BrowseInTab.DEBUG &&
      console.debug("onZoomChange: zoomFactor - " + zoomFactor);
    BrowseInTab.updateZoomUI();
  },

  InitializeOverlayElements() {
    this.DEBUG && console.debug("InitializeOverlayElements: ");

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
      <keyset extension="${this.addonId}">
        <key id="keyNewTab_BiT"
             key="${this.getLocaleMessage("newTabKey")}"
             modifiers="accel"
             oncommand="BrowseInTab.openInTab(null, false, 'tab')"/>
        <key id="goBackKb_BiT"
             keycode="VK_LEFT"
             modifiers="${modifier}"
             oncommand="BrowseInTab.BrowserController.doCommand('Browser:Back_BiT')"/>
        <key id="goForwardKb_BiT"
             keycode="VK_RIGHT"
             modifiers="${modifier}"
             oncommand="BrowseInTab.BrowserController.doCommand('Browser:Forward_BiT')"/>
        <key id="key_reload_BiT"
             keycode="VK_F5"
             modifiers="accel"
             oncommand="BrowseInTab.BrowserController.doCommand('Browser:Reload_BiT')"/>
        <key id="key_reload_skip_cache_BiT"
             keycode="VK_F5"
             modifiers="accel,shift"
             oncommand="BrowseInTab.BrowserController.doCommand('Browser:ReloadSkipCache_BiT')"/>
      </keyset>
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

    this.onMailContextPopupShowingFunc = event =>
      this.onMailContextPopupShowing(event);
    this.e("mailContext").addEventListener(
      "popupshowing",
      this.onMailContextPopupShowingFunc
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

    // Context menu for about pages links.
    let aboutPagesPopup = this.e("aboutPagesContext");
    aboutPagesPopup.insertBefore(
      MozXULElement.parseXULToFragment(popupFragment, [
        "chrome://messenger/locale/messenger.dtd",
      ]),
      aboutPagesPopup.firstElementChild
    );
    this.onLinkPopupShowingFunc = event => this.onLinkPopupShowing(event);
    aboutPagesPopup.addEventListener(
      "popupshowing",
      this.onLinkPopupShowingFunc
    );

    // The new tab button - not customizable for now.
    this.e("tabbar-toolbar").insertBefore(
      MozXULElement.parseXULToFragment(`
      <toolbarbutton id="new-tab-button" extension="${this.addonId}"
                     class="toolbarbutton-1 chromeclass-toolbar-additional"
                     label="${this.getLocaleMessage("newTabLabel")}"
                     tooltiptext="${this.getLocaleMessage("newTabTooltip")}"
                     oncommand="BrowseInTab.openInTab(null, false, 'tab')"
                     Xremovable="true"/>
      `),
      this.e("tabbar-toolbar").firstElementChild
    );

    // Add a global urlbar.
    let insertBeforeNode = this.e("tabmail-container");
    /* eslint-disable */
    let key_reloadStr = ShortcutUtils.prettifyShortcut(this.e("key_reload_BiT"));
    let key_fullZoomResetStr = ShortcutUtils.prettifyShortcut(this.e("key_fullZoomReset"));
    let urlToolbox = `
      <vbox id="url-toolbox" extension="${this.addonId}"
            class="contentTabToolbox"
            hidden="true">
        <hbox id="url-toolbar"
              class="contentTabToolbar">
          <toolbarbutton id="back-button"
                         class="toolbarbutton-1"
                         tooltiptext="&browseBackButton.tooltip;"
                         disabled="true"
                         oncommand="BrowseInTab.BrowserController.doCommand('Browser:Back_BiT')"/>
          <toolbarbutton id="forward-button"
                         class="toolbarbutton-1"
                         tooltiptext="&browseForwardButton.tooltip;"
                         disabled="true"
                         oncommand="BrowseInTab.BrowserController.doCommand('Browser:Forward_BiT')"/>

          <toolbaritem id="stop-reload-button"
                       class="chromeclass-toolbar-additional"
                       Xdata-l10n-id="toolbar-button-stop-reload"
                       overflows="false">
            <toolbarbutton id="reload-button"
                           class="toolbarbutton-1"
                           tooltiptext="${this.getLocaleMessage(
                             "reloadCurrentPageOrMessage",
                             [key_reloadStr]
                           )}"
                           oncommand="BrowseInTab.BrowserController.doCommand('Browser:ReloadOrDuplicate_BiT', event)"
                           onclick="BrowseInTab.checkForMiddleClick(this, event);">
            </toolbarbutton>
            <toolbarbutton id="stop-button"
                           class="toolbarbutton-1"
                           tooltiptext="${this.getLocaleMessage("stopLoadingCurrentPageOrMessage")}"
                           oncommand="BrowseInTab.BrowserController.doCommand('Browser:Stop_BiT')">
            </toolbarbutton>
          </toolbaritem>

          <toolbaritem id="urlbar-container"
                       class="chromeclass-location"
                       align="center"
                       flex="1">
            <hbox id="urlbar"
                  hidden="true"
                  align="center"
                  flex="1">
              <hbox id="urlbar-input-container"
                    flex="1">
                <box id="identity-box"
                     align="center">
                  <image id="identity-icon"/>
                  <label id="identity-icon-label"
                         class="plain"
                         crop="center"
                         flex="1"/>
                </box>

                <moz-input-box id="moz-input-box"
                               tooltip="aHTMLTooltip"
                               class="urlbar-input-box"
                               flex="1"
                               role="combobox"
                               aria-owns="urlbar-results">
                  <html:input id="urlbar-scheme"
                              hidden="true"
                              required="required"/>
                  <html:input id="urlbar-input"
                              anonid="input"
                              readonly="true"
                              placeholder="${this.getLocaleMessage("urlbar-placeholder")}"
                              onmousedown="if (event.button == 2) this.select();"/>
                </moz-input-box>
                <image id="urlbar-go-button"
                       class="urlbar-icon"
                       onclick="BrowseInTab.gURLBar.handleCommand(event);"
                       tooltiptext="${this.getLocaleMessage("urlbar-go-button")}"/>

                <hbox id="page-action-buttons" context="pageActionContextMenu">
                  <toolbartabstop/>
                  <image id="reader-mode-button"
                         class="urlbar-icon urlbar-page-action"
                         tooltip="dynamic-shortcut-tooltip"
                         role="button"
                         hidden="true"
                         onclick="AboutReaderParent.buttonClick(event);"/>
                  <toolbarbutton id="urlbar-zoom-button"
                                 hidden="true"
                                 tooltiptext="${this.getLocaleMessage(
                                   "urlbarZoomButtonTooltip",
                                   [key_fullZoomResetStr]
                                 )}"
                                 onclick="ZoomManager.reset();"/>
                </hbox>

              </hbox>
            </hbox>
          </toolbaritem>
        </hbox>
      </vbox>
    `;
    /* eslint-enable */
    insertBeforeNode.parentElement.insertBefore(
      MozXULElement.parseXULToFragment(urlToolbox, [
        "chrome://messenger/locale/messenger.dtd",
      ]),
      insertBeforeNode
    );

    let textboxContextMenu = this.e("moz-input-box").querySelector(
      ".textbox-contextmenu"
    );
    textboxContextMenu.addEventListener("popuphiding", event => {
      document.popupNode.selectionStart = document.popupNode.selectionEnd = 0;
    });

    // Extension toolbarbuttons can only go on mail-bar3, which is not visible
    // by default for content tabs.
    insertBeforeNode.parentElement.insertBefore(
      this.e("mail-toolbox"),
      insertBeforeNode
    );
    this.DEBUG && console.debug("InitializeOverlayElements: DONE");
  },

  /*
   * Inject a stylesheet, either chrome file or addon relative file.
   *
   * @param {Document} doc            - Document for the css injection.
   * @param {String} styleSheetSource - Resource or relative file name.
   * @param {String} styleName        - Name for DOM title.
   * @param {Boolean} isChrome        - Is this a chrome url.
   */
  InitializeStyleSheet(doc, styleSheetSource, styleName, isChrome) {
    this.DEBUG && console.debug("InitializeStyleSheet: ");
    let href;
    if (isChrome) {
      href = styleSheetSource;
    } else {
      href = this.getBaseURL(styleSheetSource);
    }

    this.TRACE &&
      console.debug("InitializeStyleSheet: styleSheet - " + styleSheetSource);
    this.TRACE && console.debug("InitializeStyleSheet: href - " + href);
    let link = doc.createElement("link");
    link.setAttribute("id", this.addonId);
    link.setAttribute("title", styleName);
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.setAttribute("href", href);
    // The |sheet| property is now (post Tb78) added after the sheet loads.
    // We must do this when setting title else another extension using this
    // technique may have its sheet be the |document.selectedStyleSheetSet|.
    link.setAttribute("onload", "this.sheet.disabled=false");
    doc.documentElement.appendChild(link);
    this.DEBUG && console.debug(link.sheet);
  },

  RemoveObservers() {
    for (let observer of Services.obs.enumerateObservers(
      this.obsTopicStorageLocalChanged
    )) {
      Services.obs.removeObserver(observer, this.obsTopicStorageLocalChanged);
    }

    Services.ww.unregisterNotification(this.Observer);

    let tabmail = this.e("tabmail");
    tabmail?.unregisterTabMonitor(this.TabMonitor);

    this.e("messagepane").removeEventListener(
      "click",
      this.contentAreaClickFunc,
      { capture: true }
    );

    this.e("mailContext").removeEventListener(
      "popupshowing",
      this.onMailContextPopupShowingFunc
    );
    this.e("copyUrlPopup").removeAttribute("linknode");
    this.e("aboutPagesContext").removeAttribute("linknode");
    this.e("aboutPagesContext").removeEventListener(
      "popupshowing",
      this.onLinkPopupShowingFunc
    );

    /* eslint-disable */
    window.removeEventListener("wheel", this.onWheelFunc, { capture: true, passive: false });
    window.removeEventListener("click", this.onClickImageFunc, { capture: true });
    /* eslint-enable */
    window.removeEventListener("FullZoomChange", this.onZoomChange);
    window.removeEventListener("TextZoomChange", this.onZoomChange);

    AddonManager.removeAddonListener(this.AddonListener);
    this.DEBUG && console.debug("RemoveObservers: DONE");
  },

  RestoreOverlayElements() {
    let nodes = document.querySelectorAll(`[extension="${this.addonId}"]`);
    for (let node of nodes) {
      node.remove();
    }

    let parent = this.e("mailContent");
    parent.insertBefore(this.e("mail-toolbox"), parent.firstElementChild);
    this.DEBUG && console.debug("RestoreOverlayElements: DONE");
  },

  RestoreOverrideFunctions() {
    // eslint-disable-next-line no-global-assign
    openLinkExternally = this._openLinkExternally;
    if ("ZoomManager" in window) {
      ZoomManager.enlarge = ZoomManager._enlarge;
      ZoomManager.reduce = ZoomManager._reduce;
      ZoomManager.scrollZoomEnlarge = ZoomManager._scrollZoomEnlarge;
      ZoomManager.scrollReduceEnlarge = ZoomManager._scrollReduceEnlarge;
    }
    // eslint-disable-next-line no-global-assign
    messagePaneOnResize = this._messagePaneOnResize;
    this.DEBUG && console.debug("RestoreOverrideFunctions: DONE");
  },

  RemoveStyles() {
    let styleSheet = document.querySelector(`link[id="${this.addonId}"]`);
    if (styleSheet) {
      styleSheet.remove();
    }
    this.DEBUG && console.debug("RemoveStyles: DONE");
  },

  InitializeTabs() {
    this.DEBUG && console.debug("InitializeTabs: ");
    let tabmail = this.e("tabmail");
    let tabsInfo = tabmail?.tabInfo ?? [];
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
    this.InitializeTabForContent(tabInfo);

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

  /**
   * Ensure 3pane folder and message tabs messagepane <browser> is initialized
   * for webpage listeners, like contentTab type.
   *
   * @param {TabInfo} tabInfo - the tabInfo for the tab.
   */
  InitializeTabForContent(tabInfo) {
    let type = tabInfo.mode.type;
    let tabId = tabInfo.tabId;
    this.DEBUG &&
      console.debug(
        "InitializeTabForContent: START tabId:type:title -  " +
          tabId +
          ":" +
          type +
          ":" +
          tabInfo.title
      );

    if (["contentTab"].includes(type)) {
      // Hide the per contentTab "urlbar".
      let contentTabToolbox = tabInfo.panel.querySelector(".contentTabToolbox");
      if (contentTabToolbox) {
        contentTabToolbox.hidden = true;
      }

      if ("progressListener" in tabInfo) {
        let progressListener = Object.assign({}, this.progressListener);
        progressListener.tabInfo = tabInfo;
        tabInfo.progressListener.addProgressListener(progressListener);
      }
      this.DEBUG && console.debug(tabInfo);
      this.DEBUG &&
        console.debug("InitializeTabForContent: DONE, tabId - " + tabId);
      return;
    }

    if (["glodaFacet"].includes(tabInfo.mode.name)) {
      let contentTabToolbox = tabInfo.panel.querySelector(".contentTabToolbox");
      if (contentTabToolbox) {
        contentTabToolbox.hidden =
          this.showMailToolbarPref == this.kShowMailToolbarAll;
      }
      if (tabInfo.browser) {
        tabInfo.browser.focus();
        // So the zoom change event is dispatched. Set zoom on browsingContext
        // manually in updateZoomUI().
        tabInfo.browser.enterResponsiveMode();
      }
      this.DEBUG && console.debug(tabInfo);
      this.DEBUG &&
        console.debug("InitializeTabForContent: DONE, tabId - " + tabId);
      return;
    }

    if (["chromeTab"].includes(type)) {
      if (tabInfo.browser) {
        // So the zoom change event is dispatched. Set zoom on browsingContext
        // manually in updateZoomUI().
        tabInfo.browser.enterResponsiveMode();
      }
    }

    let documentURI =
      tabInfo.browser?.documentURI ?? document.documentURIObject;
    this.DEBUG &&
      console.debug(
        "InitializeTabForContent: browser documentURI - " + documentURI?.spec
      );
    if (tabInfo.firstTab) {
      let multimessagebrowser = this.e("multimessage");
      // So the zoom change event is dispatched. Set zoom on browsingContext
      // manually in updateZoomUI().
      multimessagebrowser.enterResponsiveMode();
    }

    this.DEBUG &&
      console.debug(
        "InitializeTabForContent: progressListenerAdded - " +
          tabInfo.browser?._progressListenerAdded
      );

    // Ensure all tab <browser>s have our progressListener.
    // The <browser id="messagepane"> is shared among tab types
    // |folder, message, glodaList|. Each tab will get an event here, even if
    // it is not the active tab.
    if (tabInfo.browser?.webProgress && !tabInfo.filter) {
      this.DEBUG && console.debug("InitializeTabForContent: !tabInfo.filter");
      tabInfo.filter = Cc[
        "@mozilla.org/appshell/component/browser-status-filter;1"
      ].createInstance(Ci.nsIWebProgress);

      let progressListener = Object.assign({}, this.progressListener);
      progressListener.tabInfo = tabInfo;
      tabInfo.filter.addProgressListener(
        progressListener,
        Ci.nsIWebProgress.NOTIFY_ALL
      );

      tabInfo.browser.webProgress.addProgressListener(
        tabInfo.filter,
        Ci.nsIWebProgress.NOTIFY_ALL
      );

      // Don't forget the multimessage browser, per tab.
      /* */
      let multimessagebrowser = this.e("multimessage");
      if (
        ["folder"].includes(tabInfo.mode.type) &&
        multimessagebrowser?.webProgress
      ) {
        multimessagebrowser.webProgress.addProgressListener(
          tabInfo.filter,
          Ci.nsIWebProgress.NOTIFY_ALL
        );
      }
    }

    this.DEBUG && console.debug(tabInfo);
    this.DEBUG &&
      console.debug("InitializeTabForContent: DONE, tabId - " + tabId);
  },

  RestoreTabs() {
    let tabmail = this.e("tabmail");
    let tabsInfo = tabmail?.tabInfo ?? [];
    for (let tabInfo of tabsInfo) {
      if (!["contentTab"].includes(tabInfo.mode.type)) {
        if (tabInfo.browser?.webProgress && tabInfo.filter) {
          tabInfo.browser.webProgress.removeProgressListener(
            tabInfo.filter,
            Ci.nsIWebProgress.NOTIFY_ALL
          );
          delete tabInfo.browser._progressListenerAdded;
          if (["folder"].includes(tabInfo.mode.type)) {
            let multimessagebrowser = this.e("multimessage");
            multimessagebrowser.webProgress?.removeProgressListener(
              tabInfo.filter,
              Ci.nsIWebProgress.NOTIFY_ALL
            );
          }
          delete tabInfo.filter;
        }

        this.DEBUG && console.debug("RestoreTabs: tabInfo -> " + tabInfo.tabId);
        this.DEBUG && console.debug(tabInfo);
        continue;
      }

      // For contentTab type tabs.
      if ("progressListener" in tabInfo) {
        // Only one can be added, and we did, so we get to null it.
        tabInfo.progressListener.mProgressListener = null;
      }

      if (tabInfo.clickHandler?.startsWith("BrowseInTab.")) {
        tabInfo.clickHandler = "specialTabs.defaultClickHandler(event);";
        tabInfo.browser.setAttribute("onclick", tabInfo.clickHandler);
      }

      let contentTabToolbox = tabInfo.panel.querySelector(".contentTabToolbox");
      if (contentTabToolbox) {
        contentTabToolbox.hidden = false;
      }
      this.DEBUG && console.debug("RestoreTabs: tabInfo -> " + tabInfo.tabId);
      this.DEBUG && console.debug(tabInfo);
    }

    // Reset to defaults.
    Services.prefs.clearUserPref("mail.tabs.loadInBackground");
    specialTabs.contentTabType.modes.contentTab.maxTabs = this.DEFAULT_CONTENTTAB_MAXTABS;
    Services.prefs.clearUserPref("layout.css.devPixelsPerPx");
  },

  /*
   * Added on a per tab basis, even to shared tabInfo.browser like #messagepane.
   *
   * @implements {nsIWebProgressListener}
   */
  progressListener: {
    tabInfo: null,
    async onLocationChange(webProgress, request, location, flags) {
      if (!this.tabInfo.tabNode.selected || !webProgress.isTopLevel) {
        return;
      }
      let tabInfo = this.tabInfo;
      let tabmail = BrowseInTab.e("tabmail");
      let browser = tabmail.getBrowserForTab(tabInfo);

      BrowseInTab.DEBUG &&
        console.debug(
          "onLocationChange: active tabId:tabTitle - " +
            tabInfo.tabId +
            ":" +
            tabInfo.title
        );

      if (tabInfo.tabNode?.linkedPanel == "mailContent") {
        // These are |folder, message, glodaList| tab types.
        // Get the real browser, could be multimessage.
        this.tabInfo.browser = browser;
        // Clear the urlBar on location change to messagepane, it will be
        // resolved later.
        if (["messagepane", "multimessage"].includes(browser.id)) {
          BrowseInTab.clearUrlToolbarUrl();
        }
        BrowseInTab.DEBUG &&
          console.debug("onLocationChange: browser.id - " + browser.id);
        BrowseInTab.DEBUG && console.debug(browser.documentURI.spec);
      }
      BrowseInTab.DEBUG && console.debug(location.spec);

      if (browser && browser.documentURI.spec != "about:blank") {
        // Only update here with the real url. Most about:blank urls are
        // resolved later and are legitimate only for unselected messagepane.
        let isSameDocument = !!(
          flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT
        );
        let isErrorPage = !!(
          flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_ERROR_PAGE
        );
        if (
          browser.didStartLoadSinceLastUserTyping() ||
          (isErrorPage && location.spec != "about:blank") ||
          (isSameDocument && browser.isNavigating) ||
          (isSameDocument && !browser.userTypedValue)
        ) {
          browser.userTypedValue = null;
        }
        BrowseInTab.setUrlToolbar(tabInfo);
      }
    },
    onSecurityChange(webProgress, request, state) {
      this.tabInfo.securityState = state;
      let tabInfo = this.tabInfo;
      BrowseInTab.DEBUG &&
        console.debug(
          "onSecurityChange: tabId:securityState:selected:tabTitle - " +
            tabInfo.tabId +
            ":" +
            state +
            ":" +
            tabInfo.tabNode.selected +
            ":" +
            tabInfo.title
        );
      BrowseInTab.DEBUG && console.debug(webProgress?.currentURI?.spec);
      if (!tabInfo.tabNode.selected || !webProgress.isTopLevel) {
        return;
      }

      let uri = tabInfo.browser.currentURI;
      let spec = uri.spec;
      let isSecureContext = tabInfo.browser.securityUI?.isSecureContext;
      if (
        this._state == state &&
        this._lastLocation == spec &&
        this._isSecureContext === isSecureContext
      ) {
        // Switching to a tab of the same URL doesn't change most security
        // information, but tab specific permissions may be different.
        // NOTE: for shared messagepane <browser>s we need to skip this.
        //BrowseInTab.gIdentityHandler.refreshIdentityBlock();
        //return;
      }
      this._state = state;
      this._lastLocation = spec;
      this._isSecureContext = isSecureContext;
      // Make sure the "https" part of the URL is striked out or not,
      // depending on the current mixed active content blocking state.
      //BrowseInTab.gURLBar.formatValue();
      try {
        uri = Services.io.createExposableURI(uri);
      } catch (e) {}

      let isInternalOverride = BrowseInTab.isInternalOverride(tabInfo, uri);
      BrowseInTab.gIdentityHandler.updateIdentity(
        tabInfo.securityState,
        uri,
        isInternalOverride
      );
    },
    onStateChange(webProgress, request, stateFlags, status) {
      if (!this.tabInfo.tabNode.selected) {
        return;
      }

      let tabInfo = this.tabInfo;
      if (
        stateFlags & Ci.nsIWebProgressListener.STATE_START &&
        stateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK
      ) {
        BrowseInTab.DEBUG &&
          console.debug(
            "onStateChange: START active tabId:busy:stateFlags:tabTitle - " +
              tabInfo.tabId +
              ":" +
              tabInfo.busy +
              ":" +
              stateFlags +
              ":" +
              tabInfo.title
          );

        if (webProgress.isTopLevel) {
          let browser = tabInfo.browser;
          //let location;
          let originalLocation;
          try {
            request.QueryInterface(Ci.nsIChannel);
            //location = request.URI;
            originalLocation = request.originalURI;
          } catch (ex) {}
          if (
            !(
              originalLocation &&
              BrowseInTab.gURLBar.gInitialPages.includes(
                originalLocation.spec
              ) &&
              originalLocation != "about:blank" &&
              browser.initialPageLoadedFromUserAction !=
                originalLocation.spec &&
              browser.currentURI &&
              browser.currentURI.spec == "about:blank"
            )
          ) {
            // Indicating that we started a load will allow the location
            // bar to be cleared when the load finishes.
            browser.urlbarChangeTracker.startedLoad();
          }
        }

        if (!(stateFlags & Ci.nsIWebProgressListener.STATE_RESTORING)) {
          BrowseInTab.e("reload-button")?.setAttribute("displaystop", true);
          BrowseInTab.DEBUG &&
            console.debug("onStateChange: START set displaystop true");
        }
      } else if (
        stateFlags & Ci.nsIWebProgressListener.STATE_STOP &&
        stateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK
      ) {
        if (webProgress.isTopLevel) {
          let isSuccessful = Components.isSuccessCode(status);
          let browser = tabInfo.browser;
          if (browser) {
            if (!isSuccessful) {
              // && !this.mTab.isEmpty) {
              // Restore the current document's location in case the
              // request was stopped (possibly from a content script)
              // before the location changed.
              browser.userTypedValue = null;

              let isNavigating = browser.isNavigating;
              if (!isNavigating) {
                //BrowseInTab.gURLBar.setURI();
              }
            } else if (isSuccessful) {
              browser.urlbarChangeTracker.finishedLoad();
            }
          }
        }
        BrowseInTab.DEBUG &&
          console.debug(
            "onStateChange: STOP active tabId:busy:stateFlags:tabTitle - " +
              tabInfo.tabId +
              ":" +
              tabInfo.busy +
              ":" +
              stateFlags +
              ":" +
              tabInfo.title
          );
        let uri = tabInfo.browser?.currentURI;
        BrowseInTab.DEBUG &&
          console.debug(
            "onStateChange: browser.id:origURI:curURI - " + tabInfo.browser.id
          );
        BrowseInTab.DEBUG && console.debug(request?.originalURI?.spec);
        BrowseInTab.DEBUG && console.debug(uri?.spec);

        BrowseInTab.e("reload-button")?.removeAttribute("displaystop");
        BrowseInTab.DEBUG &&
          console.debug(
            "onStateChange: STOP remove displaystop, haveUrlToolbarUrlValue - " +
              BrowseInTab.haveUrlToolbarUrlValue(uri)
          );

        if (!BrowseInTab.haveUrlToolbarUrlValue(uri)) {
          // For some tab type late loads update the urlBar now.
          BrowseInTab.setUrlToolbar(tabInfo);

          let isInternalOverride = BrowseInTab.isInternalOverride(tabInfo, uri);
          BrowseInTab.gIdentityHandler.updateIdentity(
            tabInfo.securityState,
            uri,
            isInternalOverride
          );
        }
      }
    },
    // eslint-disable-next-line prettier/prettier
    onProgressChange(webProgress, request, curSelf, maxSelf, curTotal, maxTotal) {},
    onStatusChange(webProgress, request, status, message) {},
    onContentBlockingEvent(webProgress, request, event) {},
    QueryInterface: ChromeUtils.generateQI([
      Ci.nsIWebProgressListener,
      Ci.nsIWebProgressListener2,
      Ci.nsISupportsWeakReference,
    ]),
  },

  setMailToolbar(tabInfo) {
    let tabType = tabInfo.mode.type;
    this.DEBUG &&
      console.debug(
        "setMailToolbar: tabType:tabName - " + tabType + ":" + tabInfo.mode.name
      );
    let show = tabInfo.firstTab || tabInfo.tabNode.linkedPanel == "mailContent";
    let showMailToolbarPref = this.showMailToolbarPref;
    if (showMailToolbarPref == this.kShowMailToolbarAll) {
      show = true;
    } else if (showMailToolbarPref == this.kShowMailToolbarWebPage) {
      if (tabType == "contentTab" || tabType == "preferencesTab") {
        let documentURI = tabInfo.browser.documentURI;
        this.DEBUG &&
          console.debug("setMailToolbar: scheme - " + documentURI.scheme);
        show =
          ["http", "https"].includes(documentURI.scheme) ||
          documentURI.spec == "about:blank";
      }
    }
    this.e("mail-toolbox").hidden = !show;
  },

  isInternalOverride(tabInfo, uri) {
    // Don't forget web page in messagepane.
    return (
      (tabInfo.tabNode?.linkedPanel == "mailContent" ||
        tabInfo.mode.name == "glodaList") &&
      !["chrome", "http", "https"].includes(uri.scheme)
    );
  },

  haveUrlToolbarUrlValue(uri) {
    let urlbarInput = this.gURLBar.inputField;
    if (urlbarInput) {
      this.DEBUG &&
        console.debug(
          "haveUrlToolbarUrlValue: urlbarInput.value - " + urlbarInput.value
        );
      return Boolean(urlbarInput.value) && urlbarInput.value != "about:blank";
    }
    return undefined;
  },

  clearUrlToolbarUrl() {
    let urlbarInput = this.gURLBar.inputField;
    if (urlbarInput) {
      urlbarInput.value = "";
    }
  },

  setUrlToolbar(tabInfo) {
    let urlToolbox = this.e("url-toolbox");
    if (!urlToolbox) {
      return;
    }

    let tabmail = this.e("tabmail");
    let browserForTab = tabInfo.browser || tabmail.getBrowserForTab(tabInfo);
    let uri = tabInfo.browser?.currentURI || document.documentURIObject;
    this.DEBUG && console.debug("setUrlToolbar: scheme - " + uri?.scheme);

    let isInternalOverride = this.isInternalOverride(tabInfo, uri);
    this.gURLBar.setURI(null, false, isInternalOverride);

    let tabType = tabInfo.mode.type;
    let urlbarInput = this.gURLBar.inputField;
    this.DEBUG &&
      console.debug(
        "setUrlToolbar: tab type:name - " + tabType + ":" + tabInfo.mode.name
      );

    let isEditableUrl =
      tabType == "contentTab" &&
      (["http", "https"].includes(uri.scheme) ||
        uri.spec == "about:blank" ||
        uri.spec.startsWith("about:neterror"));

    let show =
      this.showUrlToolbarPref == this.kShowUrlToolbarAll || isEditableUrl;

    // It's a new tab.
    if (tabType == "contentTab" && uri.spec == "about:blank") {
      this.clearUrlToolbarUrl();
      urlbarInput.blur();
      urlbarInput.selectionStart = urlbarInput.selectionEnd = 0;
      urlbarInput.focus();
      browserForTab.contentDocument.title = this.getLocaleMessage(
        "newTabLabel"
      );
    }

    let hasSessionHistory = tabInfo.browser && tabInfo.browser.sessionHistory;
    urlToolbox.querySelector("#back-button").disabled = !(
      hasSessionHistory && tabInfo.browser.canGoBack
    );
    urlToolbox.querySelector("#forward-button").disabled = !(
      hasSessionHistory && tabInfo.browser.canGoForward
    );
    urlToolbox.querySelector(
      "#reload-button"
    ).disabled = !this.BrowserController.isCommandEnabled("Browser:Reload_BiT");

    urlToolbox.hidden = !show;
    urlbarInput.toggleAttribute("readonly", !isEditableUrl);

    this.e("urlbar-zoom-button").hidden = true;
    if (browserForTab) {
      // Some tabs don't have a browser (chat); ZoomManager requires one.
      if (this.globalZoomEnabledPref) {
        ZoomManager.zoom = this.globalZoomFactor || 1;
      } else {
        ZoomManager.zoom = this.tabZoomFactor;
      }
      this.updateZoomUI(browserForTab);
    }
  },

  /*****************************************************************************
   * These functions are from UrlbarInput.jsm.                                 *
   ****************************************************************************/
  gURLBar: {
    constructr(options = {}) {
      this.textbox = options.textbox;

      this.window = this.textbox.ownerGlobal;
      this.isPrivate = false; //PrivateBrowsingUtils.isWindowPrivate(this.window);
      this.document = this.window.document;

      // Create the panel to contain results.
      /*
      this.textbox.appendChild(
        this.window.MozXULElement.parseXULToFragment(`
          <vbox class="urlbarView"
                role="group"
                tooltip="aHTMLTooltip">
            <html:div class="urlbarView-body-outer">
              <html:div class="urlbarView-body-inner">
                <html:div id="urlbar-results"
                          class="urlbarView-results"
                          role="listbox"/>
              </html:div>
            </html:div>
            <hbox class="search-one-offs"
                  compact="true"
                  includecurrentengine="true"
                  disabletab="true"/>
          </vbox>
        `)
      );
      this.panel = this.textbox.querySelector(".urlbarView"); */

      //this.searchButton = UrlbarPrefs.get("experimental.searchButton");
      //if (this.searchButton) {
      //  this.textbox.classList.add("searchButton");
      //}

      //this.controller = new UrlbarController({
      //  input: this,
      //  eventTelemetryCategory: options.eventTelemetryCategory,
      //});
      //this.view = new UrlbarView(this);
      this.valueIsTyped = false;
      //this.formHistoryName = DEFAULT_FORM_HISTORY_NAME;
      //this.lastQueryContextPromise = Promise.resolve();
      //this.searchMode = null;
      //this._actionOverrideKeyCount = 0;
      //this._autofillPlaceholder = "";
      //this._lastSearchString = "";
      this._lastValidURLStr = "";
      //this._valueOnLastSearch = "";
      //this._resultForCurrentValue = null;
      this._suppressStartQuery = false;
      //this._suppressPrimaryAdjustment = false;
      this._untrimmedValue = "";
      //this._searchModesByBrowser = new WeakMap();

      //this.QueryInterface = ChromeUtils.generateQI([
      //  "nsIObserver",
      //  "nsISupportsWeakReference",
      //]);
      //this._addObservers();

      // This exists only for tests.
      //this._enableAutofillPlaceholder = true;

      // Forward certain methods and properties.
      const CONTAINER_METHODS = [
        "getAttribute",
        "hasAttribute",
        "querySelector",
        "setAttribute",
        "removeAttribute",
        "toggleAttribute",
      ];
      const INPUT_METHODS = ["addEventListener", "blur", "removeEventListener"];
      //const READ_WRITE_PROPERTIES = [
      //  "placeholder",
      //  "readOnly",
      //  "selectionStart",
      //  "selectionEnd",
      //];

      for (let method of CONTAINER_METHODS) {
        this[method] = (...args) => {
          return this.textbox[method](...args);
        };
      }

      for (let method of INPUT_METHODS) {
        this[method] = (...args) => {
          return this.inputField[method](...args);
        };
      }

      /*
      for (let property of READ_WRITE_PROPERTIES) {
        Object.defineProperty(this, property, {
          enumerable: true,
          get() {
            return this.inputField[property];
          },
          set(val) {
            this.inputField[property] = val;
          },
        });
      } */

      this.inputField = this.querySelector("#urlbar-input");
      this._inputContainer = this.querySelector("#urlbar-input-container");
      this._identityBox = this.querySelector("#identity-box");
      //this._searchModeIndicator = this.querySelector(
      //  "#urlbar-search-mode-indicator"
      //);
      //this._searchModeIndicatorTitle = this._searchModeIndicator.querySelector(
      //  "#urlbar-search-mode-indicator-title"
      //);
      //this._searchModeIndicatorClose = this._searchModeIndicator.querySelector(
      //  "#urlbar-search-mode-indicator-close"
      //);
      //this._searchModeLabel = this.querySelector("#urlbar-label-search-mode");
      this._toolbar = this.textbox.closest("toolbar");

      //XPCOMUtils.defineLazyGetter(this, "valueFormatter", () => {
      //  return new UrlbarValueFormatter(this);
      //});

      BrowseInTab.DEBUG &&
        console.debug(
          "constructr: visible:readOnly - " +
            this.window.toolbar.visible +
            ":" +
            this.inputField.readOnly
        );
      // If the toolbar is not visible in this window or the urlbar is readonly,
      // we'll stop here, so that most properties of the input object are valid,
      // but we won't handle events.
      if (!this.window.toolbar.visible) {
        // || this.readOnly) {
        return;
      }

      // The event bufferer can be used to defer events that may affect users
      // muscle memory; for example quickly pressing DOWN+ENTER should end up
      // on a predictable result, regardless of the search status. The event
      // bufferer will invoke the handling code at the right time.
      //this.eventBufferer = new UrlbarEventBufferer(this);

      this._inputFieldEvents = [
        //"compositionstart",
        //"compositionend",
        //"contextmenu",
        //"dragover",
        //"dragstart",
        "drop",
        "focus",
        "blur",
        "input",
        "keydown",
        //"keyup",
        //"mouseover",
        //"overflow",
        //"underflow",
        "paste",
        //"scrollend",
        //"select",
      ];
      for (let name of this._inputFieldEvents) {
        this.addEventListener(name, this);
      }

      //this.window.addEventListener("mousedown", this);
      //if (AppConstants.platform == "win") {
      //  this.window.addEventListener("draggableregionleftmousedown", this);
      //}
      //this.textbox.addEventListener("mousedown", this);
      //this._inputContainer.addEventListener("click", this);

      //this._searchModeIndicatorClose.addEventListener("click", this);

      // This is used to detect commands launched from the panel, to avoid
      // recording abandonment events when the command causes a blur event.
      //this.view.panel.addEventListener("command", this, true);

      //this.window.gBrowser.tabContainer.addEventListener("TabSelect", this);

      //this.window.addEventListener("customizationstarting", this);
      //this.window.addEventListener("aftercustomization", this);

      //this.updateLayoutBreakout();

      //this._initCopyCutController();
      this._initPasteAndGo();

      // Tracks IME composition.
      //this._compositionState = UrlbarUtils.COMPOSITION.NONE;
      //this._compositionClosedPopup = false;

      //this.editor.newlineHandling =
      //  Ci.nsIEditor.eNewlinesStripSurroundingWhitespace;
    },

    /**
     * Sets the URI to display in the location bar.
     */
    setURI(uri = null, dueToTabSwitch = false, isInternalOverride) {
      let browser = this.window?.getBrowser();
      let value = browser?.userTypedValue ?? null; // ?? this.document.URL;
      let valid = false;

      // Explicitly check for nulled out value. We don't want to reset the URL
      // bar if the user has deleted the URL and we'd just put the same URL
      // back. See bug 304198.
      if (value === null) {
        uri = uri || browser?.currentURI || this.document.documentURIObject;
        // Strip off usernames and passwords for the location bar
        try {
          uri = Services.io.createExposableURI(uri);
        } catch (e) {}

        // Replace initial page URIs with an empty string
        // only if there's no opener (bug 370555).
        if (
          this.isInitialPage(uri) &&
          BrowserUtils.checkEmptyPageOrigin(browser, uri) &&
          !isInternalOverride
        ) {
          value = "";
        } else {
          // We should deal with losslessDecodeURI throwing for exotic URIs
          try {
            //value = this.losslessDecodeURI(uri);
            value = BrowseInTab.getFormattedUrl(uri.displaySpec);
          } catch (ex) {
            value = "about:blank";
          }
        }

        valid = !this.isBlankPageURL(uri.spec) || uri.schemeIs("moz-extension");
      } else if (
        this.isInitialPage(value) &&
        BrowserUtils.checkEmptyPageOrigin(browser)
      ) {
        value = "";
        valid = true;
      }

      let isDifferentValidValue = valid && value != this.untrimmedValue;
      this.value = value;
      this.valueIsTyped = !valid;
      this.removeAttribute("usertyping");
      if (isDifferentValidValue) {
        // The selection is enforced only for new values, to avoid overriding the
        // cursor position when the user switches windows while typing.
        this.inputField.selectionStart = this.inputField.selectionEnd = 0;
      }

      // The proxystate must be set before setting search mode below because
      // search mode depends on it.
      this.setPageProxyState(valid ? "valid" : "invalid", dueToTabSwitch);

      // If we're switching tabs, restore the tab's search mode.  Otherwise, if
      // the URI is valid, exit search mode.  This must happen after setting
      // proxystate above because search mode depends on it.
      //if (dueToTabSwitch) {
      //  this.restoreSearchModeState();
      //} else if (valid) {
      //  this.setSearchMode({});
      //}

      BrowseInTab.DEBUG && console.debug("gURLBar.setURI: value - " + value);
    },

    /**
     * Passes DOM events to the _on_<event type> methods.
     * @param {Event} event
     */
    handleEvent(event) {
      BrowseInTab.DEBUG &&
        console.debug("gURLBar.handleEvent: type - " + event.type);
      let methodName = "_on_" + event.type;
      if (methodName in this) {
        this[methodName](event);
      } else {
        throw new Error("Unrecognized UrlbarInput event: " + event.type);
      }
    },

    /**
     * Handles an event which might open text or a URL. If the event requires
     * doing so, handleCommand forwards it to handleNavigation.
     *
     * @param {Event} [event] The event triggering the open.
     */
    handleCommand(event = null) {
      let isMouseEvent = event instanceof window.MouseEvent;
      if (isMouseEvent && event.button == 2) {
        // Do nothing for right clicks.
        return;
      }

      this.handleNavigation({ event });
    },

    /**
     * Handles an event which would cause a URL or text to be opened.
     */
    handleNavigation({ event, oneOffParams, triggeringPrincipal }) {
      let openParams = oneOffParams?.openParams || {};
      let url = this.inputField.value.trim();
      openParams.postData = null;

      if (!url) {
        return;
      }

      let where = "current"; //this._whereToOpen(event);
      openParams.allowInheritPrincipal = false;

      let isValidUrl = false;
      try {
        new URL(url);
        isValidUrl = true;
      } catch (ex) {}
      if (isValidUrl) {
        this._loadURL(url, where, openParams);
        //return;
      }
    },

    get value() {
      return this.inputField.value;
    },

    get untrimmedValue() {
      return this._untrimmedValue;
    },

    set value(val) {
      this._setValue(val, true);
    },

    _on_blur(event) {
      this.removeAttribute("focused");
    },

    _on_focus(event) {
      this.setAttribute("focused", "true");
    },

    _on_input(event) {
      let value = this.value;
      this.valueIsTyped = true;
      this._untrimmedValue = value;
      this.window.getBrowser().userTypedValue = value;
      // Unset userSelectionBehavior because the user is modifying the search
      // string, thus there's no valid selection. This is also used by the view
      // to set "aria-activedescendant", thus it should never get stale.
      //this.controller.userSelectionBehavior = "none";

      //let compositionState = this._compositionState;
      //let compositionClosedPopup = this._compositionClosedPopup;

      // Clear composition values if we're no more composing.
      //if (this._compositionState != UrlbarUtils.COMPOSITION.COMPOSING) {
      //  this._compositionState = UrlbarUtils.COMPOSITION.NONE;
      //  this._compositionClosedPopup = false;
      //}

      if (value) {
        this.setAttribute("usertyping", "true");
      } else {
        this.removeAttribute("usertyping");
      }
      this.removeAttribute("actiontype");

      if (
        this.getAttribute("pageproxystate") == "valid" &&
        this.value != this._lastValidURLStr
      ) {
        this.setPageProxyState("invalid", true);
      }
      /*
      if (!this.view.isOpen) {
        this.view.clear();
      } else if (!value && !UrlbarPrefs.get("suggest.topsites")) {
        this.view.clear();
        if (!this.searchMode || !this.view.oneOffSearchButtons.hasView) {
          this.view.close();
          return;
        }
      }

      this.view.removeAccessibleFocus();

      // During composition with an IME, the following events happen in order:
      // 1. a compositionstart event
      // 2. some input events
      // 3. a compositionend event
      // 4. an input event

      // We should do nothing during composition or if composition was canceled
      // and we didn't close the popup on composition start.
      if (
        compositionState == UrlbarUtils.COMPOSITION.COMPOSING ||
        (compositionState == UrlbarUtils.COMPOSITION.CANCELED &&
          !compositionClosedPopup)
      ) {
        return;
      }

      // Autofill only when text is inserted (i.e., event.data is not empty) and
      // it's not due to pasting.
      let allowAutofill =
        !!event.data &&
        !UrlbarUtils.isPasteEvent(event) &&
        this._maybeAutofillOnInput(value);

      this.startQuery({
        searchString: value,
        allowAutofill,
        resetSearchState: false,
        event,
      }); */
    },

    _on_keydown(event) {
      if (event.keyCode == KeyEvent.DOM_VK_RETURN) {
        this.handleCommand(event);
      }
    },

    _on_paste(event) {
      let originalPasteData = event.clipboardData.getData("text/plain");
      if (!originalPasteData) {
        return;
      }

      let oldValue = this.inputField.value;
      let oldStart = oldValue.substring(0, this.inputField.selectionStart);
      // If there is already non-whitespace content in the URL bar
      // preceding the pasted content, it's not necessary to check
      // protocols used by the pasted content:
      if (oldStart.trim()) {
        return;
      }
      let oldEnd = oldValue.substring(this.inputField.selectionEnd);

      let pasteData = this.stripUnsafeProtocolOnPaste(originalPasteData);
      if (originalPasteData != pasteData) {
        // Unfortunately we're not allowed to set the bits being pasted
        // so cancel this event:
        event.preventDefault();
        event.stopImmediatePropagation();

        this.value = oldStart + pasteData + oldEnd;
        // Fix up cursor/selection:
        let newCursorPos = oldStart.length + pasteData.length;
        this.inputField.selectionStart = newCursorPos;
        this.inputField.selectionEnd = newCursorPos;
      }
    },

    _initPasteAndGo() {
      //let inputBox = this.inputBox;
      let inputBox = this.querySelector("moz-input-box");
      let contextMenu = inputBox.menupopup;
      let insertLocation = contextMenu.firstElementChild;
      while (
        insertLocation.nextElementSibling &&
        insertLocation.getAttribute("cmd") != "cmd_paste"
      ) {
        insertLocation = insertLocation.nextElementSibling;
      }
      if (!insertLocation) {
        return;
      }

      let pasteAndGo = document.createXULElement("menuitem");
      pasteAndGo.id = "paste-and-go";
      let label = BrowseInTab.getLocaleMessage("pasteAndGo.label");
      pasteAndGo.setAttribute("label", label);
      let accesskey = BrowseInTab.getLocaleMessage("pasteAndGo.accesskey");
      pasteAndGo.setAttribute("accesskey", accesskey);
      pasteAndGo.setAttribute("anonid", "paste-and-go");
      pasteAndGo.addEventListener("command", () => {
        //this._suppressStartQuery = true;

        //this.select();
        window.goDoCommand("cmd_paste");
        //this.setResultForCurrentValue(null);
        this.handleCommand();

        //this._suppressStartQuery = false;
      });

      contextMenu.addEventListener("popupshowing", () => {
        // Close the results pane when the input field contextual menu is open,
        // because paste and go doesn't want a result selection.
        //this.view.close();

        let controller = document.commandDispatcher.getControllerForCommand(
          "cmd_paste"
        );
        let enabled = controller.isCommandEnabled("cmd_paste");
        if (enabled) {
          pasteAndGo.removeAttribute("disabled");
        } else {
          pasteAndGo.setAttribute("disabled", "true");
        }
      });

      insertLocation.insertAdjacentElement("afterend", pasteAndGo);
    },

    /**
     * Used to filter out the javascript protocol from URIs, since we don't
     * support LOAD_FLAGS_DISALLOW_INHERIT_PRINCIPAL for those.
     * @param {string} pasteData The data to check for javacript protocol.
     * @returns {string} The modified paste data.
     */
    stripUnsafeProtocolOnPaste(pasteData) {
      while (true) {
        let scheme = "";
        try {
          scheme = Services.io.extractScheme(pasteData);
        } catch (ex) {
          // If it throws, this is not a javascript scheme.
        }
        if (scheme != "javascript") {
          break;
        }

        pasteData = pasteData.substring(pasteData.indexOf(":") + 1);
      }
      return pasteData;
    },

    /**
     * Updates the user interface to indicate whether the URI in the address bar
     * is different than the loaded page, because it's being edited or because a
     * search result is currently selected and is displayed in the location bar.
     */
    setPageProxyState(state, updatePopupNotifications) {
      //let prevState = this.getAttribute("pageproxystate");

      this.setAttribute("pageproxystate", state);
      this._inputContainer.setAttribute("pageproxystate", state);
      this._identityBox.setAttribute("pageproxystate", state);

      if (state == "valid") {
        this._lastValidURLStr = this.value;
      }

      //if (
      //  updatePopupNotifications &&
      //  prevState != state &&
      //  this.window.UpdatePopupNotificationsVisibility
      //) {
      //  this.window.UpdatePopupNotificationsVisibility();
      //}

      BrowseInTab.DEBUG &&
        console.debug("gURLBar.setPageProxyState: state - " + state);
    },

    _setValue(val, allowTrim) {
      // Don't expose internal about:reader URLs to the user.
      //let originalUrl = ReaderMode.getOriginalUrlObjectForDisplay(val);
      //if (originalUrl) {
      //  val = originalUrl.displaySpec;
      //}
      this._untrimmedValue = val;

      if (allowTrim) {
        // No trim.
        //val = this._trimValue(val);
      }

      this.valueIsTyped = false;
      this._resultForCurrentValue = null;
      this.inputField.value = val;
      //this.formatValue();
      this.removeAttribute("actiontype");

      // Dispatch ValueChange event for accessibility.
      let event = this.document.createEvent("Events");
      event.initEvent("ValueChange", true, true);
      this.inputField.dispatchEvent(event);

      return val;
    },

    /**
     * Loads the url in the appropriate place.
     */
    _loadURL(
      url,
      openUILinkWhere,
      params,
      resultDetails = null,
      browser = window.getBrowser()
    ) {
      // No point in setting these because we'll handleRevert() a few rows below.
      if (openUILinkWhere == "current") {
        this.value = url;
        browser.userTypedValue = url;
      }

      // No point in setting this if we are loading in a new window.
      if (openUILinkWhere != "window" && window?.gInitialPages?.includes(url)) {
        //browser.initialPageLoadedFromUserAction = url;
      }

      try {
        //UrlbarUtils.addToUrlbarHistory(url, this.window);
      } catch (ex) {
        // Things may go wrong when adding url to session history,
        // but don't let that interfere with the loading of the url.
        Cu.reportError(ex);
      }

      // TODO: When bug 1498553 is resolved, we should be able to
      // remove the !triggeringPrincipal condition here.
      if (
        !params.triggeringPrincipal ||
        params.triggeringPrincipal.isSystemPrincipal
      ) {
        // Reset DOS mitigations for the basic auth prompt.
        delete browser.authPromptAbuseCounter;

        // Reset temporary permissions on the current tab if the user reloads
        // the tab via the urlbar.
        if (
          openUILinkWhere == "current" &&
          browser.currentURI &&
          url === browser.currentURI.spec
        ) {
          //this.window.SitePermissions.clearTemporaryPermissions(browser);
        }
      }

      params.allowThirdPartyFixup = true;

      if (openUILinkWhere == "current") {
        params.targetBrowser = browser;
        params.indicateErrorPageLoad = true;
        params.allowPinnedTabHostChange = true;
        params.allowPopups = url.startsWith("javascript:");
      } else {
        params.initiatingDoc = window.document;
      }

      // Focus the content area before triggering loads, since if the load
      // occurs in a new tab, we want focus to be restored to the content
      // area when the current tab is re-selected.
      browser.focus();

      if (openUILinkWhere != "current") {
        //this.handleRevert();
      }

      // Notify about the start of navigation.
      //this._notifyStartNavigation(resultDetails);

      try {
        this.openTrustedLinkIn(url, openUILinkWhere, params);
      } catch (ex) {
        // This load can throw an exception in certain cases, which means
        // we'll want to replace the URL with the loaded URL:
        if (ex.result != Cr.NS_ERROR_LOAD_SHOWED_ERRORPAGE) {
          //this.handleRevert();
        }
      }

      // Make sure the domain name stays visible for spoof protection and usability.
      this.inputField.selectionStart = this.inputField.selectionEnd = 0;

      //this.view.close();
    },

    /**
     * Decodes the given URI for displaying it in the address bar without losing
     * information, such that hitting Enter again will load the same URI.
     *
     * See UrlbarInput.jsm for details.
     */
    losslessDecodeURI(aURI) {
      let scheme = aURI.scheme;
      let value = aURI.displaySpec;

      // Try to decode as UTF-8 if there's no encoding sequence that we would break.
      if (!/%25(?:3B|2F|3F|3A|40|26|3D|2B|24|2C|23)/i.test(value)) {
        // eslint-disable-next-line prettier/prettier
        let decodeASCIIOnly = !["https", "http", "file", "ftp", "news"].includes(scheme);
        if (decodeASCIIOnly) {
          // This only decodes ascii characters (hex) 20-7e, except 25 (%).
          // This avoids both cases stipulated below (%-related issues, and \r, \n
          // and \t, which would be %0d, %0a and %09, respectively) as well as any
          // non-US-ascii characters.
          value = value.replace(
            /%(2[0-4]|2[6-9a-f]|[3-6][0-9a-f]|7[0-9a-e])/g,
            decodeURI
          );
        } else {
          try {
            value = decodeURI(value)
              // decodeURI decodes %25 to %, which creates unintended encoding
              // sequences. Re-encode it, unless it's part of a sequence that
              // survived decodeURI, i.e. one for:
              // ';', '/', '?', ':', '@', '&', '=', '+', '$', ',', '#'
              // (RFC 3987 section 3.2)
              .replace(
                /%(?!3B|2F|3F|3A|40|26|3D|2B|24|2C|23)/gi,
                encodeURIComponent
              );
          } catch (e) {}
        }
      }

      // Encode potentially invisible characters.
      value = value.replace(
        // eslint-disable-next-line no-control-regex
        /[\u0000-\u001f\u007f-\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u2800\u3000\ufffc]|[\r\n\t]|\u0020(?=\u0020)|\s$/g,
        encodeURIComponent
      );

      // Encode characters that are ignorable, can't be rendered usefully, or may
      // confuse users.
      value = value.replace(
        // eslint-disable-next-line no-misleading-character-class
        /[\u00ad\u034f\u061c\u06dd\u070f\u115f\u1160\u17b4\u17b5\u180b-\u180e\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\u3164\u0600-\u0605\u08e2\ufe00-\ufe0f\ufeff\uffa0\ufff0-\ufffb]|\ud804[\udcbd\udccd]|\ud80d[\udc30-\udc38]|\ud82f[\udca0-\udca3]|\ud834[\udd73-\udd7a]|[\udb40-\udb43][\udc00-\udfff]|\ud83d[\udd0f-\udd13\udee1]/g,
        encodeURIComponent
      );
      return value;
    },

    /***************************************************************************
     * From browser.js.                                                        *
     **************************************************************************/

    gInitialPages: [
      "about:blank",
      "about:newtab",
      "about:home",
      "about:privatebrowsing",
      "about:welcomeback",
      "about:sessionrestore",
      "about:welcome",
      "about:newinstall",
    ],
    isInitialPage(url) {
      if (!(url instanceof Ci.nsIURI)) {
        try {
          url = Services.io.newURI(url);
        } catch (ex) {
          return false;
        }
      }

      let nonQuery = url.prePath + url.filePath;
      return (
        this.gInitialPages.includes(nonQuery) || nonQuery == "about:newtab" // BROWSER_NEW_TAB_URL;
      );
    },

    /***************************************************************************
     * These functions are from utilityOverlay.js.                             *
     **************************************************************************/

    /* openTrustedLinkIn will attempt to open the given URI using the SystemPrincipal
     * as the trigeringPrincipal, unless a more specific Principal is provided.
     *
     * See openUILinkIn for a discussion of parameters
     */
    openTrustedLinkIn(url, where, aParams) {
      var params = aParams;

      if (!params) {
        params = {};
      }

      if (!params.triggeringPrincipal) {
        params.triggeringPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
      }

      this.openUILinkIn(url, where, params);
    },

    /*
     * openUILinkIn opens a URL in a place specified by the parameter |where|.
     */
    openUILinkIn(url, where, aAllowThirdPartyFixup, aPostData, aReferrerInfo) {
      var params;

      if (arguments.length == 3 && typeof arguments[2] == "object") {
        params = aAllowThirdPartyFixup;
      }
      if (!params || !params.triggeringPrincipal) {
        throw new Error(
          "Required argument triggeringPrincipal missing within openUILinkIn"
        );
      }

      params.fromChrome = params.fromChrome ?? true;

      this.openLinkIn(url, where, params);
    },

    openLinkIn(url, where, params) {
      if (!where || !url) {
        return;
      }

      var aAllowThirdPartyFixup = params.allowThirdPartyFixup;
      var aPostData = params.postData;
      var aReferrerInfo = params.referrerInfo;
      //  ? params.referrerInfo
      //  : new ReferrerInfo(Ci.nsIReferrerInfo.EMPTY, true, null);
      var aAllowInheritPrincipal = !!params.allowInheritPrincipal;
      var aForceAllowDataURI = params.forceAllowDataURI;
      var aIsPrivate = params.private;
      var aAllowPopups = !!params.allowPopups;
      var aUserContextId = params.userContextId;
      var aIndicateErrorPageLoad = params.indicateErrorPageLoad;
      var aPrincipal = params.originPrincipal;
      var aStoragePrincipal = params.originStoragePrincipal;
      var aTriggeringPrincipal = params.triggeringPrincipal;
      var aCsp = params.csp;
      var aForceAboutBlankViewerInCurrent =
        params.forceAboutBlankViewerInCurrent;

      if (!aTriggeringPrincipal) {
        throw new Error("Must load with a triggering Principal");
      }

      // Establish which window we'll load the link in.
      let w;
      if (where == "current" && params.targetBrowser) {
        w = params.targetBrowser.ownerGlobal;
      } else {
        //w = getTopWin();
      }

      // Teach the principal about the right OA to use, e.g. in case when
      // opening a link in a new private window, or in a new container tab.
      // Please note we do not have to do that for SystemPrincipals and we
      // can not do it for NullPrincipals since NullPrincipals are only
      // identical if they actually are the same object (See Bug: 1346759)
      function useOAForPrincipal(principal) {
        if (principal && principal.isContentPrincipal) {
          let attrs = {
            userContextId: aUserContextId,
            privateBrowsingId: aIsPrivate,
            firstPartyDomain: principal.originAttributes.firstPartyDomain,
          };
          return Services.scriptSecurityManager.principalWithOA(
            principal,
            attrs
          );
        }
        return principal;
      }
      aPrincipal = useOAForPrincipal(aPrincipal);
      aStoragePrincipal = useOAForPrincipal(aStoragePrincipal);
      aTriggeringPrincipal = useOAForPrincipal(aTriggeringPrincipal);

      // We're now committed to loading the link in an existing browser window.

      // Raise the target window before loading the URI, since loading it may
      // result in a new frontmost window (e.g. "javascript:window.open('');").
      w.focus();

      let targetBrowser;
      let uriObj;

      if (where == "current") {
        targetBrowser = params.targetBrowser || w.getBrowser();

        try {
          uriObj = Services.io.newURI(url);
        } catch (e) {}
      }

      let focusUrlBar = false;

      switch (where) {
        case "current":
          let flags = Ci.nsIWebNavigation.LOAD_FLAGS_NONE;

          if (aAllowThirdPartyFixup) {
            flags |= Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP;
            flags |= Ci.nsIWebNavigation.LOAD_FLAGS_FIXUP_SCHEME_TYPOS;
          }
          // LOAD_FLAGS_DISALLOW_INHERIT_PRINCIPAL isn't supported for javascript URIs,
          // i.e. it causes them not to load at all. Callers should strip
          // "javascript:" from pasted strings to prevent blank tabs
          if (!aAllowInheritPrincipal) {
            flags |= Ci.nsIWebNavigation.LOAD_FLAGS_DISALLOW_INHERIT_PRINCIPAL;
          }

          if (aAllowPopups) {
            flags |= Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_POPUPS;
          }
          if (aIndicateErrorPageLoad) {
            flags |= Ci.nsIWebNavigation.LOAD_FLAGS_ERROR_LOAD_CHANGES_RV;
          }
          if (aForceAllowDataURI) {
            flags |= Ci.nsIWebNavigation.LOAD_FLAGS_FORCE_ALLOW_DATA_URI;
          }

          let { URI_INHERITS_SECURITY_CONTEXT } = Ci.nsIProtocolHandler;
          if (
            aForceAboutBlankViewerInCurrent &&
            (!uriObj ||
              this.doGetProtocolFlags(uriObj) & URI_INHERITS_SECURITY_CONTEXT)
          ) {
            // Unless we know for sure we're not inheriting principals,
            // force the about:blank viewer to have the right principal:
            targetBrowser.createAboutBlankContentViewer(
              aPrincipal,
              aStoragePrincipal
            );
          }

          targetBrowser.loadURI(url, {
            triggeringPrincipal: aTriggeringPrincipal,
            csp: aCsp,
            flags,
            referrerInfo: aReferrerInfo,
            postData: aPostData,
            userContextId: aUserContextId,
          });

          // Don't focus the content area if focus is in the address bar and we're
          // loading the New Tab page.
          focusUrlBar =
            w.document.activeElement == this.gURLBar.inputField &&
            this.isBlankPageURL(url);
          break;
      }

      if (!focusUrlBar && targetBrowser == w.gBrowser.selectedBrowser) {
        // Focus the content, but only if the browser used for the load is selected.
        targetBrowser.focus();
      }
    },

    /**
     * Determines whether the given url is considered a special URL for new tabs.
     */
    isBlankPageURL(aURL) {
      return (
        aURL == "about:blank" ||
        aURL == "about:home" ||
        aURL == "about:welcome" ||
        aURL == "about:newtab" //BROWSER_NEW_TAB_URL
      );
    },

    doGetProtocolFlags(aURI) {
      let handler = Services.io.getProtocolHandler(aURI.scheme);
      // see DoGetProtocolFlags in nsIProtocolHandler.idl
      return handler instanceof Ci.nsIProtocolHandlerWithDynamicFlags
        ? handler
            .QueryInterface(Ci.nsIProtocolHandlerWithDynamicFlags)
            .getFlagsForURI(aURI)
        : handler.protocolFlags;
    },
  },

  /*****************************************************************************
   * These functions are from browser-siteIdentity.js.                         *
   ****************************************************************************/
  gIdentityHandler: {
    _uri: null,
    _uriHasHost: false,
    _pageExtensionPolicy: null,
    _isSecureInternalUI: false,
    _isSecureContext: false,
    _secInfo: null,
    _state: 0,
    _secureInternalPages: /^(?:accounts.*|addons|cache|certificate|config|crashes|downloads|license|logins|preferences|protections|rights|sessionrestore|support|welcomeback|ion)(?:[?#]|$)/i,

    get _isBrokenConnection() {
      return this._state & Ci.nsIWebProgressListener.STATE_IS_BROKEN;
    },
    get _isSecureConnection() {
      // If a <browser> is included within a chrome document, then this._state
      // will refer to the security state for the <browser> and not the top level
      // document. In this case, don't upgrade the security state in the UI
      // with the secure state of the embedded <browser>.
      return (
        !this._isURILoadedFromFile &&
        this._state & Ci.nsIWebProgressListener.STATE_IS_SECURE
      );
    },
    get _isEV() {
      // If a <browser> is included within a chrome document, then this._state
      // will refer to the security state for the <browser> and not the top level
      // document. In this case, don't upgrade the security state in the UI
      // with the EV state of the embedded <browser>.
      return (
        !this._isURILoadedFromFile &&
        this._state & Ci.nsIWebProgressListener.STATE_IDENTITY_EV_TOPLEVEL
      );
    },
    /* eslint-disable */
    get _isMixedActiveContentLoaded() {
      return (
        this._state & Ci.nsIWebProgressListener.STATE_LOADED_MIXED_ACTIVE_CONTENT
      );
    },
    get _isMixedActiveContentBlocked() {
      return (
        this._state & Ci.nsIWebProgressListener.STATE_BLOCKED_MIXED_ACTIVE_CONTENT
      );
    },
    get _isMixedPassiveContentLoaded() {
      return (
        this._state & Ci.nsIWebProgressListener.STATE_LOADED_MIXED_DISPLAY_CONTENT
      );
    },
    get _isContentHttpsOnlyModeUpgraded() {
      return (
        this._state & Ci.nsIWebProgressListener.STATE_HTTPS_ONLY_MODE_UPGRADED
      );
    },
    get _isContentHttpsOnlyModeUpgradeFailed() {
      return (
        this._state & Ci.nsIWebProgressListener.STATE_HTTPS_ONLY_MODE_UPGRADE_FAILED
      );
    },
    /* eslint-enable */
    get _isCertUserOverridden() {
      return this._state & Ci.nsIWebProgressListener.STATE_CERT_USER_OVERRIDDEN;
    },
    get _isCertDistrustImminent() {
      return (
        this._state & Ci.nsIWebProgressListener.STATE_CERT_DISTRUST_IMMINENT
      );
    },
    get _isAboutCertErrorPage() {
      let browser = getBrowser();
      return (
        browser?.documentURI &&
        browser.documentURI.scheme == "about" &&
        (browser.documentURI.pathQueryRef.startsWith("certerror") ||
          browser.documentURI.pathQueryRef.includes("nssBadCert"))
      );
    },
    get _isAboutNetErrorPage() {
      let browser = getBrowser();
      return (
        browser?.documentURI &&
        browser.documentURI.scheme == "about" &&
        browser.documentURI.pathQueryRef.startsWith("neterror")
      );
    },
    get _isAboutHttpsOnlyErrorPage() {
      let browser = getBrowser();
      return (
        browser?.documentURI &&
        browser.documentURI.scheme == "about" &&
        browser.documentURI.pathQueryRef.startsWith("httpsonlyerror")
      );
    },
    get _isPotentiallyTrustworthy() {
      let browser = getBrowser();
      let uri = browser?.documentURI ?? document.documentURIObject;
      return (
        !this._isBrokenConnection &&
        (this._isSecureContext || uri.scheme == "chrome")
      );
    },
    get _isAboutBlockedPage() {
      let browser = getBrowser();
      return (
        browser?.documentURI &&
        browser.documentURI.scheme == "about" &&
        browser.documentURI.pathQueryRef.startsWith("blocked")
      );
    },

    // TODO: Use the firefox defaults here for now.
    get _insecureConnectionIconEnabled() {
      //delete this._insecureConnectionIconEnabled;
      //XPCOMUtils.defineLazyPreferenceGetter(
      //  this,
      //  "_insecureConnectionIconEnabled",
      //  "security.insecure_connection_icon.enabled"
      //);
      //return this._insecureConnectionIconEnabled;
      return true;
    },
    get _insecureConnectionIconPBModeEnabled() {
      //delete this._insecureConnectionIconPBModeEnabled;
      //XPCOMUtils.defineLazyPreferenceGetter(
      //  this,
      //  "_insecureConnectionIconPBModeEnabled",
      //  "security.insecure_connection_icon.pbmode.enabled"
      //);
      //return this._insecureConnectionIconPBModeEnabled;
      return true;
    },
    get _insecureConnectionTextEnabled() {
      //delete this._insecureConnectionTextEnabled;
      //XPCOMUtils.defineLazyPreferenceGetter(
      //  this,
      //  "_insecureConnectionTextEnabled",
      //  "security.insecure_connection_text.enabled"
      //);
      //return this._insecureConnectionTextEnabled;
      return false;
    },
    get _insecureConnectionTextPBModeEnabled() {
      //delete this._insecureConnectionTextPBModeEnabled;
      //XPCOMUtils.defineLazyPreferenceGetter(
      //  this,
      //  "_insecureConnectionTextPBModeEnabled",
      //  "security.insecure_connection_text.pbmode.enabled"
      //);
      //return this._insecureConnectionTextPBModeEnabled;
      return false;
    },
    /*
    get _protectionsPanelEnabled() {
      delete this._protectionsPanelEnabled;
      XPCOMUtils.defineLazyPreferenceGetter(
        this,
        "_protectionsPanelEnabled",
        "browser.protections_panel.enabled",
        false
      );
      return this._protectionsPanelEnabled;
    get _httpsOnlyModeEnabled() {
      delete this._httpsOnlyModeEnabled;
      XPCOMUtils.defineLazyPreferenceGetter(
        this,
        "_httpsOnlyModeEnabled",
        "dom.security.https_only_mode"
      );
      return this._httpsOnlyModeEnabled;
    },
    get _httpsOnlyModeEnabledPBM() {
      delete this._httpsOnlyModeEnabledPBM;
      XPCOMUtils.defineLazyPreferenceGetter(
        this,
        "_httpsOnlyModeEnabledPBM",
        "dom.security.https_only_mode_pbm"
      );
      return this._httpsOnlyModeEnabledPBM;
    }, */
    get _useGrayLockIcon() {
      //delete this._useGrayLockIcon;
      //XPCOMUtils.defineLazyPreferenceGetter(
      //  this,
      //  "_useGrayLockIcon",
      //  "security.secure_connection_icon_color_gray",
      //  false
      //);
      //return this._useGrayLockIcon;
      return true;
    },

    get _urlBar() {
      delete this._urlBar;
      return (this._urlBar = document.getElementById("urlbar"));
    },
    get _identityBox() {
      delete this._identityBox;
      return (this._identityBox = document.getElementById("identity-box"));
    },
    get _identityIconLabel() {
      delete this._identityIconLabel;
      return (this._identityIconLabel = document.getElementById(
        "identity-icon-label"
      ));
    },
    get _identityIcon() {
      delete this._identityIcon;
      return (this._identityIcon = document.getElementById("identity-icon"));
    },

    /**
     * Helper to parse out the important parts of _secInfo (of the SSL cert in
     * particular) for use in constructing identity UI strings
     */
    getIdentityData() {
      var result = {};
      var cert = this._secInfo?.serverCert;
      if (!cert) {
        return null;
      }

      // Human readable name of Subject
      result.subjectOrg = cert.organization;

      // SubjectName fields, broken up for individual access
      if (cert.subjectName) {
        result.subjectNameFields = {};
        cert.subjectName.split(",").forEach(function(v) {
          var field = v.split("=");
          this[field[0]] = field[1];
        }, result.subjectNameFields);

        // Call out city, state, and country specifically
        result.city = result.subjectNameFields.L;
        result.state = result.subjectNameFields.ST;
        result.country = result.subjectNameFields.C;
      }

      // Human readable name of Certificate Authority
      result.caOrg = cert.issuerOrganization || cert.issuerCommonName;
      result.cert = cert;

      return result;
    },

    /**
     * Update the identity user interface for the page currently being displayed.
     *
     * This examines the SSL certificate metadata, if available, as well as the
     * connection type and other security-related state information for the page.
     *
     * @param state
     *        Bitmask provided by nsIWebProgressListener.onSecurityChange.
     * @param uri
     *        nsIURI for which the identity UI should be displayed, already
     *        processed by createExposableURI.
     */
    updateIdentity(state, uri, isInternalOverride) {
      //let shouldHidePopup = this._uri && this._uri.spec != uri.spec;
      this._state = state;
      let browser = getBrowser();

      // Firstly, populate the state properties required to display the UI. See
      // the documentation of the individual properties for details.
      this.setURI(uri, isInternalOverride);
      this._secInfo = browser?.securityUI?.secInfo;
      this._isSecureContext = browser?.securityUI?.isSecureContext;

      // Then, update the user interface with the available data.
      this.refreshIdentityBlock();
      // Handle a location change while the Control Center is focused
      // by closing the popup (bug 1207542)
      //if (shouldHidePopup && this._popupInitialized) {
      //  PanelMultiView.hidePopup(this._identityPopup);
      //}

      // NOTE: We do NOT update the identity popup (the control center) when
      // we receive a new security state on the existing page (i.e. from a
      // subframe). If the user opened the popup and looks at the provided
      // information we don't want to suddenly change the panel contents.

      // Finally, if there are warnings to issue, issue them
      if (this._isCertDistrustImminent) {
        let consoleMsg = Cc["@mozilla.org/scripterror;1"].createInstance(
          Ci.nsIScriptError
        );
        let windowId = browser.innerWindowID;
        let message = BrowseInTab.getLocaleMessage(
          "certImminentDistrust.message"
        );
        // Use uri.prePath instead of initWithSourceURI() so that these can be
        // de-duplicated on the scheme+host+port combination.
        consoleMsg.initWithWindowID(
          message,
          uri.prePath,
          null,
          0,
          0,
          Ci.nsIScriptError.warningFlag,
          "SSL",
          windowId
        );
        Services.console.logMessage(consoleMsg);
      }
    },

    /**
     * Updates the identity block user interface with the data from this object.
     */
    refreshIdentityBlock() {
      if (!this._identityBox) {
        return;
      }

      // If this condition is true, the URL bar will have an "invalid"
      // pageproxystate, which will hide the security indicators. Thus, we can
      // safely avoid updating the security UI.
      //
      // This will also filter out intermediate about:blank loads to avoid
      // flickering the identity block and doing unnecessary work.
      if (this._hasInvalidPageProxyState() && !this._isSecureInternalUI) {
        return;
      }

      this._refreshIdentityIcons();

      //this._refreshPermissionIcons();

      // Hide the shield icon if it is a chrome page.
      //gProtectionsHandler._trackingProtectionIconContainer.classList.toggle(
      //  "chromeUI",
      //  this._isSecureInternalUI
      //);
    },

    /**
     * Returns whether the current URI results in an "invalid"
     * URL bar state, which effectively means hidden security
     * indicators.
     */
    _hasInvalidPageProxyState() {
      return (
        !this._uriHasHost &&
        this._uri &&
        BrowseInTab.gURLBar.isBlankPageURL(this._uri.spec) &&
        !this._uri.schemeIs("moz-extension")
      );
    },

    /**
     * Updates the security identity in the identity block.
     */
    _refreshIdentityIcons() {
      let icon_label = "";
      let tooltip = "";
      this._identityIcon.style.listStyleImage = "";

      if (this._isSecureInternalUI) {
        // This is a secure internal Firefox page.
        this._identityBox.className = "chromeUI";
        // Security error if set in css.
        this._identityIcon.style.listStyleImage =
          "url(chrome://branding/content/icon48.png)";
        let brandBundle = document.getElementById("bundle_brand");
        icon_label = brandBundle.getString("brandShorterName");
      } else if (this._pageExtensionPolicy) {
        // This is a WebExtension page.
        this._identityBox.className = "extensionPage";
        let extensionName = this._pageExtensionPolicy.name;
        icon_label = BrowseInTab.getLocaleMessage(
          "identity.extension.label",
          extensionName
        );
      } else if (this._uriHasHost && this._isSecureConnection) {
        // This is a secure connection.
        this._identityBox.className = "verifiedDomain";
        if (this._isMixedActiveContentBlocked) {
          this._identityBox.classList.add("mixedActiveBlocked");
        }
        if (!this._isCertUserOverridden) {
          // It's a normal cert, verifier is the CA Org.
          tooltip = this.getIdentityData()
            ? BrowseInTab.getLocaleMessage(
                "identity.identified.verifier",
                this.getIdentityData().caOrg
              )
            : "";
        }
      } else if (this._isBrokenConnection) {
        // This is a secure connection, but something is wrong.
        this._identityBox.className = "unknownIdentity";

        if (this._isMixedActiveContentLoaded) {
          this._identityBox.classList.add("mixedActiveContent");
        } else if (this._isMixedActiveContentBlocked) {
          this._identityBox.classList.add(
            "mixedDisplayContentLoadedActiveBlocked"
          );
        } else if (this._isMixedPassiveContentLoaded) {
          this._identityBox.classList.add("mixedDisplayContent");
        } else {
          this._identityBox.classList.add("weakCipher");
        }
      } else if (this._isAboutCertErrorPage) {
        // We show a warning lock icon for 'about:certerror' page.
        this._identityBox.className = "certErrorPage";
      } else if (this._isAboutHttpsOnlyErrorPage) {
        // We show a not secure lock icon for 'about:httpsonlyerror' page.
        this._identityBox.className = "httpsOnlyErrorPage";
      } else if (this._isAboutNetErrorPage || this._isAboutBlockedPage) {
        // Network errors and blocked pages get a more neutral icon
        this._identityBox.className = "unknownIdentity";
      } else if (this._isPotentiallyTrustworthy) {
        // This is a local resource (and shouldn't be marked insecure).
        this._identityBox.className = "localResource";
      } else {
        // This is an insecure connection.
        let warnOnInsecure =
          this._insecureConnectionIconEnabled ||
          (this._insecureConnectionIconPBModeEnabled &&
            PrivateBrowsingUtils?.isWindowPrivate(window));
        let className = warnOnInsecure ? "notSecure" : "unknownIdentity";
        this._identityBox.className = className;
        tooltip = warnOnInsecure
          ? BrowseInTab.getLocaleMessage("identity.notSecure.tooltip")
          : "";

        let warnTextOnInsecure =
          this._insecureConnectionTextEnabled ||
          (this._insecureConnectionTextPBModeEnabled &&
            PrivateBrowsingUtils?.isWindowPrivate(window));
        if (warnTextOnInsecure) {
          icon_label = BrowseInTab.getLocaleMessage("identity.notSecure.label");
          this._identityBox.classList.add("notSecureText");
        }
      }

      if (this._isCertUserOverridden) {
        this._identityBox.classList.add("certUserOverridden");
        // Cert is trusted because of a security exception, verifier is a special string.
        tooltip = BrowseInTab.getLocaleMessage(
          "identity.identified.verified_by_you"
        );
      }

      // Gray lock icon for secure connections if pref set
      this._identityIcon.toggleAttribute(
        "lock-icon-gray",
        this._useGrayLockIcon
      );

      // Push the appropriate strings out to the UI
      this._identityIcon.setAttribute("tooltiptext", tooltip);

      if (this._pageExtensionPolicy) {
        let extensionName = this._pageExtensionPolicy.name;
        this._identityIcon.setAttribute(
          "tooltiptext",
          BrowseInTab.getLocaleMessage(
            "identity.extension.tooltip",
            extensionName
          )
        );
      }

      this._identityIconLabel.setAttribute("tooltiptext", tooltip);
      this._identityIconLabel.setAttribute("value", icon_label);
      this._identityIconLabel.collapsed = !icon_label;

      setTimeout(() => {
        // Ensure first load of branding icon (large) is sized by css before show.
        this._urlBar.removeAttribute("hidden");
      }, 300);

      BrowseInTab.DEBUG &&
        console.debug(
          "gIdentityHandler._refreshIdentityIcons: className - " +
            this._identityBox.className
        );
    },

    setURI(uri, isInternalOverride) {
      if (uri.schemeIs("view-source")) {
        uri = Services.io.newURI(uri.spec.replace(/^view-source:/i, ""));
      }
      this._uri = uri;

      BrowseInTab.DEBUG &&
        console.debug("gIdentityHandler.setURI: className - " + uri.spec);

      try {
        // Account for file: urls and catch when "" is the value
        this._uriHasHost = !!this._uri.host;
      } catch (ex) {
        this._uriHasHost = false;
      }

      this._isSecureInternalUI =
        (uri.schemeIs("about") &&
          this._secureInternalPages.test(uri.pathQueryRef)) ||
        isInternalOverride;

      this._pageExtensionPolicy = WebExtensionPolicy.getByURI(uri);

      // Create a channel for the sole purpose of getting the resolved URI
      // of the request to determine if it's loaded from the file system.
      this._isURILoadedFromFile = false;
      let chanOptions = { uri: this._uri, loadUsingSystemPrincipal: true };
      let resolvedURI;
      try {
        resolvedURI = NetUtil.newChannel(chanOptions).URI;
        if (resolvedURI.schemeIs("jar")) {
          // Given a URI "jar:<jar-file-uri>!/<jar-entry>"
          // create a new URI using <jar-file-uri>!/<jar-entry>
          resolvedURI = NetUtil.newURI(resolvedURI.pathQueryRef);
        }
        // Check the URI again after resolving.
        this._isURILoadedFromFile = resolvedURI.schemeIs("file");
      } catch (ex) {
        // NetUtil's methods will throw for malformed URIs and the like
      }
    },
  },

  Observer: {
    observe(subject, topic, data) {
      BrowseInTab.TRACE &&
        console.debug("Observer: " + topic + ", data - " + data);
      if (topic == "mail-tabs-session-restored") {
        BrowseInTab.DEBUG &&
          console.debug("Observer: " + topic + ", data - " + data);
        BrowseInTab.onMailTabsSessionRestored(false);
        // Remove, only get this once on startup.
        Services.obs.removeObserver(
          BrowseInTab.Observer,
          "mail-tabs-session-restored"
        );
      } else if (topic == BrowseInTab.obsTopicStorageLocalChanged) {
        BrowseInTab.DEBUG &&
          console.debug("Observer: " + topic + ", data - " + data);
        BrowseInTab.onStorageLocalChanged(JSON.parse(data));
      } else if (topic == "domwindowopened" && subject instanceof Window) {
        BrowseInTab.onDomWindowOpened(subject);
      }
    },
  },

  TabMonitor: {
    monitorName: "BrowseInTab",
    onTabTitleChanged(tab) {
      let tabInfo = tab;
      BrowseInTab.DEBUG &&
        console.debug(
          "onTabTitleChanged: tabId:type:title:uri - " +
            tabInfo.tabId +
            ":" +
            tabInfo.mode.type +
            ":" +
            tabInfo.title +
            ":" +
            tabInfo.browser?.currentURI.spec
        );
      // If there's no title (data: uri, eg).
      if (tabInfo.mode.type == "contentTab" && !tabInfo.title) {
        let uri = tabInfo.browser.currentURI;
        tabInfo.browser.contentDocument.title = uri.spec;
      }
    },
    onTabPersist(tab) {
      let tabInfo = tab;
      let zoomFactor;
      if (tabInfo.tabNode.selected && BrowseInTab.globalZoomEnabledPref) {
        // Save the globalZoomFactor in the selected tab.
        zoomFactor = BrowseInTab.globalZoomFactor ?? 1;
      } else {
        zoomFactor = tabInfo._ext[this.monitorName]?.zoomFactor ?? 1;
      }
      if (zoomFactor == 1) {
        // If no zoomFactor or default zoomFactor, don't persist anything.
        return null;
      }
      return { zoomFactor };
    },
    onTabRestored(tab, state, isFirstTab) {
      this.onTabOpened(tab, tab.firstTab, null);
      let tabInfo = tab;
      BrowseInTab.DEBUG &&
        console.debug(
          "onTabRestored: tabId:type:title - " +
            tabInfo.tabId +
            ":" +
            tabInfo.mode.type +
            ":" +
            tabInfo.title
        );
      tabInfo._ext[this.monitorName] = state;
      BrowseInTab.DEBUG && console.debug("onTabRestored: _ext state -> ");
      BrowseInTab.DEBUG && console.debug(tabInfo._ext[this.monitorName]);
    },
    async onTabSwitched(tab, oldTab) {
      let tabInfo = tab;
      BrowseInTab.DEBUG &&
        console.debug(
          "onTabSwitched: id:type:selected:tabId:busy:title - " +
            tabInfo.browser?.id +
            ":" +
            tabInfo.mode.type +
            ":" +
            tabInfo.tabNode.selected +
            ":" +
            tabInfo.tabId +
            ":" +
            tabInfo.busy +
            ":" +
            tabInfo.title
        );

      if (tabInfo.tabNode?.linkedPanel == "mailContent") {
        // These are |folder, message, glodaList| tab types.
        // Get the real browser, could be multimessage.
        // TODO: other types like chat, could load a real browser after tab
        // open, and may not have a getBrowser() method; handle these lameoes.
        tabInfo.browser = tabInfo.mode.getBrowser();
      }

      let documentURI = tabInfo.browser?.documentURI;
      BrowseInTab.DEBUG &&
        console.debug("onTabSwitched: url - " + documentURI?.spec);

      // Set the reload button to the correct state for this tab.
      BrowseInTab.e("reload-button")?.toggleAttribute(
        "displaystop",
        tabInfo.busy
      );

      if (!SessionStoreManager._restored) {
        return;
      }

      BrowseInTab.setMailToolbar(tabInfo);
      BrowseInTab.clearUrlToolbarUrl();

      if (["chat", "glodaFacet"].includes(tabInfo.mode.name)) {
        // Wait for these load. Chat will only resolve if an account has
        // signon at startup enabled.
        await BrowseInTab.waitForBrowserLoad(tabInfo);
      }

      // Glodafacet view wrapper for zoom is wonky and wrecks it for others;
      // fix the focus. Also set the global ZoomManager on the wrapper.
      if (["glodaFacet"].includes(tabInfo.mode.name) && tabInfo.browser) {
        tabInfo.browser.focus();
        tabInfo.panel.querySelector(
          "iframe"
        ).contentDocument.defaultView.ZoomManager = ZoomManager;
      }
      if (["glodaFacet"].includes(oldTab.mode.name) && oldTab.browser) {
        oldTab.browser.ownerGlobal.frameElement.blur();
      }

      if (tabInfo.browser) {
        tabInfo.browser.userTypedValue = null;
      }
      BrowseInTab.setUrlToolbar(tabInfo);

      let uri = tabInfo.browser?.currentURI || document.documentURIObject;
      // Some tab switches (news: for one) cause a reload(), so don't update
      // here.
      let isInternalOverride = BrowseInTab.isInternalOverride(tabInfo, uri);
      if (!isInternalOverride) {
        BrowseInTab.gIdentityHandler.updateIdentity(
          tabInfo.securityState,
          uri,
          isInternalOverride
        );
      }
    },
    async onTabOpened(tab, firstTab, oldTab) {
      let tabInfo = tab;
      BrowseInTab.DEBUG &&
        console.debug(
          "onTabOpened: tabId:type:title - " +
            tabInfo.tabId +
            ":" +
            tabInfo.mode.type +
            ":" +
            tabInfo.title
        );

      if (["chat", "glodaFacet"].includes(tabInfo.mode.name)) {
        // Wait for these load. Chat will only resolve if an account has
        // signon at startup enabled.
        await BrowseInTab.waitForBrowserLoad(tabInfo);
      }

      if (tabInfo.tabNode.selected) {
        tabInfo.tabNode.parentElement.ensureElementIsVisible(tabInfo.tabNode);
      }

      BrowseInTab.InitializeTab(tabInfo);
    },
  },

  BrowserController: {
    supportsCommand(command) {
      BrowseInTab.DEBUG &&
        console.debug("supportsCommand: command - " + command);
      switch (command) {
        case "Browser:Back_BiT":
        case "Browser:Forward_BiT":
        case "Browser:Reload_BiT":
        case "Browser:ReloadSkipCache_BiT":
        case "Browser:ReloadOrDuplicate_BiT":
        case "Browser:Stop_BiT":
          return true;
        default:
          return false;
      }
    },
    isCommandEnabled(command) {
      BrowseInTab.DEBUG &&
        console.debug("isCommandEnabled: command - " + command);
      let tabmail = BrowseInTab.e("tabmail");
      let browser = tabmail?.getBrowserForSelectedTab();
      if (!browser) {
        return false;
      }
      switch (command) {
        case "Browser:Forward_BiT":
          if (browser.sessionHistory) {
            return browser.canGoForward;
          }
          return false;
        case "Browser:Back_BiT":
          if (browser.sessionHistory) {
            return browser.canGoBack;
          }
          return false;
        case "Browser:Reload_BiT":
        case "Browser:ReloadSkipCache_BiT":
        case "Browser:ReloadOrDuplicate_BiT":
        case "Browser:Stop_BiT":
          let currentTabInfo = tabmail?.currentTabInfo;
          if (
            browser.documentURI.spec != "about:blank" &&
            browser.id != "multimessage" &&
            (currentTabInfo?.tabNode.linkedPanel == "mailContent" ||
              ["contentTab", "preferencesTab"].includes(
                currentTabInfo.mode.type
              ))
          ) {
            return true;
          }
          return false;
        default:
          return false;
      }
    },
    doCommand(command, event) {
      if (!this.isCommandEnabled(command)) {
        return;
      }
      BrowseInTab.DEBUG &&
        console.debug(
          "doCommand: command:shiftKey - " + command + ":" + event?.shiftKey
        );
      let tabmail = BrowseInTab.e("tabmail");
      let browser = tabmail?.getBrowserForSelectedTab() ?? null;
      if (!browser) {
        return;
      }
      switch (command) {
        case "Browser:Forward_BiT":
          if (browser.sessionHistory) {
            browser.goForward();
          }
          break;
        case "Browser:Back_BiT":
          if (browser.sessionHistory) {
            browser.goBack();
          }
          break;
        case "Browser:Reload_BiT":
        case "Browser:ReloadSkipCache_BiT":
        case "Browser:ReloadOrDuplicate_BiT":
          let currentTabInfo = tabmail?.currentTabInfo;
          if (currentTabInfo?.tabNode.linkedPanel == "mailContent") {
            ReloadMessage();
          } else {
            let reloadFlags = Ci.nsIWebNavigation.LOAD_FLAGS_NONE;
            if (command == "Browser:ReloadSkipCache_BiT" || event?.shiftKey) {
              reloadFlags =
                Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_PROXY |
                Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE;
            }
            browser.reloadWithFlags(reloadFlags);
          }
          break;
        case "Browser:Stop_BiT":
          browser.webNavigation.stop(Ci.nsIWebNavigation.STOP_ALL);
          break;
      }
    },
    onEvent(event) {},
  },

  /*
   * We could do a lot of awaiting load promises. Or this.
   */
  waitForBrowserLoadTimeMaxTries: 20,
  waitForBrowserLoadTimeIncrementsMS: 50,
  async waitForBrowserLoad(tabInfo) {
    BrowseInTab.DEBUG && console.debug("waitForBrowserLoad: START url -> ");
    BrowseInTab.DEBUG && console.debug(tabInfo.browser?.documentURI.spec);
    const sleep = ms => {
      return new Promise(resolve => setTimeout(resolve, ms));
    };
    let tries = 0;
    while (
      ++tries < this.waitForBrowserLoadTimeMaxTries &&
      (!tabInfo.browser || tabInfo.browser.contentDocument.URL == "about:blank")
    ) {
      await sleep(this.waitForBrowserLoadTimeIncrementsMS);
    }
    BrowseInTab.DEBUG && console.debug("waitForBrowserLoad: DONE url -> ");
    BrowseInTab.DEBUG && console.debug(tabInfo.browser?.documentURI.spec);
  },

  onDomWindowOpened(window) {
    this.DEBUG && console.debug("onDomWindowOpened: START  window ->");
    this.DEBUG && console.debug(window);

    window.addEventListener("load", event => {
      let win = event.target;
      let winType = win.documentElement.getAttribute("windowtype");
      this.DEBUG &&
        console.debug("onDomWindowOpened: load winType - " + winType);

      // Ensure chrome zoom applies to this window too.
      if (this.customZoomEnabledPref) {
        if ("style" in win.documentElement) {
          this.DEBUG && console.debug(win);
          let chromeFontSizeZoom =
            this.DEFAULT_FONTSIZE * (this.chromeZoomFactorPref / 100) + "px";
          // Add the stylesheets.
          this.InitializeStyleSheet(
            win,
            "skin/browseintab.css",
            this.addonName,
            false
          );
          win.documentElement.style.fontSize = chromeFontSizeZoom;
          win.documentElement.setAttribute("browseintabzoom", true);
        }
      }

      // For content-base header link in compose window only.
      if (
        winType != "msgcompose" ||
        !this.showContentBasePref ||
        Services.prefs.getIntPref("mail.show_headers") == 2
      ) {
        // If pref is off or if set to show all headers this isn't necessary.
        return;
      }

      win.documentElement.addEventListener(
        "compose-window-init",
        () => {
          this.DEBUG && console.debug("onDomWindowOpened:compose-window-init");
          win.defaultView.gMsgCompose.RegisterStateListener(
            BrowseInTab.ComposeStateListener
          );
        },
        { once: true }
      );
    });
  },

  /*
   * Listener for compose window state.
   */
  ComposeStateListener: {
    ComposeProcessDone() {},
    SaveInFolderDone() {},
    NotifyComposeFieldsReady() {},
    NotifyComposeBodyReady() {
      BrowseInTab.DEBUG && console.debug("NotifyComposeBodyReady: START");
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
      BrowseInTab.DEBUG && console.debug(tr);

      try {
        // The message's url is stored in the Content-Base header.
        MsgHdrToMimeMessage(
          msgHdr,
          null,
          (aMsgHdr, aMimeMsg) => {
            let contentBase = aMimeMsg && aMimeMsg.headers["content-base"];
            BrowseInTab.DEBUG &&
              console.debug(`NotifyComposeBodyReady: 1${label} ${contentBase}`);
            if (!contentBase || !contentBase[0]) {
              return;
            }
            contentBase = BrowseInTab.getFormattedUrl(contentBase);
            BrowseInTab.DEBUG &&
              console.debug(`NotifyComposeBodyReady: 2${label} ${contentBase}`);
            tr.cells[0].textContent = label;
            tr.cells[1].textContent = contentBase;
            tbody.append(tr);
            BrowseInTab.DEBUG && console.debug(tbody);
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
      BrowseInTab.DEBUG &&
        console.debug("AddonListener.resetSession: who - " + who);
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
    onEnabling(addon) {
      BrowseInTab.DEBUG && console.debug("AddonListener.onEnabling");
    },
    onOperationCancelled(addon) {
      BrowseInTab.DEBUG && console.debug("AddonListener.onOperationCancelled");
    },
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
      gContextMenu.inAMessage ||
      gContextMenu.inThreadPane ||
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
      gContextMenu.enableItem(
        "mailContext-reload",
        BrowseInTab.BrowserController.isCommandEnabled("Browser:Reload_BiT")
      );
    }
    // These only needs showing if we're not on something special.
    gContextMenu.showItem("context-back_BiT", notOnSpecialItem);
    gContextMenu.showItem("context-forward_BiT", notOnSpecialItem);
    gContextMenu.showItem("mailContext-reload", notOnSpecialItem);
  },

  onLinkPopupShowing(event) {
    //document.popupNode.click();
    let popupMenu = event.target;
    let contextMenu = new nsContextMenu(popupMenu, event.shiftKey);
    this.DEBUG && console.debug("onLinkPopupShowing: contextMenu -> ");
    this.DEBUG && console.debug(contextMenu);
    this.DEBUG && console.debug(document.popupNode);
    let show = contextMenu.onLink && !contextMenu.onMailtoLink;
    this.DEBUG && console.debug("onLinkPopupShowing: show - " + show);
    if (show) {
      popupMenu.setAttribute("linknode", true);
    } else {
      popupMenu.removeAttribute("linknode");
    }
  },

  /*
   * Used as an onclick handler for UI elements with link-like behavior.
   * e.g. onclick="checkForMiddleClick(this, event);"
   *
   * from browser.js
   */
  checkForMiddleClick(node, event) {
    // We should be using the disabled property here instead of the attribute,
    // but some elements that this function is used with don't support it (e.g.
    // menuitem).
    if (node.getAttribute("disabled") == "true") {
      return;
    }

    if (event.button == 1) {
      // Execute the node's oncommand or command.
      let cmdEvent = document.createEvent("xulcommandevent");
      cmdEvent.initCommandEvent(
        "command",
        true,
        true,
        window,
        0,
        event.ctrlKey,
        event.altKey,
        event.shiftKey,
        event.metaKey,
        event,
        event.mozInputSource
      );
      node.dispatchEvent(cmdEvent);

      // If the middle-click was on part of a menu, close the menu.
      // (Menus close automatically with left-click but not with middle-click.)
      //closeMenus(event.target);
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

    this.DEBUG && console.debug("contentAreaClick: href - " + href);
    this.savedContentAreaClickEvent = event;

    if (["mailto:", "nntp:", "news:"].includes(new URL(href).protocol)) {
      let linkNode = event.target;
      this.DEBUG && console.debug(linkNode.attributes);
      if (linkNode.hasAttribute("target")) {
        linkNode.setAttribute("_target", linkNode.getAttribute("target"));
        linkNode.removeAttribute("target");
      }
      this.DEBUG && console.debug(linkNode.attributes);
    }
    this.DEBUG && console.debug(this.savedContentAreaClickEvent);
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
   * Ensure url is formatted for utf8 display, both IDN and path parts.
   *
   * @param {String} url   - A url.
   */
  getFormattedUrl(url) {
    try {
      makeURI(url);
      return decodeURIComponent(url);
    } catch (ex) {
      // IDN domains will fail; escape them then decode.
      return decodeURIComponent(escape(url));
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
    this.DEBUG &&
      console.debug("openUrlPopupLink: url:where - " + url + ":" + where);
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
    this.DEBUG && console.debug("openLinkInContentTab: START url - " + linkUrl);
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
    if (this.inMouseWheelZoom) {
      delete this.inMouseWheelZoom;
      return;
    }
    event = event || this.savedContentAreaClickEvent;
    let linkNode = event && event.target;
    let loadInTab = this.linkClickLoadsInTabPref;

    this.DEBUG &&
      console.debug(
        "openLinkExternally: loadInTab:url - " + loadInTab + ":" + url
      );
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
      this.DEBUG && console.debug("openLinkExternally: awill openExternally");
      this._openLinkExternally(url);
      this.savedContentAreaClickEvent = null;
      return;
    }
    this.DEBUG && console.debug("openLinkExternally: url - " + url);
    let bgLoad = this.linkClickLoadsInBackgroundTabPref;
    if (event && event.shiftKey) {
      bgLoad = !bgLoad;
    }

    this.DEBUG && console.debug("openLinkExternally: about to openInTab ");
    this.openInTab(url, bgLoad, "tab");
  },

  openInTab(url, bgLoad, where) {
    this.DEBUG &&
      console.debug(
        "openInTab: where:bgLoad:url- " + where + ":" + bgLoad + ":" + url
      );
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
   * System content tabs such as Preferences and other chrome links where the
   * linkNode element is an XUL text-link element are not supported currently.
   */
  siteClickHandler(event) {
    let linkNode = event.target;
    this.DEBUG &&
      console.debug("siteClickHandler: linkNode.href - " + linkNode.href);

    if (linkNode instanceof XULElement) {
      // This is a custom element is="text-link" xul element that is handled by
      // MailGlue._handleLink() -> tabmail.openTab() or (now old 68) special
      // handling in class="text-link" in aboutAddonsExtra.js.
      this.DEBUG &&
        console.debug(
          "siteClickHandler: xul linkNode.value - " + linkNode.value
        );
      return false;
    }

    let href;
    if (linkNode instanceof HTMLAnchorElement) {
      href = linkNode.href;
    } else {
      // We may be nested inside of a link node.
      let target = event.originalTarget;
      while (target && !(target instanceof HTMLAnchorElement)) {
        target = target.parentNode;
      }
      linkNode = target;
      href = linkNode?.href;
    }

    if (
      !href ||
      !href.startsWith("http") ||
      event.detail == 2 ||
      event.button == 2
    ) {
      return true;
    }

    if (
      linkNode.ownerDocument.URL.startsWith("about:") ||
      linkNode.ownerDocument.URL.startsWith("chrome:")
    ) {
      this.DEBUG &&
        console.debug("siteClickHandler: about: or chrome: html linkNode");
      event.preventDefault();
      this.openLinkExternally(href, event);
      return false;
    }

    this.DEBUG && console.debug(linkNode.attributes);

    urlSecurityCheck(href, linkNode.ownerDocument.nodePrincipal);

    let forceInCurrentTab = this.forceLinkClickLoadsInCurrentTabPref;
    if (event.ctrlKey || this.savedCtrlKey) {
      forceInCurrentTab = !forceInCurrentTab;
      this.savedCtrlKey = false;
    }

    this.DEBUG &&
      console.debug(
        "siteClickHandler: forceInCurrentTab - " + forceInCurrentTab
      );
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
      this.openInTab(href, event && event.shiftKey, "tab");
    }
    this.DEBUG && console.debug(linkNode.attributes);
    return false;
  },

  /*
   * From ZoomUI.jsm.
   */
  updateZoomUI(browser, animate = false) {
    if (!browser) {
      let tabmail = this.e("tabmail");
      browser = tabmail?.getBrowserForSelectedTab();
    }

    let win = browser?.ownerGlobal.top || window.top;

    let appMenuZoomReset = win.document.getElementById(
      "appMenu-zoomReset-button"
    );
    let customizableZoomControls = win.document.getElementById("zoom-controls");
    let customizableZoomReset = win.document.getElementById(
      "zoom-reset-button"
    );
    let urlbarZoomButton = win.document.getElementById("urlbar-zoom-button");
    let zoomFactor = Math.round(win.ZoomManager.zoom * 100);

    let defaultZoom = 100;

    if (
      // These <browser>s are in enterResponsiveMode() state, so zoom needs to
      // be set this way.
      browser?.id == "multimessage" ||
      browser?.id.startsWith("chromeTabBrowser") ||
      browser?.documentURI.spec ==
        "chrome://messenger/content/glodaFacetView.xhtml"
    ) {
      browser.browsingContext.fullZoom = zoomFactor / 100;
    }

    this.DEBUG && console.debug("updateZoomUI: zoomFactor - " + zoomFactor);
    // Hide urlbar zoom button if zoom is at the default zoom level,
    // if we're viewing an about:blank page with an empty/null
    // principal, if the PDF viewer is currently open,
    // or if the customizable control is in the toolbar.

    urlbarZoomButton.hidden =
      defaultZoom == zoomFactor ||
      (browser &&
        browser.currentURI.spec == "about:blank" &&
        browser.id != "messagepane" &&
        (!browser.contentPrincipal ||
          browser.contentPrincipal.isNullPrincipal)) ||
      (browser &&
        browser.contentPrincipal &&
        browser.contentPrincipal.URI &&
        browser.contentPrincipal.URI.spec ==
          "resource://pdf.js/web/viewer.html") ||
      (customizableZoomControls &&
        customizableZoomControls.getAttribute("cui-areatype") == "toolbar");

    let label = this.getLocaleMessage("urlbarZoomButtonLabel", [zoomFactor]);

    if (appMenuZoomReset) {
      appMenuZoomReset.setAttribute("label", label);
    }
    if (customizableZoomReset) {
      customizableZoomReset.setAttribute("label", label);
    }
    if (!urlbarZoomButton.hidden) {
      if (animate && !win.gReduceMotion) {
        urlbarZoomButton.setAttribute("animate", "true");
      } else {
        urlbarZoomButton.removeAttribute("animate");
      }
      urlbarZoomButton.setAttribute("label", label);
    }
  },
}; // BrowseInTab

BrowseInTab.DEBUG &&
  console.debug(
    "BrowseInTab: readystate:session_restored - " +
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

  BrowseInTab.onLoad();
})();
