var cardbookPreferDisplayName = {
	updatePreferDisplayName: function (aEmails) {
		for (let email of aEmails) {
			cardbookRepository.cardbookPreferDisplayNameIndex[email.toLowerCase()] = 1;
		}
		cardbookPreferDisplayName.writePreferDisplayName();
	},

	loadPreferDisplayName: function () {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(cardbookRepository.cardbookPreferDisplayNameFile);
		
		if (cacheDir.exists()) {
			var params = {};
			params["showError"] = true;
			cardbookRepository.cardbookSynchronization.getFileDataAsync(cacheDir.path, cardbookPreferDisplayName.loadPreferDisplayNameAsync, params);
		}
	},

	loadPreferDisplayNameAsync: function (aContent) {
		var re = /[\n\u0085\u2028\u2029]|\r\n?/;
		var fileContentArray = aContent.split(re);
		for (var i = 0; i < fileContentArray.length; i++) {
			cardbookRepository.cardbookPreferDisplayNameIndex[fileContentArray[i]] = 1;
		}
	},

	writePreferDisplayName: function () {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(cardbookRepository.cardbookPreferDisplayNameFile);
		
		if (!cacheDir.exists()) {
			// read and write permissions to owner and group, read-only for others.
			cacheDir.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
		}
		if (cacheDir.exists()) {
			var writable = [];
			for (let email in cardbookRepository.cardbookPreferDisplayNameIndex) {
				writable.push(email);
			}
			cardbookRepository.cardbookSynchronization.writeFileDataAsync(cacheDir.path, writable.join("\r\n"), function () {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : PreferDisplayName file written to : " + cacheDir.path);
			});
		}
	},

	removePreferDisplayName: function () {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(cardbookRepository.cardbookPreferDisplayNameFile);
		
		if (cacheDir.exists() && cacheDir.isFile()) {
			cacheDir.remove(true);
		}
	}

};
