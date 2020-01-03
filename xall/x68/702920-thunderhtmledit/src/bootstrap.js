var { ExtensionSupport } = ChromeUtils.import(
  "resource:///modules/ExtensionSupport.jsm"
);
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

function install() {}

function uninstall() {}

function startup(data, reason) {
  var {ThunderHTMLeditPrefs} = ChromeUtils.import('chrome://thunderHTMLedit/content/prefs.jsm');
  ThunderHTMLeditPrefs.definePreference('License',  { type: 'string', default: 'unlicensed' });
  ThunderHTMLeditPrefs.definePreference('UseCount', { type: 'int', default: 0 });
  ThunderHTMLeditPrefs.definePreference('FontSize', { type: 'int', default: 13 });
  ThunderHTMLeditPrefs.definePreference('FontFamily', { type: 'string', default: 'monospace' });
  ThunderHTMLeditPrefs.definePreference('DarkTheme', { type: 'bool', default: false });

  ExtensionSupport.registerWindowListener(data.id, {
    chromeURLs: ["chrome://messenger/content/messengercompose/messengercompose.xul"],
    onLoadWindow: setupUI,
    onUnloadWindow: tearDownUI,
  });
}

function shutdown(data, reason) {
  ExtensionSupport.unregisterWindowListener(data.id);
}

function tearDownUI(domWindow) {
  delete domWindow.ThunderHTMLedit_;
}  

function setupUI(domWindow) {
  loadCSS("chrome://thunderHTMLedit/skin/composer.css", domWindow);
  loadCSS("chrome://thunderHTMLedit-platform/skin/composer.css", domWindow);

  let xul = domWindow.MozXULElement.parseXULToFragment(`
    <hbox id="thunderHTMLedit-tabbox-box">
      <hbox id="thunderHTMLedit-content-tab" collapsed="true">
        <radiogroup onselect="if (typeof ThunderHTMLedit_ != 'undefined') ThunderHTMLedit_.SelectEditMode(this.selectedIndex, false);" flex="1" tabindex="1">
          <radio label="&thunderHTMLedit.Composer.Tab.Edit;"/>
          <radio label="&thunderHTMLedit.Composer.Tab.Source;"/>
        </radiogroup>
      </hbox>
    </hbox>
    <vbox id="thunderHTMLedit-content-source-box" flex="1" collapsed="true">
      <iframe id="thunderHTMLedit-content-source-ace" data-preview="true" flex="1"
      src="chrome://thunderHTMLedit/content/html-source-editor.html" />
    </vbox>
  `, ["chrome://thunderHTMLedit/locale/thunderHTMLedit.dtd"]);
  let appContent = domWindow.document.getElementById("appcontent");
  let contentFrame = domWindow.document.getElementById("content-frame");
  appContent.insertBefore(xul, contentFrame);

  // All our stuff lives inside this object, so create it now.
  domWindow.ThunderHTMLedit_ = {};

  var {SourceEditor} = ChromeUtils.import('chrome://thunderHTMLedit/content/source-editor.jsm');
  SourceEditor.initFind(domWindow);

  loadScript("chrome://thunderHTMLedit/content/thunderHTMLedit-composer.js", domWindow);
}

function loadScript(url, targetWindow) {
  Services.scriptloader.loadSubScript(url, targetWindow);
}

function logException(exc) {
  try {
    Services.console.logStringMessage(exc.toString() + "\n" + exc.stack);
  } catch (x) {}
}

// Copied from Overlays.jsm.
function loadCSS(url, targetWindow) {
  // oconsole.debug(`Loading ${url} into ${this.window.location}`);

  // domWindowUtils.loadSheetUsingURIString doesn't record the sheet in document.styleSheets,
  // adding a html link element seems to do so.
  let link = targetWindow.document.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "link"
  );
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");
  link.setAttribute("href", url);

  targetWindow.document.documentElement.appendChild(link);
}
