if ("undefined" == typeof(cardbookCategoryParser)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

	function cardbookCategoryParser(aCategoryName, aDirPrefId) {
		this._init(aCategoryName, aDirPrefId);
	}

	cardbookCategoryParser.prototype = {
		_init: function (aCategoryName, aDirPrefId) {
			if (aDirPrefId) {
				this.dirPrefId = aDirPrefId;
			} else {
				this.dirPrefId = "";
			}
			this.href = aDirPrefId+"::"+aCategoryName;
			this.cbid = aDirPrefId+"::"+aCategoryName;
			this.uid = aCategoryName;
			this.etag = "0";
			this.updated = false;
			this.deleted = false;
			this.created = false;

			this.name = aCategoryName;
		}
	};
};
