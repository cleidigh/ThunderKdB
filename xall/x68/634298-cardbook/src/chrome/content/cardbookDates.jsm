var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var EXPORTED_SYMBOLS = ["cardbookDates"];
var cardbookDates = {
	
	defaultYear: "1604",
	
	getDateForCompare: function (aCard, aField) {
		try {
			var myFieldValue = aCard[aField];
			if (myFieldValue == "") {
				return new Date(Date.UTC(cardbookDates.defaultYear, '6', '6'));
			} else {
				switch(myFieldValue.length) {
					// datetimes
					// the mozilla parser does not parse 20180904T161908Z or 20180904T161908
					case 15:
					case 16:
					case 17:
					case 18:
					case 19:
					case 20:
						myFieldValue = cardbookDates.getCorrectDatetime(myFieldValue);
						var myDate = new Date(Date.parse(myFieldValue));
						if (isNaN(myDate)) {
							return new Date(Date.UTC(cardbookDates.defaultYear, '6', '6'));
						} else {
							return myDate;
						}
						break;

					// dates
					default:
						var dateFormat = cardbookRepository.getDateFormat(aCard.dirPrefId, aCard.version);
						var myDate = cardbookDates.convertDateStringToDateUTC(myFieldValue, dateFormat);
						if (myDate == "WRONGDATE") {
							return new Date(Date.UTC(cardbookDates.defaultYear, '6', '6'));
						} else {
							return myDate;
						}
				}
			}
		}
		catch (e) {
			return new Date(Date.UTC(cardbookDates.defaultYear, '6', '6'));
		}
	},

	getFormattedDateForCard: function (aCard, aField) {
		try {
			var myFieldValue = aCard[aField];
			if (myFieldValue == "") {
				return "";
			} else {
				switch(myFieldValue.length) {
					// datetimes
					// the mozilla parser does not parse 20180904T161908Z or 20180904T161908
					case 15:
					case 16:
					case 17:
					case 18:
					case 19:
					case 20:
						myFieldValue = cardbookDates.getCorrectDatetime(myFieldValue);
						return cardbookDates.getFormattedDateTimeForDateTimeString(myFieldValue, cardbookRepository.dateDisplayedFormat);
						break;

					// dates
					default:
						var dateFormat = cardbookRepository.getDateFormat(aCard.dirPrefId, aCard.version);
						return cardbookDates.getFormattedDateForDateString(myFieldValue, dateFormat, cardbookRepository.dateDisplayedFormat);
				}
			}
		}
		catch (e) {
			return aCard[aField];
		}
	},

	getFormattedDateForDateString: function (aDateString, aSourceDateFormat, aTargetDateFormat) {
		try {
			var myDate = cardbookDates.convertDateStringToDateUTC(aDateString, aSourceDateFormat);
			if (myDate == "WRONGDATE") {
				return aDateString;
			} else if (myDate.getUTCFullYear() == cardbookDates.defaultYear) {
				if (aTargetDateFormat == "0") {
					var formatter = new Services.intl.DateTimeFormat(undefined, { month: "long", day: "numeric", timeZone: "UTC"});
				} else {
					var formatter = new Services.intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC"});
				}
				return formatter.format(myDate);
			} else {
				if (aTargetDateFormat == "0") {
					var formatter = new Services.intl.DateTimeFormat(undefined, {dateStyle: "long", timeZone: "UTC"});
				} else {
					var formatter = new Services.intl.DateTimeFormat(undefined, {dateStyle: "short", timeZone: "UTC"});
				}
				return formatter.format(myDate);
			}
		}
		catch (e) {
			return aDateString;
		}
	},

	getFormattedDateTimeForDateTimeString: function (aDateTimeString, aTargetDateFormat) {
		try {
			var myDate = new Date(Date.parse(aDateTimeString));
			if (isNaN(myDate)) {
				return aDateTimeString;
			} else {
				if (aTargetDateFormat == "0") {
					var formatter = new Services.intl.DateTimeFormat(undefined, {dateStyle: "long", timeZone: "UTC"});
				} else {
					var formatter = new Services.intl.DateTimeFormat(undefined, {dateStyle: "short", timeZone: "UTC"});
				}
				return formatter.format(myDate);
			}
		}
		catch (e) {
			return aDateTimeString;
		}
	},

	getAge: function (aCard) {
		try {
			if (aCard.bday == "") {
				return "";
			} else {
				var dateFormat = cardbookRepository.getDateFormat(aCard.dirPrefId, aCard.version);
				var lDateOfBirth = cardbookDates.convertDateStringToDateUTC(aCard.bday, dateFormat);
				if (lDateOfBirth == "WRONGDATE") {
					return "?";
				} else if (lDateOfBirth.getUTCFullYear() == cardbookDates.defaultYear) {
					return "?";
				} else {
					var today = new Date();
					var age = today.getFullYear() - lDateOfBirth.getFullYear();
					var m = today.getMonth() - lDateOfBirth.getMonth();
					if (m < 0 || (m === 0 && today.getDate() < lDateOfBirth.getDate())) {
						age--;
					}
					return age.toString();
				}
			}
		}
		catch (e) {
			return "?";
		}
	},

	lPad: function (aValue) {
		aValue = "" + aValue;
		if (aValue.length == 1) {
			aValue = "0" + aValue;
		}
		return aValue;
	},

	getCorrectDatetime: function (aValue) {
		// 20190208T000004
		// 20190208T000004Z
		if (aValue.length == 15 ||aValue.length == 16) {
			aValue = aValue.slice(0,4) + "-" + aValue.slice(4,6) + "-" + aValue.slice(6,11) + ":" + aValue.slice(11,13) + ":" + aValue.slice(13,15) + "Z";
		// 2019-02-08T000004
		} else if (aValue.length == 17 && aValue.includes("-")) {
			aValue = aValue.slice(0,4) + "-" + aValue.slice(5,7) + "-" + aValue.slice(8,13) + ":" + aValue.slice(13,15) + ":" + aValue.slice(15,17) + "Z";
		// 20190208T00:00:04
		} else if (aValue.length == 17 && aValue.includes(":")) {
			aValue = aValue.slice(0,4) + "-" + aValue.slice(4,6) + "-" + aValue.slice(6,17) + "Z";
		// 2019-02-08T000004Z
		} else if (aValue.length == 18 && aValue.includes("-")) {
			aValue = aValue.slice(0,4) + "-" + aValue.slice(5,7) + "-" + aValue.slice(8,13) + ":" + aValue.slice(13,15) + ":" + aValue.slice(15,17) + "Z";
		// 20190208T00:00:04Z
		} else if (aValue.length == 18 && aValue.includes(":")) {
			aValue = aValue.slice(0,4) + "-" + aValue.slice(4,6) + "-" + aValue.slice(6,17) + "Z";
		// 2019-02-08T00:00:04
		} else if (aValue.length == 19) {
			aValue = aValue + "Z";
		}
		// 2019-02-08T00:00:04Z
		return aValue;
	},

	getCorrectPartialDate: function (aValue) {
		// years equal to 1604 are always considered as a partial date
		// 5-8
		if (aValue.length == 3 && aValue.includes("-")) {
			aValue = cardbookDates.defaultYear + "-0" + aValue.slice(0,1) + "-0" + aValue.slice(2,3);
		// 523
		} else if (aValue.length == 3 && !aValue.includes("-")) {
			aValue = cardbookDates.defaultYear + "-0" + aValue.slice(0,1) + "-" + aValue.slice(1,3);
		// 1212
		} else if (aValue.length == 4 && !aValue.includes("-")) {
			aValue = cardbookDates.defaultYear + "-" + aValue.slice(0,2) + "-" + aValue.slice(2,4);
		// 8-12
		} else if (aValue.length == 4 && aValue.indexOf("-") == 1) {
			aValue = cardbookDates.defaultYear + "-0" + aValue.slice(0,1) + "-" + aValue.slice(2,4);
		// 12-8
		} else if (aValue.length == 4 && aValue.indexOf("-") == 2) {
			aValue = cardbookDates.defaultYear + "-" + aValue.slice(0,2) + "-0" + aValue.slice(3,4);
		// 11-12
		} else if (aValue.length == 5 && aValue.indexOf("-") == 2) {
			aValue = cardbookDates.defaultYear + "-" + aValue.slice(0,2) + "-" + aValue.slice(3,5);
		// --1125
		} else if (aValue.length == 6 && aValue.startsWith("--")) {
			aValue = cardbookDates.defaultYear + "-" + aValue.slice(2,4) + "-" + aValue.slice(4,6);
		}
		return aValue;
	},

	convertDateStringToDateUTC: function (aDateString, aDateFormat) {
		try {
			if (aDateString.length < 3) {
				return "WRONGDATE";
			// datetimes
			// the mozilla parser does not parse 20180904T161908Z or 20180904T161908
			} else if (aDateString.length >= 15 && aDateString.length <= 20) {
				aDateString = cardbookDates.getCorrectDatetime(aDateString);
				let myDate = new Date(Date.parse(aDateString));
				if (isNaN(myDate)) {
					return "WRONGDATE";
				} else {
					return myDate;
				}
			// partial dates
			} else if (aDateString.length >= 3 && aDateString.length <= 6) {
				aDateString = cardbookDates.getCorrectPartialDate(aDateString);
				let myYear = aDateString.slice(0, 4);
				let myMonth = aDateString.slice(5, 7);
				let myDay = aDateString.slice(8, 10);
				let myDate = new Date(Date.UTC(myYear, myMonth-1, myDay));
				if (isNaN(myDate)) {
					return "WRONGDATE";
				} else {
					return myDate;
				}
			} else {
				if (aDateFormat == "YYYY-MM-DD") {
					let myYear = aDateString.slice(0, 4);
					let myMonth = aDateString.slice(5, 7);
					let myDay = aDateString.slice(8, 10);
					let myDate = new Date(Date.UTC(myYear, myMonth-1, myDay));
					if (isNaN(myDate)) {
						return "WRONGDATE";
					} else {
						return myDate;
					}
				} else if (aDateFormat == "3.0") {
					if (aDateString.length == 10) {
						let myYear = aDateString.slice(0, 4);
						let myMonth = aDateString.slice(5, 7);
						let myDay = aDateString.slice(8, 10);
						let myDate = new Date(Date.UTC(myYear, myMonth-1, myDay));
						if (isNaN(myDate)) {
							return "WRONGDATE";
						} else {
							return myDate;
						}
					} else if (aDateString.length == 8) {
						let myYear = aDateString.slice(0, 4);
						let myMonth = aDateString.slice(4, 6);
						let myDay = aDateString.slice(6, 8);
						let myDate = new Date(Date.UTC(myYear, myMonth-1, myDay));
						if (isNaN(myDate)) {
							return "WRONGDATE";
						} else {
							return myDate;
						}
					} else {
						return "WRONGDATE";
					}
				} else if (aDateFormat == "4.0") {
					if (aDateString.length == 8) {
						let myYear = aDateString.slice(0, 4);
						let myMonth = aDateString.slice(4, 6);
						let myDay = aDateString.slice(6, 8);
						let myDate = new Date(Date.UTC(myYear, myMonth-1, myDay));
						if (isNaN(myDate)) {
							return "WRONGDATE";
						} else {
							return myDate;
						}
					} else {
						return "WRONGDATE";
					}
				} else {
					return "WRONGDATE";
				}
			}
		}
		catch (e) {
			return "WRONGDATE";
		}
	},

	convertDateStringToDateString: function (aDay, aMonth, aYear, aDateFormat) {
		aMonth = cardbookDates.lPad(aMonth);
		aDay = cardbookDates.lPad(aDay);
		return cardbookDates.getFinalDateString(aDay, aMonth, aYear, aDateFormat);
	},

	splitUTCDateIntoComponents: function (aDate) {
		let lYear = aDate.getUTCFullYear();
		let lMonth = aDate.getUTCMonth() + 1;
		lMonth += "";
		lMonth = cardbookDates.lPad(lMonth);
		let lDay = aDate.getUTCDate();
		lDay += "";
		lDay = cardbookDates.lPad(lDay);
		return {day: lDay, month: lMonth, year: lYear};
	},
	
	convertUTCDateToDateString: function (aDate, aDateFormat) {
		let dateSplitted = cardbookDates.splitUTCDateIntoComponents(aDate);
		return cardbookDates.getFinalDateString(dateSplitted.day, dateSplitted.month, dateSplitted.year, aDateFormat);
	},

	splitDateIntoComponents: function (aDate) {
		let lYear = aDate.getFullYear();
		let lMonth = aDate.getMonth() + 1;
		lMonth += "";
		lMonth = cardbookDates.lPad(lMonth);
		let lDay = aDate.getDate();
		lDay += "";
		lDay = cardbookDates.lPad(lDay);
		return {day: lDay, month: lMonth, year: lYear};
	},

	convertDateToDateString: function (aDate, aDateFormat) {
		let dateSplitted = cardbookDates.splitDateIntoComponents(aDate);
		return cardbookDates.getFinalDateString(dateSplitted.day, dateSplitted.month, dateSplitted.year, aDateFormat);
	},

	getFinalDateString: function (aDay, aMonth, aYear, aDateFormat) {
		aMonth = cardbookDates.lPad(aMonth);
		aDay = cardbookDates.lPad(aDay);
		if (aDateFormat == "YYYY-MM-DD") {
			if (aYear == "") {
				aYear = cardbookDates.defaultYear;
			}
			return aYear + "-" + aMonth + "-" + aDay;
		} else if (aDateFormat == "3.0") {
			if (aYear == "") {
				aYear = cardbookDates.defaultYear;
			}
			return "" + aYear + aMonth + aDay;
		} else {
			if (aYear == "") {
				aYear = "--";
			}
			return "" + aYear + aMonth + aDay;
		}
	},

	getVCardDateFromDateString: function (aValue, aDateFormat) {
		// the value supplied is always validated before
		// years equal to 1604 are always considered as a partial date
		if (aValue.length >= 3 && aValue.length <= 5) {
			var myMonth;
			var myDay;
			// 5-8
			if (aValue.length == 3 && aValue.includes("-")) {
				myMonth = "0" + aValue.slice(0,1);
				myDay = "0" + aValue.slice(2,3);
			// 523
			} else if (aValue.length == 3 && !aValue.includes("-")) {
				myMonth = "0" + aValue.slice(0,1);
				myDay = aValue.slice(1,3);
			// 1212
			} else if (aValue.length == 4 && !aValue.includes("-")) {
				myMonth = aValue.slice(0,2);
				myDay = aValue.slice(2,4);
			// 8-12
			} else if (aValue.length == 4 && aValue.indexOf("-") == 1) {
				myMonth = "0" + aValue.slice(0,1);
				myDay = aValue.slice(2,4);
			// 12-8
			} else if (aValue.length == 4 && aValue.indexOf("-") == 2) {
				myMonth = aValue.slice(0,2);
				myDay = "0" + aValue.slice(3,4);
			// 11-12
			} else if (aValue.length == 5 && aValue.indexOf("-") == 2) {
				myMonth = aValue.slice(0,2);
				myDay = aValue.slice(3,5);
			}
			if (aDateFormat == "YYYY-MM-DD") {
				aValue = cardbookDates.defaultYear + "-" + myMonth + "-" + myDay;
			} else if (aDateFormat == "3.0") {
				aValue = cardbookDates.defaultYear + myMonth + myDay;
			} else {
				aValue = "--" + myMonth + myDay;
			}
		}
		return aValue;
	},

	getDateStringFromVCardDate: function (aValue, aDateFormat) {
		if (!aValue) {
			return "";
		} else if (aDateFormat == "4.0") {
			return aValue.replace(/^--/, "");
		} else {
			var myRegexp = new RegExp("^" + cardbookDates.defaultYear + "-?");
			return aValue.replace(myRegexp, "");
		}
	},

	convertCardDate: function (aCard, aDirPrefName, aSourceDateFormat, aTargetDateFormat) {
		var eventInNoteEventPrefix = cardbookRepository.extension.localeData.localizeMessage("eventInNoteEventPrefix");
		// date fields
		var cardChanged = false;
		for (var field of cardbookRepository.dateFields) {
			if (aCard[field] && aCard[field] != "") {
				var myFieldValue = aCard[field];
				var isDate = cardbookDates.convertDateStringToDateUTC(myFieldValue, aSourceDateFormat);
				if (isDate != "WRONGDATE") {
					aCard[field] = cardbookDates.convertUTCDateToDateString(isDate, aTargetDateFormat);
					var cardChanged = true;
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("dateEntry1Wrong", [aDirPrefName, aCard.fn, myFieldValue, aSourceDateFormat], "Warning");
				}
			}
		}
		
		// events 
		var eventsChanged = false;
		var myNoteArray = aCard.note.split("\n");
		var myEvents = cardbookRepository.cardbookUtils.getEventsFromCard(myNoteArray, aCard.others);
		if (myEvents.result.length != 0) {
			for (var i = 0; i < myEvents.result.length; i++) {
				var myFieldValue = myEvents.result[i][0];
				var isDate = cardbookDates.convertDateStringToDateUTC(myFieldValue, aSourceDateFormat);
				if (isDate != "WRONGDATE") {
					myEvents.result[i][0] = cardbookDates.convertUTCDateToDateString(isDate, aTargetDateFormat);
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("dateEntry1Wrong", [aDirPrefName, aCard.fn, myFieldValue, aSourceDateFormat], "Warning");
				}
			}

			aCard.others = myEvents.remainingOthers;
			aCard.note = myEvents.remainingNote.join("\n");
			var myPGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(aCard);
			cardbookRepository.cardbookUtils.addEventstoCard(aCard, myEvents.result, myPGNextNumber, aTargetDateFormat);
			eventsChanged = true;
		}

		if (cardChanged || eventsChanged) {
			return true;
		} else {
			return false;
		}
	},

	getDateFormatLabel: function (aDirPrefId, aVersion) {
		var dateFormat = cardbookRepository.getDateFormat(aDirPrefId, aVersion);
		if (dateFormat == "YYYY-MM-DD") {
			return dateFormat;
		} else {
			return "YYYYMMDD";
		}
	}
};
