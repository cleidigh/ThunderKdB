var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

var cardbookMailPopularity = {
	updateMailPopularity: function (aEmail) {
		let addresses = MailServices.headerParser.parseEncodedHeader(aEmail);
		for (let address of addresses) {
			if (address.email == "") {
				continue;
			}
			if (cardbookRepository.cardbookMailPopularityIndex[address.email.toLowerCase()]) {
				cardbookRepository.cardbookMailPopularityIndex[address.email.toLowerCase()]++;
			} else {
				cardbookRepository.cardbookMailPopularityIndex[address.email.toLowerCase()] = 1;
			}
		}
		cardbookMailPopularity.writeMailPopularity();
	},

	loadMailPopularity: function () {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(cardbookRepository.cardbookMailPopularityFile);
		
		if (cacheDir.exists()) {
			var params = {};
			params["showError"] = true;
			cardbookRepository.cardbookSynchronization.getFileDataAsync(cacheDir.path, cardbookMailPopularity.loadMailPopularityAsync, params);
		}
	},

	loadMailPopularityAsync: function (aContent) {
		var re = /[\n\u0085\u2028\u2029]|\r\n?/;
		var fileContentArray = aContent.split(re);
		for (var i = 0; i < fileContentArray.length; i++) {
			var mySepPosition = fileContentArray[i].indexOf(":",0);
			var myEmail = fileContentArray[i].substr(0,mySepPosition).toLowerCase();
			var myCount = fileContentArray[i].substr(mySepPosition+1,fileContentArray[i].length);
			if (myEmail && myCount) {
				cardbookRepository.cardbookMailPopularityIndex[myEmail] = myCount;
			}
		}
	},

	writeMailPopularity: function () {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(cardbookRepository.cardbookMailPopularityFile);
		
		if (!cacheDir.exists()) {
			// read and write permissions to owner and group, read-only for others.
			cacheDir.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
		}
		if (cacheDir.exists()) {
			var sortable = [];
			for (var mail in cardbookRepository.cardbookMailPopularityIndex) {
				var lowerMail = mail.toLowerCase();
				sortable.push([lowerMail, cardbookRepository.cardbookMailPopularityIndex[lowerMail]]);
			}
			cardbookRepository.cardbookUtils.sortArrayByNumber(sortable,1,-1);

			var writable = [];
			for (var i = 0; i < sortable.length; i++) {
				var myEmail = sortable[i][0];
				var myCount = sortable[i][1];
				if (myEmail && myCount) {
					writable.push([sortable[i].join(":").toLowerCase()]);
				}
			}
			cardbookRepository.cardbookSynchronization.writeFileDataAsync(cacheDir.path, writable.join("\r\n"), function () {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Mail popularity file written to : " + cacheDir.path);
			});
		}
	},

	removeMailPopularity: function () {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(cardbookRepository.cardbookMailPopularityFile);
		
		if (cacheDir.exists() && cacheDir.isFile()) {
			cacheDir.remove(true);
		}
	}

};
