if ("undefined" == typeof(cardbookBirthdaysUtils)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var cardbookBirthdaysUtils = {
		lBirthdayList : [],
		lBirthdayAccountList : {},
		lCalendarList : [],
		lBirthdaySyncResult : [],
		
		isCalendarWritable: function (aCalendar) {
			return (!aCalendar.getProperty("disabled") && !aCalendar.readOnly);
		},
		
		getCalendars: function () {
			var myCalendar = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.calendarsNameList");
			var calendarManager = Components.classes["@mozilla.org/calendar/manager;1"].getService(Components.interfaces.calICalendarManager);
			var lCalendars = calendarManager.getCalendars({});

			for (var i = 0; i < lCalendars.length; i++) {
				if (myCalendar.includes(lCalendars[i].id)) {
					cardbookBirthdaysUtils.lCalendarList.push(lCalendars[i]);
				}
			}
		},

		syncWithLightning: function () {
			var maxDaysUntilNextBirthday = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.numberOfDaysForWriting");
			cardbookBirthdaysUtils.loadBirthdays(maxDaysUntilNextBirthday);

			cardbookBirthdaysUtils.getCalendars();
			
			if (cardbookBirthdaysUtils.lBirthdayList.length != 0) {
				cardbookBirthdaysUtils.lBirthdaySyncResult = [];
				cardbookBirthdaysUtils.doSyncWithLightning();
			}
		},

		doSyncWithLightning: function () {
			for (var i = 0; i < cardbookBirthdaysUtils.lCalendarList.length; i++) {
				cardbookBirthdaysUtils.syncCalendar(cardbookBirthdaysUtils.lCalendarList[i]);
			}
		},

		syncCalendar: function (aCalendar) {
			var errorTitle;
			var errorMsg;

			// if calendar is not found, then abort
			if (aCalendar == 0) {
				cardbookBirthdaysUtils.lBirthdaySyncResult.push([aCalendar.name, 0, cardbookBirthdaysUtils.lBirthdayList.length, 0, aCalendar.id]);
				errorTitle = cardbookRepository.extension.localeData.localizeMessage("calendarNotFoundTitle");
				errorMsg = cardbookRepository.extension.localeData.localizeMessage("calendarNotFoundMessage", [aCalendar.name]);
				Services.prompt.alert(null, errorTitle, errorMsg);
				return;
			}

			// check if calendar is writable - if not, abort
			if (!(cardbookBirthdaysUtils.isCalendarWritable(aCalendar))) {
				cardbookBirthdaysUtils.lBirthdaySyncResult.push([aCalendar.name, 0, cardbookBirthdaysUtils.lBirthdayList.length, 0, aCalendar.id]);
				errorTitle = cardbookRepository.extension.localeData.localizeMessage("calendarNotWritableTitle");
				errorMsg = cardbookRepository.extension.localeData.localizeMessage("calendarNotWritableMessage", [aCalendar.name]);
				Services.prompt.alert(null, errorTitle, errorMsg);
				return;
			}

			cardbookBirthdaysUtils.lBirthdaySyncResult.push([aCalendar.name, 0, 0, 0, aCalendar.id]);
			cardbookBirthdaysUtils.getCalendarItems(aCalendar);
		},

		getCalendarItems: function (aCalendar) {
			// prepare Listener
			var getListener = {
				mCalendar : aCalendar,
				mItems : [],
				mStatus : true,
				onGetResult: function(aCalendar, aStatus, aItemType, aDetail, aItems) {
					if (!Components.isSuccessCode(aStatus)) {
						this.mStatus = false;
					} else {
						this.mItems = this.mItems.concat(aItems);
					}
				},
				onOperationComplete: function (aCalendar, aStatus, aOperationType, aId, aDetail) {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(this.mCalendar.name + " : debug mode : aStatus : " + this.mStatus);
					if (this.mStatus) {
						cardbookBirthdaysUtils.syncBirthdays(this.mCalendar, this.mItems);
					} else {
						cardbookBirthdaysUtils.lBirthdaySyncResult.push([this.mCalendar.name, 0, cardbookBirthdaysUtils.lBirthdayList.length, 0, this.mCalendar.id]);
					}
				}
			}

			var calICalendar = Components.interfaces.calICalendar;
			aCalendar.getItems(calICalendar.ITEM_FILTER_TYPE_EVENT, 0, null, null, getListener);
		},

		syncBirthdays: function (aCalendar, aItems) {
			var date_of_today = new Date();
			for (var i = 0; i < cardbookBirthdaysUtils.lBirthdayList.length; i++) {
				var ldaysUntilNextBirthday = cardbookBirthdaysUtils.lBirthdayList[i][0];
				var lBirthdayDisplayName  = cardbookBirthdaysUtils.lBirthdayList[i][1];
				var lBirthdayAge = cardbookBirthdaysUtils.lBirthdayList[i][2];
				var lBirthdayName  = cardbookBirthdaysUtils.lBirthdayList[i][8];

				var lBirthdayDate = new Date();
				lBirthdayDate.setDate(date_of_today.getUTCDate()+parseInt(ldaysUntilNextBirthday));

				// generate Date as Ical compatible text string
				var lYear = lBirthdayDate.getUTCFullYear();
				var lMonth = lBirthdayDate.getMonth() + 1;
				lMonth += "";
				if (lMonth.length == 1) {
					lMonth = "0"+lMonth;
				}
				var lDay = lBirthdayDate.getDate();
				lDay += "";
				if (lDay.length == 1) {
					lDay = "0" + lDay;
				}
				var lBirthdayDateString = lYear + "" + lMonth + "" + lDay;
				
				var lBirthdayDateNext = new Date(lBirthdayDate.getTime() + (24 * 60 * 60 * 1000));
				var lYear = lBirthdayDateNext.getFullYear();
				var lMonth = lBirthdayDateNext.getMonth() + 1;
				lMonth += "";
				if (lMonth.length == 1) {
					lMonth = "0"+lMonth;
				}
				var lDay = lBirthdayDateNext.getDate();
				lDay += "";
				if (lDay.length == 1) {
					lDay = "0" + lDay;
				}
				var lBirthdayDateNextString = lYear + "" + lMonth + "" + lDay;

				var leventEntryTitle = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.eventEntryTitle");
				if (cardbookBirthdaysUtils.lBirthdayList[i][3] != "?") {
					var lEventDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(cardbookBirthdaysUtils.lBirthdayList[i][3], cardbookBirthdaysUtils.lBirthdayList[i][7]);
					var lBirthdayTitle = leventEntryTitle.replace("%1$S", lBirthdayDisplayName).replace("%2$S", lBirthdayAge).replace("%3$S", lEventDate.getUTCFullYear()).replace("%4$S", lBirthdayName).replace("%S", lBirthdayDisplayName).replace("%S", lBirthdayAge);
				} else {
					var lBirthdayTitle = leventEntryTitle.replace("%1$S", lBirthdayDisplayName).replace("%2$S", lBirthdayAge).replace("%3$S", "?").replace("%4$S", lBirthdayName).replace("%S", lBirthdayDisplayName).replace("%S", lBirthdayAge);
				}
				var found = false;
				for (let item of aItems) {
					var summary = item.getProperty("SUMMARY");
					if (summary == lBirthdayTitle) {
						found = true;
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aCalendar.name + " : debug mode : found : " + lBirthdayTitle + ", against : " + summary);
						break;
					} else {
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aCalendar.name + " : debug mode : not found : " + lBirthdayTitle + ", against : " + summary);
					}
				}
				if (!found) {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aCalendar.name + " : debug mode : add : " + lBirthdayTitle);
					var lBirthdayId = cardbookRepository.cardbookUtils.getUUID();
					cardbookBirthdaysUtils.addNewCalendarEntry(aCalendar, lBirthdayId, lBirthdayName, lBirthdayAge, lBirthdayDateString, lBirthdayDateNextString, lBirthdayTitle);
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("syncListExistingEntry", [aCalendar.name, lBirthdayName]);
					cardbookBirthdaysUtils.lBirthdaySyncResult.push([aCalendar.name, 1, 0, 0, aCalendar.id]);
				}
			}
		},

		addNewCalendarEntry: function (aCalendar2, aBirthdayId, aBirthdayName, aBirthdayAge, aDate, aNextDate, aBirthdayTitle) {
			// Strategy is to create iCalString and create Event from that string
			var iCalString = "BEGIN:VCALENDAR\n";
			iCalString += "BEGIN:VEVENT\n";

			var calendarEntryCategories = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.calendarEntryCategories");
			if (calendarEntryCategories !== "") {
				iCalString += "CATEGORIES:" + calendarEntryCategories + "\n";
			}
			
			iCalString += "TRANSP:TRANSPARENT\n";
			if (cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.repeatingEvent")) {
				iCalString += "RRULE:FREQ=YEARLY\n";
			}

			var dtstart;
			var dtend;
			if (cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.eventEntryWholeDay")) {
				dtstart = "DTSTART;VALUE=DATE:";
				dtend = "DTEND;VALUE=DATE:";
				iCalString += dtstart + aDate + "\n";
				iCalString += dtend + aNextDate + "\n";
			} else {
				dtstart = "DTSTART;TZID=" + cal.dtz.defaultTimezone.tzid + ":";
				dtend = "DTEND;TZID=" + cal.dtz.defaultTimezone.tzid + ":";
				var eventEntryTime = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.eventEntryTime");
				var EmptyParamRegExp1 = new RegExp("(.*)([^0-9])(.*)", "ig");
				if (eventEntryTime.replace(EmptyParamRegExp1, "$1")!=eventEntryTime) {
					var eventEntryTimeHour = eventEntryTime.replace(EmptyParamRegExp1, "$1");
					var eventEntryTimeMin = eventEntryTime.replace(EmptyParamRegExp1, "$3");
					if ( eventEntryTimeHour < 10 && eventEntryTimeHour.length == 1 ) {
						eventEntryTimeHour = "0" + eventEntryTimeHour;
					}
					if ( eventEntryTimeMin < 10 && eventEntryTimeMin.length == 1 ) {
						eventEntryTimeMin = "0" + eventEntryTimeMin;
					}
					var lBirthdayTimeString = eventEntryTimeHour.toString() + eventEntryTimeMin.toString() + "00";
				} else {
					var lBirthdayTimeString = "000000";
				}
				iCalString += dtstart + aDate + "T" + lBirthdayTimeString + "\n";
				iCalString += dtend + aDate + "T" + lBirthdayTimeString + "\n";
			}

			// set Alarms
			var lcalendarEntryAlarm = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.calendarEntryAlarm");
			var lcalendarEntryAlarmArray = lcalendarEntryAlarm.split(',');
			for (var i = 0; i < lcalendarEntryAlarmArray.length; i++) {
				// default before alarm before event
				var sign = "-";
				lcalendarEntryAlarmArray[i] = lcalendarEntryAlarmArray[i].replace(/\-/g, "").replace(/ /g, "");
				if (lcalendarEntryAlarmArray[i].includes("+")) {
					sign = "";
					lcalendarEntryAlarmArray[i] = lcalendarEntryAlarmArray[i].replace(/\+/g, "").replace(/ /g, "");
				}
				if (!isNaN(parseInt(lcalendarEntryAlarmArray[i]))) {
					iCalString += "BEGIN:VALARM\nACTION:DISPLAY\nTRIGGER:" + sign + "PT" + parseInt(lcalendarEntryAlarmArray[i]) + "H\nEND:VALARM\n";
				}
			}

			// finalize iCalString
			iCalString += "END:VEVENT\n";
			iCalString += "END:VCALENDAR\n";

			// create event Object out of iCalString
			var event = Components.classes["@mozilla.org/calendar/event;1"].createInstance(Components.interfaces.calIEvent);
			event.icalString = iCalString;

			// set Title
			event.title = aBirthdayTitle;
			event.id = aBirthdayId;

			// prepare Listener
			var addListener = {
				mBirthdayId : aBirthdayId,
				mBirthdayName : aBirthdayName,
				mCalendar : aCalendar2,
				onOperationComplete: function (aCalendar, aStatus, aOperationType, aId, aDetail) {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(this.mCalendar.name + " : debug mode : created operation finished : " + this.mBirthdayId + " : " + this.mBirthdayName);
					if (aStatus == 0) {
						cardbookRepository.cardbookUtils.formatStringForOutput("syncListCreatedEntry", [this.mCalendar.name, this.mBirthdayName]);
						cardbookBirthdaysUtils.lBirthdaySyncResult.push([this.mCalendar.name, 0, 0, 1, this.mCalendar.id]);
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("syncListErrorEntry", [this.mCalendar.name, this.mBirthdayName], "Error");
						cardbookBirthdaysUtils.lBirthdaySyncResult.push([this.mCalendar.name, 0, 1, 0, this.mCalendar.id]);
					}
				}
			}

			// add Item to Calendar
			aCalendar2.addItem(event, addListener);
		},

		daysBetween: function (date1, date2) {
			// The number of milliseconds in one day
			var oneDay = 1000 * 60 * 60 * 24;
			
			var newDate1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
			var newDate2 = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
			return Math.round((newDate1.getTime() - newDate2.getTime())/(oneDay));
		},

		calcDateOfNextBirthday: function (lDateRef, lDateOfBirth) {
			var lDoB_Month= lDateOfBirth.getUTCMonth();
			var lDoB_Day = lDateOfBirth.getUTCDate();
			
			var lnextBirthday = new Date(lDateOfBirth);
			lnextBirthday.setUTCFullYear(lDateRef.getUTCFullYear());
			
			if (this.daysBetween(lnextBirthday, lDateRef)<0) {
				return new Date(Date.UTC(lDateRef.getUTCFullYear()+1, lDoB_Month, lDoB_Day));
			} else {
				return new Date(Date.UTC(lDateRef.getUTCFullYear(), lDoB_Month, lDoB_Day));
			}
		},

		getAllBirthdaysByName: function (aDateFormat, aDateOfBirth, aDisplayName, aNumberOfDays, aDateOfBirthFound, aEmail, aDirPrefId, aName) {
			var date_of_today = new Date();
			var endDate = new Date();
			var dateRef = new Date();
			var lnextBirthday;
			var lAge;
			var ldaysUntilNextBirthday;
			var lDateOfBirthOld = aDateOfBirth;
			var lDateOfBirth = cardbookRepository.cardbookDates.convertDateStringToDateUTC(aDateOfBirth, aDateFormat);

			endDate.setUTCDate(date_of_today.getUTCDate()+parseInt(aNumberOfDays));
			while (dateRef < endDate) {
				lnextBirthday = this.calcDateOfNextBirthday(dateRef,lDateOfBirth);
				if (lDateOfBirth.getUTCFullYear() == cardbookRepository.cardbookDates.defaultYear) {
					lAge = "?";
					lDateOfBirthOld = "?";
				} else {
					lAge = lnextBirthday.getFullYear()-lDateOfBirth.getUTCFullYear();
				}
				ldaysUntilNextBirthday = this.daysBetween(lnextBirthday, date_of_today);
				if (parseInt(ldaysUntilNextBirthday) <= parseInt(aNumberOfDays)) {
					if (ldaysUntilNextBirthday === parseInt(ldaysUntilNextBirthday)) {
						cardbookBirthdaysUtils.lBirthdayList.push([ldaysUntilNextBirthday, aDisplayName, lAge, lDateOfBirthOld, aDateOfBirthFound, aEmail, aDirPrefId, aDateFormat, aName]);
					} else {
						cardbookBirthdaysUtils.lBirthdayList.push(["0", aDisplayName + " : Error", "0", "0", aDateOfBirthFound, aEmail, aDirPrefId, aDateFormat, aName]);
					}
					if (!(cardbookBirthdaysUtils.lBirthdayAccountList[aDirPrefId])) {
						cardbookBirthdaysUtils.lBirthdayAccountList[aDirPrefId] = "";
					}
				}
				dateRef.setMonth(dateRef.getMonth() + 12);
				// for repeating events one event is enough
				if (cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.repeatingEvent")) {
					return;
				}
			}
		},
	
		loadBirthdays: function (lnumberOfDays) {
			var myContact = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.addressBooksNameList");
			var useOnlyEmail = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			var search = {};
			for (var field of cardbookRepository.dateFields) {
				search[field] = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.birthday." + field, true);
			}
			search.events = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.birthday.events", true);
			var eventInNoteEventPrefix = cardbookRepository.extension.localeData.localizeMessage("eventInNoteEventPrefix");
			var deathSuffix = cardbookRepository.extension.localeData.localizeMessage("deathSuffix");
			cardbookBirthdaysUtils.lBirthdayList = [];
			
			for (let i in cardbookRepository.cardbookCards) {
				var myCard = cardbookRepository.cardbookCards[i];
				var myDirPrefId = myCard.dirPrefId;
				if (myContact.includes(myDirPrefId) || myContact === "allAddressBooks") {
					var dateFormat = cardbookRepository.getDateFormat(myDirPrefId, myCard.version);
					var myDirPrefName = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(myDirPrefId);
					for (let field of cardbookRepository.dateFields) {
						if (myCard[field] && myCard[field] != "" && search[field]) {
							var myFieldValue = myCard[field];
							var isDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(myFieldValue, dateFormat);
							if (isDate != "WRONGDATE") {
								listOfEmail = cardbookRepository.cardbookUtils.getMimeEmailsFromCards([myCard], useOnlyEmail);
								if (field == "deathdate") {
									cardbookBirthdaysUtils.getAllBirthdaysByName(dateFormat, myFieldValue, myCard.fn + ' ' + deathSuffix, lnumberOfDays, myFieldValue, listOfEmail, myDirPrefId, cardbookRepository.cardbookUtils.getName(myCard) + ' ' + deathSuffix);
								} else {
									cardbookBirthdaysUtils.getAllBirthdaysByName(dateFormat, myFieldValue, myCard.fn, lnumberOfDays, myFieldValue, listOfEmail, myDirPrefId, cardbookRepository.cardbookUtils.getName(myCard));
								}
							} else {
								cardbookRepository.cardbookUtils.formatStringForOutput("dateEntry1Wrong", [myDirPrefName, myCard.fn, myFieldValue, dateFormat], "Warning");
							}
						}
					}
					if (search.events) {
						var myEvents = cardbookRepository.cardbookUtils.getEventsFromCard(myCard.note.split("\n"), myCard.others);
						for (let j = 0; j < myEvents.result.length; j++) {
							var isDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(myEvents.result[j][0], dateFormat);
							if (isDate != "WRONGDATE") {
								listOfEmail = cardbookRepository.cardbookUtils.getMimeEmailsFromCards([myCard], useOnlyEmail);
								cardbookBirthdaysUtils.getAllBirthdaysByName(dateFormat, myEvents.result[j][0], myEvents.result[j][1], lnumberOfDays, myEvents.result[j][0], listOfEmail, myDirPrefId, myEvents.result[j][1]);
							} else {
								cardbookRepository.cardbookUtils.formatStringForOutput("dateEntry1Wrong", [myDirPrefName, myCard.fn, myEvents.result[j][0], dateFormat], "Warning");
							}
						}
					}
				}
			}
		}
	};
};
