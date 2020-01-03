/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["Color", "hsva", "hsla", "hex2rgb"];

/**
 * Given a hex string (e.g. "#a3f333", return the corresponding triple of r,g,b
 * integer values between 0 and 255.
 */

function hex2rgb(hexString) {
  var red, green, blue;
  var triplet = hexString.toLowerCase().replace(/#/, '');
  var rgbArr  = new Array();

  if (triplet.length == 6) {
    red = parseInt(triplet.substr(0,2), 16)
    green = parseInt(triplet.substr(2,2), 16)
    blue = parseInt(triplet.substr(4,2), 16)
  } else if (triplet.length == 3) {
    red = parseInt((triplet.substr(0,1) + triplet.substr(0,1)), 16);
    green = parseInt((triplet.substr(1,1) + triplet.substr(1,1)), 16);
    blue = parseInt((triplet.substr(2,2) + triplet.substr(2,2)), 16);
  }
  return [red, green, blue];
}

/**
 * clamp the input value aVal to fit between the aLow and aHigh values
 */
function clamp(aVal, aLow, aHigh) {
  return Math.max(aLow, Math.min(aHigh, aVal));
}

/**
 * A Color object has four attributes, r (red), g (green), b (blue), and
 * a (transparency, aka alpha).
 *
 * r,g,b are between 0 and 255
 * a is between 0 and 1
 *
 */
function Color(r, g, b, a) {
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = (a === undefined) ? 1.0 : a;
}
Color.prototype = {
  /**
   * return the HSV (Hue, Saturation, Value) correspondent to the color, as a
   * triple.
   */
  toHSV: function() {
    let h, s, v, r, g, b, vmax, vmin, vdelta, onethird;
    r = this.r / 255.0;
    g = this.g / 255.0;
    b = this.b / 255.0;

    vmax = Math.max(r, g, b);
    vmin = Math.min(r, g, b);
    vdelta = vmax - vmin;

    onethird = 1.0/3.0;

    if (vmax == vmin)
      h = 0.0;
    else if (vmax == r && g >= b)
      h = (g - b)/(vdelta*6.0);
    else if (vmax == r && g < b)
      h = (g - b)/(vdelta*6.0) + 1.0;
    else if (vmax == g)
      h = (b - r)/(vdelta*6.0) + onethird;
    else // vmax == b
      h = (r - g)/(vdelta*6.0) + 2*onethird;

    if (vmax == 0)
        s = 0;
    else
        s = 1 - vmin/vmax;
    v = vmax;

    return [h, s, v];
  },

  /**
   * return the HSL (Hue, Saturation, Lightness) correspondent to the color, as
   * a triple.
   */
  toHSL: function() {
    let h, s, l, r, g, b, vmax, vmin, vdelta, onethird;
    r = this.r / 255.0;
    g = this.g / 255.0;
    b = this.b / 255.0;

    vmax = Math.max(r, g, b);
    vmin = Math.min(r, g, b);
    vdelta = vmax - vmin;

    onethird = 1.0/3.0;

    if (vmax == vmin)
      h = 0.0;
    else if (vmax == r && g >= b)
      h = (g - b)/(vdelta*6.0);
    else if (vmax == r && g < b)
      h = (g - b)/(vdelta*6.0) + 1.0;
    else if (vmax == g)
      h = (b - r)/(vdelta*6.0) + onethird;
    else // vmax == b
      h = (r - g)/(vdelta*6.0) + 2*onethird;

    l = 0.5 * (vmax + vmin);

    if (l == 0 || vdelta == 0)
        s = 0;
    else if (l <= 0.5)
        s = vdelta / (2 * l);
    else // l > 0.5
        s = vdelta / (2 - 2 * l);

    return [h, s, l];
  },

  /**
   * make the color lighter by a specified step (10% is the default)
   * This is done by converting the value to HSL, and boosting the Lightness
   * component (clamped).
   */
  lighter: function(aStep) {
    if (aStep === undefined)
      aStep = 0.1;
    let [h, s, l] = this.toHSL();
    l = clamp(l + aStep, 0, 1);
    return hsla(h, s, l, this.a);
  },

  /**
   * make the color darker by a specified step (10% is the default)
   * This is done by converting the value to HSL, and decreasing the Lightness
   * component (clamped).
   */
  darker: function(aStep) {
    if (aStep === undefined)
      aStep = 0.1;
    let [h, s, l] = this.toHSL();
    l = clamp(l - aStep, 0, 1);
    return hsla(h, s, l, this.a);
  },

  /**
   * make the color brigther by a specified step (10% is the default)
   * This is done by converting the value to HSV, and boosting the value
   * component (clamped).
   */
  brighter: function(aStep) {
    if (aStep === undefined)
      aStep = 0.1;
    let [h, s, v] = this.toHSV();
    v = clamp(v + aStep, 0, 1);
    return hsva(h, s, v, this.a);
  },

  /**
   * return a string representation of the color, using the rgba() notation
   * as in: rgba(100,200,300,0.2).
   */
  toString: function() {
    return "rgba(" + this.r + "," + this.g + "," + this.b + "," + this.a + ")";
  },

  /**
   * return a string representation of the color using the hex notation, as in:
   * #a3b1c9
   */
  toHex: function() {
    return "#" + dec2hex(this.r) + dec2hex(this.g) + dec2hex(this.b);
  }
}

/**
 * Converts an int 0...255 to hex pair 00...FF
 * @method dec2hex
 * @param n {int} the number to convert
 * @return {string} the hex equivalent
 */
let HCHARS="0123456789ABCDEF";
function dec2hex(n) {
  n = (n > 255 || n < 0) ? 0 : n;
  return HCHARS.charAt((n - n % 16) / 16) + HCHARS.charAt(n % 16);
}


/**
 * wrap the input value around 1 (note, this currently doesn't work with values
 * greater than 2 or less than -1 - should be fixed)
 */
function _wrappy(v) {
  if (v < 0)
    return v + 1.0
  else if (v > 1)
    return v - 1.0;
  else
    return v;
}

function _hsl_Tc(tc, p, q) {
  let Ti = Math.floor(tc * 6);
  let v;
  if (Ti == 0)
    v = p + ((q - p) * 6.0 * tc);
  else if (Ti < 3)
    v = q;
  else if (Ti < 4)
    v = p + ((q - p) * (2.0/3.0 - tc) * 6.0);
  else
    v = p;
  return Math.floor(255 * v);
}

/**
 * return a Color object specified by hue, saturation, lightness, and alpha
 * values
 *
 * @hue: hue, between 0 and 2*PI
 * @saturation: saturation, between 0 and 1
 * @lightness: lightness, between 0 and 1
 * @alpha: alpha, between 0 and 1
 */
function hsla(hue, saturation, lightness, alpha) {
  let q, p, onethird, Tr, Tg, Tb;
  if (lightness < 0.5)
    q = lightness * (1.0 + saturation);
  else
    q = lightness + saturation - (lightness * saturation);
  p = 2.0 * lightness - q;
  onethird = 1.0/3.0;
  Tr = _wrappy(hue + onethird);
  Tg = hue;
  Tb = _wrappy(hue - onethird);

  return new Color(_hsl_Tc(Tr,p,q), _hsl_Tc(Tg,p,q), _hsl_Tc(Tb,p,q), alpha);
}

/**
 * return a Color object specified by hue, saturation, value, and alpha values
 *
 * @hue: hue, between 0 and 2*PI
 * @saturation: saturation, between 0 and 1
 * @value: value, between 0 and 1
 * @alpha: alpha, between 0 and 1
 */
function hsva(hue, saturation, value, alpha) {
  let Hi, f, p, q, t;
  if (hue >= 1.0)
    hue = 0.0;
  if (saturation < 0.0) {
    let vi = Math.floor(value * 255);
    return new Color(vi, vi, vi, alpha);
  }

  Hi = Math.floor(hue * 6) % 6;
  f = hue * 6 - Hi;
  p = value * (1 - saturation);
  q = value * (1 - f * saturation);
  t = value * (1 - (1 - f) * saturation);

  // map into 0-255 space
  value = Math.floor(value * 255);
  p = Math.floor(p * 255);
  q = Math.floor(q * 255);
  t = Math.floor(t * 255);

  if (Hi == 0)
    return new Color(value, t, p, alpha);
  else if (Hi == 1)
    return new Color(q, value, p, alpha);
  else if (Hi == 2)
    return new Color(p, value, t, alpha);
  else if (Hi == 3)
    return new Color(p, q, value, alpha);
  else if (Hi == 4)
    return new Color(t, p, value, alpha);
  else // Hi == 5
    return new Color(value, p, q, alpha);
}
