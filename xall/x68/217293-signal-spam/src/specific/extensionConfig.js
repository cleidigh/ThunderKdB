var extensionConfig = {
	"appInfo": {
		"staging": false,
		"environment": "thunderbird extension",
		"version": "4.0.4",
		"manifestVersion": "4.0.4",
		"upgradeDB": false,
		"updateManifestURL": {
			"display": true,
			"fr": "https://vrf01.signal-spam.fr/extension/dist/thunderbird/update_manifests/thunderbird.4.0.4.fr.html",
			"en": "https://vrf01.signal-spam.fr/extension/dist/thunderbird/update_manifests/thunderbird.4.0.4.en.html"
		},
		"installManifestURL": {
			"fr": "https://vrf01.signal-spam.fr/extension/dist/thunderbird/install_manifests/thunderbird.4.0.0.fr.html",
			"en": "https://vrf01.signal-spam.fr/extension/dist/thunderbird/install_manifests/thunderbird.4.0.0.en.html"
		},
		"credHostname": "chrome://signal-spam-direct@signal-spam.fr",
		"verifromHost": "vrf01.signal-spam.fr",
		"name": "signalspam",
		"localesFolder": "locales_signalspam",
		"localesFileprefix": "signalspam",
		"scriptFilesFolder": "js/",
		"htmlFilesFolder": "html/",
		"cssFilesFolder": "specific/",
		"sidebarCSSFileName": "signalspamSidebar.css",
		"extensionName": "signalspam",
		"extensionCodeName": "signalspam",
		"sidebarIframeName": "SigSpamEmailScaled",
		"stopPhishingFeature": true,
		"stopPhishingCollisionCheckAPI": true,
		"optionsRequired": false,
		"feedBackLoop": true,
		"logLevel": -1,
		"consoleAvailable": true,
		"googleAnalytics": false,
		"localReportsDB": false,
		"quantum": true,
		"safari": false
	},
	"jsonConfig": {
		"localFileName": "config/config.json",
		"url": "https://vrf01.signal-spam.fr/extension/params/thunderbird/prod/v4.0.4.json",
		"staging": "https://vrf01.signal-spam.fr/extension/params/thunderbird/preprod/v4.0.4.json"
	}
};