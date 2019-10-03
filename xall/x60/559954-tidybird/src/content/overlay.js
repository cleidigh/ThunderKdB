/*
	Tidybird extension for Mozilla Thunderbird - Organize email into folders
	quickly and easily.
	
    Copyright (C) 2018 George Anastassakis (ganast@ganast.com)
	
	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
function Log(message) {
	var Application =
		Components.classes["@mozilla.org/steel/application;1"]
		.getService(Components.interfaces.steelIApplication);
	Application.console.log(message);
}
*/

// folder listener to update button list...
var TidybirdFolderListener = {

	// OnItemAdded, irrelevant in all cases...
    OnItemAdded: function(parentItem, item, view) {
		// Log('OnItemAdded: parentItem=' + parentItem + ', item=' + item + ', view=' + view);
		// alert('Email moved to folder ' + parentItem.name + ' (' + parentItem.URI + ')');
	},

	// OnItemRemoved, relevant if item removed is a folder...
    OnItemRemoved: function(parentItem, item, view) {
		// Log('OnItemRemoved: parentItem=' + parentItem + ', item=' + item + ', view=' + view);
		// alert('OnItemRemoved: parentItem=' + parentItem + ', item=' + item + ', view=' + view);

		// check if item removed is a folder...
		if (item instanceof Components.interfaces.nsIMsgFolder) {
			
			// update button list...
			Tidybird.updateButtonList();
		}
	},

	// OnItemPropertyChanged, irrelevant in all cases...
    OnItemPropertyChanged: function(item, property, oldValue, newValue) {
		// Log('OnItemPropertyChanged: item=' + item + ', property=' + property + ', oldValue=' + oldValue + ', newValue=' + newValue);
	},

	// OnItemIntPropertyChanged, irrelevant in all cases...
    OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {
		// Log('OnItemIntPropertyChanged: item=' + item + ', property=' + property + ', oldValue=' + oldValue + ', newValue=' + newValue);
	},

	// OnItemBoolPropertyChanged, irrelevant in all cases...
    OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {
		// Log('OnItemBoolPropertyChanged: item=' + item + ', property=' + property + ', oldValue=' + oldValue + ', newValue=' + newValue);
	},

	// OnItemUnicharPropertyChanged, irrelevant in all cases...
    OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) {
		// Log('OnItemUnicharPropertyChanged: item=' + item + ', property=' + property + ', oldValue=' + oldValue + ', newValue=' + newValue);
	},

	// OnItemPropertyFlagChanged, irrelevant in all cases...
    OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {
		// Log('OnItemPropertyFlagChanged: item=' + item + ', property=' + property + ', oldFlag=' + oldFlag + ', newFlag=' + newFlag);
	},

	// OnItemEvent, relevant if event signifies that a folder's name or most-
	// recently modified time property has changed...
    OnItemEvent: function(folder, event) {
		// Log('OnItemEvent: event=' + event);

		// check if a folder has been renamed...
		if (event == "RenameCompleted") {
			
			// update button list...
			Tidybird.updateButtonList();
		}

		// else, check if there has been a change in a folder's MRMTime
		// property...
		else if (event == "MRMTimeChanged") {

			// update button list...
			Tidybird.updateButtonList();
		}
	}
}

// container var for all Tidybird-related stuff...
var Tidybird = {

	// initialization...
	init: function() {
		// Log('[Tidybird] Tidybird.init - begin');

		// access mail session component...
		var mailSession = Components.classes[
			"@mozilla.org/messenger/services/session;1"
		].getService(
			Components.interfaces.nsIMsgMailSession
		);

		// add a Tidybird folder listener to the mail session component...
		mailSession.AddFolderListener(
			TidybirdFolderListener, Components.interfaces.nsIFolderListener.all
		);

		// update button list...
		Tidybird.updateButtonList();
		
		// Log('[Tidybird] Tidybird.init - end');
	},

	// toggle the Tidybird panel...
	do: function() {

		// access the button pane...
		var tidybirdPane = top.document.getElementById("tidybirdPane");

		// access the splitter...
		var tidybirdSplitter = top.document.getElementById("tidybirdSplitter");

		// check if button pane is hidden or visible...
		if (tidybirdPane.hidden) {

			// unhide the button pane and splitter...
			tidybirdPane.hidden = false;
			tidybirdSplitter.hidden = false;
		}
		else {

			// hide the button pane and splitter...
			tidybirdPane.hidden = true;
			tidybirdSplitter.hidden = true;
		}

		// update button list...
		// TODO: Is this really necessary? Probably not.
		Tidybird.updateButtonList();
	},

	updateButtonList: function() {
		var buttonList = top.document.getElementById("tidybirdButtonList");
		while (buttonList.hasChildNodes()){
			buttonList.removeChild(buttonList.firstChild);
		}
		var mostRecentlyModifiedFolders = Tidybird.getMostRecentlyModifiedFolders();
		for (var i = 0; i != mostRecentlyModifiedFolders.length; i++) {
			var button = Tidybird.createFolderMoveButton(
				mostRecentlyModifiedFolders[i]
			);
			buttonList.appendChild(button);
		}
	},

	createFolderMoveButton: function(folder) {
		
		const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		
		var ancestors = Tidybird.getFolderAncestors(folder);

		var path = "";
		for (var i = 0; i != ancestors.length; i++) {
			path += ancestors[i].name + "/"
		}
		
		var root = ancestors.length > 2 ?
			ancestors[2] :
			(
				ancestors.length > 1 ? ancestors[1] : ancestors[0]
			);
		
		var button = document.createElementNS(XUL_NS, "button");
		
		button.className = "tidybird-folder-move-button";

		var hbox = document.createElementNS(XUL_NS, "hbox");
		hbox.setAttribute("flex", "1");
		button.appendChild(hbox);

		// button.textContent = folder.name + " (in " + root.name + ")";

		var label1 = document.createElementNS(XUL_NS, "label");
		label1.setAttribute("flex", "1");
		label1.className = "tidybird-folder-move-button-label-1";
		label1.textContent = folder.name;
		hbox.appendChild(label1);
		
		var label2 = document.createElementNS(XUL_NS, "label");
		label2.setAttribute("flex", "1");
		label2.className = "tidybird-folder-move-button-label-2";
		label2.textContent = /*"in " + */root.name;
		hbox.appendChild(label2);
		
		button.setAttribute("tooltiptext", path + folder.name);

		button.addEventListener(
			"click",
			function() {
				Tidybird.moveSelectedMessageToFolder(folder)
			},
			false
		);

		return button;
	},

	moveSelectedMessageToFolder: function(folder) {
		MsgMoveMessage(folder);
	},
	
	getFolderAncestors: function(folder) {
		if (folder.parent != undefined) {
			var parent = folder.parent;
			var ancestors = Tidybird.getFolderAncestors(folder.parent);
			ancestors.push(folder.parent);
			return ancestors;
		}
		else {
			return [];
		}
	},
	
	getMostRecentlyModifiedFolders: function() {
		let mostRecentlyModifiedFolders = getMostRecentFolders(
			gFolderTreeView._enumerateFolders,
			30,
			"MRMTime",
			null
		);
		mostRecentlyModifiedFolders.sort(function(a, b) {
			return a.name.localeCompare(b.name);
		});
		return mostRecentlyModifiedFolders;
	}
}

window.addEventListener("load", Tidybird.init, false);