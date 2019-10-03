/* ***** BEGIN LICENSE BLOCK *****
 *
 * Version: GPL 3.0
 *
 * ZNotes
 * Copyright (C) 2012 Alexander Kapitman
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The Original Code is ZNotes.
 *
 * Initial Developer(s):
 *   Alexander Kapitman <akman.ru@gmail.com>
 *
 * Portions created by the Initial Developer are Copyright (C) 2012
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

const EXPORTED_SYMBOLS = ["Utils"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/product.js", ru.akman.znotes );
Cu.import( "resource://gre/modules/Log.jsm" );

var Utils = function() {

  /*
  FATAL    Severe errors that cause premature termination.
           Expect these to be immediately visible on a status console.
  ERROR    Other runtime errors or unexpected conditions.
           Expect these to be immediately visible on a status console.
  WARN     Use of deprecated APIs, poor use of API, 'almost' errors,
           other runtime situations that are undesirable or unexpected,
            but not necessarily "wrong". Expect these to be immediately
            visible on a status console.
  INFO     Interesting runtime events (startup/shutdown).
           Expect these to be immediately visible on a console, so be
           conservative and keep to a minimum.
  CONFIG   Information regarding important configuration options the system
           is using that affects how it runs.
  DEBUG    Detailed information on the flow through the system.
           Expect these to be written to logs only.
  TRACE    Most detailed information. Expect these to be written to logs only.
  ALL      All kind of information
  */
  Log.repository.rootLogger.level = Log.Level.All;
  Log.repository.rootLogger.addAppender(
    new Log.ConsoleAppender(
      new Log.BasicFormatter()
    )
  );

  var log = getLogger( "modules.utils" );

  var systemInfo = null;
  var mainWindow = null;
  var mainContext = null;
  var stringsBundle = null;
  var fontNameArray = null;
  
  /*
  0x00000001 SAVE_SCRIPTS
  0x00000010 SAVE_FRAMES
  0x00000100 SAVE_FRAMES_IN_SEPARATE_DIRECTORY
  0x00001000 PRESERVE_HTML5_TAGS
  0x00010000 SAVE_STYLES
  0x00100000 SAVE_INLINE_RESOURCES_IN_SEPARATE_FILES
  0x01000000 INLINE_STYLESHEETS_IN_DOCUMENT
  0x10000000 SAVE_ACTIVE_RULES_ONLY
  */
  var clipperFlags = 0x11010000;
  var defaultDocumentType = "application/xhtml+xml";
  
  var placeName = "";
  var mainShortCuts = "{}";
  var mainKeySet = null;
  var platformShortCuts = "{}";
  var platformKeySet = null;
  
  var isDebugEnabled = false;
  var isTestActive = false;
  var isTestRaised = false;
  var isSanitizeEnabled = true;
  var isAdEnabled = false;
  var isFirstRun = true;
  var isNewVersion = false;
  var isStandalone = true;
  var isQuitEnabled = true;
  var isSavePosition = true;
  var isEditSourceEnabled = true;
  var isPlaySound = true;
  var isClearBinOnExit = false;
  var isMainMenubarVisible = false;
  var isMainToolbarVisible = true;
  var isConfirmExit = true;
  var isExitQuitTB = false;
  var isReplaceBackground = false;
  var isHighlightRow = false;
  var isCloseBrowserAfterImport = true;
  var isClipperPlaySound = true;

  function getLogger( name ) {
    return Log.repository.getLogger( "znotes." + name );
  };

  var pub = {

    get LOGGER_LEVEL() {
      return Log.Level.Desc[Log.repository.rootLogger.level];
    },

    set LOGGER_LEVEL( value ) {
      Log.repository.rootLogger.level = Log.Level.Numbers[value.toUpperCase()];
    },

    get IS_DEBUG_ENABLED() {
      return isDebugEnabled;
    },

    set IS_DEBUG_ENABLED( value ) {
      isDebugEnabled = value;
    },

    get IS_TEST_ACTIVE() {
      return isTestActive;
    },

    set IS_TEST_ACTIVE( value ) {
      isTestActive = value;
    },

    get IS_TEST_RAISED() {
      return isTestRaised;
    },

    set IS_TEST_RAISED( value ) {
      isTestRaised = value;
    },

    get IS_SANITIZE_ENABLED() {
      return isSanitizeEnabled;
    },

    set IS_SANITIZE_ENABLED( value ) {
      isSanitizeEnabled = value;
    },

    get IS_AD_ENABLED() {
      return isAdEnabled;
    },

    set IS_AD_ENABLED( value ) {
      isAdEnabled = value;
    },

    get IS_FIRST_RUN() {
      return isFirstRun;
    },

    set IS_FIRST_RUN( value ) {
      isFirstRun = value;
    },

    get IS_NEW_VERSION() {
      return isNewVersion;
    },

    set IS_NEW_VERSION( value ) {
      isNewVersion = value;
    },
    
    get NAME() {
      return ru.akman.znotes.Product.Name;
    },

    get ID() {
      return ru.akman.znotes.Product.Id;
    },

    get VERSION() {
      return ru.akman.znotes.Product.Version;
    },

    get SITE() {
      return ru.akman.znotes.Product.Site;
    },

    get VENDOR() {
      return ru.akman.znotes.Product.Vendor;
    },

    get BUNDLE() {
      return ru.akman.znotes.Product.Bundle;
    },

    get BUILD() {
      return ru.akman.znotes.Product.Build;
    },

    get LANGUAGES() {
      return ru.akman.znotes.Product.ApplicationLanguages.split( /\s*,\s*|\s+/ );
    },

    get SITE_LANGUAGES() {
      return ru.akman.znotes.Product.SiteLanguages.split( /\s*,\s*|\s+/ );
    },

    get LICENSES() {
      return ru.akman.znotes.Product.Licenses;
    },

    get REPOSITORIES() {
      return ru.akman.znotes.Product.Repositories;
    },

    get URLS() {
      return ru.akman.znotes.Product.Urls[ pub.getSiteLanguage() ];
    },

    get CREATORS() {
      return ru.akman.znotes.Product.Creators[ pub.getLanguage() ];
    },

    get CONTRIBUTORS() {
      return ru.akman.znotes.Product.Contributors[ pub.getLanguage() ];
    },

    get CREDITS() {
      return ru.akman.znotes.Product.Credits[ pub.getLanguage() ];
    },

    get TRANSLATORS() {
      return ru.akman.znotes.Product.Translators[ pub.getLanguage() ];
    },

    get COPYRIGHTS() {
      return ru.akman.znotes.Product.Copyrights[ pub.getLanguage() ];
    },

    get TITLE() {
      return ru.akman.znotes.Product.Title[ pub.getLanguage() ];
    },

    get DESCRIPTION() {
      return ru.akman.znotes.Product.Description[ pub.getLanguage() ];
    },

    // C O M M O N  V A L U E S

    get MAIN_WINDOW() {
      return mainWindow;
    },

    set MAIN_WINDOW( value ) {
      mainWindow = value;
    },

    get MAIN_CONTEXT() {
      return mainContext;
    },

    set MAIN_CONTEXT( value ) {
      mainContext = value;
    },

    get STRINGS_BUNDLE() {
      return stringsBundle;
    },

    set STRINGS_BUNDLE( value ) {
      stringsBundle = value;
    },

    get IS_STANDALONE() {
      return isStandalone;
    },

    set IS_STANDALONE( value ) {
      isStandalone = value;
    },

    get DEFAULT_DOCUMENT_TYPE() {
      return defaultDocumentType;
    },

    set DEFAULT_DOCUMENT_TYPE( value ) {
      defaultDocumentType = value;
    },

    get PLACE_NAME() {
      return placeName;
    },

    set PLACE_NAME( value ) {
      placeName = value;
    },

    get MAIN_SHORTCUTS() {
      return mainShortCuts;
    },

    set MAIN_SHORTCUTS( value ) {
      mainShortCuts = value;
    },

    get MAIN_KEYSET() {
      return mainKeySet;
    },

    set MAIN_KEYSET( value ) {
      mainKeySet = value;
    },
    
    get PLATFORM_SHORTCUTS() {
      return platformShortCuts;
    },

    set PLATFORM_SHORTCUTS( value ) {
      platformShortCuts = value;
    },

    get PLATFORM_KEYSET() {
      return platformKeySet;
    },

    set PLATFORM_KEYSET( value ) {
      platformKeySet = value;
    },

    get IS_QUIT_ENABLED() {
      return isQuitEnabled;
    },

    set IS_QUIT_ENABLED( value ) {
      isQuitEnabled = value;
    },

    get IS_DEBUGGER_INSTALLED() {
      return pub.convertChromeURL( "chrome://venkman/content/" );
    },

    get IS_INSPECTOR_INSTALLED() {
      return pub.convertChromeURL( "chrome://inspector/content/" );
    },

    // C O M M O N  P R E F E R E N S E S

    get IS_SAVE_POSITION() {
      return isSavePosition;
    },

    set IS_SAVE_POSITION( value ) {
      isSavePosition = value;
    },

    get IS_EDIT_SOURCE_ENABLED() {
      return isEditSourceEnabled;
    },

    set IS_EDIT_SOURCE_ENABLED( value ) {
      isEditSourceEnabled = value;
    },

    get IS_PLAY_SOUND() {
      return isPlaySound;
    },

    set IS_PLAY_SOUND( value ) {
      isPlaySound = value;
    },

    get IS_CLEAR_BIN_ON_EXIT() {
      return isClearBinOnExit;
    },

    set IS_CLEAR_BIN_ON_EXIT( value ) {
      isClearBinOnExit = value;
    },

    get IS_REPLACE_BACKGROUND() {
      return isReplaceBackground;
    },

    set IS_REPLACE_BACKGROUND( value ) {
      isReplaceBackground = value;
    },

    get IS_HIGHLIGHT_ROW() {
      return isHighlightRow;
    },

    set IS_HIGHLIGHT_ROW( value ) {
      isHighlightRow = value;
    },

    get CLIPPER_FLAGS() {
      return clipperFlags;
    },

    set CLIPPER_FLAGS( value ) {
      clipperFlags = value;
    },

    get IS_CLIPPER_PLAY_SOUND() {
      return isClipperPlaySound;
    },

    set IS_CLIPPER_PLAY_SOUND( value ) {
      isClipperPlaySound = value;
    },

    get IS_CLOSE_BROWSER_AFTER_IMPORT() {
      return isCloseBrowserAfterImport;
    },

    set IS_CLOSE_BROWSER_AFTER_IMPORT( value ) {
      isCloseBrowserAfterImport = value;
    },

    get IS_MAINMENUBAR_VISIBLE() {
      return isMainMenubarVisible;
    },

    set IS_MAINMENUBAR_VISIBLE( value ) {
      isMainMenubarVisible = value;
    },

    get IS_MAINTOOLBAR_VISIBLE() {
      return isMainToolbarVisible;
    },

    set IS_MAINTOOLBAR_VISIBLE( value ) {
      isMainToolbarVisible = value;
    },

    get IS_CONFIRM_EXIT() {
      return isConfirmExit;
    },

    set IS_CONFIRM_EXIT( value ) {
      isConfirmExit = value;
    },

    get IS_EXIT_QUIT_TB() {
      return isExitQuitTB;
    },

    set IS_EXIT_QUIT_TB( value ) {
      isExitQuitTB = value;
    }

  };

  pub.getLogger = function( name ) {
    return getLogger( name );
  };

  pub.showPopup = function( imageUrl, title, text, textClickable, cookie,
                            origin, bidi, lang,
                            replacedWindow, alertListener ) {
    var win =
      Cc["@mozilla.org/embedcomp/window-watcher;1"]
      .getService( Ci.nsIWindowWatcher )
      .openWindow(
        null, "chrome://znotes/content/alert.xul",
        "_blank", "chrome,titlebar=no,popup=yes", null
      );
    win.arguments = [
      imageUrl,       // the image src url
      title,          // the alert title
      text,           // the alert text
      textClickable,  // is the text clickable
      cookie,         // the alert cookie to be passed back to the listener
      origin,         // the alert origin reported by the look and feel
      bidi,           // bidi
      lang,           // lang
      replacedWindow, // replaced alert window (nsIDOMWindow)
      alertListener   // an optional callback listener (nsIObserver)
    ];
    return win;
  };

  pub.dumpStack = function() {
    var lines = [];
    for ( var frame = Components.stack; frame; frame = frame.caller ) {
      lines.push( frame.name + " :: " + frame.filename + " (" + frame.lineNumber + ")" );
    }
    lines.splice( 0, 1 );
    return lines.join( "\n" );
  };

  pub.getSystemInfo = function() {
    if ( systemInfo ) {
      return systemInfo;
    }
    var xulRuntime =
      Cc["@mozilla.org/xre/app-info;1"].getService( Ci.nsIXULRuntime );
    systemInfo = {};
    systemInfo.OS = xulRuntime.OS;
    systemInfo.widgetToolkit = xulRuntime.widgetToolkit;
    var dnsService = Cc["@mozilla.org/network/dns-service;1"].createInstance(
      Ci.nsIDNSService );
    systemInfo.hostName = dnsService.myHostName;
    return systemInfo;
  };

  pub.getPlaceId = function() {
    var placeId = pub.createUUID();
    var directoryService =
      Cc["@mozilla.org/file/directory_service;1"]
      .getService( Ci.nsIProperties );
    var placeEntry = directoryService.get( "Home", Ci.nsIFile );
    placeEntry.append( ".znotes" );
    if ( !placeEntry.exists() || !placeEntry.isFile() ) {
      placeEntry.create( Ci.nsIFile.NORMAL_FILE_TYPE, parseInt( "0644", 8 ) );
      pub.writeFileContent( placeEntry, "UTF-8", placeId );
    } else {
      placeId = pub.readFileContent( placeEntry, "UTF-8" );
    }
    return placeId;
  };

  pub.getDataPath = function() {
    var directoryService =
      Cc["@mozilla.org/file/directory_service;1"]
      .getService( Ci.nsIProperties );
    var profileDir = directoryService.get( "ProfD", Ci.nsIFile );
    var dataPath = profileDir.clone();
    dataPath.append( pub.NAME );
    if ( !dataPath.exists() || !dataPath.isDirectory() ) {
      dataPath.create( Ci.nsIFile.DIRECTORY_TYPE,
        parseInt( "0774", 8 ) );
    }
    return dataPath;
  };

  pub.getPlacesPath = function() {
    var placesPath = pub.getDataPath();
    placesPath.append( "places" );
    if ( !placesPath.exists() || !placesPath.isDirectory() ) {
      placesPath.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0774", 8 ) );
    }
    return placesPath;
  };

  pub.getDBFile = function() {
    var dbFile = pub.getDataPath();
    dbFile.append( "znotes.sqlite" );
    return dbFile;
  };
  
  pub.getDriversPath = function() {
    var ios = Cc["@mozilla.org/network/io-service;1"].getService(
      Ci.nsIIOService );
    var fph = ios.getProtocolHandler( "file" ).QueryInterface(
      Ci.nsIFileProtocolHandler );
    var chr = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(
      Ci.nsIChromeRegistry );
    var uri = ios.newURI( "chrome://znotes_drivers/content/", null, null );
    return fph.getFileFromURLSpec( chr.convertChromeURL( uri ).spec ).parent.clone();
  };

  pub.getDocumentsPath = function() {
    var ios = Cc["@mozilla.org/network/io-service;1"].getService(
      Ci.nsIIOService );
    var fph = ios.getProtocolHandler( "file" ).QueryInterface(
      Ci.nsIFileProtocolHandler );
    var chr = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(
      Ci.nsIChromeRegistry );
    var uri = ios.newURI( "chrome://znotes_documents/content/", null, null );
    return fph.getFileFromURLSpec( chr.convertChromeURL( uri ).spec ).parent.clone();
  };

  pub.getURLSpecFromFile = function( entry ) {
    var ios = Cc["@mozilla.org/network/io-service;1"].getService(
      Ci.nsIIOService );
    var fph = ios.getProtocolHandler( "file" ).QueryInterface(
      Ci.nsIFileProtocolHandler );
    return fph.getURLSpecFromFile( entry );
  };

  pub.getFileFromURLSpec = function( url ) {
    var ios = Cc["@mozilla.org/network/io-service;1"].getService(
      Ci.nsIIOService );
    var fph = ios.getProtocolHandler( "file" ).QueryInterface(
      Ci.nsIFileProtocolHandler );
    var chr = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(
      Ci.nsIChromeRegistry );
    var uri = ios.newURI( url, null, null );
    return fph.getFileFromURLSpec( chr.convertChromeURL( uri ).spec ).clone();
  };

  pub.convertChromeURL = function( url ) {
    var ios = Cc["@mozilla.org/network/io-service;1"].getService(
      Ci.nsIIOService );
    var fph = ios.getProtocolHandler( "file" ).QueryInterface(
      Ci.nsIFileProtocolHandler );
    var chr = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(
      Ci.nsIChromeRegistry );
    var uri;
    try {
      uri = chr.convertChromeURL( ios.newURI( url, null, null ) );
    } catch ( e ) {
      log.warn( e + "\n" + pub.dumpStack() );
      return null;
    }
    return uri.spec;
  };

  pub.getLocale = function() {
    var aLocale = null;
    try {
      var chromeRegistry =
        Cc["@mozilla.org/chrome/chrome-registry;1"].getService(
          Ci.nsIXULChromeRegistry );
      aLocale = chromeRegistry.getSelectedLocale( "znotes" );
    } catch ( e ) {
      aLocale = "en-US";
    }
    return aLocale;
  };

  pub.getLanguage = function() {
    var lang = pub.getLocale().substr( 0, 2 );
    if ( pub.LANGUAGES.indexOf( lang ) < 0 ) {
      lang = pub.LANGUAGES[0];
    }
    return lang;
  };

  pub.getSiteLanguage = function() {
    var lang = pub.getLanguage();
    if ( pub.SITE_LANGUAGES.indexOf( lang ) < 0 ) {
      lang = pub.SITE_LANGUAGES[0];
    }
    return lang;
  };

  pub.getTabMail = function() {
    var mail3PaneWindow = pub.getMail3PaneWindow();
    var tabMail = null;
    if ( mail3PaneWindow ) {
      tabMail = mail3PaneWindow.document.getElementById( "tabmail" );
    }
    return tabMail;
  };

  pub.getTabContainer = function() {
    var mail3PaneWindow = pub.getMail3PaneWindow();
    var tabContainer = null;
    if ( mail3PaneWindow ) {
      tabContainer = mail3PaneWindow.document.getElementById( "tabcontainer" );
    }
    return tabContainer;
  };

  pub.getMainTab = function() {
    var tabMail = pub.getTabMail();
    if ( !tabMail ) {
      return null;
    }
    var tabInfo = tabMail.tabInfo;
    var tab = null;
    for ( var i = 0; i < tabInfo.length; i++ ) {
      tab = tabInfo[i];
      if ( tab.mode.type == "znotesMainTab" ) {
        return tab;
      }
    }
    return null;
  };

  pub.switchToMainTab = function() {
    var tabMail = pub.getTabMail();
    if ( tabMail ) {
      var mainTab = pub.getMainTab();
      if ( mainTab ) {
        tabMail.switchToTab( mainTab );
      } else {
        pub.openMainTab( true );
      }
    }
  };

  pub.openMainTab = function( isActive, persistedState ) {
    var mail3PaneWindow = pub.getMail3PaneWindow();
    var tabMail = pub.getTabMail();
    if ( tabMail ) {
      mail3PaneWindow.setTimeout(
        function() {
          tabMail.openTab(
            "znotesMainTab",
            {
              contentPage: "chrome://znotes/content/main.xul",
              background: !isActive,
              persistedState: persistedState
            }
          );
        },
        0
      );
    } else if ( mail3PaneWindow ) {
      mail3PaneWindow.setTimeout(
        function() {
          mail3PaneWindow.openDialog(
            "chrome://messenger/content/",
            "_blank",
            "chrome,dialog=no,all,centerscreen",
            null,
            {
              tabType: "znotesMainTab",
              tabParams: {
                contentPage: "chrome://znotes/content/main.xul",
                background: !isActive,
                persistedState: persistedState
              }
            }
          );
        },
        0
      );
    } else {
      window.openDialog(
        "chrome://znotes/content/main.xul",
        "_blank",
        "chrome,dialog=no,all",
        {
          contentPage: "chrome://znotes/content/main.xul",
          background: !isActive,
          persistedState: persistedState
        }
      );
    }
  };

  pub.getSelectedTab = function() {
    var tabMail = pub.getTabMail();
    if ( !tabMail ) {
      return null;
    }
    var tabContainer = pub.getTabContainer();
    if ( !tabContainer ) {
      return null;
    }
    return tabMail.tabInfo[ tabContainer.selectedIndex ];
  };

  pub.hasActiveTabs = function() {
    var selectedTab = pub.getSelectedTab()
    if ( !selectedTab ) {
      return false;
    }
    return (
      selectedTab.mode.type == "znotesContentTab" ||
      selectedTab.mode.type == "znotesMainTab"
    );
  };

  pub.getParentChromeWindow = function( aWindow ) {
    return aWindow.QueryInterface( Ci.nsIInterfaceRequestor )
                  .getInterface( Ci.nsIWebNavigation )
                  .QueryInterface( Ci.nsIDocShell )
                  .chromeEventHandler
                  .ownerDocument
                  .defaultView;
  };

  pub.getPlatformWindow = function( aWindow ) {
    return ( aWindow ? aWindow : window )
      .QueryInterface( Ci.nsIInterfaceRequestor )
      .getInterface( Ci.nsIWebNavigation )
      .QueryInterface( Ci.nsIDocShellTreeItem )
      .rootTreeItem
      .QueryInterface( Ci.nsIInterfaceRequestor )
      .getInterface( Ci.nsIDOMWindow );
  };

  pub.getZNotesPlatformWindow = function() {
    return Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService( Ci.nsIWindowMediator )
      .getMostRecentWindow( "znotes:platform" );
  };

  pub.getMail3PaneWindow = function() {
    return Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService( Ci.nsIWindowMediator )
      .getMostRecentWindow( "mail:3pane" );
  };

  pub.getZNotesMainWindow = function() {
    return Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService( Ci.nsIWindowMediator )
      .getMostRecentWindow( "znotes:main" );
  };

  pub.initGlobals = function() {
    if ( pub.MAIN_WINDOW ) {
      return;
    }
    // STANDALONE APPLICATION
    var aWindow = pub.getZNotesPlatformWindow();
    if ( aWindow ) {
      pub.MAIN_WINDOW = aWindow;
      pub.IS_STANDALONE = true;
      pub.STRINGS_BUNDLE = aWindow.document
                                  .getElementById( "znotes_stringbundle" );
      return;
    }
    // THUNDERBIRD ADDON
    aWindow = pub.getMail3PaneWindow();
    if ( aWindow ) {
      pub.MAIN_WINDOW = aWindow;
      pub.IS_STANDALONE = false;
      pub.STRINGS_BUNDLE = aWindow.document
                                  .getElementById( "znotes_stringbundle" );
      return;
    }
    // UNKNOWN
    throw Cr.NS_ERROR_UNEXPECTED;
  };

  pub.showNewVersionInfo = function( mode ) {
    var tabMail, win;
    var infoURL = "chrome://znotes_changes/content/index_" +
                  pub.getSiteLanguage() + ".xhtml";
    pub.initGlobals();
    tabMail = pub.getTabMail();
    if ( tabMail ) {
      tabMail.openTab( "znotesInfoTab", {
        contentPage: infoURL,
        windowMode: mode
      } );
    } else {
      win = pub.MAIN_WINDOW.open(
        "chrome://znotes/content/info.xul",
        "znotes:info",
        "chrome,toolbar,status,resizable,centerscreen"
      );
      win.arguments = [ {
        contentPage: infoURL,
        windowMode: mode
      } ];
    }
  };

  pub.dumpObject = function( obj, chr, cnt ) {
    if ( obj === undefined ) {
      return "undefined";
    }
    if ( obj === null ) {
      return "null";
    }
    var chr = ( chr === undefined ) ? " " : chr;
    var cnt = ( cnt === undefined ) ? 2 : cnt;
    //
    var replicate = function( character, count ) {
      return ( new Array( count + 1 ) ).join( character );
    };
    //
    var dumpObj = function( o, depth ) {
      var result = "";
      var indent = replicate( chr, depth * cnt );
      var value;
      for ( var p in o ) {
        switch ( typeof o[p] ) {
          case "string":
            result += indent + p + " : '" + o[p] + "',\n";
            break;
          case "boolean":
            result += indent + p + " : " + o[p] + ",\n";
            break;
          case "number":
            result += indent + p + " : " + o[p] + ",\n";
            break;
          case "object":
            value = "" + o[p];
            if ( o[p] && value === "[object Object]" ) {
              result += indent + p + " : {\n";
              result += dumpObj( o[p], depth + 1 );
              result += indent + "},\n";
            } else {
              result += indent + p + " : " + value + ",\n";
            }
            break;
          case "function":
            value = o[p].toString();
            result += indent + p + " : " +
                      value.substring( 0, value.indexOf( "{" ) ) + ",\n";
            break;
        }
      }
      return result.substring( 0, result.length - 2 ) + "\n";
    };
    //
    return "\n{\n" + dumpObj( obj, 1 ) + "}";
  };

  pub.cloneObject = function( from, to ) {
    var modified = false;
    for ( var p in from ) {
      if ( from.hasOwnProperty( p ) ) {
        if ( to.hasOwnProperty( p ) ) {
          if( from[p] && "object" === typeof from[p] ) {
            if ( !to[p] || "object" !== typeof to[p] ) {
              delete to[p];
              to[p] = "function" === typeof from[p].pop ? [] : {};
              modified = true;
            }
            if ( pub.cloneObject( from[p], to[p] ) ) {
              modified = true;
            }
          } else {
            if ( to[p] != from[p] ) {
              to[p] = from[p];
              modified = true;
            }
          }
        } else {
          if ( from[p] && "object" === typeof from[p] ) {
            to[p] = "function" === typeof from[p].pop ? [] : {};
            if ( pub.cloneObject( from[p], to[p] ) ) {
              modified = true;
            }
          } else {
            to[p] = from[p];
            modified = true;
          }
        }
      }
    }
    for ( var p in to ) {
      if ( to.hasOwnProperty( p ) && !from.hasOwnProperty( p ) ) {
        delete to[p];
        modified = true;
      }
    }
    return modified;
  };

  pub.fillObject = function( from, to ) {
    var modified = false;
    for ( var p in from ) {
      if ( from.hasOwnProperty( p ) ) {
        if ( to.hasOwnProperty( p ) ) {
          if ( from[p] && "object" === typeof from[p] ) {
            if ( to[p] && "object" === typeof to[p] ) {
              modified = pub.fillObject( from[p], to[p] );
            }
          } else {
            if ( to[p] && "object" !== typeof to[p] ) {
              if ( to[p] != from[p] ) {
                to[p] = from[p];
                modified = true;
              }
            }
          }
        }
      }
    }
    return modified;
  };

  pub.isObjectsEqual = function( from, to ) {
    for ( var p in from ) {
      if ( from.hasOwnProperty( p ) ) {
        if ( to.hasOwnProperty( p ) ) {
          if( from[p] && "object" === typeof from[p] ) {
            if ( !to[p] || "object" !== typeof to[p] ) {
              return false;
            }
            if ( !pub.isObjectsEqual( from[p], to[p] ) ) {
              return false;
            }
          } else {
            if ( to[p] != from[p] ) {
              return false;
            }
          }
        } else {
          return false;
        }
      }
    }
    for ( var p in to ) {
      if ( to.hasOwnProperty( p ) ) {
        if ( from.hasOwnProperty( p ) ) {
          if( to[p] && "object" === typeof to[p] ) {
            if ( !from[p] || "object" !== typeof from[p] ) {
              return false;
            }
            if ( !pub.isObjectsEqual( to[p], from[p] ) ) {
              return false;
            }
          } else {
            if ( from[p] != to[p] ) {
              return false;
            }
          }
        } else {
          return false;
        }
      }
    }
    return true;
  };

  pub.isURI = function( str ) {
    return str && /^http:\/\/|^https:\/\/|^file:\/\/|^ftp:\/\/|^about:|^mailto:|^news:|^snews:|^telnet:|^ldap:|^ldaps:|^gopher:|^finger:|^javascript:/i.test( str );
  };

  pub.encodeUTF8 = function( s ) {
    return unescape( encodeURIComponent( s ) );
  };

  pub.decodeUTF8 = function( s ) {
    return decodeURIComponent( escape( s ) );
  };

  pub.lengthUTF8 = function( s ) {
    var result = 0;
    for ( var i = 0; i < s.length; i++ ) {
      var code = s.charCodeAt( i );
      if ( code < 128 ) {
        result++;
      } else if ( code > 127 && code < 2048 ) {
        result += 2;
      } else {
        result += 3;
      }
    }
    return result;
  };

  pub.copyEntryTo = function( from, to, name, overwrite ) {
    var entries, entry, parent = to ? to.clone() : from.parent.clone();
    var flag = ( overwrite === undefined ? false : !!overwrite );
    if ( from.isDirectory() ) {
      parent.append( name );
      if ( !parent.exists() || !parent.isDirectory() ) {
        parent.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0755", 8 ) );
      }
      entries = from.directoryEntries;
      while ( entries && entries.hasMoreElements() ) {
        entry = entries.getNext();
        entry.QueryInterface( Ci.nsIFile );
        pub.copyEntryTo( entry, parent, entry.leafName, flag );
      }
    } else {
      entry = parent.clone();
      entry.append( name );
      if ( !entry.exists() || entry.isDirectory() ) {
        try {
          from.copyTo( parent, name );
        } catch ( e ) {
          //
        }
      } else if ( flag ) {
        if ( entry.exists() ) {
          entry.remove( true );
        }
        try {
          from.copyTo( parent, name );
        } catch ( e ) {
          //
        }
      }
    }
  };

  pub.readFileContent = function( entry, encoding ) {
    var data = "";
    var istream =
      Cc["@mozilla.org/network/file-input-stream;1"]
      .createInstance( Ci.nsIFileInputStream );
    var cstream =
      Cc["@mozilla.org/intl/converter-input-stream;1"]
      .createInstance( Ci.nsIConverterInputStream );
    istream.init( entry, -1, 0, 0 );
    try {
      var isInit = false;
      var enc = encoding ? encoding : "UTF-8";
      while ( !isInit ) {
        try {
          cstream.init(
            istream,
            enc,
            0,
            Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER
          );
          var str = {};
          var read = 0;
          do {
            read = cstream.readString( parseInt( "0xffffffff", 16 ), str );
            data += str.value;
          } while ( read != 0 );
          isInit = true;
        } catch( e ) {
          log.warn( e + "\n" + pub.dumpStack() );
          if ( enc === "UTF-8" )
            isInit = true;
          enc = "UTF-8";
        }
      }
    } finally {
      cstream.close();
      istream.close();
    }
    return data;
  };

  pub.writeFileContent = function( entry, encoding, data ) {
    var ostream =
      Cc["@mozilla.org/network/file-output-stream;1"]
      .createInstance( Ci.nsIFileOutputStream );
    ostream.init(
      entry,
      // PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE
      parseInt( "0x02", 16 ) | parseInt( "0x08", 16 ) | parseInt( "0x20", 16 ),
      parseInt( "0644", 8 ),
      0
    );
    var cstream =
      Cc["@mozilla.org/intl/converter-output-stream;1"]
      .createInstance( Ci.nsIConverterOutputStream );
    try {
      var isInit = false;
      var enc = encoding;
      while ( !isInit ) {
        try {
          cstream.init(
            ostream,
            enc,
            0,
            Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER
          );
          cstream.writeString( data );
          isInit = true;
        } catch( e ) {
          log.warn( e + "\n" + pub.dumpStack() );
          if ( enc === "UTF-8" )
            isInit = true;
          enc = "UTF-8";
        }
      }
    } finally {
      cstream.close();
      ostream.close();
    }
  };

  // TODO: @see clipper.js :: loadURLToFileEntry()
  pub.saveURLToFile = function( fileEntry, fileMode, filePermitions, bufferSize,
                                url, contentType, context, urlListener ) {
    var ioService =
      Cc["@mozilla.org/network/io-service;1"]
      .getService( Ci.nsIIOService );
    var fileOutputStream =
      Cc["@mozilla.org/network/safe-file-output-stream;1"]
      .createInstance( Ci.nsIFileOutputStream );
    var bufferedOutputStream =
      Cc["@mozilla.org/network/buffered-output-stream;1"]
      .createInstance( Ci.nsIBufferedOutputStream );
    var uri = ioService.newURI( url, null, null );
    var channel = ioService.newChannelFromURI( uri );
    if ( contentType ) {
      channel.contentType = contentType;
    }
    channel.asyncOpen(
      {
        onStartRequest: function ( aRequest, aContext ) {
          fileOutputStream.init(
            fileEntry,
            fileMode,
            filePermitions,
            Ci.nsIFileOutputStream.DEFER_OPEN
          );
          bufferedOutputStream.init( fileOutputStream, bufferSize );
          if ( urlListener && urlListener.OnStartRunningUrl ) {
            urlListener.OnStartRunningUrl( uri, channel.contentLength );
          }
        },
        onStopRequest: function ( aRequest,  aContext,  aStatusCode ) {
          bufferedOutputStream.flush();
          if ( fileOutputStream instanceof Ci.nsISafeOutputStream ) {
            fileOutputStream.finish();
          } else {
            fileOutputStream.close();
          }
          if ( urlListener && urlListener.OnStopRunningUrl ) {
            urlListener.OnStopRunningUrl( uri, aStatusCode );
          }
        },
        onDataAvailable: function ( aRequest, aContext, aStream,
                                    aOffset, aCount ) {
          var total = aCount;
          while ( total > 0 ) {
            total -= bufferedOutputStream.writeFrom( aStream, total );
          }
          if ( urlListener && urlListener.OnProgressUrl ) {
            urlListener.OnProgressUrl( uri, aCount );
          }
        }
      },
      context ? context : null
    );
  };

  pub.createUUID = function() {
    var s = [];
    var hexDigits = "0123456789ABCDEF";
    for ( var i = 0; i < 32; i++ )
      s[i] = hexDigits.substr( Math.floor( Math.random() * parseInt( "0x10", 16 ) ), 1 );
    s[12] = "4";
    s[16] = hexDigits.substr( ( s[16] & parseInt( "0x3", 16 ) ) | parseInt( "0x8", 16 ), 1 );
    return s.join("");
  };

  pub.RGB2HEX = function( r, g, b ) {
    var red = r.toString( 16 );
    while ( red.length < 2 ) red = "0" + red;
    var green = g.toString( 16 );
    while ( green.length < 2 ) green = "0" + green;
    var blue = b.toString( 16 );
    while ( blue.length < 2 ) blue = "0" + blue;
    return ( "#" + red + green + blue ).toUpperCase();
  };

  pub.HEX2RGB = function( hex ) {
    return [
      parseInt( hex.substr( 1, 2 ), 16 ),
      parseInt( hex.substr( 3, 2 ), 16 ),
      parseInt( hex.substr( 5, 2 ), 16 )
    ];
  };

  pub.HEX2HSL = function( hex ) {
    var r = parseInt( hex.substr( 1, 2 ), 16 ) / 255;
    var g = parseInt( hex.substr( 3, 2 ), 16 ) / 255;
    var b = parseInt( hex.substr( 5, 2 ), 16 ) / 255;
    var max = Math.max( r, g, b );
    var min = Math.min( r, g, b );
    var h, s, l;
    l = ( max + min ) / 2;
    if ( max == min ) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / ( 2 - max - min ) : d / ( max + min );
      switch ( max ) {
        case r:
          h = ( g - b ) / d + ( g < b ? 6 : 0 );
          break;
        case g:
          h = ( b - r ) / d + 2;
          break;
        case b:
          h = ( r - g ) / d + 4;
          break;
      }
      h /= 6;
    }
    return [ Math.floor(h * 360), Math.floor(s * 100), Math.floor(l * 100) ];
  };

  pub.getHighlightColors = function( foreColor, backColor ) {
    var hsl = pub.HEX2HSL( foreColor );
    return {
      fgColor: foreColor,
      bgColor: "transparent",
      fgColorSelected: backColor,
      bgColorSelected: "hsl(" + hsl[0] + "," + hsl[1] + "%," + hsl[2] + "%)"
    };
  };

  pub.setProperty = function( node, value ) {
    node.setAttribute( "properties", value );
  };

  pub.addProperty = function( node, value ) {
    var properties = node.hasAttribute( "properties" ) ?
      node.getAttribute( "properties" ).trim() : "";
    properties = properties.length ? properties.split( /\s+/g ) : [];
    if ( properties.indexOf( value ) < 0 ) {
      properties.push( value );
    }
    node.setAttribute( "properties", properties.join( " " ) );
  };

  pub.removeProperty = function( node, value ) {
    var properties = node.hasAttribute( "properties" ) ?
      node.getAttribute( "properties" ).trim() : "";
    properties = properties.length ? properties.split( /\s+/g ) : [];
    var index = properties.indexOf( value );
    if ( index < 0 ) {
      return;
    }
    properties.splice( index, 1 );
    node.setAttribute( "properties", properties.join( " " ) );
  };

  pub.addCSSRule = function( doc, selector, declaration ) {
    var styleSheet = doc.styleSheets[0];
    var rule = selector + " { " + declaration + " }";
    styleSheet.insertRule( rule, styleSheet.cssRules.length );
  };

  pub.deleteCSSRule = function( doc, selector ) {
    var index = pub.findCSSRule( doc, selector );
    if ( index != -1 ) {
      var styleSheet = doc.styleSheets[0];
      styleSheet.deleteRule( index );
    }
  };

  pub.findCSSRule = function( doc, selector ) {
    var styleSheet = doc.styleSheets[0];
    var ruleSelector;
    var rules = styleSheet.cssRules;
    for ( var i = 0; i < rules.length; i++ ) {
      ruleSelector = rules[i].selectorText;
      if ( ruleSelector &&
           ruleSelector.toLowerCase() == selector.toLowerCase() ) {
        return i;
      }
    }
    return -1;
  };

  pub.changeCSSRule = function( doc, selector, declaration ) {
    pub.deleteCSSRule( doc, selector );
    pub.addCSSRule( doc, selector, declaration );
  };

  pub.getFontNameArray = function() {
    if ( fontNameArray == null ) {
      fontNameArray =
        Cc["@mozilla.org/gfx/fontenumerator;1"]
        .getService( Ci.nsIFontEnumerator )
        .EnumerateAllFonts( {} );
    }
    return fontNameArray;
  };

  pub.getDefaultFontMapping = function() {
    var prefs =
      Cc["@mozilla.org/preferences-service;1"]
      .getService( Ci.nsIPrefService )
      .getDefaultBranch( "font." );
    var languageGroup =
      Cc["@mozilla.org/intl/stringbundle;1"]
      .getService( Ci.nsIStringBundleService )
      .createBundle( prefs.getCharPref( "language.group" ) )
      .GetStringFromName( "font.language.group" );
    var defaultFontName = prefs.getCharPref( "default." + languageGroup );
    var defaultFontValue = prefs.getCharPref( "name." + defaultFontName + "." + languageGroup );
    var serif, sansserif, cursive, fantasy, monospace;
    try {
      serif = prefs.getCharPref( "name.serif." + languageGroup );
    } catch ( e ) {
      serif = defaultFontValue;
    }
    try {
      sansserif = prefs.getCharPref( "name.sans-serif." + languageGroup );
    } catch ( e ) {
      sansserif = defaultFontValue;
    }
    try {
      cursive = prefs.getCharPref( "name.cursive." + languageGroup );
    } catch ( e ) {
      cursive = defaultFontValue;
    }
    try {
      fantasy = prefs.getCharPref( "name.fantasy." + languageGroup );
    } catch ( e ) {
      fantasy = defaultFontValue;
    }
    try {
      monospace = prefs.getCharPref( "name.monospace." + languageGroup );
    } catch ( e ) {
      monospace = defaultFontValue;
    }
    var varSize, fixSize;
    try {
      varSize = prefs.getIntPref( "size.variable." + languageGroup );
    } catch ( e ) {
      varSize = 16;
    }
    try {
      fixSize = prefs.getIntPref( "size.fixed." + languageGroup );
    } catch ( e ) {
      fixSize = 13;
    }
    return {
      generics: {
        "serif"      : serif,
        "sans-serif" : sansserif,
        "cursive"    : cursive,
        "fantasy"    : fantasy,
        "monospace"  : monospace,
        "tt"         : monospace
      },
      "defaultName"  : defaultFontName,
      "defaultValue" : defaultFontValue,
      "varSize" : varSize,
      "fixSize" : fixSize
    };
  };

  pub.getEntryIcon = function( entry, size ) {
    if ( !entry.exists() || entry.isDirectory() ) {
      return null;
    }
    var fph =
      Cc["@mozilla.org/network/io-service;1"]
      .getService( Ci.nsIIOService )
      .getProtocolHandler( "file" )
      .QueryInterface( Ci.nsIFileProtocolHandler );
    var urlSpec = fph.getURLSpecFromFile( entry );
    return "moz-icon://" + urlSpec + "?size=" + size;
  };

  pub.getMimeTypeIcon = function( mimeType, size ) {
    return "moz-icon://goat?size=" + size + "&contentType=" + mimeType;
  };

  pub.getExtensionIcon = function( ext, size ) {
    return "moz-icon://goat." + ext + "?size=" + size;
  };

  pub.openURI = function( uri, force, win, title ) {
    if ( force === undefined ) {
      force = false;
    }
    var ioService =
      Cc["@mozilla.org/network/io-service;1"]
      .getService( Ci.nsIIOService );
    var fph =
      ioService.getProtocolHandler( "file" ).QueryInterface(
        Ci.nsIFileProtocolHandler );
    var mimeService = Cc["@mozilla.org/mime;1"].getService( Ci.nsIMIMEService );
    if ( !( uri instanceof Ci.nsIURI ) ) {
      uri = ioService.newURI( uri, null, null );
    }
    var contentType = "unknown";
    var file = null;
    if ( uri.schemeIs( "file" ) ) {
      file = fph.getFileFromURLSpec( uri.spec );
      if ( file && file.exists() && !file.isDirectory() ) {
        var i = file.leafName.lastIndexOf( "." );
        var ext = "";
        if ( i >= 0 ) {
          ext = file.leafName.substr( i + 1 );
          try {
            contentType = mimeService.getTypeFromExtension( ext );
          } catch ( e ) {
            // NS_ERROR_NOT_AVAILABLE
          }
        }
      } else {
        throw {
          name: "openURI",
          message: "File does not exist."
        };
        return;
      }
    } else {
      try {
        contentType = mimeService.getTypeFromURI( uri );
      } catch ( e ) {
        // NS_ERROR_NOT_AVAILABLE
      }
    }
    var mimeInfo = mimeService.getFromTypeAndExtension( contentType, ext );
    var handlerService =
      Cc["@mozilla.org/uriloader/handler-service;1"]
      .getService( Ci.nsIHandlerService );
    if ( !mimeInfo.preferredApplicationHandler || force ) {
      var params = {};
      params.title = title;
      params.description = null;
      params.filename = null;
      params.handlerApp = null;
      params.mimeInfo = mimeInfo;
      try {
        win.openDialog(
          "chrome://global/content/appPicker.xul",
          null,
          "chrome,modal,centerscreen,titlebar,dialog=yes",
          params
        );
      } catch ( e ) {
        return;
      }
      if ( !params.handlerApp || !params.handlerApp.executable ) {
        return;
      }
      try {
        if ( params.handlerApp.executable.isFile() ) {
          mimeInfo.preferredApplicationHandler = params.handlerApp;
          mimeInfo.alwaysAskBeforeHandling = false;
          mimeInfo.preferredAction = Ci.nsIHandlerInfo.useHelperApp;
          handlerService.store( mimeInfo );
        }
      } catch ( e ) {
        return;
      }
    }
    if ( file ) {
      mimeInfo.launchWithFile( file );
    } else {
      mimeInfo.preferredApplicationHandler.launchWithURI( uri );
    }
  };

  pub.getTempFileEntry = function( fileName, fileSuffix ) {
    var directoryService =
      Cc["@mozilla.org/file/directory_service;1"]
      .getService( Ci.nsIProperties );
    var tempDirectory = directoryService.get( "TmpD", Ci.nsIFile );
    var tmpDir, tmpFile;
    var tmpFileSuffix = fileSuffix ? fileSuffix : ".tmp";
    var tmpFileName = fileName ? fileName : pub.createUUID().toLowerCase();
    var tmpName = tmpFileName + tmpFileSuffix;
    var tmpDirName = "";
    do {
      tmpDir = tempDirectory.clone();
      if ( tmpDirName ) {
        tmpDir.append( tmpDirName );
      }
      tmpFile = tmpDir.clone();
      tmpFile.append( tmpName );
      tmpDirName = pub.createUUID();
    } while (
      tmpFile.exists() && !tmpFile.isDirectory()
    );
    if ( !tmpDir.exists() || !tmpDir.isDirectory() ) {
      tmpDir.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0774", 8 ) );
    }
    return tmpFile.clone();
  };

  pub.getEntriesToSaveContent = function( fileSuffix, dirSuffix ) {
    var directoryService =
      Cc["@mozilla.org/file/directory_service;1"]
      .getService( Ci.nsIProperties );
    var tempDirectory = directoryService.get( "TmpD", Ci.nsIFile );
    var tmpName, tmpFile, tmpDir;
    var tmpDirSuffix = dirSuffix ? dirSuffix : "_files";
    var tmpFileSuffix = fileSuffix ? fileSuffix : ".xhtml";
    do {
      tmpName = pub.createUUID();
      tmpFile = tempDirectory.clone();
      tmpFile.append( tmpName + tmpFileSuffix );
      tmpDir = tempDirectory.clone();
      tmpDir.append( tmpName + tmpDirSuffix );
    } while (
      tmpDir.exists() && tmpDir.isDirectory() ||
      tmpFile.exists() && !tmpFile.isDirectory()
    );
    tmpDir.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0774", 8 ) );
    return {
      fileEntry: tmpFile.clone(),
      directoryEntry: tmpDir.clone()
    };
  };

  pub.getURLFromRequest = function( aRequest ) {
    if ( !aRequest ) {
      return "";
    }
    var aURI;
    try {
      aURI = aRequest.QueryInterface( Ci.nsIChannel ).URI;
    } catch ( e ) {
      aURI = null;
    }
    return pub.getURLFromURI( aURI );
  };

  pub.getURLFromURI = function( aURI ) {
    if ( !aURI ) {
      return "";
    }
    var result, nsIURIFixup;
    try {
      nsIURIFixup =
        Cc["@mozilla.org/docshell/urifixup;1"]
        .getService( Ci.nsIURIFixup );
      result = nsIURIFixup.createExposableURI( aURI ).spec;
    } catch( e ) {
      result = aURI.spec;
    }
    return result;
  };

  pub.parseQueryString = function( query ) {
    var key, value, result = {};
    var part, parts = query.split( "&" );
    for ( var i = 0; i < parts.length; i++ ) {
      part = parts[i].split( '=' );
      key = part[0];
      if ( key ) {
        key = decodeURIComponent( key );
        value = decodeURIComponent( part[1] ? part[1] : "" );
        result[key] = value;
      }
    }
    return result;
  };

  pub.getHREFForClickEvent = function( aEvent, aDontCheckInputElement ) {
    var href = null;
    var target = aEvent.target;
    var name = target.nodeName.toLowerCase();
    if ( name == "a" || name == "area" || name == "link" ) {
      if ( target.hasAttribute( "href" ) ) {
        href = target.href;
      }
    } else if ( !aDontCheckInputElement && name == "input" ) {
      if ( target.form && target.form.action ) {
        href = target.form.action;
      }
    } else {
      var linkNode = aEvent.originalTarget;
      while ( linkNode && !( linkNode.nodeName.toLowerCase() == "a" ) ) {
        linkNode = linkNode.parentNode;
      }
      if ( linkNode ) {
        href = linkNode.href;
      }
    }
    return href;
  };

  pub.openLinkExternally = function( url ) {
    var uri = url;
    if ( !( uri instanceof Ci.nsIURI ) ) {
      uri =
        Cc["@mozilla.org/network/io-service;1"]
        .getService( Ci.nsIIOService )
        .newURI( url, null, null );
    }
    Cc["@mozilla.org/uriloader/external-protocol-service;1"]
    .getService( Ci.nsIExternalProtocolService )
    .loadUrl( uri );
  };

  pub.clickHandler = function( event ) {
    if ( !event.isTrusted || event.defaultPrevented || event.button ) {
      return true;
    }
    var href = pub.getHREFForClickEvent( event, true );
    if ( !href ) {
      return true;
    }
    var svc =
      Cc["@mozilla.org/uriloader/external-protocol-service;1"]
      .getService( Ci.nsIExternalProtocolService );
    var ioService =
      Cc["@mozilla.org/network/io-service;1"]
      .getService( Ci.nsIIOService );
    var uri = ioService.newURI( href, null, null );
    if ( uri.schemeIs( "znotes" ) ) {
      event.stopPropagation();
      event.preventDefault();
      return pub.openLinkInternally( href );
    } else if ( uri.schemeIs( "chrome" ) ) {
      event.stopPropagation();
      event.preventDefault();
      return false;
    } else {
      event.preventDefault();
      pub.openLinkExternally( href );
      return true;
    }
  };

  pub.openLinkInternally = function( href ) {
    log.debug( "openLinkExternally()\n" + href );
    return true;
  };

  pub.getErrorName = function( code ) {
    for ( var name in Cr ) {
      if ( Cr[name] === ( "" + code ) ) {
        return name;
      }
    }
    var e = new Components.Exception( "", code );
    if ( e.name ) {
      return e.name;
    }
    return "0x" + Number( code ).toString( 16 ).toUpperCase();
  };

  pub.updateKeyAttribute = function( node ) {
    var id, child;
    if ( node ) {
      try {
        if ( node.hasAttribute( "key" ) ) {
          id = node.getAttribute( "key" );
          node.removeAttribute( "key" );
          node.setAttribute( "key", id );
        }
        child = node.firstElementChild;
        while ( child ) {
          pub.updateKeyAttribute( child );
          child = child.nextElementSibling;
        }
      } catch ( e ) {
        log.debug( pub.dumpObject( node ) );
        log.warn( e + "\n" + pub.dumpStack() );
      }
    }
  };

  /*
  alt     The user must press the Alt key.
          On the Macintosh, this is the Option key.
  control The user must press the Control key.
  meta    The user must press the Meta key.
          This is the Command key on the Macintosh.
  shift   The user must press the Shift key.
  accel   The user must press the special accelerator key.
          The key used for keyboard shortcuts on the user's platform.
          Usually, this would be the value you would use.
  =================================================================
  os      The user must press the Win key.
          This is the Super key or the Hyper key on Linux.
          If this value is used, typically the key combination conflicts
          with system wide shortcut keys. So, you shouldn't use this
          value as far as possible. Requires Gecko 17.0
  access  The user must press the special access key.
          The key used for access keys on the user's platform.
  any     Indicates that all modifiers preceding it are optional.
  */

  pub.getShortcutFromAttributes = function( key, keycode, modifiers ) {
    key = ( key == null ) ? "" : key.toUpperCase();
    keycode = ( keycode == null ) ? "" : keycode;
    keycode = ( keycode.indexOf( "VK_" ) == 0 ) ?
      keycode.substr( 3 ).toUpperCase() : "";
    var m = ( modifiers == null ) ? [] : modifiers.split( /\s*,\s*|\s+/ );
    modifiers = [];
    for ( var i = 0; i < m.length; i++ ) {
      if ( m[i].trim().length ) {
        modifiers.push( m[i] );
      }
    }
    var accel = ( pub.getSystemInfo().OS == 'Darwin' ) ? "Meta" : "Ctrl";
    var modifier;
    for ( var i = 0; i < modifiers.length; i++ ) {
      modifier = modifiers[i].toLowerCase();
      switch ( modifier ) {
        case "control":
          modifier = "Ctrl";
          break;
        case "accel":
          modifier = accel;
          break;
      }
      modifiers[i] = modifier.substr( 0, 1 ).toUpperCase() +
                     modifier.substr( 1 );
    }
    // reject all before "any" and "any" itself in modifiers attribute
    var anyIndex = modifiers.indexOf( "Any" );
    if ( anyIndex >= 0 ) {
      modifiers = modifiers.slice( anyIndex + 1 )
    }
    modifiers = modifiers.sort().join( "+" );
    return modifiers + ( modifiers.length ? "+" : "" ) +
           ( key.length ? key : keycode );
  };

  pub.getShortcutFromEvent = function( event ) {
    var keycode = ( "keyCode" in event ) ? event.keyCode : 0;
    var key = ( "charCode" in event ) ? event.charCode : 0;
    if ( keycode ) {
      switch ( keycode ) {
        case event.DOM_VK_SHIFT:
        case event.DOM_VK_ALT:
        case event.DOM_VK_CONTROL:
        case event.DOM_VK_META:
          keycode = "";
          break;
        default:
          for ( var name in event ) {
            if ( name.indexOf( "DOM_VK_" ) == 0 && event[name] == keycode ) {
              keycode = name.substr( 7 );
              break;
            }
          }
      }
      key = "";
    } else {
      keycode = "";
      key = String.fromCharCode( key ).toUpperCase();
    }
    var modifiers = [];
    if ( ( "shiftKey" in event ) && event.shiftKey ) {
      modifiers.push( "Shift" );
    }
    if ( ( "altKey" in event ) && event.altKey ) {
      modifiers.push( "Alt" );
    }
    if ( ( "ctrlKey" in event ) && event.ctrlKey ) {
      modifiers.push( "Ctrl" );
    }
    if ( ( "metaKey" in event ) && event.metaKey ) {
      modifiers.push( "Meta" );
    }
    modifiers = modifiers.sort().join( "+" );
    return modifiers +
      ( modifiers.length && ( key.length || keycode.length ) ? "+" : "" ) +
      ( key.length ? key : keycode );
  };

  pub.getPlatformAssignedShortcuts = function() {
    var result = {};
    var keysets = pub.MAIN_WINDOW.document.getElementsByTagName( "keyset" );
    var process = function( keyset ) {
      var shortcut, key, keycode, modifiers;
      var node = keyset.firstChild;
      while ( node ) {
        if ( node.nodeName === "keyset" ) {
          process( node );
          node = node.nextSibling;
          continue;
        }
        if ( node.nodeName !== "key" ) {
          node = node.nextSibling;
          continue;
        }
        key = node.hasAttribute( "key" ) ?
          node.getAttribute( "key" ).trim() : "";
        keycode = node.hasAttribute( "keycode" ) ?
          node.getAttribute( "keycode" ).trim() : "";
        modifiers = node.hasAttribute( "modifiers" ) ?
          node.getAttribute( "modifiers" ).trim() : "";
        if ( !key.length && !keycode.length ) {
          node = node.nextSibling;
          continue;
        }
        // extend key with "any" in modifiers attribute to proper keys
        var m = ( modifiers === "" ) ?
          [] : modifiers.split( /\s*,\s*|\s+/ );
        modifiers = [];
        for ( var i = 0; i < m.length; i++ ) {
          if ( m[i].trim().length ) {
            modifiers.push( m[i].toLowerCase() );
          }
        }
        m = [ [] ];
        var i = modifiers.indexOf( "any" );
        if ( i >= 0 ) {
          m = modifiers.slice( 0, i );
          modifiers = modifiers.slice( i + 1 );
          if ( !m.length ) {
            m = [ [] ];
          } else {
            m = pub.getPermutations( m );
          }
        }
        for ( var j = 0; j < m.length; j++ ) {
          shortcut = pub.getShortcutFromAttributes(
            key, keycode, m[j].concat( modifiers ).join( "," ) );
          if ( shortcut ) {
            result[ shortcut ] = null;
          }
        }
        //
        node = node.nextSibling;
      }
    };
    for ( var i = 0; i < keysets.length; i++ ) {
      process( keysets[i] );
    }
    return result;
  };
  
  pub.getNameFromId = function( id ) {
    var beginIndex = id.indexOf( "_" );
    var endIndex = id.lastIndexOf( "_" );
    if ( ( beginIndex < 0 ) || ( endIndex < 0 ) || beginIndex == endIndex ) {
      return null;
    }
    return id.substring( beginIndex + 1, endIndex );
  };

  pub.getPermutations = function( arr ) {
    var result = [];
    function process( key ) {
      var tmp = [];
      tmp.push( [ key ] );
      for ( var i = 0; i < result.length; i++ ) {
        tmp.push( [ result[i], key ] );
      }
      result = result.concat( tmp );
    };
    for ( var i = 0; i < arr.length; i++ ) {
      process( arr[i] );
    }
    result.push( [] );
    return result;
  };

  pub.beep = function() {
    var sound = Cc["@mozilla.org/sound;1"].createInstance( Ci.nsISound );
    sound.beep();
  };
  
  pub.play = function( url ) {
    var sound = Cc["@mozilla.org/sound;1"].createInstance( Ci.nsISound );
    var uri = Cc["@mozilla.org/network/io-service;1"]
      .getService( Ci.nsIIOService )
      .newURI( url, null, null );
    sound.play( uri );
  };

  pub.checkChromeURL = function( url ) {
    var ios =
      Cc["@mozilla.org/network/io-service;1"]
      .getService( Ci.nsIIOService );
    try {
      ios.newChannelFromURI( ios.newURI( url, null, null ) ).open();
      return true;
    } catch ( e ) {
      //
    }
    return false;
  };

  pub.loadScript = function( url, context, charset ) {
    var loader =
      Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService( Ci.mozIJSSubScriptLoader );
    loader.loadSubScript( url, context, charset );
  };

  return pub;

}();
