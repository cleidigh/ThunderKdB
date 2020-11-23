var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

if (!customElements.get("cardbookABActionPicker")) {

	const updateParentNode = (parentNode) => {
		if (parentNode.hasAttribute("initialActionIndex")) {
			let actionIndex = parentNode.getAttribute("initialActionIndex");
			let filterAction = gFilter.getActionAt(actionIndex);
			parentNode.initWithAction(filterAction);
		}
		parentNode.updateRemoveButton();
	};

	class MozRuleactiontargetCardBookActionABPicker extends MozXULElement {
		addDirectories(aMenuPopup, aMenuValue, aMenuLabel, aMenuType) {
			let newMenuItem = document.createXULElement('menuitem');
			newMenuItem.setAttribute('label', aMenuLabel);
			newMenuItem.setAttribute('value', aMenuValue);
			if (aMenuType) {
				newMenuItem.setAttribute('ABtype', cardbookRepository.getABIconType(aMenuType));
			}
			aMenuPopup.appendChild(newMenuItem);
		};
	
		connectedCallback() {
			if (this.delayConnectedCallback()) {
				return;
			}
			this.textContent = "";
			this.appendChild(MozXULElement.parseXULToFragment(`
				<menulist flex="1" class="ruleactionitem" inherits="disabled" sizetopopup="none" oncommand="this.parentNode.setAttribute('value', this.value);">
					<menupopup></menupopup>
				</menulist>
			`));
	
			let menulist = this.getElementsByTagName("menulist")[0];
			let menupopup = this.getElementsByTagName("menupopup")[0];
			let value = menulist.value;
	Services.console.logStringMessage("test value : " + value.toSource());
			var defaultIndex = 0;
			var defaultValue = "";
			var found = false;
			var k = 0;
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[5] && account[6] != "SEARCH" && !cardbookRepository.cardbookPreferences.getReadOnly(account[4])) {
					var dirPrefId = account[4];
					var dirPrefName = account[0];
					this.addDirectories(menupopup, dirPrefId, dirPrefName, account[6]);
					if (!found) {
						defaultValue = dirPrefId;
						found = true;
					}
					if (dirPrefId == value) {
						defaultIndex = k;
						defaultValue = dirPrefId;
					}
					k++;
	
					for (let category of cardbookRepository.cardbookAccountsCategories[dirPrefId]) {
						this.addDirectories(menupopup, dirPrefId + "::" + category, dirPrefName + " / " + category, "");
						if (dirPrefId + "::" + category == value) {
							defaultIndex = k;
							defaultValue = dirPrefId + "::" + category;
						}
						k++;
					}
				}
			}
	
	Services.console.logStringMessage("test defaultIndex : " + defaultIndex.toSource());
	Services.console.logStringMessage("test defaultValue : " + defaultValue.toSource());
			menulist.selectedIndex = defaultIndex;
			menulist.setAttribute("value", defaultValue);
			// test this.appendChild(menulist);
			updateParentNode(this.closest(".ruleaction"));
		}
	}

	customElements.define("cardbookABActionPicker", MozRuleactiontargetCardBookActionABPicker);
}

function getChildNode(type) {
	const elementMapping = {
		// mappings to thunderbird's ruleactiontarget-* elements
		"cardbook#addFrom": "cardbookABActionPicker",
		"cardbook#addTo": "cardbookABActionPicker",
		"cardbook#addCc": "cardbookABActionPicker",
		"cardbook#addBcc": "cardbookABActionPicker",
		"cardbook#addAll": "cardbookABActionPicker",
		"cardbook#removeFrom": "cardbookABActionPicker",
		"cardbook#removeTo": "cardbookABActionPicker",
		"cardbook#removeCc": "cardbookABActionPicker",
		"cardbook#removeBcc": "cardbookABActionPicker",
		"cardbook#removeAll": "cardbookABActionPicker",
		};
	const elementName = elementMapping[type];
	return elementName ? document.createXULElement(elementName) : null;
}

function patchRuleactiontargetWrapper() {
	let wrapper = customElements.get("ruleactiontarget-wrapper");
	if (wrapper) {
		let alreadyPatched = wrapper.prototype.hasOwnProperty("_patchedByCardBook") ? wrapper.prototype._patchedByCardBook : false;
		if (alreadyPatched) {
			return;
		}
		let prevMethod = wrapper.prototype._getChildNode;
		if (prevMethod) {
			wrapper.prototype._getChildNode = function(type) {
				let element = getChildNode(type);
				return element ? element : prevMethod(type);
			};
			wrapper.prototype._patchedByCardBook = true;
		}
	}
}

patchRuleactiontargetWrapper();









if (!customElements.get("cardbookABSearchPicker")) {

	class MozRuleactiontargetCardBookSearchABPicker extends MozXULElement {
		updateSearchValue(menulist) {
			let target = this.closest(".search-value-custom");
			target.setAttribute("value", menulist.value);
			target.value = menulist.getAttribute('label');
		}
		
		addDirectories(aMenuPopup, aMenuValue, aMenuLabel, aMenuType) {
			let newMenuItem = document.createXULElement('menuitem');
			newMenuItem.setAttribute('label', aMenuLabel);
			newMenuItem.setAttribute('value', aMenuValue);
			if (aMenuType) {
				newMenuItem.setAttribute('ABtype', cardbookRepository.getABIconType(aMenuType));
			}
			aMenuPopup.appendChild(newMenuItem);
		};
	
		connectedCallback() {
			if (this.delayConnectedCallback()) {
				return;
			}
	
			this.textContent = "";
			this.appendChild(MozXULElement.parseXULToFragment(`
				<menulist flex="1" class="search-value-menulist" inherits="disabled" sizetopopup="none" oncommand="this.parentNode.setAttribute('value', this.value);">
					<menupopup class="search-value-popup"></menupopup>
				</menulist>
			`));
	
			let target = this.closest(".search-value-custom");
			let wrapper = target.closest("search-value");
	
			let menulist = this.getElementsByTagName("menulist")[0];
			let menupopup = this.getElementsByTagName("menupopup")[0];
			let value = menulist.value;
			var defaultIndex = 0;
			var defaultValue = "";
			var found = false;
			var k = 0;
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[5] && account[6] != "SEARCH") {
					var dirPrefId = account[4];
					var dirPrefName = account[0];
					this.addDirectories(menupopup, dirPrefId, dirPrefName, account[6]);
					if (!found) {
						defaultValue = dirPrefId;
						found = true;
					}
					if (dirPrefId == value) {
						defaultIndex = k;
						defaultValue = dirPrefId;
					}
					k++;
	
					for (let category of cardbookRepository.cardbookAccountsCategories[dirPrefId]) {
						this.addDirectories(menupopup, dirPrefId + "::" + category, dirPrefName + " / " + category, "");
						if (dirPrefId + "::" + category == value) {
							defaultIndex = k;
							defaultValue = dirPrefId + "::" + category;
						}
						k++;
					}
				}
			}
	
			// test this.appendChild(menulist);
			this.updateSearchValue(menulist);
	
			// override the opParentValue setter to detect ops needing no value
			wrapper.oldOpParentValueSetter = wrapper.__lookupSetter__('opParentValue');
			wrapper.__defineSetter__('opParentValue', function(aValue) {
				let elements = this.getElementsByClassName('search-value-custom');
				if (elements.length > 0) {
					let element = elements[0];
					// hide the value if not relevant
					if (aValue == Components.interfaces.nsMsgSearchOp.IsEmpty || aValue == Components.interfaces.nsMsgSearchOp.IsntEmpty) {
						element.setAttribute('hidden', 'true');
					} else {
						element.removeAttribute('hidden');
					}
				}
				return this.oldOpParentValueSetter(aValue);
			});
			
			let searchrow = wrapper.parentNode.parentNode;
			let searchop = searchrow.getElementsByTagName('search-operator')[0].value;
			wrapper.opParentValue = searchop;
		}
	}

	customElements.define("cardbookABSearchPicker", MozRuleactiontargetCardBookSearchABPicker);
}

/* test
class MozAbPickerSearch extends MozSearchValue {
  connectedCallback() {
    if (this.delayConnectedCallback()) {
      return;
    }
    this.textContent = "";
    this.appendChild(MozXULElement.parseXULToFragment(`
      <menulist flex="1" class="search-value-menulist" inherits="disabled" sizetopopup="none" oncommand="this.parentNode.setAttribute('value', this.value);">
        <menupopup class="search-value-popup" anonid="abPickerSearch-menupopup"></menupopup>
      </menulist>
    `));

    let value = this.getAttribute("value");
    let menulist = document.getAnonymousNodes(this)[0];
    let menupopup = document.getAnonymousElementByAttribute(this, "anonid", "abPickerSearch-menupopup");

    var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
    var defaultIndex = 0;
    var defaultValue = "";
    var found = false;
    var k = 0;
    for (let account of cardbookRepository.cardbookAccounts) {
      if (account[5] && account[6] != "SEARCH") {
        var dirPrefId = account[4];
        var dirPrefName = account[0];
        this.addDirectories(menupopup, dirPrefId, dirPrefName);
        if (!found) {
          defaultValue = dirPrefId;
          found = true;
        }
        if (dirPrefId == value) {
          defaultIndex = k;
          defaultValue = dirPrefId;
        }
        k++;

        for (let category of cardbookRepository.cardbookAccountsCategories[dirPrefId]) {
          this.addDirectories(menupopup, dirPrefId + "::" + category, dirPrefName + " / " + category);
          if (dirPrefId + "::" + category == value) {
            defaultIndex = k;
            defaultValue = dirPrefId + "::" + category;
          }
          k++;
        }
      }
    }

    menulist.selectedIndex = defaultIndex;
    menulist.setAttribute("value", defaultValue);

  }

  addDirectories(aMenuPopup, aMenuValue, aMenuLabel) {
    let newMenuItem = document.createXULElement('menuitem');
    newMenuItem.setAttribute('label', aMenuLabel);
    newMenuItem.setAttribute('value', aMenuValue);
    aMenuPopup.appendChild(newMenuItem);
  }
}
customElements.define("abPickerSearch", MozAbPickerSearch);
*/