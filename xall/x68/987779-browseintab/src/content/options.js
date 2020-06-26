"use strict";

/* globals browser */

var BrowseInTabOptions = {
  e(element) {
    return document.getElementById(element);
  },

  maxContentTabsDefault: 10,
  get contentBaseHeaderDefault() {
    return browser.i18n.getMessage("contentBaseHeader");
  },

  async onLoad() {
    // console.debug("BrowseInTabOptions.onLoad:");
    this.initializeStrings();

    /* eslint-disable */
    this.maxContentTabs = this.e("maxContentTabs");
    this.tabsLoadInBackground = this.e("tabsLoadInBackground");
    this.linkClickLoadsInTab = this.e("linkClickLoadsInTab");
    this.linkClickOptions = this.e("linkClickOptions");
    this.linkClickLoadsInBackgroundTab = this.e("linkClickLoadsInBackgroundTab");
    this.forceLinkClickLoadsInCurrentTab = this.e("forceLinkClickLoadsInCurrentTab");
    this.showContentBase = this.e("showContentBase");
    this.contentBaseLabel = this.e("contentBaseLabel");
    this.contentBaseHeader = this.e("contentBaseHeader");
    this.useFirefoxCompatUserAgent = this.e("useFirefoxCompatUserAgent");
    this.restoreDefaults = this.e("restoreDefaults");

    await this.restoreOptions();
    this.e("container").removeAttribute("hidden");

    this.maxContentTabs.addEventListener(
      "change",
      this.saveOptions.bind(this)
    );
    this.tabsLoadInBackground.addEventListener(
      "change",
      this.saveOptions.bind(this)
    );
    this.linkClickLoadsInTab.addEventListener(
      "change",
      this.saveOptions.bind(this)
    );
    this.linkClickLoadsInBackgroundTab.addEventListener(
      "change",
      this.saveOptions.bind(this)
    );
    this.forceLinkClickLoadsInCurrentTab.addEventListener(
      "change",
      this.saveOptions.bind(this)
    );
    this.showContentBase.addEventListener(
      "change",
      this.saveOptions.bind(this)
    );
    this.contentBaseHeader.addEventListener(
      "change",
      this.saveOptions.bind(this)
    );
    this.useFirefoxCompatUserAgent.addEventListener(
      "change",
      this.saveOptions.bind(this)
    );
    this.restoreDefaults.addEventListener(
      "click",
      this.defaultOptions.bind(this));
    /* eslint-enable */
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
    if (checked) {
      element.disabled = false;
      element.style.color = "";
    } else {
      element.disabled = true;
      element.style.color = "GrayText";
    }
  },

  saveOptions() {
    // Just set them all.
    /* eslint-disable */
    let storageLocalData = {
      maxContentTabs: Number(this.maxContentTabs.value),
      tabsLoadInBackground: this.tabsLoadInBackground.checked,
      linkClickLoadsInTab: this.linkClickLoadsInTab.checked,
      linkClickLoadsInBackgroundTab: this.linkClickLoadsInBackgroundTab.checked,
      forceLinkClickLoadsInCurrentTab: this.forceLinkClickLoadsInCurrentTab.checked,
      showContentBase: this.showContentBase.checked,
      contentBaseHeader: this.contentBaseHeader.value,
      useFirefoxCompatUserAgent: this.useFirefoxCompatUserAgent.checked,
    };

    this.updateElements(this.linkClickOptions, this.linkClickLoadsInTab.checked);
    this.updateElements(this.contentBaseLabel, this.showContentBase.checked);
    this.updateElements(this.contentBaseHeader, this.showContentBase.checked);
    /* eslint-enable */

    browser.storage.local.set(storageLocalData);

    let response = result => {
      // console.debug("BrowseInTabOptions.saveOptions: result - ");
      // console.dir(result);
    };
    let onError = error => {
      console.error(`BrowseInTabOptions.saveOptions: ${error}`);
    };

    let sending = browser.runtime.sendMessage({ storageLocalData });
    sending.then(response, onError);
  },

  async restoreOptions() {
    let setCurrentChoice = result => {
      this.maxContentTabs.value =
        "maxContentTabs" in result
          ? result.maxContentTabs
          : this.maxContentTabsDefault;
      this.tabsLoadInBackground.checked =
        "tabsLoadInBackground" in result ? result.tabsLoadInBackground : true;
      this.linkClickLoadsInTab.checked =
        "linkClickLoadsInTab" in result ? result.linkClickLoadsInTab : false;
      this.linkClickLoadsInBackgroundTab.checked =
        "linkClickLoadsInBackgroundTab" in result
          ? result.linkClickLoadsInBackgroundTab
          : false;
      this.forceLinkClickLoadsInCurrentTab.checked =
        "forceLinkClickLoadsInCurrentTab" in result
          ? result.forceLinkClickLoadsInCurrentTab
          : true;
      this.showContentBase.checked =
        "showContentBase" in result ? result.showContentBase : true;
      this.contentBaseHeader.value =
        "contentBaseHeader" in result
          ? result.contentBaseHeader
          : this.contentBaseHeaderDefault;
      this.useFirefoxCompatUserAgent.checked =
        "useFirefoxCompatUserAgent" in result
          ? result.useFirefoxCompatUserAgent
          : false;
      // console.debug("BrowseInTabOptions.restoreOptions: result - ");
      // console.dir(result);

      this.updateElements(
        this.linkClickOptions,
        this.linkClickLoadsInTab.checked
      );
      this.updateElements(this.contentBaseLabel, this.showContentBase.checked);
      this.updateElements(this.contentBaseHeader, this.showContentBase.checked);
    };

    let onError = error => {
      console.error(`BrowseInTabOptions.restoreOptions: ${error}`);
    };

    let getting = browser.storage.local.get([
      "maxContentTabs",
      "tabsLoadInBackground",
      "linkClickLoadsInTab",
      "linkClickLoadsInBackgroundTab",
      "forceLinkClickLoadsInCurrentTab",
      "showContentBase",
      "contentBaseHeader",
      "useFirefoxCompatUserAgent",
    ]);
    await getting.then(setCurrentChoice, onError);
  },

  async defaultOptions() {
    await browser.storage.local.clear();
    await this.restoreOptions();
    let response = result => {
      // console.debug("BrowseInTabOptions.defaultOptions: result - ");
      // console.dir(result);
    };
    let onError = error => {
      console.error(`BrowseInTabOptions.defaultOptions: ${error}`);
    };
    let sending = browser.runtime.sendMessage({ storageLocalData: {} });
    sending.then(response, onError);
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
