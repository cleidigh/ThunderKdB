var titlecasethunderbird = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
    $this = this;
    this.strings = document.getElementById("titlecasethunderbird-strings");
    //document.getElementById("msgComposeContext").addEventListener("popupshowing", function(e) { $this.showContextMenu(e); }, false);
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.titlecasethunderbird.");
    if (prefs.getBoolPref("altcmd")) {
			document.addEventListener("keydown", function(e){
				var firstkeypress = e.altKey; 	// ALT
				var propercasekeypress = 49; 		// 1
				var titlecasekeypress = 50;			// 2
				var titlecasecamelkeypress = 51;	// 3
				var startcasekeypress = 52;			// 4
				var startcasecamelkeypress = 53;	// 5
				var camelcasekeypress = 54;			// 6
				var uppercasekeypress = 55;			// 7
				var lowercasecamelkeypress = 56;	// 8
				var togglecasekeypress = 57;	// 9
				if(e.which == propercasekeypress && firstkeypress == true) {
					 titlecasethunderbird.onMenuItemCommand(e);
					 return false;
				}
				if(e.which == titlecasekeypress && firstkeypress == true) {
					 titlecasethunderbird.onMenuTitleCase(e);
					 return false;
				}
				if(e.which == titlecasecamelkeypress && firstkeypress == true) {
					 titlecasethunderbird.onMenuTitleCaseCamel(e);
					 return false;
				}
				if(e.which == startcasekeypress && firstkeypress == true) {
					 titlecasethunderbird.onMenuStartCase(e);
					 return false;
				}
				if(e.which == startcasecamelkeypress && firstkeypress == true) {
					 titlecasethunderbird.onMenuStartCaseCamel(e);
					 return false;
				}
				if(e.which == camelcasekeypress && firstkeypress == true) {
					 titlecasethunderbird.onMenuCamelCase(e);
					 return false;
				}
				if(e.which == uppercasekeypress && firstkeypress == true) {
					 titlecasethunderbird.onMenuAllUppercase(e);
					 return false;
				}
				if(e.which == lowercasecamelkeypress && firstkeypress == true) {
					 titlecasethunderbird.onMenuAllLowercase(e);
					 return false;
				}
				if(e.which == togglecasekeypress && firstkeypress == true) {
					 titlecasethunderbird.onMenuToggleCase(e);
					 return false;
				}
			});
    }
  },

  SelectionChange: function(original2, original) {

			// Start Selection Save
				var origRange = original2.getRangeAt(0).cloneRange();
			// End Selection Save
			// Start selection change
				var range = original2.getRangeAt(0);
				range.deleteContents();
				range.insertNode(document.createTextNode(original));
			// End selection change
			// Start ReSelection
				original2.removeAllRanges();
				original2.addRange(origRange);
			// End ReSelection
  },

  ie_has_no_indexOf: function(input) {
	  var special_words = new Array('and',
				'the',
				'to',
				'for',
				'is',
				'in',
				'a',
				'at',
				'an',
				'from',
				'by',
				'if',
				'of');
  for (var i=0;i<special_words.length;i++) {
    if (special_words[i]==input) {
      return 1;
    }
  }
  return -1;
},

  showContextMenu: function(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    //document.getElementById("context-titlecasethunderbird").hidden = gContextMenu.onImage;
  },

  onMenuCamelCase: function(e) {
	try {
		var original2 = document.commandDispatcher.focusedWindow.getSelection();
		var original = original2.toString();
		// Start Text change
			original = original.toLowerCase().replace(/[^a-z ]+/g, ' ');
			original = original.replace(/^(.)|\s(.)/g, function($1) { return $1.toUpperCase(); });
			original = original.replace(/[^a-zA-Z]+/g, '');
		// End Text change
		titlecasethunderbird.SelectionChange(original2, original);

	// Old code below
	//workingHTML = workingHTML.replace(searchStr, convertedstring);
	//content.document.getElementsByTagName("body").item(0).innerHTML = workingHTML;
	}catch(e){
		alert('TitleCase For Thunderbird error: ' + e);
	}
  },

  onMenuStartCase: function(e) {
	try {
		var original2 = document.commandDispatcher.focusedWindow.getSelection();
		var original = original2.toString();
		// Start Text change
			original = original.toLowerCase();
			var o_split = original.split(" ");
			for (var i=0;i<o_split.length;i++) {
				//always capitalize the first word
				o_split[i] = (o_split[i].substring(0,1)).toUpperCase() + o_split[i].substring(1);
			}
			original = o_split.join(' ');
		// End Text change
		titlecasethunderbird.SelectionChange(original2, original);
		}catch(e){
      alert('TitleCase For Thunderbird error: ' + e);
	}
  },

  onMenuStartCaseCamel: function(e) {
	try {
		var original2 = document.commandDispatcher.focusedWindow.getSelection();
		var original = original2.toString();
		// Start Text change
			var o_split = original.split(" ");
			for (var i=0;i<o_split.length;i++) {
				//always capitalize the first word
				o_split[i] = (o_split[i].substring(0,1)).toUpperCase() + o_split[i].substring(1);
			}
			original = o_split.join(' ');
		// End Text change
		titlecasethunderbird.SelectionChange(original2, original);
		}catch(e){
      alert('TitleCase For Thunderbird error: ' + e);
	}
  },

  onMenuTitleCase: function(e) {
	try {
		var original2 = document.commandDispatcher.focusedWindow.getSelection();
		var original = original2.toString();
		// Start Text change
			original = original.toLowerCase();
			var o_split = original.split(" ");
			for (var i=0;i<o_split.length;i++) {
				if (i == 0) {
					//always capitalize the first word
					o_split[i] = (o_split[i].substring(0,1)).toUpperCase() + o_split[i].substring(1);
				}
				else if(titlecasethunderbird.ie_has_no_indexOf(o_split[i]) < 0) {
					o_split[i] = (o_split[i].substring(0,1)).toUpperCase() + o_split[i].substring(1);
				}
			}
			  original = o_split.join(' ');
		// End Text change
		titlecasethunderbird.SelectionChange(original2, original);
		}catch(e){
      alert('TitleCase For Thunderbird error: ' + e);
	}
  },

  onMenuTitleCaseCamel: function(e) {
	try {
		var original2 = document.commandDispatcher.focusedWindow.getSelection();
		var original = original2.toString();
		// Start Text change
			var o_split = original.split(" ");
			for (var i=0;i<o_split.length;i++) {
				if (i == 0) {
					//always capitalize the first word
					o_split[i] = (o_split[i].substring(0,1)).toUpperCase() + o_split[i].substring(1);
				}
				else if(titlecasethunderbird.ie_has_no_indexOf(o_split[i]) < 0) {
					o_split[i] = (o_split[i].substring(0,1)).toUpperCase() + o_split[i].substring(1);
				}
			}
			  original = o_split.join(' ');
		// End Text change
		titlecasethunderbird.SelectionChange(original2, original);
		}catch(e){
      alert('TitleCase For Thunderbird error: ' + e);
	}
  },

  onMenuItemCommand: function(e) {
	try {
		var original2 = document.commandDispatcher.focusedWindow.getSelection();
		var original = original2.toString();
		// Start Text change
			original = original.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g,function(c){return c.toUpperCase()});;
		// End Text change
		titlecasethunderbird.SelectionChange(original2, original);
		}catch(e){
      alert('TitleCase For Thunderbird error: ' + e);
	}

  },

  onMenuAllUppercase: function(e) {
	try {
		var original2 = document.commandDispatcher.focusedWindow.getSelection();
		var original = original2.toString();
		// Start Text change
			original = original.toUpperCase();
		// End Text change
		titlecasethunderbird.SelectionChange(original2, original);
		}catch(e){
      alert('TitleCase For Thunderbird error: ' + e);
	}

  },

  onMenuAllLowercase: function(e) {
	try {
		var original2 = document.commandDispatcher.focusedWindow.getSelection();
		var original = original2.toString();
		// Start Text change
			original = original.toLowerCase();
		// End Text change
		titlecasethunderbird.SelectionChange(original2, original);
		}catch(e){
      alert('TitleCase For Thunderbird error: ' + e);
	}

  },

  onMenuToggleCase: function(e) {
	try {
		var original2 = document.commandDispatcher.focusedWindow.getSelection();
		var original = original2.toString();
		// Start Text change
			var o_split = original.split("");
			for (var i=0;i<o_split.length;i++) {
				if (o_split[i] == o_split[i].toUpperCase()) {
					// if uppercase turn to lowercase
					o_split[i] = o_split[i].toLowerCase();
				} else if(o_split[i] == o_split[i].toLowerCase()) {
					// if lowercase turn to uppercase
					o_split[i] = o_split[i].toUpperCase();
				}
			}
			  original = o_split.join('');
		// End Text change
		titlecasethunderbird.SelectionChange(original2, original);
		}catch(e){
      alert('TitleCase For Thunderbird error: ' + e);
	}

  },

  onToolbarButtonCommand: function(e) {
    // just reuse the function above.  you can change this, obviously!
    titlecasethunderbird.onMenuItemCommand(e);
  }

};
window.addEventListener("load", function(e) { titlecasethunderbird.onLoad(e); }, false);
//window.addEventListener("load", initOverlay, false);
