var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

// Action part
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
	
			menulist.selectedIndex = defaultIndex;
			menulist.setAttribute("value", defaultValue);
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
		let alreadyPatched = wrapper.prototype.hasOwnProperty("patchedByCardBook") ? wrapper.prototype.patchedByCardBook : false;
		if (alreadyPatched) {
			return;
		}
		let prevMethod = wrapper.prototype._getChildNode;
		if (prevMethod) {
			wrapper.prototype._getChildNode = function(type) {
				let element = getChildNode(type);
				return element ? element : prevMethod(type);
			};
			wrapper.prototype.patchedByCardBook = true;
		}
	}
}

patchRuleactiontargetWrapper();



// Search part
function patchCardBookABSelector(es) {
	function addDirectories(aMenuPopup, aMenuValue, aMenuLabel, aMenuType) {
		let newMenuItem = document.createXULElement('menuitem');
		newMenuItem.setAttribute('label', aMenuLabel);
		newMenuItem.setAttribute('value', aMenuValue);
		if (aMenuType) {
			newMenuItem.setAttribute('ABtype', cardbookRepository.getABIconType(aMenuType));
		}
		aMenuPopup.appendChild(newMenuItem);
	};

	function updateSearchValue(menulist) {
		let target = this.closest(".search-value-custom");
		if (target) {
			target.setAttribute("value", menulist.value);
			// The AssignMeaningfulName functions uses the item's js value, so set
			// this to allow this to be shown correctly.
			target.value = menulist.getAttribute('label');
		} else {
			console.log("cannot update search value for menulist:")
			console.log(menulist);
		}
	}
	
	if (es.firstChild && es.firstChild.classList.contains("cardbookABSelector")) {
		return true;
	}
	if (es.firstChild) {
		es.removeChild(es.firstChild);
	}
	try {
		let wrapper = es.closest("search-value");
		let menulistFragment = window.MozXULElement.parseXULToFragment(`
			<menulist flex="1" class="search-value-menulist flexinput cardbookABSelector" inherits="disabled" oncommand="this.parentNode.updateSearchValue(this);">
				<menupopup class="search-value-popup"/>
			</menulist>
		`);
		// dropdown selected, then we haven't got the container <hbox class="search-value-custom" />
		
		es.appendChild(menulistFragment);
		es.classList.add("flexelementcontainer");
		es.updateSearchValue = updateSearchValue;

		let value = es.getAttribute("value");
		let menulist = es.getElementsByTagName("menulist")[0];

		let menuPopup = es.lastChild.getElementsByTagName("menupopup")[0];
		let selectedIndex = 0;
		var found = false;
		var k = 0;
		var ABStrBundle = Services.strings.createBundle("chrome://messenger/locale/addressbook/addressBook.properties");
		addDirectories(menuPopup, "allAddressBooks", ABStrBundle.GetStringFromName("allAddressBooks"), "");
		k++;
		for (let account of cardbookRepository.cardbookAccounts) {
			if (account[5] && account[6] != "SEARCH") {
				var dirPrefId = account[4];
				var dirPrefName = account[0];
				addDirectories(menuPopup, dirPrefId, dirPrefName, account[6]);
				if (!found) {
					found = true;
				}
				if (dirPrefId == value) {
					selectedIndex = k;
				}
				k++;

				for (let category of cardbookRepository.cardbookAccountsCategories[dirPrefId]) {
					addDirectories(menuPopup, dirPrefId + "::" + category, dirPrefName + " / " + category, "");
					if (dirPrefId + "::" + category == value) {
						selectedIndex = k;
					}
					k++;
				}
			}
		}

		menulist.selectedIndex = selectedIndex;
		es.updateSearchValue(menulist);

		// override the opParentValue setter to detect operators which need no value
		// this => es ??
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
		es.setAttribute('patchedByCardBook', "true");
		return true;
	} catch(ex) {
		console.log(ex);
		return false;  
	}
}

function cardBookFilterSearchFunction(mutationList, observer) {
	mutationList.forEach( (mutation) => {
		switch(mutation.type) {
			case 'childList':
				/* One or more children have been added to and/or removed from the tree.
				(See mutation.addedNodes and mutation.removedNodes.) */
				// iterate nodelist of added nodes
				let nList = mutation.addedNodes;
				nList.forEach( (el) => {
					if (!el.querySelectorAll) {
						return; // leave the anonymous function, this continues with the next forEach
					}
					let hbox = el.querySelectorAll("hbox.search-value-custom");
					hbox.forEach ( (es) => {
						let attType = es.getAttribute('searchAttribute');
						let isPatched = false;
						if (!attType.startsWith("cardbook")) {
							return;
						}
						switch(attType) {
							case "cardbook#searchFrom":
							case "cardbook#searchTo":
							case "cardbook#searchCc":
							case "cardbook#searchToOrCc":
							case "cardbook#searchBcc":
							case "cardbook#searchAll":
							case "cardbook#searchCorrespondents":
								isPatched = patchCardBookABSelector(es)
								break;
							default:
						}
					});
				});
				break;
			case "attributes":
				let es = mutation.target;
				if (es.classList.contains("search-value-custom")) {
					let attType = es.getAttribute('searchAttribute');
					let isPatched = false;
					if (!attType.startsWith("cardbook")) {
						return;
					}
					switch(attType) {
						case "cardbook#searchFrom":
						case "cardbook#searchTo":
						case "cardbook#searchCc":
						case "cardbook#searchToOrCc":
						case "cardbook#searchBcc":
						case "cardbook#searchAll":
						case "cardbook#searchCorrespondents":
							if (es.firstChild) {
								if (es.firstChild.classList.contains("cardbookABSelector")) {
									return;
								}
								es.removeChild(es.firstChild);
							}
							isPatched = patchCardBookABSelector(es)
							break;
						default:
					}
				}
				break;          
		}
	});
}

// watch out for custom conditions being added to the top list.
// this works when the element is added by the Filter Editor, but not 
// if we change an existing row to this type...
// for this, let's watch changes to search-menulist
const cardBookFilterSearchObserver = new MutationObserver(cardBookFilterSearchFunction);

const cardBookFilterSearchObserverOptions = {
childList: true,
attributes: true,
// Omit (or set to false) to observe only changes to the parent node
subtree: true
}

let termList = window.document.querySelector('#searchTermList')
cardBookFilterSearchObserver.observe(termList, cardBookFilterSearchObserverOptions);

