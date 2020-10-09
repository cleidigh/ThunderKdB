// toggleAddressPicker
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

(function() {
	// Keep a reference to the original function.
	var _original = toggleAddressPicker;
	
	// Override a function.
	toggleAddressPicker = function(aFocus = true) {

		let sidebarBox = document.getElementById("sidebar-box");
		let sidebarSplitter = document.getElementById("sidebar-splitter");
		let sidebar = document.getElementById("sidebar");
		let sidebarAddrMenu = document.getElementById("menu_AddressSidebar");
		let contactsButton = document.getElementById("button-contacts");
		
		if (sidebarBox.hidden) {
			// Show contacts sidebar.
			sidebarBox.hidden = false;
			sidebarSplitter.hidden = false;
			sidebarAddrMenu.setAttribute("checked", "true");
			if (contactsButton) {
				contactsButton.setAttribute("checked", "true");
			}
			
			let sidebarUrl = sidebar.getAttribute("src");
			// If we have yet to initialize the src URL on the sidebar, then go ahead
			// and do so now... We do this lazily here, so we don't spend time when
			// bringing up the compose window loading the address book data sources.
			// Only when we open composition with the sidebar shown, or when the user
			// opens it, do we set and load the src URL for contacts sidebar.
			if (sidebarUrl != "chrome://cardbook/content/contactsSidebar/wdw_cardbookContactsSidebar.xhtml") {
				// sidebarUrl not yet set, load contacts side bar and focus the search
				// input if applicable: We pass "?focus" as a URL querystring, then via
				// onload event of <window id="abContactsPanel">, in AbPanelLoad() of
				// abContactsPanel.js, we do the focusing first thing to avoid timing
				// issues when trying to focus from here while contacts side bar is still
				// loading.
				let url = "chrome://cardbook/content/contactsSidebar/wdw_cardbookContactsSidebar.xhtml";
				if (aFocus) {
					url += "?focus";
				}
				sidebar.setAttribute("src", url);
			} else if (aFocus) {
				// sidebarUrl already set, so we can focus immediately if applicable.
				focusContactsSidebarSearchInput();
			}
			sidebarBox.setAttribute("sidebarVisible", "true");
		} else {
			// Hide contacts sidebar.
			// If something in the sidebar was left marked focused,
			// clear out the attribute so that it does not keep focus in a hidden element.
			let sidebarContent = sidebar.contentDocument;
			let sideFocused = Array.from(
			sidebarContent.querySelectorAll('[focused="true"]')
				).concat(Array.from(sidebarContent.querySelectorAll(":focus")));
			for (let elem of sideFocused) {
				if ("blur" in elem) {
					elem.blur();
				}
				elem.removeAttribute("focused");
			}
			
			sidebarBox.hidden = true;
			sidebarSplitter.hidden = true;
			sidebarBox.setAttribute("sidebarVisible", "false");
			sidebarAddrMenu.removeAttribute("checked");
			if (contactsButton) {
				contactsButton.removeAttribute("checked");
			}
			
			// If nothing is focused in the main compose frame, focus subject if empty
			// otherwise the body. If we didn't do that, focus may stay inside the closed
			// Contacts sidebar and then the main window/frame does not respond to accesskeys.
			// This may be fixed by bug 570835.
			let composerBox = document.getElementById("headers-parent");
			let focusedElement =
			composerBox.querySelector(":focus") ||
			composerBox.querySelector('[focused="true"]');
			if (focusedElement) {
				focusedElement.focus();
			} else if (!document.getElementById("msgSubject").value) {
				SetMsgSubjectElementFocus();
			} else {
				SetMsgBodyFrameFocus();
			}
		}
	};

})();


window.document.addEventListener("DOMOverlayLoaded_cardbook@vigneau.philippe", function(e) {
	// usefull at startup if the contact sidebar is already open
	if (!document.getElementById("sidebar-box").hidden) {
		setTimeout(toggleAddressPicker, 0, false);
		setTimeout(toggleAddressPicker, 0, false);
	}
}, false);
