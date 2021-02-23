if ("undefined" == typeof(wdw_logEdition)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var wdw_bulkOperation = {
		
		lTimerBulkOperation: {},
		
		load: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_bulkOperation.lTimerBulkOperation[1] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerBulkOperation = wdw_bulkOperation.lTimerBulkOperation[1];
			lTimerBulkOperation.initWithCallback({ notify: function(lTimerBulkOperation) {
						var close = true;
						for (var dirPrefId in cardbookRepository.lTimerDirAll) {
							var total = cardbookRepository.cardbookServerCardSyncTotal[dirPrefId];
							var done = cardbookRepository.cardbookServerCardSyncDone[dirPrefId];
							if (total !=0 && done !=0) {
								if (!(document.getElementById("bulkProgressmeter_" + dirPrefId))) {
									var currentRow = cardbookElementTools.addGridRow(document.getElementById("bulkOperationRows"), 'bulkOperationRow_' + dirPrefId, {align: 'center'});
									cardbookElementTools.addLabel(currentRow, 'bulkOperationRowLabel_' + dirPrefId, cardbookRepository.cardbookPreferences.getName(dirPrefId), 'bulkOperationProgressmeter_' + dirPrefId);
									cardbookElementTools.addProgressmeter(currentRow, "bulkProgressmeter_" + dirPrefId);
								}
								var value = Math.round(done / total * 100);
								document.getElementById("bulkProgressmeter_" + dirPrefId).value = value;
								if (value != 100) {
									close = false;
								}
							} else if (document.getElementById("bulkProgressmeter_" + dirPrefId)) {
								document.getElementById("bulkProgressmeter_" + dirPrefId).value = 100;
							}
						}
						if (close) {
							wdw_bulkOperation.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

		},

		cancel: function () {
			wdw_bulkOperation.lTimerBulkOperation[1].cancel();
			close();
		}

	};

};
