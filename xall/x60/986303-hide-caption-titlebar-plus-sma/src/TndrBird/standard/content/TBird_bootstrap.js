
"use strict";


var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");


//const consoleJSM= Cu.import("resource://gre/modules/Console.jsm", {});
//const console = consoleJSM.console; //access exported symbol of "console" from the Console.jsm

const consoleService_legacy= Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);


var bPrintDebug = null;
var allowedWords= new Set();

// to be called ONLY 1 time!
function  get_printDebug_flag() {
	try {
		const prefKey_debug = "extensions.hide_caption.plus.print_debug";
		bPrintDebug= Services.prefs.prefHasUserValue(prefKey_debug) &&
		             Services.prefs.getBoolPref     (prefKey_debug);

		const key_debugWords= "extensions.hide_caption.plus.print_debugWords"; // CHAR pref.
		const debugWords_val= Services.prefs.prefHasUserValue(key_debugWords) ?
		                      Services.prefs.getCharPref     (key_debugWords)+"" : "";

		if( debugWords_val.trim().length > 0 ){
			allowedWords= new Set(debugWords_val.trim().split(/\s+/));
		}

		if( bPrintDebug ){
			//consoleService_legacy.logStringMessage( ... );
			console.log( "    DEBUG:  allowedWords=" , allowedWords); // use COMMA here to see the Set components!
		}
	} catch (ex) {
		consoleService_legacy.logStringMessage( " get_printDebug_flag():  ignoring ERROR: " + ex, ex);
	}
};


var bPrintDebug_AUDIO = null;

function get_debug_audio_flag(){
	if( bPrintDebug_AUDIO === null ){
		try {
			const prefKey_debug_audio = "extensions.hide_caption.plus.print_debug_audio";
			bPrintDebug_AUDIO= Services.prefs.prefHasUserValue(prefKey_debug_audio) &&
							   Services.prefs.getBoolPref     (prefKey_debug_audio);
		} catch (ex) {	consoleService_legacy.logStringMessage( " get_debug_audio_flag():  ignoring ERROR: " + ex, ex);	}
	}
	return bPrintDebug_AUDIO;
};


const tmpTimerImport= {};

function play_audio_error(){
	try{
		if( !tmpTimerImport.setTimeout ){
			Cu.import("resource://gre/modules/Timer.jsm",  tmpTimerImport );
		}
		tmpTimerImport.setTimeout( function(){
			(new Services.appShell.hiddenDOMWindow.Audio("resource://devtools/client/themes/audio/shutter.wav")).play();
		}, 600);
	}catch(ex){ myDumpToConsole("  IGNORED err0r: "+ex); }
};


function  myDumpToConsole_noAudio_plus(moduleWord, aMessage){
	if( bPrintDebug === false ){ // PRODUCTION, maximum performance!!
		return;
	}
	if( bPrintDebug === null  ){
		get_printDebug_flag();
	}
	if( bPrintDebug ){
		var prefix= "   ";
		if( moduleWord ){
			prefix= "["+moduleWord+"]   ";
		}else{ // !moduleWord
			moduleWord= "_";
		}
		if( allowedWords.size == 0 || allowedWords.has(moduleWord) ){
			//console.log(""+aMessage);
			consoleService_legacy.logStringMessage( prefix + "" + aMessage);
		}
	}
};
function  myDumpToConsole_plus        (moduleWord, aMessage){
	myDumpToConsole_noAudio_plus(      moduleWord, aMessage);
	
	//TODO: poner AUDIO aca!
};
function  myDumpToConsole             (            aMessage){
	myDumpToConsole_plus(              null      , aMessage);
};
function  debugError( aMessage, ex){
	//console.error(              ""+aMessage+ "   "+ (ex? "\n ex= "+ex+"  \n"+ex.stack:"") );
	Components.utils.reportError( ""+aMessage+ "   "+ (ex? "\n ex= "+ex+"  \n"+ex.stack:"") );
	if( ex ){
		Components.utils.reportError(ex);
	}
};


var   Bstrap= {
		Cu: Components.utils,
		Cc: Components.classes,
		Ci: Components.interfaces,
		debugError                  : debugError,
		myDumpToConsole_plus        : myDumpToConsole_plus,
		myDumpToConsole_noAudio_plus: myDumpToConsole_noAudio_plus,
		
		Services       : Services,
};

var newTest_overrideMimeType= false;


const validTextParents= new Array('label','description'); // 'tooltip' 
function is_validTextParent( elem ) {
	return 	elem  &&  elem.nodeType == elem.ELEMENT_NODE  &&  validTextParents.indexOf((""+elem.tagName).toLowerCase()) >= 0;
};

function cleanNode( elem ){
	//HCPlusLib.myDumpToConsole( "  "+elem.tagName+"   id="+elem.id );
	for( var n = elem.firstChild; n; ) {
		var nBak= n;
		n = n.nextSibling;
		
		if( nBak.nodeType != nBak.ELEMENT_NODE ) { //|| !nBak.hasAttribute("id")
			if( is_validTextParent(nBak.parentNode) ){
				
				myDumpToConsole("Keeping node:  "+nBak.nodeName+"  "+nBak.textContent);
				
			}else{ // ! is_validTextParent(nBak.parentNode)
				nBak.parentNode.removeChild(nBak);
				
				if( nBak.nodeType != nBak.COMMENT_NODE && nBak.nodeType != nBak.TEXT_NODE ){
					debugError( "  Error??:  cleaned node: "+nBak+ "   "+nBak.tagName );
				}
			}
		}else{ // is ELEMENT
			if( is_validTextParent(nBak.parentNode) ){

				myDumpToConsole("Keeping SUBTREE:  "+nBak.nodeName+"  "+nBak.textContent);
			
			}else{ // ! is_validTextParent ...
				cleanNode(nBak);
			}
		};
	};
};


function  load_file_as_document( x_request, sFileName, callback, iRecursion ) {
	if( iRecursion === undefined ){
		iRecursion= 0;
	}
	
	//sFileName.hc_done= false;
	
	//request.addEventListener("load", ..)
	x_request.onload= function(event) {
		try {
		    //xxx.myDumpToConsole(" load_file_as_document(): loaded: " + sFileName + "   ("+iRecursion+")");

		    var xul_document = x_request.responseXML;

		    // CLEAN TEXT nodes, etc!!
			myDumpToConsole( "  Will clean nodes.   " );
		    cleanNode( xul_document.documentElement );
		    
		    //if( sFileName.hc_done === true ){   return;  } // tried to block multiple loads but failed ...
		    //sFileName.hc_done= true;
		    
		    //CALLBACK
			callback(event, xul_document);
			
		} catch (e) {  throw e;  };  //xxx.debugError(" onload: ex= "+e, e); 
	};
	
	x_request.onerror = x_request.onabort = function(_arg) {
		
		if( iRecursion > 10 ){
			throw new Error("throw ERROR: Failed to load " + sFileName + "   "+_arg+ "   ("+iRecursion+")" );
		}else{
			// window.setTimeout(function(){ // NO existe window aca
			// }, 1000);

			debugError(                  "Failed to load " + sFileName + "   "+_arg+ "   ("+iRecursion+").   RETRYING ! ..." );
			
			//recursive call - I've found that this load FAILS when Fx is launched/restarted with about 10+ Fx windows opened! 
		    load_file_as_document( x_request, sFileName, callback, iRecursion + 1 );
		};
	};
	
	if( newTest_overrideMimeType ){
		x_request.open("GET", sFileName);
		x_request.overrideMimeType("application/xml"); // AFTER open() !
	}else{ // old way up to Fx 49.*
		x_request.overrideMimeType("application/xml");
		x_request.open("GET", sFileName);
	}
	
	x_request.send();
};


var unloaders       = [];

var bs_recentWindow	= null;

var XUL_main_overlay_doc;


			
var thySelf = this;	

function setStyleSheet(aUrl, aEnable, aMostPriority){
		var sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);

    	var LEVEL_SHEET= aMostPriority===undefined || aMostPriority? sss.AUTHOR_SHEET: sss.USER_SHEET; // poner AGENT_SHEET  p/ Fx59+ ?
    	
    	return do_setStyleSheet( aUrl, aEnable, LEVEL_SHEET, sss);
};
function do_setStyleSheet(aUrl, aEnable, LEVEL_SHEET, sss){
    	try {
    		
    		var uri = Services.io.newURI(aUrl, null, null); //"chrome://myext/content/myext.css"

    		thySelf.myDumpToConsole(" BEGIN: do_setStyleSheet( "+aUrl+", "+aEnable+", "+LEVEL_SHEET+" )" );
    		
    		if( aEnable ){
    			//Note: loadAndRegisterSheet will load the stylesheet *synchronously*, so you should only call this method using *local* URIs.
    			if(!sss.sheetRegistered(     uri, LEVEL_SHEET)){
    				sss.loadAndRegisterSheet(uri, LEVEL_SHEET);
    			};
    		}else{
    			if( sss.sheetRegistered(     uri, LEVEL_SHEET)){
    				sss.unregisterSheet(     uri, LEVEL_SHEET); 
    			};
    		};
    		
    		return true;
    		
    	} catch (ex) {
    		thySelf.debugError(" do_setStyleSheet( "+aUrl+", "+aEnable+", "+LEVEL_SHEET+" )   error: "+ex, ex);
    	};
    	return false;
};


//setTimeout() and clearTimeout() -- needs Firefox 22+!
Cu.import("resource://gre/modules/Timer.jsm");

function resetAddonInfo( _delay = 0 ){
	const addonCss= "chrome://HideCaptionTb/skin/resetAddonInfo.css";
	setTimeout(function(){
		setStyleSheet(     addonCss, true );
		setTimeout(function(){
			setStyleSheet( addonCss, false );
		}, 150);
	}, _delay);
}



var rand= ""; //"?_r="+Math.random(); // to fool cache between disables/enables-addon??
// cuidado con el random! pq en *produccion* me carga OTRAS instancias de las clases vd??

var array_js_names= new Array(
		"HCPlusLib.js"   	+rand,
		"HideCaption.js" 	+rand,
		"HideC_loaderXUL.js"+rand,
		"components/HomeToolbarHandler.js"  +rand,
		);


function startup(aData, aReason) {

	function start_addon( tmpImport ){

		// Put my addon in all browser windows, current and future
		watchWindows(function (window) {

			const is_mostRecentWindow=  window === bs_recentWindow; 
			
			if( window.HCPlusLib ){
				if( is_mostRecentWindow ){
					myDumpToConsole(" mostRecentWindow  already processed, no err." );
					
					return; // RETURN !
				}else{
					debugError(" Ignoring Error:  window.HCPlusLib   ALREADY EXISTS!! ");
				}
			}

			myDumpToConsole(" \n\n\n STARTING for a window!  mostRecent="+is_mostRecentWindow+"  -  title= "+ 
					(window.document? window.document.title: "(no doc)") +" \n\n ");
			
			
			array_js_names.forEach(function( name ){
				try {
					// Components.utils.import         ( "chrome://HideCaptionTb/content/"+name , tmpImport);
					Services.scriptloader.loadSubScript( "chrome://HideCaptionTb/content/"+name , window   ); 
				} catch (ex1) {
					debugError(" Ignoring Error importing "+name, ex1);
				};
			});
			myDumpToConsole("Imported: "+array_js_names);

			/*
			//store in WINDOW
			window.HCPlusLib               			= new tmpImport.HCPlusLib_class          ( window );
			window.HCPlusLib.HcSingleton			= tmpImport.HcSingleton;
			
			if( is_mostRecentWindow ){
				window.HCPlusLib.is_mostRecentWindow_at_statup= true;
				myDumpToConsole(" mostRecentWindow  processed first!" );
			}
			
			window.HideCaption            			= new tmpImport.HideCaption_class        ( window );
			window.HCPlusLib.set_HideCaption();
			
			window.HideCaption.HomeToolbarHandler 	= new tmpImport.HomeToolbarHandler_class ( window );
			*/

			
			// xul documents
			window.HideCaption.XUL_main_overlay_doc  = XUL_main_overlay_doc;
			
			// start!
			window.HideCaption.OnLoad();
			
			
			// >>> UNLOADERS <<<
			//unloaders.push( ... ); // movido al shutdown y uso el wm.enumerator
		});
		
		
		// LAST thing in startup()?
		resetAddonInfo(200);

	};

	
	//  start execution -------------------------------------------------------------------------------------

		// These *ONLY APPEAR* when addon is ACTIVE/ENABLED !!
		const propFile= "chrome://hidecaptiontb/locale/tbird.properties";
		const defBr_hctpId= Services.prefs.getDefaultBranch("extensions.hidecaptionplus-dp@dummy.addons.mozilla.org.");
        // Br_hctpId.setStringPref("name"         , propFile );
        defBr_hctpId.setStringPref("description"  , propFile );
        defBr_hctpId.setStringPref("translator.1" , propFile );
        // console.log( "val stored pref!!: "+Services.prefs.getStringPref("extensions.hidecaptionplus-dp@dummy.addons.mozilla.org.description" ) );

	

	try {
		//LoadDebugFlag();
		
		if(!aData.version ){
			aData.version = hctp_current_version;
		}
		
		myDumpToConsole( "data.installPath: \n     " + (aData.installPath.path? aData.installPath.path : aData.installPath) );
		
		
		Bstrap.startup_reason= aReason;
		Bstrap.startup_reason_APP_STARTUP  = aReason == APP_STARTUP;
		Bstrap.startup_reason_ADDON_UPGRADE= aReason == ADDON_UPGRADE;
		Bstrap.startup_data  = aData;
		

		// pongo esto ahora como LOCAL VAR!!, para asegurar nomas, dps de agregar el RANDOM al url! y dara el error en el DIALOG!! 
		// con HcSingleton.Bstrap NO-existente, pq hace import() con OTRO url! 
		var tmpImport= new Object();
		
		/*
		// This flag BEFORE   H.set_main_styleSheets()
		// REMOVE AUTHOR_LVL for REMOVED moz-document() in Fx 61.0a !!
		HcSingleton.use_AUTHOR_LVL = Services.vc.compare(Services.appinfo.version+"", "60.*" ) <= 0;

		*/
		
		//HcSingleton.set_main_styleSheets( true );  // BEFORE load_xul , for pretty startup lookup!
		var cssFile= "chrome://HideCaptionTb/content/initial.css"
		setStyleSheet( cssFile, true );

		
		// >>> UNLOADERS <<<
		unloaders.push(function(){

			//HcSingleton.hc_shutdown();
						
			//HcSingleton.set_main_styleSheets( false );
			setStyleSheet( cssFile, false );
			
			/*
			// C.u.unload  --- with Array.reverse !
			array_js_names.reverse().forEach(function( name ){
				Components.utils.unload("chrome://HideCaptionTb/content/"+name );
			});
			myDumpToConsole("Unloaded: "+array_js_names);
			*/
		});
		
		
		//new check for fx50 nightly since 2016-jun-16
		if( Services.vc.compare(Services.appinfo.version+"", "49.99") >  0 ){
			newTest_overrideMimeType= true;
		}

		const class_xmlhttprequest= Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'];
		var   x_request = null;
		if( class_xmlhttprequest ){
			x_request = class_xmlhttprequest
				.getService(Components.interfaces.nsIXMLHttpRequest)
				.QueryInterface(Components.interfaces.nsIDOMEventTarget);
		}else{
			Components.utils.importGlobalProperties(["XMLHttpRequest"]);
			
			x_request = new XMLHttpRequest();
		}


		load_file_as_document(     x_request, "chrome://HideCaptionTb/content/overlay.xul"+rand , function(event, xul_document){
			XUL_main_overlay_doc= xul_document;
			
			// START !
			start_addon( tmpImport );
		});
		

	} catch (ex) {
		debugError(" Error at startup() end: ", ex);
	};

} // startup



var func_ww_unregisterNotification= function (){  
	// throw Error("bad ww_unregisterNotification()");   
}

function shutdown(aData, aReason) {
	
	// xx_return; // HARD DISABLED for *HANGING* Pale Moon !
	
	if (aReason != APP_SHUTDOWN) {

		Bstrap.shutdown_reason= aReason;
		Bstrap.shutdown_reason_ADDON_UPGRADE= aReason == ADDON_UPGRADE;
		Bstrap.shutdown_data  = aData;
		Bstrap.is_shutdown    = true;
		
		
		//2nd thing that got executed at shutdown time.
		unloaders.push( function(){
			
			function shutdown_process_window(window){
				if( window.closed ){
					myDumpToConsole("   window.closed="+window.closed+"  -  skipping.  (no erro?)" );
					return;
				}
				if( !window.HCPlusLib ){
					debugError(" Ignoring Error:  window.HCPlusLib   Doesn't EXIST anymore!! ");
					return; // RETURN;
				}

				//mostRecent="+is_mostRecentWindow_shutdown+"
				myDumpToConsole(" \n\n\n SHUTDOWN:  process window, title= "+(window.document? window.document.title: "(no doc)") +" \n\n ");

				window.HideCaption.hc_shutdown();
				window.HCPlusLib  .hc_shutdown();
				
				// delete window.HideCaption; // TypeError: property "HideCaption" is non-configurable and can't be deleted 
				// delete window.HCPlusLib;
				window.HideCaption = undefined;
				window.HCPlusLib   = undefined;
			}

			
			let windows = Services.wm.getEnumerator(null);
			while (windows.hasMoreElements()) {
				let window = windows.getNext();
				if (window.document.readyState == "complete"){
					let documentElement = window.document.documentElement;
					if (documentElement.getAttribute("windowtype") == "mail:3pane"){
						shutdown_process_window(window);
					}
				}// else runOnLoad() .. noup, of course.
			}
		});
		
		//1st thing that got executed at shutdown time.
		unloaders.push( func_ww_unregisterNotification ); 

		myDumpToConsole( " BEGIN shutdown() - I'll call these functions: " );
		
		unloaders.reverse().forEach(function (f) { // reverse() so unload FIRST the unreg. of window-listener!!, and so on 
			try {
				myDumpToConsole( "boots. >>>>  " + (""+f).replace( /error/gi, "Err[censored]r") );
				f();
			} catch (ex) {
				debugError(" Ignoring Error at shutdown() function.   ex= "+ex, ex);
			};
		});
	};

	resetAddonInfo(400);
	
}


function install  (aData, aReason) { ;}
function uninstall(aData, aReason) { ;}


/* Code from: https://github.com/Mardak/restartless/blob/watchWindows/bootstrap.js */

function watchWindows(callback) {
	// Wrap the callback in a function that ignores failures
	function watcher(window) {
		try {
			// Now that the window has loaded, only handle browser windows
			let documentElement = window.document.documentElement;
			//console.log("====== 3   windowtype: "+ documentElement.getAttribute("windowtype"));
			if (documentElement.getAttribute("windowtype") == "mail:3pane")
				callback(window);
		}catch(ex) {
			debugError(" Ignoring Error at watcher(): ", ex);
		};
	}

	// Wait for the window to finish loading before running the callback
	function runOnLoad(window) {
		// Listen for one load event before checking the window type
		window.addEventListener("load", function runOnce() {
			window.removeEventListener("load", runOnce, false);
			watcher(window);
		}, false);
	}

	// put addon objs to this window
	function process_window(window) {
		// Only run the watcher immediately if the window is completely loaded
		if (window.document.readyState == "complete")
			watcher(window);
		// Wait for the window to load before continuing
		else
			runOnLoad(window);
	}


	// process the MostRecentWindow first!! ----------------------------------------------- 
	bs_recentWindow = Services.wm.getMostRecentWindow("mail:3pane");
	if( bs_recentWindow ){
		process_window(bs_recentWindow);
	}
	else{
		myDumpToConsole(" (err)  getMostRecentWindow() bad retvalue?:  "+bs_recentWindow);
	}

	// Add functionality to existing windows
	let windows = Services.wm.getEnumerator(null);
	while (windows.hasMoreElements()) {
		let window = windows.getNext();
		process_window(window);
	}

	//Watch for new browser windows opening then wait for it to load
	function windowWatcher(subject, topic) {
		if (topic == "domwindowopened")
			runOnLoad(subject);
	}

	Services.ww.registerNotification(windowWatcher);

	func_ww_unregisterNotification= function(){ Services.ww.unregisterNotification(windowWatcher); }
	//unloaders.push( ); // moved to 1st THING of shutdown()
};

