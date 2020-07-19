var CSSManager = {
  bgColors: {}, //bgColors[selector]: FFFFFF
  bgColorLightness: 0.75,
  fgColorMode: 0,

  init: async function (fgColorMode, bgColorLightness, bgColors) {
    this.fgColorMode = fgColorMode;
    this.bgColorLightness = bgColorLightness;
    if (bgColors) {
      this.bgColors = bgColors;
    } else {
      await this.initTagColorTable();
    }
  },

  initTagColorTable: async function () {
    let tagArray = await browser.messages.listTags();
    for (let i = 0; i < tagArray.length; i++) {
      let selector = await browser.tagPopupApi.getSelectorForKey(tagArray[i].key);
      let color = tagArray[i].color.replace("#", "");
      this.bgColors[selector] = color;
    }
  },

  getAllTagColors: async function (hex, unique) {
    let ret = [];
    let checked = [];

    let tagArray = await browser.messages.listTags();
    for (let i = 0; i < tagArray.length; i++) {
      let rgbStr = tagArray[i].color.replace("#", "");
      if (unique && checked[rgbStr]) {
        continue;
      } else {
        checked[rgbStr] = true;
      }

      if (hex) {
        ret.push(rgbStr);
      } else {
        if (rgbStr == "white") {
          rgbStr = "FFFFFF";
        } else if (rgbStr == "black") {
          rgbStr = "000000";
        }
        let rgb = rgbStr.match(/../g);
        if (!rgb) continue;
        let r = parseInt(rgb[0], 16);
        let g = parseInt(rgb[1], 16);
        let b = parseInt(rgb[2], 16);
        ret.push(r + ", " + g + ", " + b);
      }
    }
    return ret;
  },

  getCurrentTagColors: async function () {
    let tagArray = await browser.messages.listTags();
    let ret = [];
    for (let i = 0; i < tagArray.length; i++) {
      let selector = await browser.tagPopupApi.getSelectorForKey(tagArray[i].key);
      if (this.bgColors[selector] && ret.indexOf(this.bgColors[selector]) == -1) ret.push(this.bgColors[selector]);
    }

    return ret;
  },

  makeCSS: async function () {
    let newCSS = "data:text/css,@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);\n";

    for (let selector in this.bgColors) {
      let rgbStr = this.bgColors[selector];
      if (rgbStr == "white") {
        rgbStr = "FFFFFF";
      } else if (rgbStr == "black") {
        rgbStr = "000000";
      }

      let rgb = rgbStr.match(/../g);
      if (!rgb) continue;
      let r = parseInt(rgb[0], 16);
      let g = parseInt(rgb[1], 16);
      let b = parseInt(rgb[2], 16);
      let bgColor = this.calcBgColorBySaturation(r, g, b, this.bgColorLightness);
      let fgColor = this.getFgColor(r, g, b, bgColor[0], bgColor[1], bgColor[2], this.bgColorLightness);

      newCSS = newCSS + "treechildren::-moz-tree-cell-text(" + selector + "), ." + selector + ":not([_moz-menuactive]) {color: rgb(" + fgColor.join(", ") + ")  !important;}\n";

      //redefine color of selected row
      let textColor = "black";
      let enough = await browser.tagPopupApi.isColorContrastEnough(rgbStr);
      if (!enough) {
        textColor = "white";
      }
      newCSS = newCSS + "treechildren::-moz-tree-cell-text(" + selector + ", selected, focus){color: " + textColor + " !important;}\n";


      /* XXX: Under the scroll bar is not colored.
         Thunderbird does it by using -moz-tree-row.
         But if the below is changed to -moz-tree-row, it conflicts with original one.
      */
      newCSS = newCSS + "treechildren::-moz-tree-cell(" + selector + "){background-color: rgb(" + bgColor.join(", ") + ") !important;}\n";
      newCSS = newCSS + "treechildren::-moz-tree-cell(" + selector + ", selected, focus){background-color: transparent !important;}\n";
    }

    return newCSS;
  },

  rgb255ToHsv: function (r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;
    let max = Math.max(Math.max(r, g), b);
    let min = Math.min(Math.min(r, g), b);

    //Value
    let v = max;

    //Saturation
    let s = null;
    if (v != 0) s = (max - min) / max;

    //Hue
    let h = null;
    if (s) {
      if (max == r) {
        h = (60 * (g - b) / (max - min)) + 0;
      } else if (max == g) {
        h = (60 * (b - r) / (max - min)) + 120;
      } else if (max == b) {
        h = (60 * (r - g) / (max - min)) + 240;
      }

      if (h < 0) h = h + 360;
    }

    return [h, s, v];
  },

  hsvToRgb255: function (h, s, v) {
    if (!s) return [Math.round(v * 255), Math.round(v * 255), Math.round(v * 255)];

    let hi = Math.floor(h / 60) % 6
    let f = (h / 60) - hi;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    let r = 0;
    let g = 0;
    let b = 0;

    switch (hi) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
      default:
        break;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  },

  getFgColor: function (r, g, b, bg_r, bg_g, bg_b, lightness) {
    let ret = null;
    if (this.fgColorMode == 0) {
      ret = this.adjustFgColor(r, g, b, lightness);
    } else if (this.fgColorMode == 1) {
      ret = this.calcFgColorByLuminance(bg_r, bg_g, bg_b);
    } else if (this.fgColorMode == 2) {
      ret = this.calcFgColorByHue(r, g, b);
    }

    return ret;
  },

  adjustFgColor: function (r, g, b, lightness) {
    let hsv = this.rgb255ToHsv(r, g, b);
    if (Math.round(hsv[0]) == 60) { //Yellowish
      return this.calcFgColorByLuminance(r, g, b);
    } else {
      return lightness < 0.5 ? this.calcFgColorByLuminance(r, g, b) : [r, g, b];
    }
  },

  calcFgColorByLuminance: function (r, g, b) {
    let l = (r * 299 + g * 587 + b * 114) / 2550;
    if (l < 50) return [255, 255, 255];
    else return [0, 0, 0];
  },

  calcFgColorByValue: function (r, g, b) {
    let hsv = this.rgb255ToHsv(r, g, b);
    let v = hsv[2];
    if (v < 0.5) return [255, 255, 255];
    else return [0, 0, 0];
  },

  calcFgColorByHue: function (r, g, b) {
    let hsv = this.rgb255ToHsv(r, g, b);
    if (hsv[2] < 0.25) {
      return [255, 255, 255]; //use white
    } else if (!hsv[1]) { //for gray
      return [0, 0, 0]; //use black
    } else {
      hsv[0] = (hsv[0] + 180) % 360;
      return this.hsvToRgb255(hsv[0], hsv[1], hsv[2]);
    }
  },

  calcBgColorBySaturation: function (r, g, b, degree) {
    let hsv = this.rgb255ToHsv(r, g, b);
    hsv[2] = hsv[2] + ((1 - hsv[2]) * degree);
    if (hsv[2] > 1) hsv[2] = 1;
    if (hsv[1]) {
      hsv[1] = hsv[1] - hsv[1] * degree;
      if (hsv[1] < 0) hsv[1] = 0;
    }

    return this.hsvToRgb255(hsv[0], hsv[1], hsv[2]);
  }
};
