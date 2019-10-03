//
// Color Folders v1.0
// Color Folders v1.1
//   Modified to follow the API change in Gecko 22 and onwards
//   (NB: TB replaced Gecko 17 with "24" at TB 24)
//   thanks so much to Strim for providing thie modification.
// Copyright(c) 2011-2013 fisheater
// Released under Mozilla Public License, version 2.0

// Corrected, resurrected, restaurated, extended and republished by Lab5 ( www.lab5.ch ) , anno 2019
// as: Colored Folders v1.2

//

if(!com) var com = {};
if(!com.fisheater) com.fisheater = {};
if(!com.fisheater.colorFolders) com.fisheater.colorFolders = {};

com.fisheater.colorFolders = {
	init: function() {
		window.removeEventListener("load", com.fisheater.colorFolders.init, false);
		
		// override getCellProperties()
		gFolderTreeView.originalGetCellProperties = gFolderTreeView.getCellProperties;
		gFolderTreeView.getCellProperties = function(row, col) {
			var props = gFolderTreeView.originalGetCellProperties(row, col);
			if (col.id == "folderNameCol") {
				var folder = gFolderTreeView.getFolderForIndex(row);
				var folderColor;
				if ( folderColor = folder.getStringProperty("folderColor") ) {
					// color name conversion from v0.9 convention to keep compatibility with existing folders
					var compatibility = com.fisheater.colorFolders.compatibility[folderColor];
					if (compatibility) {
						folderColor = compatibility;
					}
					
					// save folder color
					props += " " + folderColor;
				}
			}
			return props;
		}
		// end of override
		
		// addEventListener for onPopupShowing for folderPaneContext
		var elm = document.getElementById("folderPaneContext");
		elm.addEventListener("popupshowing", com.fisheater.colorFolders.onPopupShowing, false);
		
		// addEventListener for onCommand for folderColorPopup
		elm = document.getElementById("folderColorPopup");
		elm.addEventListener("command", com.fisheater.colorFolders.setFolderColor, false);

		// addEventListener for onSelect for folderColorPicker (capture = true)
		elm = document.getElementById("folderColorPicker");
		elm.addEventListener("select", com.fisheater.colorFolders.setFolderColor, true);
	},

	// event listener for popup menu
	setFolderColor: function(event) {

		var id = event.target.id;
		var folderColor;
		if (id == "folderColorPicker") {
			folderColor = document.getElementById("folderColorPicker").color;
			folderColor = "folderColor" + folderColor.substring( 1, 7 );
		}
		else if (id != "folderColorPopup") {
			var folderColor = event.target.value;
			if (folderColor == "folderColorDefault") {
				folderColor = "";
			}
		}
		
		// apply for all selected folders
		var folders = gFolderTreeView.getSelectedFolders();
		

		for  (var  fndx in folders) {
			
					var folder = folders[fndx];

					folder.setStringProperty("folderColor", folderColor);
		}
		
		// close popup
		// necessary as selecting colorpicker does not close popup
		// must be here otherwise 'selectedFolders' are lost and gets back to previous selection
		document.getElementById("folderPaneContext").hidePopup();

		// force redraw the folder pane
		var box = document.getElementById("folderTree").boxObject;
		box.QueryInterface(Components.interfaces.nsITreeBoxObject);
		box.invalidate();
	},

	// event listener for popupshowing
	onPopupShowing: function(event) {
		if (event.target.id == "folderPaneContext") {
			const specialFolderFlagsMask = nsMsgFolderFlags.Inbox | nsMsgFolderFlags.Drafts
				| nsMsgFolderFlags.SentMail | nsMsgFolderFlags.Trash | nsMsgFolderFlags.Templates
				| nsMsgFolderFlags.Archive | nsMsgFolderFlags.Junk | nsMsgFolderFlags.Queue;
			var folders = gFolderTreeView.getSelectedFolders();
			
		 
		
			var type = "";
			for  (var  fndx in folders) {
				
						var folder = folders[fndx];
		
				if ( folder.isServer || folder.flags & specialFolderFlagsMask ) {
					// to disable menu "folderPaneContext-colorFolders" if any one of folders is special
					type = "special";
					break;
				}
				else if ( folder.flags & nsMsgFolderFlags.Virtual ) {
					// to have standard folder icons in popup if not all types are the same
					if (type == "") {
						type = "virtual";
					}
					else if (type != "virtual") {
						type = "normal";
						break;
					}
				}					
				else if ( folder.server.type == "nntp" || folder.server.type == "rss" ) {
					// to have standard folder icons in popup if not all types are the same
					if (type == "") {
						type = folder.server.type;
					}
					else if (type != folder.server.type) {
						type = "normal";
						break;
					}
				}
				else {
					type = "normal";
				}
			}
			var aMenu = document.getElementById("folderPaneContext-colorFolders");
			if ( type == "special" ) {
				// disabling menu "folderPaneContext-colorFolders" if any one of folders is special
				aMenu.disabled = true;
			}
			else {
				aMenu.disabled = false;
				var aPopup = document.getElementById("folderColorPopup");
				if (type == "virtual" ) {
					// having virtual folder icons in popup if all folders are virtual
					aPopup.setAttribute("class", "folderColorVirtual", "");
				}	
				else if (type == "rss" ) {
					// having rss folder icons in popup if all folders are rss
					aPopup.setAttribute("class", "folderColorRss", "");
				}	
				else if (type == "nntp" ) {
					// having nntp folder icons in popup if all folders are nntp
					aPopup.setAttribute("class", "folderColorNntp", "");
				}	
				else {
					// having standard folder icons in popup if any one of folders is normal
					aPopup.setAttribute("class", "folderColorDefault", "");
				}
				
				// set "More Colors..." menu an icon
				var folderColor = document.getElementById("folderColorPicker").color;
				folderColor = "folderColor" + folderColor.substring( 1, 7 );
				aPopup = document.getElementById("folderColorMoreColors");
				aPopup.setAttribute("class", "menu-iconic "+folderColor, "")
			}
		}
	},
	
	compatibility: {
		folderColorG0:			"folderColorCCCCCC",
		folderColorG1:			"folderColor999999",
		folderColorG2:			"folderColor333333",
		folderColorRed:			"folderColorCC0000",
		folderColorYellow:		"folderColorFF9900",
		folderColorYellowGreen:	"folderColor33CC00",
		folderColorGreen:		"folderColor009900",
		folderColorCyan:		"folderColor00CCCC",
		folderColorBlue:		"folderColor000099",
		folderColorViolet:		"folderColor6633FF",
		folderColorMagenta:		"folderColorCC33CC"
	}
		
};

window.addEventListener("load", com.fisheater.colorFolders.init, false);