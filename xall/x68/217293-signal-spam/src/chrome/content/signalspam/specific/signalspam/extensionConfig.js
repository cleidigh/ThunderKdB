/**
 * Created by emmanuelsellier on 18/05/2017.
 */
var extensionConfig = {
    appInfo : {
        staging : false,
        environment : 'thunderbird',
        version : '3.1.2',
        manifestVersion : '3.1.2',
        upgradeDB : false,
        updateManifestURL : {
            display:true,
            'fr':'https://vrf01.signal-spam.fr/extension/dist/thunderbird/update_manifests/thunderbird.3.1.0.fr.html',
            'en':'https://vrf01.signal-spam.fr/extension/dist/thunderbird/update_manifests/thunderbird.3.1.0.en.html'
        },
        installManifestURL : {
            'fr':'https://vrf01.signal-spam.fr/extension/dist/thunderbird/install_manifests/thunderbird.3.0.0.fr.html',
            'en':'https://vrf01.signal-spam.fr/extension/dist/thunderbird/install_manifests/thunderbird.3.0.0.en.html'
        },
        credHostname : 'chrome://signal-spam-direct@signal-spam.fr',
        verifromHost : "vrf01.signal-spam.fr",
        runtimeId:undefined,
        name : 'signalspam',
        localesFolder : 'locales_signalspam',
        localesFileprefix : 'signalspam',
        scriptFilesFolder : 'js/',
        htmlFilesFolder : 'html/',
        cssFilesFolder : 'specific/',
        sidebarCSSFileName: 'signalspamSidebar.css',
        extensionName : 'SignalSpam',
        extensionCodeName : 'SIGNALSPAM',
        sidebarIframeName : 'SigSpamEmailScaled',
        stopPhishingFeature : true,
        stopPhishingCollisionCheckAPI : true,
        optionsRequired: false,
        feedBackLoop: true,
        logLevel:-1,
        consoleAvailable:true,
        googleAnalytics: false,
        localReportsDB: false
    },
    jsonConfig : {
        localFileName:'signalspam/config.json',
        url:'https://vrf01.signal-spam.fr/extension/params/thunderbird/prod/v3.0.0.json',
        staging:'https://vrf01.signal-spam.fr/extension/params/thunderbird/preprod/v3.0.0.json'
    }
};
if (typeof exports !== "undefined")
    exports.default = extensionConfig;