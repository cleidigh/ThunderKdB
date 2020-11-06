"use strict";

/* globals browser */

var BrowseInTabOptions = {
  DEBUG: false,
  e(element) {
    return document.getElementById(element);
  },
  defaultPanelId: "linksPanel",
  maxContentTabsDefault: 10,
  kShowMailToolbarDefault: 0,
  kShowMailToolbarWebPage: 1,
  kShowMailToolbarAll: 2,
  kShowUrlToolbarWebPage: 0,
  kShowUrlToolbarAll: 1,
  get contentBaseHeaderDefault() {
    return browser.i18n.getMessage("contentBaseHeader");
  },

  async onLoad() {
    this.DEBUG && console.debug("BrowseInTabOptions.onLoad:");
    this.initializeStrings();

    /* eslint-disable */
    this.tabs = this.e("tabs");
    this.tabButtonLinks = this.e("tabButtonLinks");
    this.tabsLoadInBackground = this.e("tabsLoadInBackground");
    this.linkClickLoadsInTab = this.e("linkClickLoadsInTab");
    this.linkClickOptionsFieldset = this.e("linkClickOptionsFieldset");
    this.linkClickLoadsInBackgroundTab = this.e("linkClickLoadsInBackgroundTab");
    this.forceLinkClickLoadsInCurrentTab = this.e("forceLinkClickLoadsInCurrentTab");
    this.showContentBase = this.e("showContentBase");
    this.contentBaseFieldset = this.e("contentBaseFieldset");
    this.contentBaseHeader = this.e("contentBaseHeader");
    this.useFirefoxCompatUserAgent = this.e("useFirefoxCompatUserAgent");
    this.tabButtonTabsToolbars = this.e("tabButtonTabsToolbars");
    this.maxContentTabs = this.e("maxContentTabs");
    this.mailToolbarRadioForm = this.e("mailToolbarRadioForm");
    this.urlToolbarRadioForm = this.e("urlToolbarRadioForm");
    this.restoreDefaults = this.e("restoreDefaults");
    /* eslint-enable */

    await this.restoreOptions();
    this.e("container").removeAttribute("hidden");
    this.initPanelEventListeners(document.body, this);
  },

  initializeStrings() {
    document.querySelectorAll("[data-localekey]").forEach(element => {
      let message = browser.i18n.getMessage(element.dataset.localekey);
      let localeAttribute = element.dataset.localeattribute;
      if (localeAttribute) {
        element.setAttribute(localeAttribute, message);
      } else {
        element.textContent = message;
      }
    });
  },

  updateElements(element, checked) {
    element.disabled = !checked;
    if (element.classList.contains("browser-style")) {
      element.classList.toggle("disabled", !checked);
    }
  },

  /**
   * Generic required initialization for panel pages.
   *
   * @param {Document|HTMLElement} parent - The document of the page or a
   *                                        specific element.
   * @param {Object} controller           - Object with handleEvent().
   */
  initPanelEventListeners(parent, controller) {
    if (!("querySelectorAll" in parent) || !("handleEvent" in controller)) {
      return;
    }

    // Add oninput/onchange listeners to <input> and <select> elements.
    for (let element of parent.querySelectorAll("input, button")) {
      if (element.localName == "button" || element.type == "button") {
        element.addEventListener("click", controller);
        element.addEventListener("keypress", controller);
        element.addEventListener("focus", controller);
        element.addEventListener("blur", controller);
      } else if (
        element.type == "checkbox" ||
        element.type == "color" ||
        element.type == "file" ||
        element.type == "number" ||
        element.type == "radio" ||
        element.type == "select-one" ||
        element.type == "textarea"
      ) {
        element.addEventListener("change", controller);
      } else {
        element.addEventListener("input", controller);
      }
    }

    // No form submit.
    for (let formElement of parent.querySelectorAll("form")) {
      formElement.addEventListener("submit", event => event.preventDefault());
    }
  },

  /**
   * The generic event handler for |this|.
   */
  handleEvent(event) {
    let target = event.target;
    this.DEBUG &&
      console.debug(
        "BrowseInTabOptions.handleEvent: target.id:event.type - " +
          target.id +
          ":" +
          event.type
      );
    switch (event.type) {
      case "input":
      case "change":
        this.onChange(event);
        break;
      case "click":
        target.removeAttribute("keyfocus");
        this.onClick(event);
        break;
      case "keypress":
        // Ensure this comes after a click event also dispatched on keypress.
        window.setTimeout(() => {
          target.setAttribute("keyfocus", true);
        });
        break;
      case "focus":
        target.setAttribute("keyfocus", true);
        break;
      case "blur":
        target.removeAttribute("keyfocus");
        target.blur();
        break;
      default:
        break;
    }
  },

  onClick(event) {
    let target = event.target;
    switch (target.id) {
      case "restoreDefaults":
        this.defaultOptions();
        break;
      case "tabButtonLinks":
      case "tabButtonTabsToolbars":
        this.onTabClick(event);
        break;
      default:
        break;
    }
  },

  onChange(event) {
    let target = event.target;
    this.saveOption(target);
  },

  onTabClick(event) {
    if (event.type != "click" || event.button != 0) {
      return;
    }
    let tabToSelect = event.target;
    this.selectTab(tabToSelect, true);
  },

  /**
   * Mouse or key selection of a tab. Supports loading a |panelsrc| attribute
   * in an iframe, or showing an inline |panelid| attribute element.
   *
   * @param {HTMLButtonElement} tabToSelect  - Tab button element.
   * @param {Boolean} focus                  - If true, focus the tab.
   *
   * @returns HTMLButtonElement tabToSelect  - Selected tab element.
   */
  async selectTab(tabToSelect, focus) {
    this.DEBUG &&
      console.debug(
        "BrowseInTabOptions.selectTab: panel - " +
          tabToSelect.getAttribute("panelid")
      );
    tabToSelect = tabToSelect || this.tabs.firstElementChild;
    let panel;
    // Current selection.
    let selTab = this.tabs.querySelector("[selected]");
    if (selTab) {
      if (tabToSelect.id != selTab.id) {
        selTab.removeAttribute("selected");
        selTab.removeAttribute("aria-selected");
        let selPanelId = selTab.getAttribute("panelid");
        panel = this.e(selPanelId);
        if (panel) {
          panel.hidden = panel.disabled = true;
        }
      }
    }

    tabToSelect.setAttribute("selected", "true");
    tabToSelect.setAttribute("aria-selected", "true");
    if (focus) {
      tabToSelect.focus();
    }

    let panelIdToSelect = tabToSelect.getAttribute("panelid");
    panel = this.e(panelIdToSelect);
    if (panel) {
      panel.hidden = panel.disabled = false;
      if (panelIdToSelect != this.defaultPanelId) {
        this.setStorageLocal({ lastSelectedTabPanelId: panelIdToSelect });
      } else {
        await browser.storage.local.remove("lastSelectedTabPanelId");
        this.setStorageLocal();
      }
      this.lastSelectedTabPanelId = panelIdToSelect;
    }
  },

  async saveOption(changeElement) {
    /* eslint-disable */
    let storageLocalData;
    switch (changeElement.id) {
      case "tabsLoadInBackground":
        storageLocalData = {
          tabsLoadInBackground: this.tabsLoadInBackground.checked
        };
        break;
      case "linkClickLoadsInTab":
        storageLocalData = {
          linkClickLoadsInTab: this.linkClickLoadsInTab.checked
        };
        this.updateElements(this.linkClickOptionsFieldset, this.linkClickLoadsInTab.checked);
        break;
      case "linkClickLoadsInBackgroundTab":
        storageLocalData = {
          linkClickLoadsInBackgroundTab: this.linkClickLoadsInBackgroundTab.checked
        };
        break;
      case "forceLinkClickLoadsInCurrentTab":
        storageLocalData = {
          forceLinkClickLoadsInCurrentTab: this.forceLinkClickLoadsInCurrentTab.checked
        };
        break;
      case "showContentBase":
        storageLocalData = {
          showContentBase: this.showContentBase.checked
        };
        this.updateElements(this.contentBaseFieldset, this.showContentBase.checked);
        break;
      case "contentBaseHeader":
        storageLocalData = {
          contentBaseHeader: this.contentBaseHeader.value
        };
        break;
      case "useFirefoxCompatUserAgent":
        storageLocalData = {
          useFirefoxCompatUserAgent: this.useFirefoxCompatUserAgent.checked
        };
        break;
      case "maxContentTabs":
        storageLocalData = {
          maxContentTabs: Number(this.maxContentTabs.value)
        };
        break;
      case "showMailToolbarDefaultTabs":
        await browser.storage.local.remove("showMailToolbar");
        break;
      case "showMailToolbarWebpageTabs":
      case "showMailToolbarAllTabs":
        storageLocalData = {
          showMailToolbar: Number(this.mailToolbarRadioForm.elements.showMailToolbar.value)
        };
        break;
      case "showUrlToolbarWebpageTabs":
      case "showUrlToolbarAllTabs":
        storageLocalData = {
          showUrlToolbar: Number(this.urlToolbarRadioForm.elements.showUrlToolbar.value)
        };
        break;
      default:
        return;
    }
    /* eslint-enable */

    this.setStorageLocal(storageLocalData);
  },

  async setStorageLocal(storageLocalData) {
    if (storageLocalData) {
      await browser.storage.local.set(storageLocalData);
    }

    this.DEBUG &&
      console.debug("BrowseInTabOptions.setStorageLocal: new storage.local ->");
    this.DEBUG && console.debug(await browser.storage.local.get());
  },

  async restoreOptions() {
    let setCurrentChoice = result => {
      this.tabsLoadInBackground.checked = result?.tabsLoadInBackground || true;
      this.linkClickLoadsInTab.checked = result?.linkClickLoadsInTab || false;
      this.linkClickLoadsInBackgroundTab.checked =
        result?.linkClickLoadsInBackgroundTab || false;
      this.forceLinkClickLoadsInCurrentTab.checked =
        result?.forceLinkClickLoadsInCurrentTab || true;
      this.showContentBase.checked = result?.showContentBase || true;
      this.contentBaseHeader.value =
        result?.contentBaseHeader || this.contentBaseHeaderDefault;
      this.useFirefoxCompatUserAgent.checked =
        result?.useFirefoxCompatUserAgent || false;
      this.maxContentTabs.value =
        result?.maxContentTabs || this.maxContentTabsDefault;
      this.mailToolbarRadioForm.elements.showMailToolbar.value =
        result?.showMailToolbar || this.kShowMailToolbarDefault;
      this.urlToolbarRadioForm.elements.showUrlToolbar.value =
        result?.showUrlToolbar || this.kShowUrlToolbarWebPage;

      let panelIdToSelect =
        result?.lastSelectedTabPanelId ||
        this.lastSelectedTabPanelId ||
        this.defaultPanelId;
      let tab = this.tabs.querySelector(`button[panelid="${panelIdToSelect}"]`);
      this.selectTab(tab, false);

      /* eslint-disable */
      this.updateElements(this.linkClickOptionsFieldset, this.linkClickLoadsInTab.checked);
      this.updateElements(this.contentBaseFieldset, this.showContentBase.checked);
      /* eslint-enable */

      this.DEBUG &&
        console.debug("BrowseInTabOptions.restoreOptions: result -> ");
      this.DEBUG && console.debug(result);
    };

    let onError = error => {
      console.error(`BrowseInTabOptions.restoreOptions: ${error}`);
    };

    let getting = browser.storage.local.get([
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
    ]);
    await getting.then(setCurrentChoice, onError);
  },

  async defaultOptions() {
    await browser.storage.local.clear();
    await this.restoreOptions();
  },
}; // BrowseInTabOptions

(async function() {
  if (!["interactive", "complete"].includes(document.readyState)) {
    await new Promise(resolve =>
      document.addEventListener("DOMContentLoaded", resolve, { once: true })
    );
  }

  BrowseInTabOptions.onLoad();
})();
