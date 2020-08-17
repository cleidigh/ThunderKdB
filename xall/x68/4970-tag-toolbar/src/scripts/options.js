var default_prefs = {
  use_msghdr: true,
  bgcolor_en: true,
  lightness: 75,
  fg_mode: 0,
  ignore_black: false
};

var colors = [];

async function init() {
  translate();
  await loadPrefs();

  await CSSManager.init(null, null, []);
  browser.runtime.sendMessage({
    message: "GET_TAGCOLORS"
  });
}
init();

browser.runtime.onMessage.addListener(async message => {
  switch (message.message) {
    case "SEND_TAGCOLORS":
      colors = message.colors;
      showColorSample();
      break;
    default:
      break;
  }
});

async function loadPrefs() {
  for (let key in default_prefs) {
    let elem = document.getElementById(key);
    let result = await browser.storage.local.get(key);
    let value = result[key];
    if (value === undefined) {
      value = default_prefs[key];
    }

    switch (elem.localName) {
      case "input":
        let type = elem.getAttribute("type");
        if (type == "checkbox") {
          elem.checked = value;
        } else if (type == "number") {
          elem.value = value;
        }
        break;
      case "select":
        elem.value = value.toString();
        break;
      default:
        break;
    }

    elem.addEventListener("change", (event) => {
      savePref(event);
    });
  }

  document.getElementById("fg_mode").addEventListener("change", () => {
    showColorSample();
  });
  document.getElementById("lightness").addEventListener("change", () => {
    showColorSample();
  });
  document.getElementById("ignore_black").addEventListener("change", () => {
    showColorSample();
  });

}

async function savePref(event) {
  let elem = event.target;
  let id = elem.id;
  let obj = {};

  switch (elem.localName) {
    case "input":
      let type = elem.getAttribute("type");
      if (type == "checkbox") {
        obj[id] = elem.checked;
      } else if (type == "number") {
        obj[id] = isNaN(elem.value) ? 0 : elem.value;
      }
      break;
    case "select":
      obj[id] = parseInt(elem.value);
      break;
    default:
      break;
  }
  browser.storage.local.set(obj);
}

async function showColorSample() {
  let lightness = parseInt(document.getElementById("lightness").value);

  if (isNaN(lightness)) return;
  lightness = lightness / 100.0;
  if (lightness > 1) {
    lightness = 1;
    document.getElementById("lightness").value = 100;
  } else if (lightness < 0) {
    lightness = 0;
    document.getElementById("lightness").value = 0;
  }

  let fg = parseInt(document.getElementById("fg_mode").value);

  let list = document.getElementById("colorSample");
  for (let i = list.childNodes.length - 1; i >= 0; i--) {
    list.removeChild(list.childNodes[i]);
  }

  for (let i = 0; i < colors.length; i++) {
    let item = document.createElement("option");
    item.textContent = "This is a preview";
    item.setAttribute("id", "preview" + i);
    list.appendChild(item);
  }

  let ignore_black = document.getElementById("ignore_black").checked;

  for (let i = 0; i < colors.length; i++) {
    let rgb = colors[i].split(", ");
    rgb[0] = parseInt(rgb[0]);
    rgb[1] = parseInt(rgb[1]);
    rgb[2] = parseInt(rgb[2]);

    let sample = document.getElementById("preview" + i);
    let fgColorcode = rgb.join(",");
    
    if (ignore_black && (rgb[0] + rgb[1] + rgb[2] == 0)) {
      sample.style.color = "rgb(" + fgColorcode + ")";
    } else {      
      let s_colorcode = CSSManager.calcBgColorBySaturation(rgb[0], rgb[1], rgb[2], lightness);
      if (fg == 0) {
        let rgb2 = CSSManager.adjustFgColor(rgb[0], rgb[1], rgb[2], lightness);
        fgColorcode = rgb2.join(",");
      } else if (fg == 1) {
        let rgb2 = CSSManager.calcFgColorByLuminance(s_colorcode[0], s_colorcode[1], s_colorcode[2]);
        fgColorcode = rgb2.join(",");
      } else if (fg == 2) {
        let rgb2 = CSSManager.calcFgColorByHue(rgb[0], rgb[1], rgb[2]);
        fgColorcode = rgb2.join(",");
      }

      sample.style.color = "rgb(" + fgColorcode + ")";
      sample.style.backgroundColor = "rgb(" + s_colorcode.join(",") + ")";
    }
  }
}
