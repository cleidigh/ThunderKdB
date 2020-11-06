"use strict";

/* globals browser */

var MessagePreviewOptions = {
  DEBUG: false,
  // These four are also found in messagePreview.js.
  kPreviewTooltipMaxSize: 4000,
  kPreviewTextMaxSize: 40,
  kPreviewAuto: 0,
  kPreviewHover: 1,

  async onLoad() {
    this.DEBUG && console.debug("MessagePreviewOptions.onLoad:");
    this.initializeStrings();

    /* eslint-disable */
    this.previewTooltipEnabled = document.getElementById("previewTooltipEnabled");
    this.previewTooltipFieldset = document.getElementById("previewTooltipFieldset");
    this.previewTooltipMaxSize = document.getElementById("previewTooltipMaxSize");
    this.previewTextEnabled = document.getElementById("previewTextEnabled");
    this.previewTextFieldset = document.getElementById("previewTextFieldset");
    this.previewTextMaxSize = document.getElementById("previewTextMaxSize");
    this.previewRadioGroup = document.getElementById("previewRadioGroup");
    this.previewRadioFieldset = document.getElementById("previewRadioFieldset");
    this.previewGetRadioForm = document.getElementById("previewGetRadioForm");
    this.imapAllowDownload = document.getElementById("imapAllowDownload");
    this.restoreDefaults = document.getElementById("restoreDefaults");

    await this.restoreOptions();
    document.getElementById("container").removeAttribute("hidden");

    this.previewTooltipEnabled.addEventListener("change", e => this.saveOptions(e));
    this.previewTooltipMaxSize.addEventListener("change", e => this.saveOptions(e));
    this.previewTextEnabled.addEventListener("change", e => this.saveOptions(e));
    this.previewTextMaxSize.addEventListener("change", e => this.saveOptions(e));
    this.imapAllowDownload.addEventListener("change", e => this.saveOptions(e));
    this.previewGetRadioForm.addEventListener("change", e => this.saveOptions(e));
    this.restoreDefaults.addEventListener("click", e => this.defaultOptions(e));
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

  updateElements() {
    this.previewTooltipFieldset.disabled = !this.previewTooltipEnabled.checked;
    this.previewTooltipFieldset.classList.toggle(
      "disabled",
      !this.previewTooltipEnabled.checked
    );
    this.previewTextFieldset.disabled = !this.previewTextEnabled.checked;
    this.previewTextFieldset.classList.toggle(
      "disabled",
      !this.previewTextEnabled.checked
    );
    this.previewRadioGroup.classList.toggle(
      "disabled",
      !(this.previewTooltipEnabled.checked || this.previewTextEnabled.checked)
    );
    this.previewRadioFieldset.disabled = !(
      this.previewTooltipEnabled.checked || this.previewTextEnabled.checked
    );
    this.previewGetRadioForm.classList.toggle(
      "disabled",
      !(this.previewTooltipEnabled.checked || this.previewTextEnabled.checked)
    );
  },

  saveOptions(event) {
    let changeElement = event.target;
    let storageLocalData;
    switch (changeElement.id) {
      case "previewTooltipEnabled":
        storageLocalData = {
          previewTooltipEnabled: this.previewTooltipEnabled.checked,
        };
        break;
      case "previewTooltipMaxSize":
        storageLocalData = {
          previewTooltipMaxSize: Number(this.previewTooltipMaxSize.value),
        };
        break;
      case "previewTextEnabled":
        storageLocalData = {
          previewTextEnabled: this.previewTextEnabled.checked,
        };
        break;
      case "previewTextMaxSize":
        storageLocalData = {
          previewTextMaxSize: Number(this.previewTextMaxSize.value),
        };
        break;
      case "previewAuto":
      case "previewHover":
        /* eslint-disable */
        storageLocalData = {
          previewGetOption: Number(this.previewGetRadioForm.elements.preview.value),
        };
        /* eslint-enable */
        break;
      case "imapAllowDownload":
        storageLocalData = {
          imapAllowDownload: this.imapAllowDownload.checked,
        };
        break;
      default:
        return;
    }

    this.updateElements();
    this.setStorageLocal(storageLocalData);
  },

  async setStorageLocal(storageLocalData) {
    if (storageLocalData) {
      await browser.storage.local.set(storageLocalData);
    }

    this.DEBUG &&
      console.debug(
        "MessagePreviewOptions.setStorageLocal: new storage.local ->"
      );
    this.DEBUG && console.debug(await browser.storage.local.get());
  },

  async restoreOptions() {
    let setCurrentChoice = result => {
      this.previewTooltipEnabled.checked =
        result?.previewTooltipEnabled || true;
      this.previewTooltipMaxSize.value =
        result?.previewTooltipMaxSize || this.kPreviewTooltipMaxSize;
      /* eslint-disable */
      this.previewTextEnabled.checked =
        result?.previewTextEnabled || false;
      /* eslint-enable */
      this.previewTextMaxSize.value =
        result?.previewTextMaxSize || this.kPreviewTextMaxSize;
      this.previewGetRadioForm.elements.preview.value =
        result?.previewGetOption || this.kPreviewHover;
      this.imapAllowDownload.checked = result?.imapAllowDownload || true;

      this.updateElements();

      this.DEBUG &&
        console.debug("MessagePreviewOptions.restoreOptions: result -> ");
      this.DEBUG && console.debug(result);
    };

    let onError = error => {
      console.error(`MessagePreviewOptions.restoreOptions: ${error}`);
    };

    let getting = browser.storage.local.get([
      "previewTooltipEnabled",
      "previewTooltipMaxSize",
      "previewTextEnabled",
      "previewTextMaxSize",
      "previewGetOption",
      "imapAllowDownload",
    ]);
    await getting.then(setCurrentChoice, onError);
  },

  async defaultOptions(event) {
    await browser.storage.local.clear();
    await this.restoreOptions();
  },
}; // MessagePreviewOptions

(async function() {
  if (!["interactive", "complete"].includes(document.readyState)) {
    await new Promise(resolve =>
      document.addEventListener("DOMContentLoaded", resolve, { once: true })
    );
  }

  MessagePreviewOptions.onLoad();
})();
