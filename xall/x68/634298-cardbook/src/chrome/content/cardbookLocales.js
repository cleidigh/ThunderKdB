if ("undefined" == typeof(cardbookLocales)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var cardbookLocales = {
		keyPrefix: "__CARDBOOKMSG_",
		pathToConversionHelperJSM: "chrome://cardbook/content/api/ConversionHelper/ConversionHelper.jsm",
		i18n: null,
		
		updateString(string) {
			let re = new RegExp(this.keyPrefix + "(.+?)__", "g");
			return string.replace(re, matched => {
				const key = matched.slice(this.keyPrefix.length, -2);
				return this.i18n.getMessage(key) || matched;
			});
		},
		
		updateSubtree(node) {
			const texts = document.evaluate(
				'descendant::text()[contains(self::text(), "' + this.keyPrefix + '")]',
				node,
				null,
				XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
				null
			);
			for (let i = 0, maxi = texts.snapshotLength; i < maxi; i++) {
				const text = texts.snapshotItem(i);
				if (text.nodeValue.includes(this.keyPrefix)) text.nodeValue = this.updateString(text.nodeValue);
			}
			
			const attributes = document.evaluate(
				'descendant::*/attribute::*[contains(., "' + this.keyPrefix + '")]',
				node,
				null,
				XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
				null
			);
			for (let i = 0, maxi = attributes.snapshotLength; i < maxi; i++) {
				const attribute = attributes.snapshotItem(i);
				if (attribute.value.includes(this.keyPrefix)) attribute.value = this.updateString(attribute.value);
			}
		},
		
		async updateDocument() {
			// do we need to load the ConversionHelper?
			try {
				if (browser) this.i18n = browser.i18n;
			} catch (e) {
				let { ConversionHelper } = ChromeUtils.import(this.pathToConversionHelperJSM);
				// Since the TB68 built in OverlayLoader could run/finish before background.js has finished,
				// and therefore run before the ConversionHelper has been initialized, we need to wait.
				// In TB78, this return immediately
				await ConversionHelper.webExtensionStartupCompleted();
				this.i18n = ConversionHelper.i18n;
			}
			this.updateSubtree(document);
		}
	};
};