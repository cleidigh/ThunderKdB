/* eslint-env webextensions */

/* globals rg_size, r_noresize, r_small, r_medium, r_large, r_custom, l_width, tb_width, l_height, tb_height, l_measure
   b_previewarrows, b_previous, b_next, l_previewarrows, i_previewthumb, l_previewfilename, l_previeworiginalsize,
   l_previeworiginalfilesize, l_previewresized, l_previewresizedfilesize, cb_savedefault,
   b_ok, b_cancel */

var params = new URL(location.href).searchParams;
var tabId = parseInt(params.get("tabId"), 10);
var count = parseInt(params.get("count"), 10);

var images = [];
var currentIndex = 0;
var maxWidth, maxHeight;

for (let element of document.querySelectorAll("[id]")) {
  window[element.id] = element;
}
for (let element of document.querySelectorAll("[data-l10n-content]")) {
  element.textContent = browser.i18n.getMessage(element.getAttribute("data-l10n-content"));
}
for (let element of document.querySelectorAll("[data-l10n-title]")) {
  element.title = browser.i18n.getMessage(element.getAttribute("data-l10n-title"));
}

browser.runtime.getPlatformInfo().then(({ os }) => {
  if (os != "win") {
    b_ok.style.order = 1;
  }
});

/* exported load */
addEventListener("load", async () => {
  let prefs = await browser.storage.local.get({
    "default.maxWidth": 500,
    "default.maxHeight": 500,
    "default.saveDefault": true,
  });

  maxWidth = prefs["default.maxWidth"];
  maxHeight = prefs["default.maxHeight"];

  if (maxWidth == -1 && maxHeight == -1) {
    r_noresize.checked = true;
  } else if (maxWidth == 500 && maxHeight == 500) {
    r_small.checked = true;
  } else if (maxWidth == 800 && maxHeight == 800) {
    r_medium.checked = true;
  } else if (maxWidth == 1200 && maxHeight == 1200) {
    r_large.checked = true;
  } else {
    r_custom.checked = true;
    tb_width.value = maxWidth;
    tb_height.value = maxHeight;
  }

  cb_savedefault.checked = prefs["default.saveDefault"];

  setSize();
  loadImage(0);
});

r_noresize.addEventListener("change", setSize);
r_small.addEventListener("change", setSize);
r_medium.addEventListener("change", setSize);
r_large.addEventListener("change", setSize);
r_custom.addEventListener("change", setSize);
tb_height.addEventListener("change", setSize);
tb_width.addEventListener("change", setSize);

function setSize() {
  let checked = rg_size.querySelector("input:checked");
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

  updateEstimate();
}

function humanSize(size) {
  let unit = "bytes";
  if (size >= 1048576) {
    size = size / 1048576;
    unit = "megabytes";
  } else if (size >= 1024) {
    size = size / 1024;
    unit = "kilobytes";
  }

  return size.toFixed(size >= 9.95 ? 0 : 1) + "\u2006" + browser.i18n.getMessage(`unit.${unit}`);
}

async function loadImage(index) {
  if (index < 0) {
    index += count;
  } else if (index >= count) {
    index -= count;
  }
  currentIndex = index;
  l_previewarrows.textContent = `${index + 1} / ${count}`;

  if (!images[index]) {
    let file = await browser.runtime.sendMessage({
      type: "fetchFile",
      tabId,
      index,
    });

    images[index] = { file, url: URL.createObjectURL(file), previewCache: new Map() };
  }

  i_previewthumb.src = images[index].url;
  l_previewfilename.textContent = images[index].file.name;
  l_previeworiginalfilesize.textContent = browser.i18n.getMessage("preview.originalfilesize", [
    humanSize(images[index].file.size),
  ]);
}

i_previewthumb.addEventListener("load", updateEstimate);

async function updateEstimate() {
  l_previeworiginalsize.textContent = browser.i18n.getMessage("preview.originalsize", [
    i_previewthumb.naturalWidth,
    i_previewthumb.naturalHeight,
  ]);

  let scale = 1;
  if (maxWidth > 0 && maxHeight > 0) {
    scale = Math.min(
      1,
      Math.min(maxWidth / i_previewthumb.naturalWidth, maxHeight / i_previewthumb.naturalHeight)
    );
  }
  if (scale == 1) {
    l_previewresized.textContent = browser.i18n.getMessage("preview.notresized");
    l_previewresizedfilesize.textContent = "";
  } else {
    let newWidth = Math.floor(i_previewthumb.naturalWidth * scale + 0.01);
    let newHeight = Math.floor(i_previewthumb.naturalHeight * scale + 0.01);
    let { "default.quality": quality } = await browser.storage.local.get({
      "default.quality": 75,
    });
    let cacheKey = `${newWidth}x${newHeight}x${quality}`;

    let estimate;
    if (images[currentIndex].previewCache.has(cacheKey)) {
      estimate = images[currentIndex].previewCache.get(cacheKey);
    } else {
      l_previewresizedfilesize.textContent = browser.i18n.getMessage(
        "preview.resizedfilesize.estimating"
      );
      estimate = await browser.shrunked.estimateSize(
        images[currentIndex].file,
        maxWidth,
        maxHeight,
        quality
      );
      images[currentIndex].previewCache.set(cacheKey, estimate);
    }
    l_previewresized.textContent = browser.i18n.getMessage("preview.resized", [
      newWidth,
      newHeight,
    ]);
    l_previewresizedfilesize.textContent = browser.i18n.getMessage("preview.resizedfilesize", [
      humanSize(estimate),
    ]);
  }
}

b_previous.addEventListener("click", () => loadImage(currentIndex - 1));
b_next.addEventListener("click", () => loadImage(currentIndex + 1));

b_ok.addEventListener("click", async () => {
  let prefsToStore = {};
  if (cb_savedefault.checked) {
    prefsToStore["default.maxWidth"] = maxWidth;
    prefsToStore["default.maxHeight"] = maxHeight;
  }
  prefsToStore["default.saveDefault"] = cb_savedefault.checked;
  await browser.storage.local.set(prefsToStore);

  let { "default.quality": quality } = await browser.storage.local.get({
    "default.quality": 75,
  });
  await browser.runtime.sendMessage({
    type: "doResize",
    tabId,
    maxWidth,
    maxHeight,
    quality,
  });

  let thisWindow = await browser.windows.getCurrent();
  browser.windows.remove(thisWindow.id);
});

b_cancel.addEventListener("click", async () => {
  let thisWindow = await browser.windows.getCurrent();
  browser.windows.remove(thisWindow.id);
});
