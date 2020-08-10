var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var EXPORTED_SYMBOLS = ["cardbookLog"];
var cardbookLog = {

	getTime: function() {
		var objToday = new Date();
		var year = objToday.getFullYear();
		var month = ("0" + (objToday.getMonth() + 1)).slice(-2);
		var day = ("0" + objToday.getDate()).slice(-2);
		var hour = ("0" + objToday.getHours()).slice(-2);
		var min = ("0" + objToday.getMinutes()).slice(-2);
		var sec = ("0" + objToday.getSeconds()).slice(-2);
		var msec = ("00" + objToday.getMilliseconds()).slice(-3);
		return year + "." + month + "." + day + " " + hour + ":" + min + ":" + sec + ":" + msec;
	},

	updateStatusProgressInformation: function(aLogLine, aErrorType) {
		if (cardbookRepository.statusInformation.length >= cardbookRepository.statusInformationLineNumber) {
			cardbookRepository.statusInformation.shift();
		}
		if (aErrorType) {
			cardbookRepository.statusInformation.push([cardbookLog.getTime() + " : " + aLogLine, aErrorType]);
		} else {
			cardbookRepository.statusInformation.push([cardbookLog.getTime() + " : " + aLogLine, "Normal"]);
		}
		// Services.console.logStringMessage(cardbookLog.getTime() + " : " + aLogLine.toSource());
	},

	updateStatusProgressInformationWithDebug1: function(aLogLine, aResponse) {
		if (aResponse) {
			if (cardbookRepository.debugMode) {
				cardbookLog.updateStatusProgressInformation(aLogLine + aResponse.toSource());
			}
		}
	},

	updateStatusProgressInformationWithDebug2: function(aLogLine) {
		if (cardbookRepository.debugMode) {
			cardbookLog.updateStatusProgressInformation(aLogLine);
		}
	}
};
