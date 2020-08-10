var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { DBViewWrapper } = ChromeUtils.import("resource:///modules/DBViewWrapper.jsm");
var { TagUtils } = ChromeUtils.import("resource:///modules/TagUtils.jsm");

class cardsTreeColumns extends customElements.get("treecols") {
	connectedCallback() {
		if (this.delayConnectedCallback()) {
			return;
		}
		let treecolpicker = this.querySelector("treecolpicker:not([is]");
		
		if (treecolpicker) {
			treecolpicker.remove();
		}
		if (!this.querySelector("treecolpicker[is=cards-pane-treecolpicker]")) {
			this.appendChild(MozXULElement.parseXULToFragment(`
				<treecolpicker is="cards-pane-treecolpicker" class="treecol-image" fixed="true"></treecolpicker>
			`));
		}
		// Exceptionally apply super late, so we get the other goodness from there
		// now that the treecolpicker is corrected.
		super.connectedCallback();
	}
}
customElements.define("cards-pane-treecols", cardsTreeColumns, { extends: "treecols" });

class cardsTreeColpicker extends customElements.get("treecolpicker") {
	connectedCallback() {
		super.connectedCallback();
		if (this.delayConnectedCallback()) {
			return;
		}
		let popup = this.querySelector(`menupopup[anonid="popup"]`);

		// delete all above the menuseparator
		for (let i = popup.childNodes.length -1; i >= 0; i--) {
			let child = popup.childNodes[i];
			if (child.tagName == "menuseparator") {
				break;
			}
			popup.removeChild(child);
		}

		// We'll add an "Restore Column Order" menu
		popup.appendChild(MozXULElement.parseXULToFragment(`
			<menuitem class="resetABMenuitem" label="&restoreColumnOrder.label;"></menuitem>
			`, ["chrome://global/locale/tree.dtd"]));

		let resetABMenuitem = this.querySelector(".resetABMenuitem");
		resetABMenuitem.addEventListener("click", (event) => {
			cardbookTreeUtils.setColumnsState(cardbookRepository.defaultDisplayedColumns.split(','));
		});
		
		// We'll add an "Apply columns to..." menu
		popup.appendChild(MozXULElement.parseXULToFragment(`
			<menu class="applyToABMenu" label="&columnPicker.applyTo.label;">
				<menupopup class="applyToABMenupopup" position="start_before"></menupopup>
			</menu>
			`, ["chrome://messenger/locale/messenger.dtd"]));

		popup.addEventListener("popupshowing", (event) => {
			let applyToABMenupopup = this.querySelector(".applyToABMenupopup");
			let applyToABMenulist = this.querySelector(".applyToABMenu");
			while (applyToABMenupopup.hasChildNodes()) {
				applyToABMenupopup.lastChild.remove();
			}
			cardbookElementTools.loadAddressBooks(applyToABMenupopup, applyToABMenulist, "", true, true, true, true, true);
		});
		
		
		let applyToABMenu = this.querySelector(".applyToABMenu");
		let applyToABMenupopup = this.querySelector(".applyToABMenupopup");
		applyToABMenu.addEventListener("click", (event) => {
			let applyToABMenupopup = this.querySelector(".applyToABMenupopup");
			let applyToABMenulist = this.querySelector(".applyToABMenu");
			// click on the menu
			if (event.originalTarget == applyToABMenulist) {
				applyToABMenupopup.openPopup(applyToABMenupopup, "after_end");
				return;
			// click on the submenu
			} else {
				// Confirm the action with the user.
				let destAB = event.originalTarget.value;
				let destABName = event.originalTarget.label;
				let strBundle = document.getElementById("bundle_messenger");
				let stringBase = "threadPane.columnPicker.confirmFolder.noChildren.";
				let confirmed = Services.prompt.confirm(null, strBundle.getString(stringBase + "title"),
															strBundle.getFormattedString(stringBase + "message", [destABName]));
				if (!confirmed) {
					return;
				}
				
				var myColumns = cardbookTreeUtils.getColumnsState();
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[1]) {
						if ((account[4] == destAB) || ("allAddressBooks" == destAB)) {
							cardbookRepository.cardbookPreferences.setDisplayedColumns(account[4], myColumns);
						}
					}
				}
			}
		});
	}
}
customElements.define("cards-pane-treecolpicker", cardsTreeColpicker, { extends: "treecolpicker" });
