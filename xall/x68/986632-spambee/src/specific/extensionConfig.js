var extensionConfig = {
	"appInfo": {
		"staging": false,
		"environment": "thunderbird extension",
		"version": "3.0.3",
		"updateManifestURL": {
			"display": true,
			"fr": "https://services.verifrom.com/spambee/extension/dist/thunderbird/update_manifests/thunderbird.3.0.3.fr.html",
			"en": "https://services.verifrom.com/spambee/extension/dist/thunderbird/update_manifests/thunderbird.3.0.3.en.html",
			"de": "https://services.verifrom.com/spambee/extension/dist/thunderbird/update_manifests/thunderbird.${version}.de.html",
			"lu": "https://services.verifrom.com/spambee/extension/dist/thunderbird/update_manifests/thunderbird.${version}.de.html",
			"lb": "https://services.verifrom.com/spambee/extension/dist/thunderbird/update_manifests/thunderbird.${version}.de.html"
		},
		"installManifestURL": {
			"display": true,
			"fr": "https://services.verifrom.com/spambee/extension/dist/thunderbird/install_manifests/thunderbird.3.0.0.fr.html",
			"en": "https://services.verifrom.com/spambee/extension/dist/thunderbird/install_manifests/thunderbird.3.0.0.en.html",
			"de": "https://services.verifrom.com/spambee/extension/dist/thunderbird/install_manifests/thunderbird.3.0.0.de.html",
			"lu": "https://services.verifrom.com/spambee/extension/dist/thunderbird/install_manifests/thunderbird.3.0.0.de.html",
			"lb": "https://services.verifrom.com/spambee/extension/dist/thunderbird/install_manifests/thunderbird.3.0.0.de.html"
		},
		"credHostname": "chrome://spambee@verifrom.com",
		"verifromHost": "services.verifrom.com",
		"name": "spambee",
		"localesFolder": "locales_spambee",
		"localesFileprefix": "beesecure",
		"scriptFilesFolder": "js/",
		"htmlFilesFolder": "html/",
		"cssFilesFolder": "specific/",
		"sidebarCSSFileName": "spambeeSidebar.css",
		"extensionName": "spambee",
		"extensionCodeName": "spambee",
		"sidebarIframeName": "spambeeEmailScaled",
		"stopPhishingFeature": true,
		"stopPhishingCollisionCheckAPI": true,
		"optionsRequired": false,
		"feedBackLoop": true,
		"logLevel": -1,
		"consoleAvailable": true,
		"googleAnalytics": false,
		"localReportsDB": true,
		"phishingAlertIcon": "/logo/icon32.png",
		"quantum": true,
		"safari": false,
		"manifestVersion": "3.0.3"
	},
	"jsonConfig": {
		"localFileName": "config/config.json",
		"url": "https://services.verifrom.com/spambee/extension/params/thunderbird/prod/thunderbird-3.0.3.json",
		"staging": "https://services.verifrom.com/spambee/extension/params/thunderbird/preprod/thunderbird-3.0.3.json"
	}
};