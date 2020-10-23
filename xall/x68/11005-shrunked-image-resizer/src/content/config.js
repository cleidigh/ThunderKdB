/* globals tp_defaults, tb_minsize, r_noresize, r_small, r_medium, r_large, r_custom, l_width,
   tb_width, l_height, tb_height, l_measure, s_quality, tp_advanced, cb_resample, cb_exif,
   cb_orient, cb_gps, cb_logenabled, b_resizeonsend, s_resizeonsend */

for (let element of document.querySelectorAll("[id]")) {
  window[element.id] = element;
}
for (let element of document.querySelectorAll("[data-l10n-content]")) {
  element.textContent = browser.i18n.getMessage(element.getAttribute("data-l10n-content"));
}
for (let element of document.querySelectorAll("[data-l10n-title]")) {
  element.title = browser.i18n.getMessage(element.getAttribute("data-l10n-title"));
}
for (let element of document.querySelectorAll("[data-l10n-label]")) {
  element.label = browser.i18n.getMessage(element.getAttribute("data-l10n-label"));
}

var settingFromThisPage = false;

async function getAll() {
  let prefs = await browser.storage.local.get({
    "default.maxWidth": 500,
    "default.maxHeight": 500,
    "default.quality": 75,
    "default.saveDefault": true,
    fileSizeMinimum: 100,
    // "log.enabled": false,
    "options.exif": true,
    "options.orientation": true,
    "options.gps": true,
    "options.resample": true,
    resizeAttachmentsOnSend: false,
  });

  tb_minsize.value = prefs.fileSizeMinimum;
  if (prefs["default.maxWidth"] == prefs["default.maxHeight"]) {
    switch (prefs["default.maxWidth"]) {
      case -1:
        r_noresize.checked = true;
        break;
      case 500:
        r_small.checked = true;
        break;
      case 800:
        r_medium.checked = true;
        break;
      case 1200:
        r_large.checked = true;
        break;
      default:
        r_custom.checked = true;
        tb_width.value = prefs["default.maxWidth"];
        tb_height.value = prefs["default.maxHeight"];
        break;
    }
  } else {
    r_custom.checked = true;
    tb_width.value = prefs["default.maxWidth"];
    tb_height.value = prefs["default.maxHeight"];
  }
  s_quality.value = prefs["default.quality"];
  cb_resample.checked = prefs["options.resample"];
  cb_exif.checked = prefs["options.exif"];
  cb_orient.checked = prefs["options.orient"];
  cb_gps.checked = prefs["options.gps"];
  // cb_logenabled.checked = prefs["log.enabled"];
  s_resizeonsend.value = prefs.resizeAttachmentsOnSend;

  l_width.disabled = tb_width.disabled = l_height.disabled = tb_height.disabled = !r_custom.checked;
  cb_orient.disabled = cb_gps.disabled = !cb_exif.checked;
}

addEventListener("load", async () => {
  window.browser = window.browser.extension.getBackgroundPage().browser;

  await getAll();

  r_noresize.addEventListener("change", setSize);
  r_small.addEventListener("change", setSize);
  r_medium.addEventListener("change", setSize);
  r_large.addEventListener("change", setSize);
  r_custom.addEventListener("change", setSize);
  tb_height.addEventListener("change", setSize);
  tb_width.addEventListener("change", setSize);

  s_quality.addEventListener("change", setQuality);

  cb_resample.addEventListener("change", setCheckbox);
  cb_exif.addEventListener("change", event => {
    cb_orient.disabled = cb_gps.disabled = !cb_exif.checked;
    setCheckbox(event);
  });
  cb_orient.addEventListener("change", setCheckbox);
  cb_gps.addEventListener("change", setCheckbox);
  // cb_logenabled.addEventListener("change", setCheckbox);

  s_resizeonsend.addEventListener("change", setSendOption);

  browser.storage.onChanged.addListener(() => {
    if (!settingFromThisPage) {
      getAll();
    }
  });
});

async function setSize() {
  let maxWidth, maxHeight;
  let checked = document.querySelector('input[name="rg_size"]:checked');
  switch (checked) {
    case r_noresize:
      maxWidth = -1;
      maxHeight = -1;
      break;
    case r_small:
      maxWidth = 500;
      maxHeight = 500;
      break;
    case r_medium:
      maxWidth = 800;
      maxHeight = 800;
      break;
    case r_large:
      maxWidth = 1200;
      maxHeight = 1200;
      break;
    case r_custom:
      maxWidth = parseInt(tb_width.value, 10);
      maxHeight = parseInt(tb_height.value, 10);
      break;
  }

  l_width.disabled = tb_width.disabled = l_height.disabled = tb_height.disabled =
    checked != r_custom;

  settingFromThisPage = true;
  await browser.storage.local.set({
    "default.maxWidth": maxWidth,
    "default.maxHeight": maxHeight,
  });
  settingFromThisPage = false;
}

async function setQuality() {
  settingFromThisPage = true;
  await browser.storage.local.set({
    "default.quality": parseInt(s_quality.value, 10),
  });
  settingFromThisPage = false;
}

async function setCheckbox({ target }) {
  settingFromThisPage = true;
  await browser.storage.local.set({ [target.name]: target.checked });
  settingFromThisPage = false;
}

async function setSendOption() {
  settingFromThisPage = true;
  await browser.storage.local.set({
    resizeAttachmentsOnSend: s_resizeonsend.value == "true",
  });
  settingFromThisPage = false;
}
