(function() {
	var project = com.namespace("com.github.shimamu.asbcustom.messengerOverlay");

	function init() {
	}

	function asbContactsListOnClick(event) {
		var uri = com.github.shimamu.asbcustom.search.SearchURI.create();
		var element = document.getElementById("deleteItem");
		if (element) {
			var isDisabled = (uri.isLdapDirectory()) ? true : false;
			element.setAttribute("disabled", isDisabled);
		}

		contactsListOnClick(event);
	}

	function contactsListOnKeyPress(event) {
		switch (event.key) {
			case "Enter":
				if (event.altKey) {
					goDoCommand("cmd_properties");
				}
				break;
			case "w":
				if (event.altKey) {
					AbNewMessage();
				}
				break;
		}
	}

	function contactsListOnClick(event) {
		// we only care about button 0 (left click) and 
		// button 1 (middle click) events
		if (event.button == 0) {
			// all we need to worry about here is column header clicks.
			var t = event.originalTarget;

			if (t.localName == "treecol") {
				var sortDirection;
				var currentDirection = t.getAttribute("sortDirection");

				if (currentDirection == kDefaultDescending) {
					sortDirection = kDefaultAscending;
				} else {
					sortDirection = kDefaultDescending;
				}

				SortAndUpdateIndicators(t.id, sortDirection);
			}
		}
	}

	function toggleSidebar() {
		var sidebarBox = top.document.getElementById("asbcustomPane");
		var menu = top.document.getElementById("menu_showAddressPane");
		var splitter = top.document.getElementById("sidebar-title");

		if (sidebarBox.hidden) {
			sidebarBox.hidden = false;
			splitter.hidden = false;
			menu.setAttribute("checked", "true");
		} else {
			sidebarBox.hidden = true;
			splitter.hidden = true;
			menu.setAttribute("checked", "false");
		}
	}

	project.toggleSidebar = toggleSidebar;
	project.init = init;
	project.contactsListOnKeyPress = contactsListOnKeyPress
	project.contactsListOnClick = contactsListOnClick
	project.asbContactsListOnClick = asbContactsListOnClick;
}());
