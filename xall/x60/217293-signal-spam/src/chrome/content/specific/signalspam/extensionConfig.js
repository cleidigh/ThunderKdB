/**
 * Created by emmanuelsellier on 18/05/2017.
 */
var extensionConfig = {
    appInfo : {
        environment : 'thunderbird',
        version : '2.2.3',
        updateManifestURL : {
            display:true,
            'fr':'https://vrf01.signal-spam.fr/extension/update_manifests/thunderbird.2.2.3.fr.html',
            'en':'https://vrf01.signal-spam.fr/extension/update_manifests/thunderbird.2.2.3.en.html'
        },
        installManifestURL : {
            'fr':'https://vrf01.signal-spam.fr/extension/install_manifests/thunderbird.2.0.0.fr.html',
            'en':'https://vrf01.signal-spam.fr/extension/install_manifests/thunderbird.2.0.0.en.html'
        },
        credHostname : 'chrome://signal-spam-direct@signal-spam.fr',
        verifromHost : "vrf01.signal-spam.fr",
        name : 'Signal Spam',
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
        googleAnalytics: false
    },
    jsonConfig : {
        localFileName:'signalspam/config.json',
        url:'https://vrf01.signal-spam.fr/extension/params/thunderbird_extension_prod_params_v2.0.0.json'
    }
};