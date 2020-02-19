TTBCSSManager = {
	cssURI: null,
	bgColors: [], //bgColors[selector]: FFFFFF
	sss: null,
	ios: null,
	init: function() {
/*
		//this.bgColors["lc-FFFFFF"] = "255, 255, 255";
		this.bgColors["lc-CCCCCC"] = "204, 204, 204";
		this.bgColors["lc-C0C0C0"] = "192, 192, 192";
		this.bgColors["lc-999999"] = "153, 153, 153";
		this.bgColors["lc-666666"] = "102, 102, 102";
		this.bgColors["lc-333333"] = "51, 51, 51";
		this.bgColors["lc-000000"] = "0, 0, 0";
		this.bgColors["lc-FFCCCC"] = "255, 204, 204";
		this.bgColors["lc-FF6666"] = "255, 102, 102";
		this.bgColors["lc-FF0000"] = "255, 0, 0";
		this.bgColors["lc-CC0000"] = "204, 0, 0";
		this.bgColors["lc-990000"] = "153, 0, 0";
		this.bgColors["lc-660000"] = "102, 0, 0";
		this.bgColors["lc-330000"] = "51, 0, 0";
		this.bgColors["lc-FFCC99"] = "255, 204, 153";
		this.bgColors["lc-FF9966"] = "255, 153, 102";
		this.bgColors["lc-FF9900"] = "255, 153, 0";
		this.bgColors["lc-FF6600"] = "255, 102, 0";
		this.bgColors["lc-CC6600"] = "204, 102, 0";
		this.bgColors["lc-993300"] = "153, 51, 0";
		this.bgColors["lc-663300"] = "102, 51, 0";
		this.bgColors["lc-FFFF99"] = "255, 255, 153";
		this.bgColors["lc-FFFF66"] = "255, 255, 102";
		this.bgColors["lc-FFCC66"] = "255, 204, 102";
		this.bgColors["lc-FFCC33"] = "255, 204, 51";
		this.bgColors["lc-CC9933"] = "204, 153, 51";
		this.bgColors["lc-996633"] = "153, 102, 51";
		this.bgColors["lc-663333"] = "102, 51, 51";
		this.bgColors["lc-FFFFCC"] = "255, 255, 204";
		this.bgColors["lc-FFFF33"] = "255, 255, 51";
		this.bgColors["lc-FFFF00"] = "255, 255, 0";
		this.bgColors["lc-FFCC00"] = "255, 204, 0";
		this.bgColors["lc-999900"] = "153, 153, 0";
		this.bgColors["lc-666600"] = "102, 102, 0";
		this.bgColors["lc-333300"] = "51, 51, 0";
		this.bgColors["lc-99FF99"] = "153, 255, 153";
		this.bgColors["lc-66FF99"] = "102, 255, 153";
		this.bgColors["lc-33FF33"] = "51, 255, 51";
		this.bgColors["lc-33CC00"] = "51, 204, 0";
		this.bgColors["lc-009900"] = "0, 153, 0";
		this.bgColors["lc-006600"] = "0, 102, 0";
		this.bgColors["lc-003300"] = "0, 51, 0";
		this.bgColors["lc-99FFFF"] = "153, 255, 255";
		this.bgColors["lc-33FFFF"] = "51, 255, 255";
		this.bgColors["lc-66CCCC"] = "102, 204, 204";
		this.bgColors["lc-00CCCC"] = "0, 204, 204";
		this.bgColors["lc-339999"] = "51, 153, 153";
		this.bgColors["lc-336666"] = "51, 102, 102";
		this.bgColors["lc-003333"] = "0, 51, 51";
		this.bgColors["lc-CCFFFF"] = "204, 255, 255";
		this.bgColors["lc-66FFFF"] = "102, 255, 255";
		this.bgColors["lc-33CCFF"] = "51, 204, 255";
		this.bgColors["lc-3366FF"] = "51, 102, 255";
		this.bgColors["lc-3333FF"] = "51, 51, 255";
		this.bgColors["lc-000099"] = "0, 0, 153";
		this.bgColors["lc-000066"] = "0, 0, 102";
		this.bgColors["lc-CCCCFF"] = "204, 204, 255";
		this.bgColors["lc-9999FF"] = "153, 153, 255";
		this.bgColors["lc-6666CC"] = "102, 102, 204";
		this.bgColors["lc-6633FF"] = "102, 51, 255";
		this.bgColors["lc-6600CC"] = "102, 0, 204";
		this.bgColors["lc-333399"] = "51, 51, 153";
		this.bgColors["lc-330099"] = "51, 0, 153";
		this.bgColors["lc-FFCCFF"] = "255, 204, 255";
		this.bgColors["lc-FF99FF"] = "255, 153, 255";
		this.bgColors["lc-CC66CC"] = "204, 102, 204";
		this.bgColors["lc-CC33CC"] = "204, 51, 204";
		this.bgColors["lc-993399"] = "153, 51, 153";
		this.bgColors["lc-663366"] = "102, 51, 102";
		this.bgColors["lc-330033"] = "51, 0, 51";
		//this.bgColors["lc-white"] = "255, 255, 255";
		//this.bgColors["lc-black"] = "0, 0, 0";	
*/
		this.initTagColorTable();
		this.sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
    	                .getService(Components.interfaces.nsIStyleSheetService);
		this.ios = Components.classes["@mozilla.org/network/io-service;1"]
    	                .getService(Components.interfaces.nsIIOService);
		this.registerCSS();

		/*
		var me = this;
		var listener = {
		  domain: "ttb.thread_bgcolor",
		  observe: function(aSubject, aTopic, aPrefstring) {
			  if (aTopic == "nsPref:changed") {
				  dump(aPrefstring+"\n");
				  me.registerCSS();
			  }
		  }
		};
    try {
        var pbi = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranchInternal);
        pbi.addObserver(listener.domain, listener, false);
    } catch(e) {}
    */
	},
	
	initTagColorTable: function() {
		var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
		  .getService(Components.interfaces.nsIMsgTagService);
		var tagArray = tagService.getAllTags({});
		for (var i=0; i<tagArray.length; i++) {
			var selector = tagService.getSelectorForKey(tagArray[i].key);
			var color = tagArray[i].color.replace("#","");
			this.bgColors[selector] = color;
		}
	},
	
	getAllTagColors: function(hex) {
		var color;
		var ret = [];
		for (color in this.bgColors) {
			if (hex) {
				ret.push(this.bgColors[color]);
			} else {
				var rgbStr = this.bgColors[color];
				if (rgbStr == "white") {
					rgbStr = "FFFFFF";
				} else if (rgbStr == "black") {
					rgbStr = "000000";
				}
				var rgb = rgbStr.match(/../g);
				if (!rgb) continue;
	  		var r = parseInt(rgb[0],16);
	  		var g = parseInt(rgb[1],16);
	  		var b = parseInt(rgb[2],16);
	  		ret.push(r+", "+g+", "+b);
			}
		}
		
		return ret;
	},
	
	getCurrentTagColors: function() {
		var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
		  .getService(Components.interfaces.nsIMsgTagService);
		var tagArray = tagService.getAllTags({});
		var ret = [];
		for (var i=0; i<tagArray.length; i++) {
			//var color = "lc-"+tagArray[i].color.replace("#","");
			var selector = tagService.getSelectorForKey(tagArray[i].key);
			if (this.bgColors[selector] && ret.indexOf(this.bgColors[color]) == -1) ret.push(this.bgColors[selector]);
		}
		
		return ret;
	},
	
	makeCSS: function(lightness) {
		var newCSS = "data:text/css,@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);\n";
		var color;
		for (color in this.bgColors) {
			//var rgb = this.bgColors[color].split(", ");
			var rgbStr = this.bgColors[color];
			if (rgbStr == "white") {
				rgbStr = "FFFFFF";
			} else if (rgbStr == "black") {
				rgbStr = "000000";
			}

			var rgb = rgbStr.match(/../g);
			if (!rgb) continue;
  		var r = parseInt(rgb[0],16);
  		var g = parseInt(rgb[1],16);
  		var b = parseInt(rgb[2],16);
			var bgColor = this.calcBgColorBySaturation(r, g, b, lightness);
			var fgColor = this.getFgColor(r, g, b, bgColor[0], bgColor[1], bgColor[2], lightness);

			//newCSS = newCSS + "treechildren::-moz-tree-cell-text(" + color + "), ." + color +":not([_moz-menuactive]) {color: rgb("+ fgColor.join(", ") + ") !important;}\n";
			newCSS = newCSS + "treechildren::-moz-tree-cell(" + color + "){background-color: rgb(" + bgColor.join(", ") +") !important;}\n";
			newCSS = newCSS + "treechildren::-moz-tree-cell(" + color + ", selected, focus){background-color: transparent !important;}\n";
		}
		return newCSS;
	},
	
	registerCSS: function() {
		this.unregisterCSS();
		if (gTTBPreferences.getBoolPref("ttb.thread_bgcolor.enabled", false)) {
			var lightness = gTTBPreferences.copyUnicharPref("ttb.thread_bgcolor.lightness", "0.75");
			this.cssURI = this.ios.newURI(this.makeCSS(lightness), null, null);
			this.sss.loadAndRegisterSheet(this.cssURI, this.sss.USER_SHEET);
		}
	},
	
	unregisterCSS: function() {
		if (this.cssURI && this.sss.sheetRegistered(this.cssURI, this.sss.USER_SHEET)) {
			this.sss.unregisterSheet(this.cssURI, this.sss.USER_SHEET);
		}
	},
	
	rgb255ToHsv: function(r, g, b) {
		r = r / 255;
		g = g / 255;
		b = b / 255;
		var max = Math.max(Math.max(r, g), b);
		var min = Math.min(Math.min(r, g), b);
	
		//Value
		var v = max;
		
		//Saturation
		var s = null;
		if (v != 0) s = (max - min) / max;
		
		//Hue
		var h = null;
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
	
	hsvToRgb255: function(h, s, v) {
		if (!s) return [Math.round(v * 255), Math.round(v * 255), Math.round(v * 255)];
		
		var hi = Math.floor(h / 60) % 6
	  var f = (h / 60) - hi;
	  var p = v * (1 - s);
	  var q = v * (1 - f * s);
	  var t = v * (1 - (1 - f) * s);
		var r = 0;
		var g = 0;
		var b = 0;
		switch (hi) {
	    case 0 :
	      r = v;  g = t;  b = p;  break;
	    case 1 :
	      r = q;  g = v;  b = p;  break;
	    case 2 :
	      r = p;  g = v;  b = t;  break;
	    case 3 :
	      r = p;  g = q;  b = v;  break;
	    case 4 :
	      r = t;  g = p;  b = v;  break;
	    case 5 :
	      r = v;  g = p;  b = q;  break;
	  }
	
		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	},

	getFgColor: function(r, g, b, bg_r, bg_g, bg_b, lightness) {
		var type = gTTBPreferences.getIntPref("ttb.thread_fgcolor", 0);
		var ret = null;
		if (type == 0) {
			//ret = lightness >= 0.5 ? this.calcFgColorByLuminance(r, g, b) : [r, g, b];
			ret = this.adjustFgColor(r, g, b);
		} else if (type == 1) {
			//ret = this.calcFgColorByValue(r, g, b);
			ret = this.calcFgColorByLuminance(bg_r, bg_g, bg_b);
		} else if (type == 2) {
			ret = this.calcFgColorByHue(r, g, b);
		}
		
		return ret;
	},
	
	adjustFgColor: function(r, g, b, lightness) {
		var hsv = this.rgb255ToHsv(r, g, b);
		if (Math.round(hsv[0]) == 60) {//Yellowish
			return this.calcFgColorByLuminance(r, g, b);
		} else {
			return lightness < 0.5 ? this.calcFgColorByLuminance(r, g, b) : [r, g, b];
		}
	},
	
	calcFgColorByLuminance: function(r, g, b) {
		var l = (r * 299 + g * 587 + b * 114) / 2550;
		if (l < 50) return [255, 255, 255];
		else return [0, 0, 0];
	},
	
	calcFgColorByValue: function(r, g, b) {
		var hsv = this.rgb255ToHsv(r, g, b);
		var v = hsv[2];
		if (v < 0.5) return [255, 255, 255];
		else return [0, 0, 0];
	},
	
	calcFgColorByHue: function(r, g, b) {
		var hsv = this.rgb255ToHsv(r, g, b);
		if (hsv[2] < 0.25) {
			return [255, 255, 255]; //use white
		} else if (!hsv[1]) { //for gray
			return [0, 0, 0]; //use black
		} else {
			hsv[0] = (hsv[0] + 180) % 360;
			return this.hsvToRgb255(hsv[0], hsv[1], hsv[2]);
		}
	},
	
	calcBgColorBySaturation: function(r, g, b, degree) {
		var hsv = this.rgb255ToHsv(r, g, b);
		//if (!hsv[1] || hsv[2] < 0.5) {
			hsv[2] = hsv[2] + ((1 - hsv[2]) * degree);
			if (hsv[2] > 1) hsv[2] = 1;
		//}
		if (hsv[1]) {
			hsv[1] = hsv[1] - hsv[1] * degree;
			if (hsv[1] < 0) hsv[1] = 0;
		}
		
		return this.hsvToRgb255(hsv[0], hsv[1], hsv[2]);
	}
}

window.addEventListener("load", function(){TTBCSSManager.init();}, true);
