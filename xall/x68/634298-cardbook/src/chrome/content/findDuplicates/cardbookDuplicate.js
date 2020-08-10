if ("undefined" == typeof(cardbookDuplicate)) {
	var cardbookDuplicate = {

		updateDuplicate: function (aListOfCards) {
			var myArray = [];
			for (var i = 0; i < aListOfCards.length; i++) {
				myArray.push(aListOfCards[i].uid);
			}
			myArray = cardbookRepository.arrayUnique(myArray);
			for (var i = 0; i < myArray.length-1; i++) {
				if (!cardbookRepository.cardbookDuplicateIndex[myArray[i]]) {
					cardbookRepository.cardbookDuplicateIndex[myArray[i]] = [];
				}
				for (var j = i+1; j < myArray.length; j++) {
					if (!cardbookRepository.cardbookDuplicateIndex[myArray[i]].includes(myArray[j])) {
						cardbookRepository.cardbookDuplicateIndex[myArray[i]].push(myArray[j]);
					}
				}
			}
			cardbookDuplicate.writeDuplicate();
		},

		loadDuplicate: function () {
			var cacheDir = cardbookRepository.getLocalDirectory();
			cacheDir.append(cardbookRepository.cardbookDuplicateFile);
			
			if (cacheDir.exists()) {
				var params = {};
				params["showError"] = true;
				cardbookRepository.cardbookSynchronization.getFileDataAsync(cacheDir.path, cardbookDuplicate.loadDuplicateAsync, params);
			} else {
				wdw_findDuplicates.load();
			}
		},

		loadDuplicateAsync: function (aContent) {
			var re = /[\n\u0085\u2028\u2029]|\r\n?/;
			var fileContentArray = aContent.split(re);
			for (var i = 0; i < fileContentArray.length; i++) {
				var myLine = [];
				myLine = fileContentArray[i].split("::");
				if (!cardbookRepository.cardbookDuplicateIndex[myLine[0]]) {
					cardbookRepository.cardbookDuplicateIndex[myLine[0]] = [];
				}
				cardbookRepository.cardbookDuplicateIndex[myLine[0]].push(myLine[1]);
			}
			wdw_findDuplicates.load();
		},

		writeDuplicate: function () {
			var cacheDir = cardbookRepository.getLocalDirectory();
			cacheDir.append(cardbookRepository.cardbookDuplicateFile);
			
			if (!cacheDir.exists()) {
				// read and write permissions to owner and group, read-only for others.
				cacheDir.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
			}
			if (cacheDir.exists()) {
				var myArray = [];
				for (var uid in cardbookRepository.cardbookDuplicateIndex) {
					for (var i = 0; i < cardbookRepository.cardbookDuplicateIndex[uid].length; i++) {
						myArray.push(uid+"::"+cardbookRepository.cardbookDuplicateIndex[uid][i]);
					}
				}
				myArray = cardbookRepository.arrayUnique(myArray);
				cardbookRepository.cardbookSynchronization.writeFileDataAsync(cacheDir.path, myArray.join("\r\n"), function () {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Duplicate file written to : " + cacheDir.path);
				});
			}
		}

	};

};
