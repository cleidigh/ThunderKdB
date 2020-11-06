var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

var EXPORTED_SYMBOLS = ["cardbookTypes"];
var cardbookTypes = {
	
	allIMPPs: [],
	
	rebuildAllPGs: function (aCard) {
		let myPgNumber = 1;
		for (var i in cardbookRepository.multilineFields) {
			let myType = cardbookRepository.multilineFields[i];
			for (var j = 0; j < aCard[myType].length; j++) {
				let myTempString = aCard[myType][j][2];
				if (myTempString.startsWith("ITEM")) {
					aCard[myType][j][2] = "ITEM" + myPgNumber;
					myPgNumber++;
				}
			}
		}
		let myNewOthers = [];
		let myPGMap = {};
		for (var j = 0; j < aCard.others.length; j++) {
			let myTempString = aCard.others[j];
			var relative = []
			relative = myTempString.match(/^ITEM([0-9]*)\.(.*)/i);
			if (relative && relative[1] && relative[2]) {
				if (myPGMap[relative[1]]) {
					myNewOthers.push("ITEM" + myPGMap[relative[1]] + "." + relative[2]);
				} else {
					myNewOthers.push("ITEM" + myPgNumber + "." + relative[2]);
					myPGMap[relative[1]] = myPgNumber;
					myPgNumber++;
				}
			} else {
				myNewOthers.push(aCard.others[j]);
			}
		}
		aCard.others = JSON.parse(JSON.stringify(myNewOthers));
		return myPgNumber;
	},

	whichCodeTypeShouldBeChecked: function (aType, aDirPrefId, aSourceArray, aSourceList) {
		if (aSourceArray.length == 0) {
			return {result: "", isAPg: false, isAlreadyThere: false};
		} else {
			var ABType = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
			var ABTypeFormat = cardbookRepository.getABTypeFormat(ABType);
			var match = false;
			for (var i = 0; i < cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType].length && !match; i++) {
				var code = cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][0];
				var types = cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][1];
				var possibilities = types.split(";");
				for (var j = 0; j < possibilities.length && !match; j++) {
					var possibility = possibilities[j].split(",");
					for (var k = 0; k < aSourceArray.length; k++) {
						if (possibility.indexOf(aSourceArray[k].toUpperCase()) == -1) {
							break;
						} else if (possibility.indexOf(aSourceArray[k].toUpperCase()) != -1 && k == aSourceArray.length - 1 ) {
							// here we are sure that aSourceArray in included in possibility
							if (aSourceArray.length == possibility.length) {
								match = true;
								if (cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][2] && cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][2] == "PG") {
									return {result: code, isAPg: true, isAlreadyThere: true};
								} else {
									return {result: code, isAPg: false};
								}
							}
						}
					}
				}
			}
			// the strange string may already be in the basic translated strings
			for (var i = 0; i < aSourceList.length; i++) {
				for (var j = 0; j < aSourceArray.length; j++) {
					if (aSourceArray[j].toUpperCase() == aSourceList[i][0].toUpperCase()) {
						return {result: aSourceList[i][1], isAPg: false};
					}
				}
			}
			return {result: aSourceArray[0], isAPg: true, isAlreadyThere: false};
		}
	},

	whichLabelTypeShouldBeChecked: function (aType, aDirPrefId, aSourceArray) {
		if (aSourceArray.length == 0) {
			return "";
		} else {
			var ABType = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
			var ABTypeFormat = cardbookRepository.getABTypeFormat(ABType);
			var match = false;
			for (var i = 0; i < cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType].length && !match; i++) {
				var code = cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][0];
				var types = cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][1];
				var possibilities = types.split(";");
				for (var j = 0; j < possibilities.length && !match; j++) {
					var possibility = possibilities[j].split(",");
					for (var k = 0; k < aSourceArray.length; k++) {
						if (possibility.indexOf(aSourceArray[k].toUpperCase()) == -1) {
							break;
						} else if (possibility.indexOf(aSourceArray[k].toUpperCase()) != -1 && k == aSourceArray.length - 1 ) {
							// here we are sure that aSourceArray in included in possibility
							if (aSourceArray.length == possibility.length) {
								match = true;
								return cardbookTypes.getTypeLabelFromTypeCode(ABTypeFormat, aType, code);
							}
						}
					}
				}
			}
			return aSourceArray[0];
		}
	},

	isMyCodePresent: function (aType, aCode, aABTypeFormat, aSourceArray) {
		var match = false;
		for (var i = 0; i < cardbookRepository.cardbookCoreTypes[aABTypeFormat][aType].length && !match; i++) {
			var code = cardbookRepository.cardbookCoreTypes[aABTypeFormat][aType][i][0];
			if (code != aCode) {
				continue;
			}
			var types = cardbookRepository.cardbookCoreTypes[aABTypeFormat][aType][i][1];
			var possibilities = types.split(";");
			for (var j = 0; j < possibilities.length && !match; j++) {
				var possibility = possibilities[j].split(",");
				for (var k = 0; k < aSourceArray.length; k++) {
					if (possibility.indexOf(aSourceArray[k].toUpperCase()) == -1) {
						break;
					} else if (possibility.indexOf(aSourceArray[k].toUpperCase()) != -1 && k == aSourceArray.length - 1 ) {
						// here we are sure that aSourceArray in included in possibility
						if (aSourceArray.length == possibility.length) {
							return true;
						}
					}
				}
			}
		}
		return false;
	},

	getTypeLabelFromTypeCode: function (aABType, aType, aTypeCode) {
		var prefResult = cardbookRepository.cardbookPreferences.getStringPref(cardbookRepository.cardbookPreferences.prefCardBookCustomTypes + aABType + "." + aType + "." + aTypeCode + ".value");
		if (prefResult != "") {
			return prefResult;
		} else {
			return cardbookRepository.extension.localeData.localizeMessage(aTypeCode);
		}
		return aTypeCode;
	},

	getTypeDisabledFromTypeCode: function (aABType, aType, aTypeCode) {
		return cardbookRepository.cardbookPreferences.getBoolPref(cardbookRepository.cardbookPreferences.prefCardBookCustomTypes + aABType + "." + aType + "." + aTypeCode + ".disabled", false);
	},

	getTypes: function (aABType, aType, aResetToCore) {
		var result = [];
		for (let k = 0; k < cardbookRepository.cardbookCoreTypes[aABType][aType].length; k++) {
			var myCoreCodeType = cardbookRepository.cardbookCoreTypes[aABType][aType][k][0];
			var myDisabled = cardbookTypes.getTypeDisabledFromTypeCode(aABType, aType, myCoreCodeType);
			if (!myDisabled || aResetToCore) {
				var myLabel = cardbookTypes.getTypeLabelFromTypeCode(aABType, aType, myCoreCodeType);
				result.push([myLabel, myCoreCodeType]);
			}
		}
		if (!aResetToCore) {
			var count = {};
			var customTypes = Services.prefs.getChildList(cardbookRepository.cardbookPreferences.prefCardBookCustomTypes + aABType + "." + aType + ".", count);
			var tmpArray = [];
			for (let k = 0; k < customTypes.length; k++) {
				var tmpValue = customTypes[k].replace(cardbookRepository.cardbookPreferences.prefCardBookCustomTypes + aABType + "." + aType + ".", "");
				if (tmpValue.endsWith(".value")) {
					tmpArray.push(tmpValue.replace(".value", ""));
				}
			}
			for (let k = 0; k < tmpArray.length; k++) {
				var myCustomType = tmpArray[k];
				var isItACore = false;
				for (let l = 0; l < cardbookRepository.cardbookCoreTypes[aABType][aType].length; l++) {
					var myCoreCodeType = cardbookRepository.cardbookCoreTypes[aABType][aType][l][0];
					if (myCustomType == myCoreCodeType) {
						isItACore = true;
						break;
					}
				}
				if (!isItACore) {
					var myLabel = cardbookRepository.cardbookPreferences.getStringPref(cardbookRepository.cardbookPreferences.prefCardBookCustomTypes + aABType + "." + aType + "." + myCustomType + ".value");
					result.push([myLabel, myCustomType]);
				}
			}
		}
		return result;
	},

	getTypesFromDirPrefId: function (aType, aDirPrefId) {
		var result = [];
		if (aDirPrefId) {
			var myABType = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
			var myABTypeFormat = cardbookRepository.getABTypeFormat(myABType);
		} else {
			var myABTypeFormat = "CARDDAV";
		}
		result = cardbookTypes.getTypes(myABTypeFormat, aType, false);
		return result;
	},

	getIMPPLineForCode: function (aCode) {
		var serviceLine = [];
		var myPrefResults = [];
		myPrefResults = cardbookRepository.cardbookPreferences.getAllIMPPs();
		for (var i = 0; i < myPrefResults.length; i++) {
			if (aCode.toLowerCase() == myPrefResults[i][0].toLowerCase()) {
				serviceLine = [myPrefResults[i][0], myPrefResults[i][1], myPrefResults[i][2]];
				break;
			}
		}
		return serviceLine;
	},

	getIMPPLineForProtocol: function (aProtocol) {
		var serviceLine = [];
		var myPrefResults = [];
		myPrefResults = cardbookRepository.cardbookPreferences.getAllIMPPs();
		for (var i = 0; i < myPrefResults.length; i++) {
			if (aProtocol.toLowerCase() == myPrefResults[i][2].toLowerCase()) {
				serviceLine = [myPrefResults[i][0], myPrefResults[i][1], myPrefResults[i][2]];
				break;
			}
		}
		return serviceLine;
	},

	getIMPPCode: function (aInputTypes) {
		var serviceCode = "";
		for (var j = 0; j < aInputTypes.length; j++) {
			serviceCode = aInputTypes[j].replace(/^X-SERVICE-TYPE=/i, "");
			if (serviceCode != aInputTypes[j]) {
				break;
			} else {
				serviceCode = "";
			}
		}
		return serviceCode;
	},

	getIMPPProtocol: function (aCardValue) {
		var serviceProtocol = "";
		if (aCardValue[0].indexOf(":") >= 0) {
			serviceProtocol = aCardValue[0].split(":")[0];
		}
		return serviceProtocol;
	},

	loadIMPPs: function (aArray) {
		var myPrefResults = [];
		myPrefResults = cardbookRepository.cardbookPreferences.getAllIMPPs();
		var serviceCode = "";
		var serviceProtocol = "";
		for (var i = 0; i < aArray.length; i++) {
			serviceCode = cardbookTypes.getIMPPCode(aArray[i][1]);
			serviceProtocol = cardbookTypes.getIMPPProtocol(aArray[i][0]);
			if (serviceCode != "" || serviceProtocol != "") {
				var found = false;
				for (var j = 0; j < myPrefResults.length; j++) {
					if (serviceCode != "") {
						if (myPrefResults[j][0].toLowerCase() == serviceCode.toLowerCase()) {
							found = true;
							break;
						}
					} else if (serviceProtocol != "") {
						if (myPrefResults[j][2].toLowerCase() == serviceProtocol.toLowerCase()) {
							found = true;
							break;
						}
					}
				}
				if (!found) {
					if (serviceCode == "") {
						myPrefResults.push([serviceProtocol, serviceProtocol, serviceProtocol]);
					} else if (serviceProtocol == "") {
						myPrefResults.push([serviceCode, serviceCode, serviceCode]);
					} else {
						myPrefResults.push([serviceCode, serviceCode, serviceProtocol]);
					}
				}
			}
		}
		cardbookTypes.allIMPPs = JSON.parse(JSON.stringify(myPrefResults));
	}
};
