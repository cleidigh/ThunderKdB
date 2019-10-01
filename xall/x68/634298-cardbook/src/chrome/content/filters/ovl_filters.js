if ("undefined" == typeof(ovl_filters)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var ovl_filters = {
		
		_isLocalSearch: function(aSearchScope) {
			switch (aSearchScope) {
				case Components.interfaces.nsMsgSearchScope.offlineMail:
				case Components.interfaces.nsMsgSearchScope.offlineMailFilter:
				case Components.interfaces.nsMsgSearchScope.onlineMailFilter:
				case Components.interfaces.nsMsgSearchScope.localNews:
					return true;
				default:
					return false;
				}
		},

		_addEmails: function(aMsgHdrs, aActionValue, aField) {
			// a category might be included
			var mySepPosition = aActionValue.indexOf("::",0);
			if (mySepPosition != -1) {
				var myCategory = aActionValue.substr(mySepPosition+2,aActionValue.length);
				aActionValue = aActionValue.substr(0,mySepPosition);
			} else {
				var myCategory = "";
			}
			let count = aMsgHdrs.length;
			var myTopic = "emailCollectedByFilter";
			var myActionId = cardbookActions.startAction(myTopic);
			for (var i = 0; i < count; i++) {
				let hdr = aMsgHdrs.queryElementAt(i, Components.interfaces.nsIMsgDBHdr);
				var addresses = {}, names = {}, fullAddresses = {};
				MailServices.headerParser.parseHeadersWithArray(hdr[aField], addresses, names, fullAddresses);
				for (var j = 0; j < addresses.value.length; j++) {
					cardbookUtils.addCardFromDisplayAndEmail(aActionValue, names.value[j], addresses.value[j], myCategory, myActionId);
				}
			}
			cardbookActions.endAction(myActionId);
		},

		_removeEmails: function(aMsgHdrs, aActionValue, aField) {
			// a category might be included
			var mySepPosition = aActionValue.indexOf("::",0);
			if (mySepPosition != -1) {
				var myCategory = aActionValue.substr(mySepPosition+2,aActionValue.length);
				aActionValue = aActionValue.substr(0,mySepPosition);
			} else {
				var myCategory = "";
			}
			let count = aMsgHdrs.length;
			var myTopic = "emailDeletedByFilter";
			var myActionId = cardbookActions.startAction(myTopic);
			for (var i = 0; i < count; i++) {
				let hdr = aMsgHdrs.queryElementAt(i, Components.interfaces.nsIMsgDBHdr);
				var addresses = {}, names = {}, fullAddresses = {};
				MailServices.headerParser.parseHeadersWithArray(hdr[aField], addresses, names, fullAddresses);
				for (var j = 0; j < addresses.value.length; j++) {
					var myEmail = addresses.value[j].toLowerCase();
					if (cardbookRepository.cardbookCardEmails[aActionValue]) {
						if (cardbookRepository.cardbookCardEmails[aActionValue][myEmail]) {
							for (let k = 0; k < cardbookRepository.cardbookCardEmails[aActionValue][myEmail].length; k++) {
								var myCard = cardbookRepository.cardbookCardEmails[aActionValue][myEmail][k];
								if (myCategory != "") {
									if (myCategory == cardbookRepository.cardbookUncategorizedCards) {
										if (myCard.categories == "") {
											cardbookRepository.asyncDeleteCards([myCard], myActionId);
										}
									} else {
										if (myCard.categories.includes(myCategory)) {
											cardbookRepository.asyncDeleteCards([myCard], myActionId);
										}
									}
								} else if (myCategory == "") {
									cardbookRepository.asyncDeleteCards([myCard], myActionId);
								}
							}
						}
					}
				}
			}
			cardbookActions.endAction(myActionId);
		},

		_searchEmails: function(aSearchValue, aEmail) {
			if (aSearchValue) {
				return cardbookRepository.isEmailInPrefIdRegistered(aSearchValue, aEmail);
			} else {
				return cardbookRepository.isEmailRegistered(aEmail);
			}
		},

		_matchEmails: function(aMsgHdrEmails, aSearchValue, aSearchOp) {
			var addresses = {}, names = {}, fullAddresses = {};
			MailServices.headerParser.parseHeadersWithArray(aMsgHdrEmails, addresses, names, fullAddresses);
			var matches = false;
			
			for (var i = 0; i < addresses.value.length; i++) {
				switch (aSearchOp) {
					case Components.interfaces.nsMsgSearchOp.IsInAB:
					case Components.interfaces.nsMsgSearchOp.IsntInAB:
						if (i === 0) {
							if (ovl_filters._searchEmails(aSearchValue, addresses.value[i])) {
								matches = true;
							} else {
								matches = false;
							}
						} else {
							if (ovl_filters._searchEmails(aSearchValue, addresses.value[i])) {
								matches = (matches && true);
							} else {
								matches = (matches && false);
							}
						}
						break;
					default:
						Components.utils.reportError("invalid search operator : " + aSearchOp);
				}
			}
			if (aSearchOp == Components.interfaces.nsMsgSearchOp.IsntInAB) {
				return !matches;
			} else {
				return matches;
			}
		},

		onLoad: function () {
			var searchFrom = {
				id: "cardbook#searchFrom",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.searchFrom.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope, length) {
					if (!ovl_filters._isLocalSearch(scope)) {
						length.value = 0;
						return [];
					}
					length.value = 2;
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					return ovl_filters._matchEmails(aMsgHdr.author, aSearchValue, aSearchOp);
				}
			};
			MailServices.filters.addCustomTerm(searchFrom);

			var searchTo = {
				id: "cardbook#searchTo",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.searchTo.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope, length) {
					if (!ovl_filters._isLocalSearch(scope)) {
						length.value = 0;
						return [];
					}
					length.value = 2;
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					return ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp);
				}
			};
			MailServices.filters.addCustomTerm(searchTo);

			var searchCc = {
				id: "cardbook#searchCc",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.searchCc.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope, length) {
					if (!ovl_filters._isLocalSearch(scope)) {
						length.value = 0;
						return [];
					}
					length.value = 2;
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					return ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp);
				}
			};
			MailServices.filters.addCustomTerm(searchCc);

			var searchBcc = {
				id: "cardbook#searchBcc",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.searchBcc.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope, length) {
					if (!ovl_filters._isLocalSearch(scope)) {
						length.value = 0;
						return [];
					}
					length.value = 2;
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					return ovl_filters._matchEmails(aMsgHdr.bccList, aSearchValue, aSearchOp);
				}
			};
			MailServices.filters.addCustomTerm(searchBcc);

			var searchAll = {
				id: "cardbook#searchAll",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.searchAll.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope, length) {
					if (!ovl_filters._isLocalSearch(scope)) {
						length.value = 0;
						return [];
					}
					length.value = 2;
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				// true && false => false
				// true || false => true
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					if (aSearchOp == Components.interfaces.nsMsgSearchOp.IsntInAB) {
						return (ovl_filters._matchEmails(aMsgHdr.author, aSearchValue, aSearchOp) &&
								ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp) &&
								ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp) &&
								ovl_filters._matchEmails(aMsgHdr.bccList, aSearchValue, aSearchOp));
					} else {
						return (ovl_filters._matchEmails(aMsgHdr.author, aSearchValue, aSearchOp) ||
								ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp) ||
								ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp) ||
								ovl_filters._matchEmails(aMsgHdr.bccList, aSearchValue, aSearchOp));
					}
				}
			};
			MailServices.filters.addCustomTerm(searchAll);

			var searchCorrespondents = {
				id: "cardbook#searchCorrespondents",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.searchCorrespondents.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope, length) {
					if (!ovl_filters._isLocalSearch(scope)) {
						length.value = 0;
						return [];
					}
					length.value = 2;
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				// true && false => false
				// true || false => true
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					if (aSearchOp == Components.interfaces.nsMsgSearchOp.IsntInAB) {
						if (cardbookRepository.isOutgoingMail(aMsgHdr)) {
							return (ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp) &&
									ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp) &&
									ovl_filters._matchEmails(aMsgHdr.bccList, aSearchValue, aSearchOp));
						} else {
							return ovl_filters._matchEmails(aMsgHdr.author, aSearchValue, aSearchOp);
						}
					} else {
						if (cardbookRepository.isOutgoingMail(aMsgHdr)) {
							return (ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp) ||
									ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp) ||
									ovl_filters._matchEmails(aMsgHdr.bccList, aSearchValue, aSearchOp));
						} else {
							return ovl_filters._matchEmails(aMsgHdr.author, aSearchValue, aSearchOp);
						}
					}
				}
			};
			MailServices.filters.addCustomTerm(searchCorrespondents);

			var addFrom = {
				id: "cardbook#addFrom",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.addFrom.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				allowDuplicates: true,
				needsBody: false,
				apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					ovl_filters._addEmails(aMsgHdrs, aActionValue, "author");
				}
			};
			MailServices.filters.addCustomAction(addFrom);

			var addTo = {
				id: "cardbook#addTo",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.addTo.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				allowDuplicates: true,
				needsBody: false,
				apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					ovl_filters._addEmails(aMsgHdrs, aActionValue, "recipients");
				}
			};
			MailServices.filters.addCustomAction(addTo);

			var addCc = {
				id: "cardbook#addCc",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.addCc.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				allowDuplicates: true,
				needsBody: false,
				apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					ovl_filters._addEmails(aMsgHdrs, aActionValue, "ccList");
				}
			};
			MailServices.filters.addCustomAction(addCc);

			var addBcc = {
				id: "cardbook#addBcc",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.addBcc.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				allowDuplicates: true,
				needsBody: false,
				apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					ovl_filters._addEmails(aMsgHdrs, aActionValue, "bccList");
				}
			};
			MailServices.filters.addCustomAction(addBcc);

			var addAll = {
				id: "cardbook#addAll",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.addAll.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				allowDuplicates: true,
				needsBody: false,
				apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					ovl_filters._addEmails(aMsgHdrs, aActionValue, "author");
					ovl_filters._addEmails(aMsgHdrs, aActionValue, "recipients");
					ovl_filters._addEmails(aMsgHdrs, aActionValue, "ccList");
					ovl_filters._addEmails(aMsgHdrs, aActionValue, "bccList");
				}
			};
			MailServices.filters.addCustomAction(addAll);

			var removeFrom = {
				id: "cardbook#removeFrom",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.removeFrom.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				allowDuplicates: true,
				needsBody: false,
				apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					ovl_filters._removeEmails(aMsgHdrs, aActionValue, "author");
				}
			};
			MailServices.filters.addCustomAction(removeFrom);

			var removeTo = {
				id: "cardbook#removeTo",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.removeTo.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				allowDuplicates: true,
				needsBody: false,
				apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					ovl_filters._removeEmails(aMsgHdrs, aActionValue, "recipients");
				}
			};
			MailServices.filters.addCustomAction(removeTo);

			var removeCc = {
				id: "cardbook#removeCc",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.removeCc.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				allowDuplicates: true,
				needsBody: false,
				apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					ovl_filters._removeEmails(aMsgHdrs, aActionValue, "ccList");
				}
			};
			MailServices.filters.addCustomAction(removeCc);

			var removeBcc = {
				id: "cardbook#removeBcc",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.removeBcc.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				allowDuplicates: true,
				needsBody: false,
				apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					ovl_filters._removeEmails(aMsgHdrs, aActionValue, "bccList");
				}
			};
			MailServices.filters.addCustomAction(removeBcc);

			var removeAll = {
				id: "cardbook#removeAll",
				name: cardbookRepository.strBundle.GetStringFromName("cardbook.removeAll.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				allowDuplicates: true,
				needsBody: false,
				apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					ovl_filters._removeEmails(aMsgHdrs, aActionValue, "author");
					ovl_filters._removeEmails(aMsgHdrs, aActionValue, "recipients");
					ovl_filters._removeEmails(aMsgHdrs, aActionValue, "ccList");
					ovl_filters._removeEmails(aMsgHdrs, aActionValue, "bccList");
				}
			};
			MailServices.filters.addCustomAction(removeAll);
		}
	};
};

window.addEventListener("load", function(e) { ovl_filters.onLoad(e); }, false);
