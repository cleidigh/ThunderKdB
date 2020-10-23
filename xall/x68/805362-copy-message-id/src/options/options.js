const prefixInput = document.querySelector("#prefix");
const suffixInput = document.querySelector("#suffix");
const copyBracketsInput = document.querySelector("#copyBrackets");
const urlEncodeInput = document.querySelector("#urlEncode");
const rawInput = document.querySelector("#raw");

/*
Set text boxes to automatically resize.
*/
function autoResize() {
  this.style.height = "5px";
  this.style.height = this.scrollHeight + "px";
}

prefixInput.addEventListener("input", autoResize, false);
suffixInput.addEventListener("input", autoResize, false);

/*
Store the currently selected settings using browser.storage.local.
*/
function storeSettings() {
  browser.storage.local.set({
    copyID: {
      prefix: prefixInput.value,
      suffix: suffixInput.value,
      copyBrackets: copyBrackets.checked,
      urlEncode: urlEncode.checked,
      raw: raw.checked
    }
  });
}

/*
Update the options UI with the settings values retrieved from storage,
or the default settings if the stored settings are empty.
*/
function updateUI(storedSettings) {
  if (storedSettings.copyID) {
    prefixInput.value = storedSettings.copyID.prefix;
    suffixInput.value = storedSettings.copyID.suffix;
    copyBracketsInput.checked = storedSettings.copyID.copyBrackets;
    urlEncodeInput.checked = storedSettings.copyID.urlEncode;
    rawInput.checked = storedSettings.copyID.raw;
  }
}

function onError(e) {
  console.error(e);
}

/*
On opening the options page, fetch stored settings and update the UI with them.
*/
const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(updateUI, onError);

/*
On checkbox change, save the currently selected settings.
*/
copyBracketsInput.addEventListener("change", storeSettings);
urlEncodeInput.addEventListener("change", storeSettings);
rawInput.addEventListener("change", storeSettings);

/*
On textbox blur, save the currently selected settings.
*/
prefixInput.addEventListener("blur", storeSettings);
suffixInput.addEventListener("blur", storeSettings);
