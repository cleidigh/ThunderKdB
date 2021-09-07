if ("undefined" == typeof(wdw_cardbookEventContacts)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var wdw_cardbookEventContacts = {
		allEvents: [],
		emailArray: [],
		attendeeId: "",
		attendeeName: "",

		sortTrees: function (aEvent) {
			wdw_cardbookEventContacts.buttonShowing();
			if (aEvent.button != 0) {
				return;
			}
			var target = aEvent.originalTarget;
			if (target.localName == "treecol") {
				wdw_cardbookEventContacts.sortCardsTreeCol(target);
			}
		},

		sortCardsTreeCol: function (aColumn) {
			var myTree = document.getElementById('eventsTree');
			if (aColumn) {
				if (myTree.currentIndex !== -1) {
					var mySelectedValue = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn(aColumn.id));
				}
			}

			var columnName;
			var columnArray;
			var columnType;
			var order = myTree.getAttribute("sortDirection") == "ascending" ? 1 : -1;

			if (aColumn) {
				var myColumn = aColumn;
				columnName = aColumn.id;
				if (myTree.getAttribute("sortResource") == columnName) {
					order *= -1;
				}
			} else {
				columnName = myTree.getAttribute("sortResource");
				var myColumn = document.getElementById(columnName);
			}
			cal.unifinder.sortItems(wdw_cardbookEventContacts.allEvents, columnName, order);

			//setting these will make the sort option persist
			myTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
			myTree.setAttribute("sortResource", columnName);
			
			wdw_cardbookEventContacts.displayEvents();
			
			//set the appropriate attributes to show to indicator
			var cols = myTree.getElementsByTagName("treecol");
			for (var i = 0; i < cols.length; i++) {
				cols[i].removeAttribute("sortDirection");
			}
			document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");

			// select back
			if (aColumn && mySelectedValue) {
				for (var i = 0; i < myTree.view.rowCount; i++) {
					if (myTree.view.getCellText(i, myTree.columns.getNamedColumn(aColumn.id)) == mySelectedValue) {
						myTree.view.selection.rangedSelect(i,i,true);
						found = true
						foundIndex = i;
						break;
					}
				}
			}
		},

		doubleClickTree: function (aEvent) {
			var myTree = document.getElementById('eventsTree');
			if (myTree.currentIndex != -1) {
				var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
				if (cell.row != -1) {
					wdw_cardbookEventContacts.editEvent();
				} else {
					wdw_cardbookEventContacts.createEvent();
				}
			}
		},

		displayEvents: function () {
			var eventsTreeView = {
				get rowCount() { return wdw_cardbookEventContacts.allEvents.length; },
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) { return false },
				getCellText: function(idx, column) {
					var calendarEvent = wdw_cardbookEventContacts.allEvents[idx];
					if (column.id == "title") return (calendarEvent.title ? calendarEvent.title.replace(/\n/g, ' ') : "");
					else if (column.id == "startDate") return wdw_cardbookEventContacts.formatEventDateTime(calendarEvent.startDate);
					else if (column.id == "endDate") {
						let eventEndDate = calendarEvent.endDate.clone();
						if (calendarEvent.startDate.isDate) {
							eventEndDate.day = eventEndDate.day - 1;
						}
						return wdw_cardbookEventContacts.formatEventDateTime(eventEndDate);
					} else if (column.id == "categories") return calendarEvent.getCategories({}).join(", ");
					else if (column.id == "location") return calendarEvent.getProperty("LOCATION");
					else if (column.id == "status") return getEventStatusString(calendarEvent);
					else if (column.id == "calendarName") return calendarEvent.calendar.name;
				}
			}
			document.getElementById('eventsTree').view = eventsTreeView;
			wdw_cardbookEventContacts.buttonShowing();
		},

		formatEventDateTime: function (aDatetime) {
			return cal.getDateFormatter().formatDateTime(aDatetime.getInTimezone(cal.dtz.defaultTimezone));
		},
		
		getItemFromEvent: function (event) {
			let row = document.getElementById('eventsTree').getRowAt(event.clientX, event.clientY);
			if (row > -1) {
				return wdw_cardbookEventContacts.allEvents[row];
			}
			return null;
		},

		eventsTreeContextShowing: function () {
			if (cardbookWindowUtils.displayColumnsPicker()) {
				wdw_cardbookEventContacts.eventsTreeContextShowingNext();
				return true;
			} else {
				return false;
			}
		},

		eventsTreeContextShowingNext: function () {
			var menuEdit = document.getElementById("editEvent");
			var myTree = document.getElementById("eventsTree");
			if (myTree.currentIndex != -1) {
				menuEdit.disabled = false;
			} else {
				menuEdit.disabled = true;
			}
		},

		buttonShowing: function () {
			var btnEdit = document.getElementById("editEventLabel");
			var myTree = document.getElementById("eventsTree");
			if (myTree.currentIndex != -1) {
				btnEdit.disabled = false;
			} else {
				btnEdit.disabled = true;
			}
		},

		// code taken from modifyEventWithDialog
		editEvent: function() {
			var myTree = document.getElementById('eventsTree');
			if (myTree.currentIndex == -1) {
				return;
			} else {
				var myItem = wdw_cardbookEventContacts.allEvents[myTree.currentIndex];
				let dlg = cal.item.findWindow(myItem);
				if (dlg) {
					dlg.focus();
					disposeJob(null);
					return;
				}

				var editListener = {
					onOperationComplete: function(aCalendar, aStatus, aOperationType, aId, aDetail) {
						wdw_cardbookEventContacts.loadEvents();
					}
				};

				var onModifyItem = function(item, calendar, originalItem, listener, extresponse=null) {
					doTransaction('modify', item, calendar, originalItem, editListener, extresponse);
					// as the editlistener does not work, bug seems solved
					// wdw_cardbookEventContacts.loadEvents();
				};

				let item = myItem;
				let response;
				[item, , response] = promptOccurrenceModification(item, true, "edit");
				
				if (item && (response || response === undefined)) {
					openEventDialog(item, item.calendar, "modify", onModifyItem, null, null, null);
				} else {
					disposeJob(null);
				}
			}
		},

		// code taken from createEventWithDialog
		createEvent: function() {
			var createListener = {
				onOperationComplete: function(aCalendar, aStatus, aOperationType, aId, aDetail) {
					wdw_cardbookEventContacts.loadEvents();
				}
			};

			var onNewEvent = function(item, calendar, originalItem, listener) {
				if (item.id) {
					// If the item already has an id, then this is the result of
					// saving the item without closing, and then saving again.
					doTransaction('modify', item, calendar, originalItem, createListener);
				} else {
					// Otherwise, this is an addition
					doTransaction('add', item, calendar, null, createListener);
				}
				// as the createListener does not work, bug seems solved
				// wdw_cardbookEventContacts.loadEvents();
			};
		
			cardbookLightning.createLightningEvent([[wdw_cardbookEventContacts.attendeeId, wdw_cardbookEventContacts.attendeeName]], onNewEvent);
		},

		chooseActionForKey: function (aEvent) {
			if (aEvent.key == "Enter") {
				wdw_cardbookEventContacts.editEvent();
				aEvent.stopPropagation();
			}
		},
		
		addItemsFromCalendar: function (aCalendar, aAddItemsInternalFunc) {
			var refreshListener = {
				QueryInterface: ChromeUtils.generateQI([Components.interfaces.calIOperationListener]),
				mEventArray: [],
				onOperationComplete: function (aCalendar, aStatus, aOperationType, aId, aDateTime) {
					var refreshTreeInternalFunc = function() {
						aAddItemsInternalFunc(refreshListener.mEventArray);
					};
					setTimeout(refreshTreeInternalFunc, 0);
				},
				
				onGetResult: function (aCalendar, aStatus, aItemType, aDetail, aItems) {
					refreshListener.mEventArray = refreshListener.mEventArray.concat(aItems);
				}
			};
			
			let filter = 0;
			filter |= aCalendar.ITEM_FILTER_TYPE_EVENT;
			
			aCalendar.getItems(filter, 0, null, null, refreshListener);
		},

		addItemsFromCompositeCalendarInternal: function (eventArray) {
			wdw_cardbookEventContacts.allEvents = wdw_cardbookEventContacts.allEvents.concat(eventArray);

			// filter does not work
			for (var i = 0; i < wdw_cardbookEventContacts.allEvents.length; i++) {
				let found = false;
				let attendeesArray = cal.email.createRecipientList(wdw_cardbookEventContacts.allEvents[i].getAttendees({})).split(', ');
				for (let j = 0; !found && j < attendeesArray.length; j++) {
					for (let k = 0; !found && k < wdw_cardbookEventContacts.emailArray.length; k++) {
						if (attendeesArray[j].indexOf(wdw_cardbookEventContacts.emailArray[k].toLowerCase()) >= 0) {
							found = true;
						}
					}
				}
				if (!found) {
					wdw_cardbookEventContacts.allEvents.splice(i,1);
					i--;
				}
			}
			wdw_cardbookEventContacts.sortCardsTreeCol(null);
		},

		loadEvents: function () {
			wdw_cardbookEventContacts.allEvents = [];
			let cals = cal.getCalendarManager().getCalendars({});
			for (let calendar of cals) {
				if (!calendar.getProperty("disabled")) {
					wdw_cardbookEventContacts.addItemsFromCalendar(calendar, wdw_cardbookEventContacts.addItemsFromCompositeCalendarInternal);
				}
			}
		},

		load: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_cardbookEventContacts.emailArray = window.arguments[0].listOfEmail;
			wdw_cardbookEventContacts.attendeeId = window.arguments[0].attendeeId;
			wdw_cardbookEventContacts.attendeeName = window.arguments[0].attendeeName;
			document.title = cardbookRepository.extension.localeData.localizeMessage("eventContactsWindowLabel", [window.arguments[0].displayName]);

			wdw_cardbookEventContacts.loadEvents();
		},
	
		do_close: function () {
			close();
		}
	};
};

function ensureCalendarVisible(aCalendar) {};
function goUpdateCommand(aCommand) {};
