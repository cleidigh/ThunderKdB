var extensionConfig = {
	"appInfo": {
		"staging": false,
		"environment": "thunderbird extension",
		"version": "2.2.4",
		"updateManifestURL": {
			"display": true,
			"fr": "https://services.verifrom.com/spambee/extension/dist/thunderbird/update_manifests/thunderbird.2.2.4.fr.html",
			"en": "https://services.verifrom.com/spambee/extension/dist/thunderbird/update_manifests/thunderbird.2.2.4.en.html"
		},
		"installManifestURL": {
			"fr": "https://services.verifrom.com/spambee/extension/dist/thunderbird/install_manifests/thunderbird.2.0.0.fr.html",
			"en": "https://services.verifrom.com/spambee/extension/dist/thunderbird/install_manifests/thunderbird.2.0.0.en.html"
		},
		"credHostname": "chrome://spambee@verifrom.com",
		"verifromHost": "services.verifrom.com",
		"name": "spambee",
		"localesFolder": "locales_spambee",
		"localesFileprefix": "spambee",
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
		"quantum": false,
		"safari": false,
		"manifestVersion": "2.2.4"
	},
	"jsonConfig": {
		"localFileName": "chrome/content/spambee/config.json",
		"url": "https://services.verifrom.com/spambee/extension/params/thunderbird/prod/thunderbird-2.2.4.json",
		"staging": "https://services.verifrom.com/spambee/extension/params/thunderbird/preprod/thunderbird-2.2.4.json"
	}
};