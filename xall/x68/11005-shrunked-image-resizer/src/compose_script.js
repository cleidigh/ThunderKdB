let config = {
  attributes: false,
  childList: true,
  characterData: false,
  subtree: true,
};
let observer = new MutationObserver(function(mutations) {
  for (let mutation of mutations) {
    if (mutation.addedNodes && mutation.addedNodes.length) {
      console.log("Nodes added to message: " + mutation.addedNodes.length);
      for (let target of mutation.addedNodes) {
        maybeResizeInline(target);
      }
    }
  }
});
observer.observe(document.body, config);

async function maybeResizeInline(target) {
  if (target.nodeName == "IMG") {
    try {
      console.log(
        "<IMG> found, source is " +
          target.src.substring(0, 100) +
          (target.src.length <= 100 ? "" : "\u2026")
      );
      let parent = target.parentNode;
      while (parent && "classList" in parent) {
        if (parent.classList.contains("moz-signature")) {
          console.log("Not resizing - image is part of signature");
          return;
        }
        if (parent.getAttribute("type") == "cite") {
          console.log("Not resizing - image is part of message being replied to");
          return;
        }
        if (parent.classList.contains("moz-forward-container")) {
          console.log("Not resizing - image is part of forwarded message");
          return;
        }
        parent = parent.parentNode;
      }

      if (!target.complete) {
        target.addEventListener(
          "load",
          () => {
            console.log("Image now loaded, calling maybeResizeInline");
            maybeResizeInline(target);
          },
          { once: true }
        );
        console.log("Image not yet loaded");
        return;
      }

      if (target.hasAttribute("shrunked:resized")) {
        console.log("Not resizing - image already has shrunked attribute");
        return;
      }
      if (!imageIsJPEG(target)) {
        console.log("Not resizing - image is not JPEG");
        return;
      }
      if (target.width < 500 && target.height < 500) {
        console.log("Not resizing - image is too small");
        return;
      }

      let src = target.getAttribute("src");
      if (/^data:/.test(src)) {
        let srcSize = ((src.length - src.indexOf(",") - 1) * 3) / 4;
        if (src.endsWith("=")) {
          srcSize--;
          if (src.endsWith("==")) {
            srcSize--;
          }
        }
        let { fileSizeMinimum } = await browser.storage.local.get({
          fileSizeMinimum: 100,
        });
        if (srcSize < fileSizeMinimum * 1024) {
          console.log("Not resizing - image file size is too small");
          return;
        }
      }

      let srcName = "";
      let nameParts = target.src.match(/;filename=([^,;]*)[,;]/);
      if (nameParts) {
        srcName = decodeURIComponent(nameParts[1]);
      }

      let response = await fetch(src);
      let srcBlob = await response.blob();
      let srcFile = new File([srcBlob], srcName);

      let destFile = await browser.runtime.sendMessage({
        type: "resizeFile",
        file: srcFile,
      });
      let destURL = await new Promise(resolve => {
        let reader = new FileReader();
        reader.onloadend = function() {
          let dataURL = reader.result;
          dataURL =
            "data:image/jpeg;filename=" + encodeURIComponent(destFile.name) + dataURL.substring(15);
          resolve(dataURL);
        };
        reader.readAsDataURL(destFile);
      });

      target.setAttribute("src", destURL);
      target.removeAttribute("width");
      target.removeAttribute("height");
      target.setAttribute("shrunked:resized", "true");
    } catch (ex) {
      console.error(ex);
    }
  } else if (target.nodeType == Node.ELEMENT_NODE) {
    console.log("<" + target.nodeName + "> found, checking children");
    for (let child of target.children) {
      maybeResizeInline(child);
    }
  }
}

function imageIsJPEG(image) {
  let src = image.src.toLowerCase();
  return src.startsWith("data:image/jpeg") || src.endsWith(".jpg");
}
