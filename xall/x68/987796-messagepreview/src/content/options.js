"use strict";

/* globals browser */

var MessagePreviewOptions = {
  // These four are also found in messagePreview.js.
  kPreviewTooltipMaxSize: 4000,
  kPreviewTextMaxSize: 40,
  kPreviewAuto: 0,
  kPreviewHover: 1,

  async onLoad() {
    // console.log("MessagePreviewOptions.onLoad:");
    this.initializeElements();
    /* eslint-disable */
    this.previewTooltipEnabled = document.getElementById("previewTooltipEnabled");
    this.previewTooltipFieldset = document.getElementById("previewTooltipFieldset");
    this.previewTooltipMaxSize = document.getElementById("previewTooltipMaxSize");
    this.previewTextEnabled = document.getElementById("previewTextEnabled");
    this.previewTextFieldset = document.getElementById("previewTextFieldset");
    this.previewTextMaxSize = document.getElementById("previewTextMaxSize");
    this.previewRadioFieldset = document.getElementById("previewRadioFieldset");
    this.previewGetRadioForm = document.getElementById("previewGetRadioForm");
    this.imapAllowDownload = document.getElementById("imapAllowDownload");
    this.restoreDefaults = document.getElementById("restoreDefaults");

    await this.restoreOptions();
    this.updateElements();
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

  initializeElements() {
    // NOTE: Adding browser_style to options_ui or class="browser-style" has
    // no effect.
    let i18nString = browser.i18n.getMessage;
    let html = `
      <div id="grid">
        <div>
          <input id="previewTooltipEnabled"
                 type="checkbox"></input>
          <label for="previewTooltipEnabled">${i18nString(
            "previewTooltipEnabled"
          )}</label>
        </div>

        <fieldset id="previewTooltipFieldset">
          <label for="previewTooltipMaxSize">${i18nString(
            "previewTooltipMaxSize"
          )}</label>
          <input id="previewTooltipMaxSize"
                 class="maxsize"
                 type="number"
                 min="0"</input>
        </fieldset>
        <br/>

        <div>
          <input id="previewTextEnabled"
                 type="checkbox"></input>
          <label for="previewTextEnabled">${i18nString(
            "previewTextEnabled"
          )}</label>
        </div>

        <fieldset id="previewTextFieldset">
          <label for="previewTextMaxSize">${i18nString(
            "previewTextMaxSize"
          )}</label>
          <input id="previewTextMaxSize"
                 class="maxsize"
                 type="number"
                 min="0"</input>
        </fieldset>
        <br/>

        <fieldset id="previewRadioFieldset">
          <label for="previewGetRadioForm">${i18nString(
            "previewGetOption"
          )}</label>
          <form id="previewGetRadioForm">
            <div>
              <input id="previewAuto" type="radio" name="preview" value="0">
              <label for="previewAuto">${i18nString("previewGetAuto")}</label>
            </div>
            <div>
              <input id="previewHover" type="radio" name="preview" value="1" checked>
              <label for="previewHover">${i18nString("previewGetHover")}</label>
            </div>
          </form>
        </fieldset>
        <br/>

        <div>
          <input id="imapAllowDownload"
                 type="checkbox"></input>
          <label for="imapAllowDownload">${i18nString(
            "imapAllowDownload"
          )}</label>
        </div>
      </div>

      <br/>
      <button id="restoreDefaults">${i18nString(
        "previewRestoreDefaults"
      )}</button>
    `;

    let range = document.createRange();
    let parent = document.getElementById("container");
    range.selectNode(parent);
    // eslint-disable-next-line no-unsanitized/method
    let documentFragment = range.createContextualFragment(html);
    parent.appendChild(documentFragment);
  },

  updateElements() {
    this.previewTooltipFieldset.disabled = !this.previewTooltipEnabled.checked;
    this.previewTextFieldset.disabled = !this.previewTextEnabled.checked;
    this.previewRadioFieldset.disabled = !(
      this.previewTooltipEnabled.checked || this.previewTextEnabled.checked
    );
  },

  // Just set all prefs at once, only a few.
  saveOptions(event) {
    this.updateElements();
    let storageLocalData = {
      previewTooltipEnabled: this.previewTooltipEnabled.checked,
      previewTooltipMaxSize: Number(this.previewTooltipMaxSize.value),
      previewTextEnabled: this.previewTextEnabled.checked,
      previewTextMaxSize: Number(this.previewTextMaxSize.value),
      previewGetOption: Number(this.previewGetRadioForm.elements.preview.value),
      imapAllowDownload: this.imapAllowDownload.checked,
    };

    browser.storage.local.set(storageLocalData);

    let response = result => {
      // console.debug("MessagePreviewOptions.saveOptions: result - ");
      // console.dir(result);
    };
    let onError = error => {
      console.error(`MessagePreviewOptions.saveOptions: ${error}`);
    };

    let sending = browser.runtime.sendMessage({ storageLocalData });
    sending.then(response, onError);
  },

  async restoreOptions() {
    let setCurrentChoice = result => {
      this.previewTooltipEnabled.checked =
        "previewTooltipEnabled" in result ? result.previewTooltipEnabled : true;
      this.previewTooltipMaxSize.value =
        "previewTooltipMaxSize" in result
          ? result.previewTooltipMaxSize
          : this.kPreviewTooltipMaxSize;
      this.previewTextEnabled.checked =
        "previewTextEnabled" in result ? result.previewTextEnabled : false;
      this.previewTextMaxSize.value =
        "previewTextMaxSize" in result
          ? result.previewTextMaxSize
          : this.kPreviewTextMaxSize;
      this.previewGetRadioForm.elements.preview.value =
        "previewGetOption" in result
          ? result.previewGetOption
          : this.kPreviewHover;
      this.imapAllowDownload.checked =
        "imapAllowDownload" in result ? result.imapAllowDownload : true;
      // console.log("MessagePreviewOptions.restoreOptions: result - ");
      // console.dir(result);
    };

    let onError = error => {
      console.error(`MessagePreviewOptions.restoreOptions: ${error}`);
    };

    let getting = browser.storage.local.get([
      "previewGetOption",
      "previewTooltipEnabled",
      "previewTextEnabled",
      "imapAllowDownload",
    ]);
    await getting.then(setCurrentChoice, onError);
  },

  async defaultOptions(event) {
    await browser.storage.local.clear();
    await this.restoreOptions();
    this.saveOptions(event);
  },
};

document.addEventListener(
  "DOMContentLoaded",
  () => {
    MessagePreviewOptions.onLoad();
  },
  { once: true }
);
