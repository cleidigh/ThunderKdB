var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

var ABFacetingFilter = {
	name: "cardbook",
	domId: "qfb-cardbook",
	
	/**
	* @return true if the constaint is only on is in addressbooks/isn't in addressbooks,
	*     false if there are specific AB constraints in play.
	*/
	isSimple: function(aFilterValue) {
		// it's the simple case if the value is just a boolean
		if (typeof(aFilterValue) != "object") {
			return true;
		}
		// but also if the object contains no non-null values
		let simpleCase = true;
		for (let key in aFilterValue.addressbooks) {
			let value = aFilterValue.addressbooks[key];
			if (value !== null) {
				simpleCase = false;
				break;
			}
		}
		return simpleCase;
	},
	
	/**
	* Because we support both inclusion and exclusion we can produce up to two
	*  groups.  One group for inclusion, one group for exclusion.  To get listed
	*  the message must have any/all of the addressbooks marked for inclusion,
	*  (depending on mode), but it cannot have any of the addressbooks marked for
	*  exclusion.
	*/
	appendTerms: function(aTermCreator, aTerms, aFilterValue) {
		if (aFilterValue == null) {
			return null;
		}
		
		let term, value;
		
		// just the true/false case
		if (this.isSimple(aFilterValue)) {
			term = aTermCreator.createTerm();
			value = term.value;
			term.attrib = Components.interfaces.nsMsgSearchAttrib.Custom;
			value.attrib = term.attrib;
			value.str = "";
			term.value = value;
			term.customId = "cardbook#searchCorrespondents";
			term.booleanAnd = true;
			term.op = Components.interfaces.nsMsgSearchOp.IsInAB;
			aTerms.push(term);
			// we need to perform faceting if the value is literally true.
			if (aFilterValue === true) {
				return this;
			}
		} else {
			let firstIncludeClause = true, firstExcludeClause = true;
			let lastIncludeTerm = null;
			term = null;
			let excludeTerms = [];
			let mode = aFilterValue.mode;
			for (let key in aFilterValue.addressbooks) {
				let shouldFilter = aFilterValue.addressbooks[key];
				if (shouldFilter !== null) {
					term = aTermCreator.createTerm();
					value = term.value;
					term.attrib = Components.interfaces.nsMsgSearchAttrib.Custom;
					value.attrib = term.attrib;
					value.str = key;
					term.value = value;
					term.customId = "cardbook#searchCorrespondents";
					if (shouldFilter) {
						term.op = Components.interfaces.nsMsgSearchOp.IsInAB;
						// AND for the group. Inside the group we also want AND if the
						// mode is set to "All of".
						term.booleanAnd = firstIncludeClause || (mode === "AND");
						term.beginsGrouping = firstIncludeClause;
						aTerms.push(term);
						firstIncludeClause = false;
						lastIncludeTerm = term;
					} else {
						term.op = Components.interfaces.nsMsgSearchOp.IsntInAB;
						// you need to not include all of the addressbooks marked excluded.
						term.booleanAnd = true;
						term.beginsGrouping = firstExcludeClause;
						excludeTerms.push(term);
						firstExcludeClause = false;
					}
				}
			}
			if (lastIncludeTerm) {
				lastIncludeTerm.endsGrouping = true;
			}
			
			// if we have any exclude terms:
			// - we might need to add a "is in AB" clause if there were no explicit
			//   inclusions.
			// - extend the exclusions list in.
			if (excludeTerms.length) {
				// (we need to add is in AB)
				if (!lastIncludeTerm) {
					term = aTermCreator.createTerm();
					value = term.value;
					term.attrib = Components.interfaces.nsMsgSearchAttrib.Custom;
					value.attrib = term.attrib;
					value.str = "";
					term.value = value;
					term.customId = "cardbook#searchCorrespondents";
					term.booleanAnd = true;
					term.op = Components.interfaces.nsMsgSearchOp.IsInAB;
					aTerms.push(term);
				}
				
				// (extend in the exclusions)
				excludeTerms[excludeTerms.length-1].endsGrouping = true;
				aTerms.push.apply(aTerms, excludeTerms);
			}
		}
		return null;
	},

	onSearchStart: function(aCurState) {
		// this becomes aKeywordMap; we want to start with an empty one
		return {};
	},

	onSearchMessage: function(aKeywordMap, aMsgHdr, aFolder) {
	},

	onSearchDone: function(aCurState, aKeywordMap, aStatus) {
		// we are an async operation; if the user turned off the AB facet already,
		//  then leave that state intact...
		if (aCurState == null) {
			return [null, false, false];
		}
		
		// only propagate things that are actually addressbooks though!
		let outKeyMap = {addressbooks: {}};
		let allAddressBooks = cardbookPreferences.getAllPrefIds();
		for (let i = 0; i < allAddressBooks.length; i++) {
			let dirPrefId = allAddressBooks[i];
			if (cardbookPreferences.getEnabled(dirPrefId) && (cardbookPreferences.getType(dirPrefId) !== "SEARCH")) {
				if (dirPrefId in aKeywordMap) {
					outKeyMap.addressbooks[dirPrefId] = aKeywordMap[dirPrefId];
				}
			}
		}
		return [outKeyMap, true, false];
	},

	/**
	* We need to clone our state if it's an object to avoid bad sharing.
	*/
	propagateState: function(aOld, aSticky) {
		// stay disabled when disabled, get disabled when not sticky
		if (aOld == null || !aSticky) {
			return null;
		}
		if (this.isSimple(aOld)) {
			return !!aOld; // could be an object, need to convert.
		}
		// return shallowObjCopy(aOld);
		return JSON.parse(JSON.stringify(aOld));
  	},
	
	/**
	* Default behaviour but:
	* - We collapse our expando if we get unchecked.
	* - We want to initiate a faceting pass if we just got checked.
	*/
	onCommand: function(aState, aNode, aEvent, aDocument) {
		let checked = aNode.checked ? true : null;
		if (!checked) {
			aDocument.getElementById("quick-filter-bar-cardbook-bar").collapsed = true;
		}
		
		// return ourselves if we just got checked to have
		// onSearchStart/onSearchMessage/onSearchDone get to do their thing.
		return [checked, true];
	},
	
	domBindExtra: function(aDocument, aMuxer, aNode) {
		// AB filtering mode menu (All of/Any of)
		function commandHandler(aEvent) {
			let filterValue = aMuxer.getFilterValueForMutation(ABFacetingFilter.name);
			filterValue.mode = aEvent.target.value;
			aMuxer.updateSearch();
		}
		aDocument.getElementById("qfb-cardbook-boolean-mode").addEventListener("ValueChange", commandHandler);
	},
	
	reflectInDOM: function(aNode, aFilterValue, aDocument, aMuxer) {
		aNode.checked = aFilterValue ? true : false;
		if ((aFilterValue != null) && (typeof(aFilterValue) == "object")) {
			this._populateABBar(aFilterValue, aDocument, aMuxer);
		} else {
			aDocument.getElementById("quick-filter-bar-cardbook-bar").collapsed = true;
		}
	},
	
	_populateABBar: function(aState, aDocument, aMuxer) {
		let ABbar = aDocument.getElementById("quick-filter-bar-cardbook-bar");
		let keywordMap = aState.addressbooks;
		
		// If we have a mode stored use that. If we don't have a mode, then update
		// our state to agree with what the UI is currently displaying;
		// this will happen for fresh profiles.
		let qbm = aDocument.getElementById("qfb-cardbook-boolean-mode");
		if (aState.mode) {
			qbm.value = aState.mode;
		} else {
			aState.mode = qbm.value;
		}
		
		function commandHandler(aEvent) {
			let ABKey = aEvent.target.getAttribute("value");
			let state = aMuxer.getFilterValueForMutation(ABFacetingFilter.name);
			state.addressbooks[ABKey] = aEvent.target.checked ? true : null;
			aEvent.target.removeAttribute("inverted");
			aMuxer.updateSearch();
		};
		
		function rightClickHandler(aEvent) {
			// Only do something if this is a right-click, otherwise commandHandler
			//  will pick up on it.
			if (aEvent.button == 2) {
				// we need to toggle the checked state ourselves
				aEvent.target.checked = !aEvent.target.checked;
				let ABKey = aEvent.target.getAttribute("value");
				let state = aMuxer.getFilterValueForMutation(ABFacetingFilter.name);
				state.addressbooks[ABKey] = aEvent.target.checked ? false : null;
				if (aEvent.target.checked) {
					aEvent.target.setAttribute("inverted", "true");
				} else {
					aEvent.target.removeAttribute("inverted");
				}
				aMuxer.updateSearch();
				aEvent.stopPropagation();
				aEvent.preventDefault();
			}
		};
		
		// -- nuke existing exposed addressbooks, but not the mode selector (which is first)
		while (ABbar.childNodes.length > 1) {
			ABbar.lastChild.remove();
		}

		let addCount = 0;
		
		for (var prop in document.styleSheets) {
			var styleSheet = document.styleSheets[prop];
			if (styleSheet.href == "chrome://cardbook/skin/cardbookQFB.css") {
				cardbookRepository.deleteCssAllRules(styleSheet);

				var allAddressBooks = [];
				allAddressBooks = cardbookPreferences.getAllPrefIds();
				for (let i = 0; i < allAddressBooks.length; i++) {
					let dirPrefId = allAddressBooks[i];
					if (cardbookPreferences.getEnabled(dirPrefId) && (cardbookPreferences.getType(dirPrefId) !== "SEARCH")) {
						let dirPrefName = cardbookPreferences.getName(dirPrefId);
						addCount++;
						// Keep in mind that the XBL does not get built for dynamically created
						//  elements such as these until they get displayed, which definitely
						//  means not before we append it into the tree.
						let button = aDocument.createXULElement("toolbarbutton");

						button.setAttribute("id", "qfb-cardbook-" + dirPrefId);
						button.addEventListener("command", commandHandler);
						button.addEventListener("click", rightClickHandler);
						button.setAttribute("type", "checkbox");
						if (keywordMap[dirPrefId] !== null && keywordMap[dirPrefId] !== undefined) {
							button.setAttribute("checked", "true");
							if (!keywordMap[dirPrefId]) {
								button.setAttribute("inverted", "true");
							}
						}
						button.setAttribute("label", dirPrefName);
						button.setAttribute("value", dirPrefId);

						let color = cardbookPreferences.getColor(dirPrefId)
						let ruleString = ".qfb-cardbook-button-color[buttonColor=color_" + dirPrefId + "] {color: " + color + " !important;}";
						let ruleIndex = styleSheet.insertRule(ruleString, styleSheet.cssRules.length);

						button.setAttribute("buttonColor", "color_" + dirPrefId);
						button.setAttribute("class", "qfb-cardbook-button qfb-cardbook-button-color");
						ABbar.appendChild(button);
					}
				}

				cardbookRepository.reloadCss(styleSheet.href);
			}
		}
		ABbar.collapsed = !addCount;
	},
};
QuickFilterManager.defineFilter(ABFacetingFilter);
