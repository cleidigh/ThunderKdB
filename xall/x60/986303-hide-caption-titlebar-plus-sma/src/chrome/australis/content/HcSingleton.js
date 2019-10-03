
"use strict";

var EXPORTED_SYMBOLS = ["HcSingleton"];


var HcSingleton= new (function HcSingleton_class(){
	
	const Cu = Components.utils;

	// Services -- NOT importing directly bc of error in "...drawInTitlebar"'s timeout-at-shutdown.  
	const  tmpImport_Svc= {};
	Cu.import("resource://gre/modules/Services.jsm", tmpImport_Svc);
	const Services= tmpImport_Svc.Services;


	const thySelf= this;
	

	
	this.hctp_current_version = "4.2.0";
	
	

	//  CustomizableUI ------------------------------------------------------------------
	var CustomizableUI= null;

   	try {
		Cu.import("resource:///modules/CustomizableUI.jsm", tmpImport_Svc);
		CustomizableUI= tmpImport_Svc.CustomizableUI;
	} catch (ex) {
   		// TODAVIA NO ESTA esta VAR/FUNCION!   //thySelf.Bstrap.debugError(" IGNORING error in import CustomizableUI.    Error: "+ex, ex);
		Services.console.logStringMessage(" IGNORING error in import CustomizableUI.    Error: "+ex, ex)
	};
    
	// Will return FALSE for eg. PALE MOON 27.*
	this.get_CustomizableUI= function() {
		return CustomizableUI;
	};
	
	
	//setTimeout() and clearTimeout() -- needs Firefox 22+!
	Cu.import("resource://gre/modules/Timer.jsm");


	var initial_drawInTitlebar= true; 
	
	
	var hc_localeStrBundle= null;
	
	
	this.isReleaseVersion= true;
	
	this.smallBars_FxVer_prefix= "unknownFxVer";
	this.isFx40orLater         = false;
	this.isFx41orLater         = false;
	this.isFx47orLater         = false;
	this.isFx57orLater         = false;
	this.isFx58orLater         = false;
	
	this.startup_time	= -1;
	
	
	function deleteById(_id, _doc){
		const theElem= _doc.getElementById(_id);
		if( theElem && theElem.parentNode ){
    		theElem.parentNode.removeChild(theElem);
		}
	};
	
	//STARTUP -- after xul_docs loaded
	this.hc_startup= function() {
    
		const hctp_version= ""+thySelf.Bstrap.startup_data.version;
		thySelf.isReleaseVersion= !(/\D/.test( hctp_version.replace(/\./g, "") )); // NOT-release-ver if NO-DIGIT (\D) found
		
		
		initial_drawInTitlebar= Services.prefs.getBoolPref( "browser.tabs.drawInTitlebar" );

		
		// delete forbidden elems!
		DynBars_delete_forbidden_elems();

		// delete elems!
		FloatBars_delete_elems();


		// prepare localized strings in my XUL items
		do_strings_locale( thySelf.XUL_main_overlay_doc );  // uses Fx's own properties file. 

		// my own locale strings!!
		hc_localeStrBundle= Services.strings.createBundle("chrome://HideCaptionPlus/locale/main.properties");

		
		// small tabs - remove BETA values!
		thySelf.change_prefValue_char("plus.style.small_tabs", "small_tabs_40_BETA", "always"              );
		thySelf.change_prefValue_char("plus.style.small_tabs", "small_tabs_50_BETA", "small_tabs_30_almost");
		
		
		/*** NO funciona con DefaultBranch en Fx45 ... (y no se si al final eso sigue siendo 'oficial')
		const defBr_hctpId= Services.prefs.getDefaultBranch("extensions.hidecaptionplus-dp@dummy.addons.mozilla.org.");
        thySelf.setUniCharPref("name"       , 'HCTP '+thySelf.main_GetStringFromName("newversion_mainAction"), defBr_hctpId );
        thySelf.setUniCharPref("description", new Date()+' 255 Jua1'+thySelf.main_GetStringFromName("newversion_msg"), defBr_hctpId );
        thySelf.myDumpToConsole( "val stored pref!!: "+thySelf.getUniCharPref("extensions.hidecaptionplus-dp@dummy.addons.mozilla.org.description", Services.prefs ) );
		***/
        
		// ¡¡Persisted Attributes: LOAD (STORE) also into BOTH XUL DOCUMENTS loaded!!
		thySelf.attrs_loadAll( thySelf.XUL_main_overlay_doc   );
		thySelf.attrs_loadAll( thySelf.XUL_floatbars_over_doc );

		
		
		if( CustomizableUI ){
			CustomizableUI.addListener   ( thySelf.customizeObserver );
		}
		
		// MAIN widgets! (not floatbars')
		thySelf.createOrDestroy_widgets_fromXUL( thySelf.XUL_main_overlay_doc, true );


		// floatbarsGlobal_init(): DON'T call it HERE, so I can have same behavior as when ENABLING manually this ADDON
		//   (was tested to call it BEFORE windows are opened, bc "personal-bookmarks" were blank! (needed the call (per window) to: window.PlacesToolbarHelper.customizeDone())
		
		// ... was moved at BEGGINING of floatbars_enable...whatever()  
		// zz_thySelf.floatbarsGlobal_init();

		
		thySelf.smallBars_FxVer_prefix= "old/fx29_"; // minimum version supported! 
		if( Services.vc.compare(Services.appinfo.version+"", "39.99") > 0 ){ // It's 40 or more!!
			thySelf.smallBars_FxVer_prefix= ""; // fx40 (for windows!) used in CURRENT FILES (non prefixed)  
			if( thySelf.getPlatform_app() != "windows" ){ // LINUX and MAC
				thySelf.smallBars_FxVer_prefix= "linux_"; // fx40 (for LINUX is different! + add Mac here too)
			}
			thySelf.isFx40orLater         = true;
		}
		if( Services.vc.compare(Services.appinfo.version+"", "40.99") > 0 ){	thySelf.isFx41orLater         = true;	}
		if( Services.vc.compare(Services.appinfo.version+"", "46.99") > 0 ){	thySelf.isFx47orLater         = true;	}
		if( Services.vc.compare(Services.appinfo.version+"", "56.*" ) > 0 ){	thySelf.isFx57orLater         = true;	}
		thySelf.isFx58orLater = Services.vc.compare(Services.appinfo.version+"", "57.*" ) > 0;

		const mainWin= thySelf.XUL_main_overlay_doc.getElementById("main-window");
		// Fx57+
		mainWin.setAttribute( "hctp_isFx57plus", ""+thySelf.isFx57orLater );
		
		
		// prefs -------------------------------------------------------------

    	//   prefCss_list
    	this.prefCss_list.forEach(function( prefCss ){
    		prefCss.startup();
		});

		/***  // lo dejo activo en HCPlusLib ...
		var prefName_intFlags = "extensions.hide_caption.plus.z_sys.intFlags";
		// set init values;
		thySelf.DynElemSettings.init( Services.prefs.prefHasUserValue( prefName_intFlags ) ? 
		                              Services.prefs.getCharPref     ( prefName_intFlags ) : "" );
		***/
    };

	// --------------------------------------------------------------------------------

	//SHUTDOWN
	this.hc_shutdown= function() {

    	//1st destroy these widgets, etc
    	thySelf.floatbarsGlobal_Disable();
    	
		if( CustomizableUI ){
			CustomizableUI.removeListener( thySelf.customizeObserver );
		}
		
    	this.sheet_list.forEach(function( sheet ){
    		sheet.resetStyleSheet();
		});

    	//   prefCss_list
    	this.prefCss_list.forEach(function( prefCss ){
    		prefCss.reset();
		});
    	
    	//DESTROY !
    	thySelf.createOrDestroy_widgets_fromXUL( thySelf.XUL_main_overlay_doc, false );

    	// Hay q hacer segun:  http://maglione-k.users.sourceforge.net/bootstrapped.xhtml
    	// No haria flush en todo el sistema? no se podria usar una instancia PROPIA de Services?  
    	Services.strings.flushBundles();
    	
    	
    	thySelf.myDumpToConsole( "  shutdown_reason_ADDON_UPGRADE: " + thySelf.Bstrap.shutdown_reason_ADDON_UPGRADE );
    	if( !thySelf.Bstrap.shutdown_reason_ADDON_UPGRADE ){
    		//fix last gap-in-top
    		Services.prefs.setBoolPref( "browser.tabs.drawInTitlebar", !initial_drawInTitlebar );
    	}
		setTimeout(function(){
			Services.prefs.setBoolPref( "browser.tabs.drawInTitlebar",  initial_drawInTitlebar );
		}, 100);

    };

	
	this.getPlatform_app=  function(){
			try{
				const navigator= Services.appShell.hiddenDOMWindow.navigator;  // uses  ** hiddenDOMWindow ** !
				
				var _oscpu   = (""+navigator["oscpu"]).toLowerCase();  //navigator.oscpu could bring undefined warn/error?
				var platform = (""+navigator.platform).toLowerCase();

				var retVal= "unknown";
				
				if(       _oscpu.indexOf("windows") >= 0 || platform.indexOf("win32") >= 0 ){  // windows...
					retVal= "windows"; // put -linux- here for a nice devel hack 
				}else if( _oscpu.indexOf("linux")   >= 0 || platform.indexOf("linux") >= 0 ){  // linux...
					retVal= "linux";
				}else if(                                   platform.indexOf("mac")   >= 0 ){  // mac .. _oscpu.indexOf("mac??darwin??")   >= 0 || 
					retVal= "mac"; //TODO -- NOT TESTED yet in mac
				}
				//thySelf.myDumpToConsole( "   ... getPlatformPlus() -> "+retVal );
				return retVal;
			}catch(ex){ thySelf.debugError("error: "+ex, ex);  }
			return "(error)";
	};

    
	// GetStringFromName --------------------------------------
	this.main_GetStringFromName= function( code ) {
		return thySelf.main_GetStringFromName__internal( code, hc_localeStrBundle );
	};
	this.main_GetStringFromName__internal= function( code, _arg_localeStrBundle ) {
    	
    	try {
    		return _arg_localeStrBundle.GetStringFromName( code );
		} catch (ex) {
    		thySelf.debugError(" ignoring error in main_GetStringFromName( "+code+" )    error: "+ex, ex);
    		return "  (Couldn't get message text for '"+code+"') ";
		};
		//  falta este:                   formatStringFromName("sss")  --> %S, %1, %2, etc 
    },

	this.special_getStringFromName__newversion_msg__ALL= function( _my_localeStrBundle ) {
		if(!_my_localeStrBundle){
			_my_localeStrBundle= hc_localeStrBundle;
		}
		return "" + 
			thySelf.main_GetStringFromName__internal( "newversion_msg"  , _my_localeStrBundle ) + 
			thySelf.main_GetStringFromName__internal( "newversion_msg_2", _my_localeStrBundle ) + 
			thySelf.main_GetStringFromName__internal( "newversion_msg_3", _my_localeStrBundle ) ;
	};


    
    // Attribs - storage:  BEGIN ---------------------------------------------------------------------------------------------------
    
    this.Attrs_storage= new (function(){
    	
    	var persistedAttrs= {};
    	
    	var pref_key= "extensions.hide_caption.plus.x_persist.attrs";
    	
        this.loadOrSave= function( bLoad ){
        	if( bLoad ){
        		if( Services.prefs.prefHasUserValue(pref_key) ){
        			persistedAttrs= JSON.parse( Services.prefs.getCharPref(pref_key) );
        		}else{
        			persistedAttrs= {};
        		}
        	}else{ // save!
            	Services.prefs.setCharPref(pref_key, JSON.stringify(persistedAttrs));
        	}
        },
        this.persist= function( id, aName, aValue ){
    		thySelf.myDumpToConsole("   attr,  doing:  persist( "+id+", "+aName+", "+aValue+" )");
    		
        	var oAttrs= persistedAttrs[ id ];
        	if(!oAttrs ){
        		oAttrs= {};
            	persistedAttrs[ id ]= oAttrs;
        	}
        	oAttrs[aName]= aValue;
        },
        this.retrieve= function( id, aName ){
        	var oAttrs= persistedAttrs[ id ];
        	return oAttrs? oAttrs[aName]: undefined;
        },
        this.get_persistedAttrs= function(){
        	return persistedAttrs;
        },
        this.forEach= function( callback ){
        	for( var sId in persistedAttrs ){
            	var oAttrs= persistedAttrs[ sId ];
        		for( var aName in oAttrs ){
            		callback( sId, aName, oAttrs[aName] );
        		}
        	}
        },

        
        this.persist_fromDoc= function( id, aName,         _document ){
    		var elem = _document.getElementById(id);
    		if( elem ){
    			var val= "_NULL_";
    			if( elem.hasAttribute(aName) ){
        			val= elem.getAttribute(aName);
    			}
        		this.persist( id, aName, val );
    		}
        },
        this.load_toDoc     = function( id, aName, aValue, _document ){
    		var elem = _document.getElementById(id);
    		if( elem ){
            	if( aValue == "_NULL_" ){	elem.removeAttribute(aName, aValue);
            	}else{                   	elem.setAttribute   (aName, aValue);
            	}
    		}
    		thySelf.myDumpToConsole("   attr,  doing:  load_toDoc( "+id+", "+aName+", "+aValue+", .. )"+(!elem? "   (elem not found)":""));
        };
        
    })();  // new this.Attrs_storage()
    
    
    this.attrs_persistAll= function( _document ){
    	
    	//1) float bars  collapsed
		var foreign_hctpToolbox= thySelf.XUL_floatbars_over_doc.getElementById("hctp-toolbox");
		if( foreign_hctpToolbox ){
			Array.slice(foreign_hctpToolbox.childNodes).forEach(function(foreign_hToolbar){
			
				thySelf.Attrs_storage.persist_fromDoc(     foreign_hToolbar.id, "collapsed", _document );
				
				if( !CustomizableUI &&
				    Services.appinfo.ID   == "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}" ){ // make sure this ONLY for PaleMoon!
					thySelf.Attrs_storage.persist_fromDoc( foreign_hToolbar.id, "currentset", _document );
				}
			});
		}

		//2) resizable width
		thySelf.Attrs_storage.persist_fromDoc( "hcp-web-title-label1", "width", _document );

		
		thySelf.Attrs_storage.loadOrSave( false );
    	
    	//thySelf.Attrs_storage.forEach( function(id, aName, aValue){
    	//});
    	
		//thySelf.setAttrs_smart2( xul_doc, "spring"   , ["label","title"], "[h] "+custTbarBundle.GetStringFromName("springTitle")   );

		
		// ¡¡LOAD (STORE) also into BOTH XUL DOCUMENTS loaded!!
		thySelf.attrs_loadAll( thySelf.XUL_main_overlay_doc   );
		thySelf.attrs_loadAll( thySelf.XUL_floatbars_over_doc );
    },
    
    this.attrs_loadAll= function( _document ){
    	
		thySelf.Attrs_storage.loadOrSave( true );

		thySelf.Attrs_storage.forEach( function( id, aName, aValue){
			thySelf.Attrs_storage.load_toDoc( id, aName, aValue, _document );
		});
    },
    
    // Attribs - storage:  END ---------------------------------------------------------------------------------------------------
    
    // called BEFORE hc_startup()!!
    this.set_main_styleSheets= function( bEnable ){

    	if(!thySelf.startup_time || thySelf.startup_time < 0 ){
        	thySelf.startup_time= new Date().getTime();
    	}
    	
	    thySelf.setStyleSheet_plus( "chrome://hidecaptionplus_fx/skin/level_ag.css" , bEnable, { level_Agent:  true } );
	    thySelf.setStyleSheet_plus( "chrome://hidecaptionplus_fx/skin/level_us.css" , bEnable, { level_User:   true } );
	    thySelf.setStyleSheet_plus( "chrome://hidecaptionplus_fx/skin/level_au.css" , bEnable, { level_Author: true } );
    },

	this.HcSheet_class= function() {
    	var last_sheet= null;
    	
    	this.setStyleSheet  = function(aUrl){ // ENABLES sheet!
    		if( last_sheet === aUrl ){
        		thySelf.myDumpToConsole(" HcSheet.setStyleSheet( "+aUrl+" )  ->  same url, skipping." );
    			return true ; // RETURN!
    		}
    		
    		this.resetStyleSheet();  //last_sheet= null;
    		if( aUrl       != null ){   if( thySelf.setStyleSheet( aUrl      , true ) ){  last_sheet= aUrl;  }else{	 return false;  } // false == error happened!	
    		}
    		return true;
    	};
    	this.resetStyleSheet= function(){ // DISABLES sheet!
    		if( last_sheet != null ){       thySelf.setStyleSheet( last_sheet, false);   }
    		last_sheet= null;
    	};
    };

    
	//MAIN sheet list!
    this.sheet_list= new Array();
    
    //is.sheet_list.push( this.Small_Tabs_sheet     = new this.HcSheet_class() ); // using PrefWithCss_class !
    this.sheet_list.push( this.Small_Toolbars_sheet = new this.HcSheet_class() );
    
    this.sheet_list.push( this.FloatBars_sheet      = new this.HcSheet_class() );
    this.sheet_list.push( this.TBoxHide_sheet       = new this.HcSheet_class() );
    
    this.sheet_list.push( this.VerticalMaxim_sheet  = new this.HcSheet_class() );
    
    
	// -------------
	
	this.replace_dirs= function( myFile ) {
		//HCPlusLib.load_osfile_module();
		if( !thySelf.OS ){
			Cu.import("resource://gre/modules/osfile.jsm", thySelf);
			if( !thySelf.OS ){
				throw "no [thySelf.OS]!!";
			}
		}
		
		const real_homeDir= thySelf.OS.Path.toFileURI(thySelf.OS.Constants.Path.homeDir); 
		myFile = (""+myFile).replace("{%homeDir%}"  , real_homeDir);
		myFile =     myFile .replace("{%configDir%}", real_homeDir); // for now, USING HOMEDIR for the Future CONFIGURABLE directory!!! 
		return   myFile; 
	};
	
    function getFirstWord(_val){
		return (""+_val).trim().split(/\s+/,1)[0]; // get first word
    }
	this.hc_getFirstWord = function(_val){
		return getFirstWord(_val);
	};
	
	this.hasWord = function( _str, _word){
		const _retVal= (""+_str).indexOf(_word) >= 0;
		//thySelf.myDumpToConsole("   hasWord("+_str+" , "+_word+")  returns -> "+_retVal );
		return _retVal;
	};

    
	this.customMmc_path= "{%configDir%}/Documents/hctp_config/mmc/";
	
	this.PrefWithCss_class = function( _prefName, _prefix_path, _defaultVal, _mapObj ){

		const hcSheet = new thySelf.HcSheet_class();

		this.honorPref= function( _val ) {
			var _val_original= _val;
			
			if( _val == "none" || _val == "no" ){
				hcSheet.setStyleSheet( null );
				return;
			}
			if( _mapObj && _mapObj[_val] ){
				_val= _mapObj[_val];
			}
			
			_val= getFirstWord(_val);
			
			// use CUSTOM DIR !!!
			var  file_fullPath= "chrome://hidecaptionplus_fx/skin/"+_prefix_path+""+_val+".css";
			if( (""+_val_original).indexOf("customMmc") >= 0 ){ // dps vendran otros tipo customImg, customFx, etc
				file_fullPath= thySelf.customMmc_path + _val + ".css"
				file_fullPath= thySelf.replace_dirs(file_fullPath);
			}
			
			if(!hcSheet.setStyleSheet( file_fullPath ) ){
	    		thySelf.myDumpToConsole("   warn:  FAILED to setStyle, attempting default! ");
				_val= _defaultVal; 
				_val= getFirstWord(_val);
				hcSheet.setStyleSheet( "chrome://hidecaptionplus_fx/skin/"+_prefix_path+""+_val+".css" );
			}
		};

		this.startup = function() {
			// assuming pref is of STRING type! (should be for a dynamic css file!)
			var pref_value= _defaultVal;
			var pref_name = "extensions.hide_caption." + _prefName;
			if( Services.prefs.prefHasUserValue(        pref_name ) ){
				pref_value= Services.prefs.getCharPref( pref_name );
			}
			this.honorPref( pref_value );
		};

		this.reset   = function() {
			hcSheet.resetStyleSheet();
		};
		
		this.get_name      = function() {	return _prefName;   };
		this.get_defaultVal= function() {	return _defaultVal; };
	};

	
    this.prefCss_list= new Array();
    
	// minmaxclose_buttons_skin
    this.prefCss_list.push(  this.MmcButtons_skin  =  new this.PrefWithCss_class( "plus.adv.minmaxclose_buttons_skin",   "mmc/" ,  "w10like  theme"	) );
    // small_tabs
    this.prefCss_list.push(  this.Pref__small_tabs =  new this.PrefWithCss_class( "plus.style.small_tabs"			 ,   "tabs/",  "no"	          , {always: "small_tabs_20"}  ) );
    
    
    
	this.customStyles_path= "{%configDir%}/Documents/hctp_config/my_styles/";
	
	const LIST_MAX_LEN= 300;
	
	this.Pref_CustomCss_class = function( _prefName, _prefix_path, _defaultVal, _useHomeDir ){

		var old_values= "";
	
		this.honorPref= function( _values ) {

			_values= (_values+"").trim();
		
			this.reset();

			old_values= _values;
			
			setStyles_commaSeparated(    _values, true  );
		};

		
		var setStyles_commaSeparated= function( _values, bSet ) {

			var errFiles= "";
			
			if( _values.length > LIST_MAX_LEN ){
				_values= _values.substring(0, LIST_MAX_LEN);
				errFiles += "  (max length is "+LIST_MAX_LEN+", extra chars discarded)   ";
			}

			var arrValues= _values.split(",");
			
			arrValues.forEach( function (_val){
				
				_val= (_val+"").trim();
				if( _val.length == 0 ){
					thySelf.myDumpToConsole(" setStyles...():  IGNORING whitespace element. " );
					return;
				}
				if( _val.indexOf(".") < 0 ){
					_val += ".css";
				}
				
				var  file_fullPath= "chrome://HideCaptionPlus/skin/"+_prefix_path+""+_val; // use GLOBAL skin directory !
				if( _useHomeDir ){ // User Home Dir !!
					file_fullPath= thySelf.customStyles_path + _val;
					file_fullPath= thySelf.replace_dirs(file_fullPath);
				}
				
				const wasOK = thySelf.setStyleSheet( file_fullPath, bSet );
				if( bSet && !wasOK ){ // using wasOK for AVOIDING side-efeccts (like NO calling the function)
					errFiles += "\""+_val+"\"   ";
				}
			});
			
			if( bSet ){
				if( errFiles.length > 0 ){
					thySelf.myDumpToConsole(" setStyles...():   errFiles = "+errFiles );
				}
				// set pref !! (user could introduce UNICODE chars!!!)
				thySelf.setUniCharPref( "extensions.hide_caption." + _prefName + "_failed", errFiles , Services.prefs );
			}
		};

		this.startup = function() {
			// assuming pref is of STRING type! (should be for a dynamic css file!)
			var pref_value= _defaultVal;
			var pref_name = "extensions.hide_caption." + _prefName;
			if( Services.prefs.prefHasUserValue(        pref_name ) ){
				pref_value= thySelf.getUniCharPref( pref_name, Services.prefs ); // support UNICODE !!!
			}
			this.honorPref( pref_value );
		};

		this.reset   = function() {
			setStyles_commaSeparated( old_values, false );
			old_values= "";
		};
		
		this.get_name      = function() {	return _prefName;   };
		//is.get_defaultVal= function() {	return _defaultVal; };
	};

	// minmaxclose_buttons_skin
    this.prefCss_list.push(  this.CustomStyles_homeDir =  new this.Pref_CustomCss_class( "plus.style.customCss_homeDir",   "(UNUSED)/" ,  "", true ) );

    //is.prefCss_list.push(  this.CustomStyles_inside  =  new this.Pref_CustomCss_class( "plus.style.customCss_inside" ,   "cust_styles/" ,  "", false ) );
	
    
	// StyleSheetService ------------------------------------------------------------------------------
    
	this.get_StyleSheetService= function() {
		return thySelf.Bstrap.Cc["@mozilla.org/content/style-sheet-service;1"].getService(thySelf.Bstrap.Ci.nsIStyleSheetService);
	};
	
	// aProps  example:  { level_Agent: true } 
	this.setStyleSheet_plus= function(aUrl, aEnable, aProps){
		var sss = thySelf.get_StyleSheetService();
    	
		//  USER_SHEET has MORE priority!? (come after AGENT_... in the queue), but AUTHOR has even more right? , (check prededence for !important rules...) 
		var LEVEL_SHEET=  aProps.level_Agent? sss.AGENT_SHEET: (aProps.level_Author? sss.AUTHOR_SHEET: sss.USER_SHEET); // poner AGENT_SHEET  p/ Fx59+ ?
    	
		return thySelf.do_setStyleSheet( aUrl, aEnable, LEVEL_SHEET, sss);
    };
    this.setStyleSheet=      function(aUrl, aEnable, aMostPriority){
		var sss = thySelf.get_StyleSheetService();

    	var LEVEL_SHEET= aMostPriority===undefined || aMostPriority? sss.AUTHOR_SHEET: sss.USER_SHEET; // poner AGENT_SHEET  p/ Fx59+ ?
    	
    	return thySelf.do_setStyleSheet( aUrl, aEnable, LEVEL_SHEET, sss);
    };

    this.do_setStyleSheet=   function(aUrl, aEnable, LEVEL_SHEET, sss){
    	try {
    		var ios = thySelf.Bstrap.Cc["@mozilla.org/network/io-service;1"].getService(thySelf.Bstrap.Ci.nsIIOService);
    		var uri = ios.newURI(aUrl, null, null); //"chrome://myext/content/myext.css"

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

    
    // Misc --------------------------------------------------
    
    //prefs handling...
    this.change_prefValue_char= function( _pName, oldVal, newVal ){
		var pref_name = "extensions.hide_caption." + _pName;
		if( Services.prefs.prefHasUserValue( pref_name ) && 
			Services.prefs.getCharPref     ( pref_name ) == oldVal ){
			Services.prefs.setCharPref     ( pref_name, newVal );
		}
    };
    
    
    // Used in close-with-history ...
    this.PgHistory= new (function(){
    	
    	this.mainAction;

    	this.set_lineScan= function(_lnScan) {
        	this.lineScan  = _lnScan;
        		
        	this.ls_scanFull= this.lineScan.indexOf("scanFull") >= 0;
        	this.ls_hcLine  = this.lineScan.indexOf("hcLine")   >= 0  || this.ls_scanFull; // include scanFull !
		};
		// set init values;
		this.set_lineScan("");
		
    })();

	
	// Used in Hc_SpecialEvent ... (etc?)
    this.DynElemSettings= new (function(){
    	
		var this_dynElSet= this;
		
		var my_prefValue= "";
		
		function setFlag( _myflag ){
			var _val= my_prefValue.indexOf(""+_myflag) >= 0;
        	this_dynElSet[""+_myflag]= _val;
			if(_val){
				thySelf.myDumpToConsole("  Found!: ["+_myflag+" = "+_val+"]");
			}
		};
		
    	this.init= function(_prefValue) {
			my_prefValue= ""+_prefValue;
			
			new Array("D","F","M","U").forEach( (_ParentID) => {  // Dynbars, Float, Mmc, floatmenU ...
				new Array("Block","Retain").forEach( (suffix) => {
					setFlag(_ParentID+"_ctrl"      +suffix);
					setFlag(_ParentID+"_scrollLock"+suffix);
				})
			})
		};
		
    })();
	
    
    // GENERAL SETTINGS!!
    this.Settings= new (function(){
    	
    	this.btt_blockFirst= false;
    	this.btt_never     = false;

    })();
    
    
    // Customize --------------------------------------------------

	// widgets!
	this.createOrDestroy_widgets_fromXUL= function( xul_doc, bCreate ){
		var special_palette= xul_doc.querySelector("hctp_special_palette"); //selector tagName
		if( special_palette ){
			Array.slice(special_palette.childNodes).forEach(function(hItem){
				thySelf.createWidget_fromNode(hItem, bCreate);
			});
		}else{
			thySelf.debugError("  Error?:  NOT FOUND special_palette.   xul_doc= "+xul_doc );
		}
	},
	
	this.createWidget_fromNode= function( foreign_node, bCreate ){

		var _id= foreign_node.id;
		if( _id === undefined ){ // TEXT nodes were coming here ...
			thySelf.debugError(
					"    IGNORING Error in  Doing:  createWidget_fromNode: "+ _id +" \n " +
					"       foreign_node= "+foreign_node+"  "+foreign_node.tagName+" \n " +
					"       parent= "+foreign_node.parentNode);
			return;
		}
		
		if( !thySelf.get_sys_DynamicBars_enable() ){
			if( DynBars_widgets.indexOf(_id) >= 0 ){ // if found, SKIP it!
				thySelf.myDumpToConsole("    createWidget():  SKIPPING for: "+ _id +"");
				return; // RETURN !!
			}
		}

		if( bCreate ){
			//CREATE!

			try {
				if( CustomizableUI ){
					thySelf.myDumpToConsole("    Doing:  createWidget(): "+ _id +"");
					var dataWidget = {
						id: _id,
						type: "custom",
						onBuild: function (_doc) {
							var node = _doc.importNode( foreign_node, true );
							//zznode.id= _id;
							return node;
						}
					};
					var defArea= foreign_node.getAttribute("h_defaultArea");
					if( defArea && defArea.trim().length > 0 ){
						dataWidget.defaultArea= defArea;
						thySelf.myDumpToConsole("                        ... defaultArea=["+defArea+"]");
					}
					CustomizableUI.createWidget( dataWidget );
				}else{
					// thySelf.myDumpToConsole(" err   Doing:  createWidget(): "+ _id +"");
				}
				
				//TODO: guardar flag en (por ej):  foreign_node.widgetCreated= _id; ??? 
				//xxxx; thySelf.widgetIdList.push( _id );

			} catch (ex) {
				thySelf.debugError(" ignoring error:   createWidget_fromNode( "+foreign_node+"   id="+_id+" )  (maybe It already exists?)    error: "+ex, ex);
			};

		}else{ 
			// DESTROY!

			try {
				if( CustomizableUI ){
					thySelf.myDumpToConsole("    Doing:  destroyWidget(): "+ _id +"");
					CustomizableUI.destroyWidget(_id);
				}
			} catch (ex) {
				thySelf.debugError(" ignoring error:   in destroyWidget( id="+_id+" )    error: "+ex, ex);
			};
		};
	},

	
	this.floatbars_initd= false;

	// enable
	this.floatbarsGlobal_init= function(){
		
		if( thySelf.floatbars_initd ){
			thySelf.myDumpToConsole("    ....  floatbarsGlobal_init():  It's already done. ---------------- \n ");
			return;
		}
		
		// widgets!
		thySelf.createOrDestroy_widgets_fromXUL( thySelf.XUL_floatbars_over_doc, true );

		
		// registerArea
		var foreign_hctpToolbox= thySelf.XUL_floatbars_over_doc.getElementById("hctp-toolbox"); //byId
		if( foreign_hctpToolbox ){
			Array.slice(foreign_hctpToolbox.childNodes).forEach(function(foreign_hToolbar){
				var toolbar_id= foreign_hToolbar.id;
				
				thySelf.myDumpToConsole("  Doing:  registerArea: "+ toolbar_id +"   ");
				var props= { };
				var _defaultPlacements= (""+foreign_hToolbar.getAttribute("hc_defaultPlacements")).trim();
				if( _defaultPlacements.length > 0 ){
					props.defaultPlacements= _defaultPlacements.split(","); // to array!
					
					thySelf.myDumpToConsole("      ....  defaultPlacements: "+props.defaultPlacements+"   len: "+props.defaultPlacements.length );
				}
				//registerArea() complaints if defaultCollapsed=true
				if( (""+foreign_hToolbar.getAttribute("hc_defaultCollapsed" )) == "false" ){
					props.defaultCollapsed= false;
				}

				if( CustomizableUI ){
					try {
						CustomizableUI.registerArea( toolbar_id, props );
					} catch (ex1) {
						thySelf.debugError("  Error: in registerArea(), will retry!:  "+ex1, ex1);
						
						CustomizableUI.registerArea( toolbar_id, { } );
					};
				}
			});
		}else{ //!foreign_hctpToolbox 
			thySelf.debugError("  Error?:  NOT FOUND foreign_hctpToolbox ");
		}
		
		
		thySelf.floatbars_initd= true;
		
		thySelf.myDumpToConsole("    END:  floatbarsGlobal_init(): (one time only!) --------------------------------- \n ");
	},

	// disable
	this.floatbarsGlobal_Disable= function(){
		
		if( !thySelf.floatbars_initd ){
			thySelf.myDumpToConsole("    ....  floatbarsGlobal_Disable():  It's already done. ---------------- \n ");
			return;
		}
		
		try {
			// unregisterArea
			var foreign_hctpToolbox= thySelf.XUL_floatbars_over_doc.getElementById("hctp-toolbox"); //byId
			if( foreign_hctpToolbox ){
				Array.slice(foreign_hctpToolbox.childNodes).forEach(function(foreign_hToolbar){
					var toolbar_id= foreign_hToolbar.id;
					
					if( CustomizableUI ){
						thySelf.myDumpToConsole("    Doing:  unregisterArea: "+ toolbar_id +"");

						CustomizableUI.unregisterArea( toolbar_id );
					}
				});
			}else{ //!foreign_hctpToolbox 
				thySelf.debugError("  Error?:  NOT FOUND foreign_hctpToolbox ");
			}
		} catch (ex) {	thySelf.debugError(" Ignoring error: "+ex, ex);	}
		

		// DESTROY widgets!
		thySelf.createOrDestroy_widgets_fromXUL( thySelf.XUL_floatbars_over_doc, false );

		
		//TODO:  reset menu location here??
		
		
		thySelf.floatbars_initd= false;
		
		thySelf.myDumpToConsole("    END:  floatbarsGlobal_Disable(): (one time only!) --------------------------------- \n ");
	},

	
	// CLASS Hc_Timeout  --------------------------------------------------------
	this.Hc_Timeout= function(){

		var removeTimeout= null;
		
		this.isWaiting= function() {
			return !!removeTimeout;
		};

		this.clear_removeTimeout= function(){
			if (removeTimeout) {
				clearTimeout(removeTimeout);
				removeTimeout = null;
			}
		};
		
		this.setTimeout= function( callback, delay ){
			this.clear_removeTimeout();
			removeTimeout = setTimeout(function () {
				removeTimeout = null;

				callback();
			}, delay);
		}
	};

	
	// Customizable events ---------
	
	// not used when no listener!:  eg. for PALE MOON
	function reset_menu_position_to_toolbar_menubar(){
		CustomizableUI.addWidgetToArea( "menubar-items", "toolbar-menubar", 0 );
	}

	// not used when no listener!:  eg. for PALE MOON
	function check_hcp_menubar_position( aWidgetId, aArea, aPosition ){
		
		if( aWidgetId == "hcp-main-menu-tbaritem" ){
			
			var _isInToolbar= false;
			
			if( !aArea ) { // moved back to PALLETE
				; //
				
			}else if( CustomizableUI.getAreaType( aArea ) == CustomizableUI.TYPE_TOOLBAR ){
				// all is OK!

				_isInToolbar= true;
				
			}else{ // moved to PANEL!, forbid!
				
				//este alert produce un BUG en el drag & drop del customize!
				//thySelf.alert_plus("Customizing Menubar:", " Menubar can be placed in a Toolbar only. \n " ); //function(){ xxxxx.alert("xxx") } //Resetting position

				//resets BOTH items
				reset_menu_position_to_toolbar_menubar();
				setTimeout(function(){
					CustomizableUI.removeWidgetFromArea("hcp-main-menu-tbaritem");
				}, 2000);
			}
			
			if( !_isInToolbar ){
				// DELAY for widget-removed!! (there are quick removed events, when moving from one toolbar to another!!!
				thySelf.HcTout_hcMenu_removed.setTimeout(function(){
					if( !!CustomizableUI ){ // undefined after main shutdown
						CustomizableUI.dispatchToolboxEvent("hcMenu_changed", { isInToolbar: _isInToolbar, }); // does for ALL WINDOWs opened!
					}
				}, 150);
			}else{ // _isInToolbar == true
				// CLEAR 1st !
				thySelf.HcTout_hcMenu_removed.clear_removeTimeout();
				
				// puts attr for css to HIDE original menubar  while customizing!!
				CustomizableUI.dispatchToolboxEvent("hcMenu_changed", { isInToolbar: _isInToolbar, }); // does for ALL WINDOWs opened!
			}
		}
	}

	// not used when no listener!:  eg. for PALE MOON
	this.customizeObserver= {
			onWidgetAdded:   function(aWidgetId, aArea, aPosition){
				thySelf.myDumpToConsole("     onWidgetAdded_x  ("+aWidgetId+", (palette?)       , "+aArea+", "+aPosition+") ");

				check_hcp_menubar_position( aWidgetId, aArea, aPosition );
				CustomizableUI.dispatchToolboxEvent("hc_Widget_moved", { wId: aWidgetId, area: aArea }); // does for ALL WINDOWs opened!
			},
			onWidgetMoved:   function(aWidgetId, aArea, aOldPosition, aNewPosition){
				thySelf.myDumpToConsole("     onWidgetMoved_x  ("+aWidgetId+", -----            , "+aArea+", "+aOldPosition+", "+aNewPosition+") ");

				check_hcp_menubar_position( aWidgetId, aArea, aNewPosition );
			},
			onWidgetRemoved: function(aWidgetId, aOldArea){
				thySelf.myDumpToConsole("     onWidgetRemoved_x("+aWidgetId+", "+aOldArea+     ", (palette?)     ) ");
				
				check_hcp_menubar_position( aWidgetId, null, 0 );
				CustomizableUI.dispatchToolboxEvent("hc_Widget_moved", { wId: aWidgetId, area: null  }); // does for ALL WINDOWs opened!
			},
	}
	
    this.HcTout_hcMenu_removed= new this.Hc_Timeout();
	
	// Misc. --------------------------------------------------------------------------------------------------
	

	this.setAttrs_smart2= function( xul_doc, eId, arr_Attrs, strValue ){
		var elem= xul_doc.getElementById(eId);
		if( elem ){
			arr_Attrs.forEach(function( name ){
				elem.setAttribute( name, strValue);
			});
		}else{
			thySelf.debugError(" No elem found: id: "+eId);
		}
	}

	function  do_strings_locale(xul_doc) {
		try {
			var custTbarBundle= Services.strings.createBundle("chrome://global/locale/customizeToolbar.properties");

			thySelf.setAttrs_smart2( xul_doc, "spring"   , ["label","title"], "[h] "+custTbarBundle.GetStringFromName("springTitle")   );
			thySelf.setAttrs_smart2( xul_doc, "spacer"   , ["label","title"], "[h] "+custTbarBundle.GetStringFromName("spacerTitle")   );
			thySelf.setAttrs_smart2( xul_doc, "separator", ["label","title"], "[h] "+custTbarBundle.GetStringFromName("separatorTitle"));
		
		} catch (ex1) {
			thySelf.debugError(" Ignoring Error: ", ex1);
		};
	}
	
	

	// CLASS Hc_FollowChanges  --------------------------------------------------------
	this.Hc_FollowChanges= function( callback ){
		var stored_value= null;
		
		//eg: for smallTabs, this gets called from ALL OPENED Fx WINDOWS!, but no problem :-)
		this.onChange = function( value ) {
			try {
				var firstTime= (stored_value === null);
				if( stored_value === value ){
					return;
				}
				stored_value= value;

				callback( value, firstTime, this );
				
			} catch (ex) {	thySelf.debugError(" Ignoring error: "+ex, ex);	};
		};
	};
	
	//SMALL_TABS
	this.smallTabs_changed= new this.Hc_FollowChanges( function( value, firstTime, changeObj ){
		
		var recentWindow = Services.wm.getMostRecentWindow("navigator:browser");
		if( recentWindow ){
			// done at handler ... recentWindow.focus();
			//notif-window!
			if( recentWindow.HCPlusLib ){
				recentWindow.HCPlusLib.checkAndNotif_when_smallTabs_changed( value, firstTime, changeObj );
			}else{ // !recentWindow.HCPlusLib   --->  error!
				thySelf.myDumpToConsole("      smallTabs_changed() -->> callback():  [NO recentWindow.HCPlusLib] (error?) ");
			}
		}
		else{
			thySelf.debugError(" getMostRecentWindow() bad retvalue?:  "+recentWindow);
		}
	});


	// Track opened windows!! --------------------------------------------------------------------------

	//var lastOpenedWindow= null;
	
	const openedWinArr= new Array();
	
	//called also at boot time for ALL already opened windows!
	this.windowIsOpened = function(_win) {
		
		_win.HideCaption.opened_time= new Date().getTime();

		const seconds_after_startup= (_win.HideCaption.opened_time - thySelf.startup_time)/1000;
		
		thySelf.myDumpToConsole( "\n OnLoad()/windowIsOpened():  seconds_after_startup: "+seconds_after_startup+" \n");
		
		const after_first_startup_seconds= seconds_after_startup > 20; // seconds 
		if(   after_first_startup_seconds ){  
			//lastOpenedWindow= _win; // only track wins opened AFTER first secs right??
			openedWinArr.push(_win);
			
			_win.HideCaption.is_trackedOpened= true;
		}
		thySelf.myDumpToConsole("      windowIsOpened() -->> after_first_startup_seconds: "+after_first_startup_seconds);
	};
	this.windowIsClosing= function(_win) {
		
		const idx= openedWinArr.indexOf(_win)
		if(   idx >= 0 ){
			openedWinArr.splice(idx, 1); // remove only ONE object
		}
		//if( lastOpenedWindow == _win ){
		//	lastOpenedWindow = null;
		//}
	};
	this.getLastOpenedWindow= function() {
		const lastOpenedWindow= openedWinArr[openedWinArr.length-1]; // no prob if empty

		if( lastOpenedWindow && lastOpenedWindow.closed ){
			thySelf.debugError(" ERROR in getLastOpenedWindow():  win is ALREADY CLOSED!: ");
			return null;
		}
		return lastOpenedWindow;
	};
	
	
	// alerts like those in Tbird ----------------------------------------------------------

	this.alert_plus= function(title, text, clickCallback){

		var alert_listener = null;
		if( clickCallback ){
			alert_listener = {
				observe: function(subject, topic, data) {
					//alert("subject=" + subject + ", topic=" + topic + ", data=" + data);
					if( topic == "alertclickcallback" ){
						clickCallback();
					}
				}
			};
		}		

		try {
			var hcp_icon_url= "chrome://HideCaptionPlus/skin/hcp_icon.png";
			Components.classes['@mozilla.org/alerts-service;1'].getService(Components.interfaces.nsIAlertsService).
					showAlertNotification( hcp_icon_url, title, text, !!alert_listener , "cookie_close", alert_listener);
					//owAlertNotification(null, title, text, false, "", null);
		} catch(ex) {
			// prevents runtime error on platforms that don't implement nsIAlertsService
			thySelf.debugError("  Ignoring Error, will use prompts.confirm() :"+ex, ex);
			
			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

			if( prompts.confirm(null, title, text) ){ //winxxx.confirm(title +" \n\n"+ text)
				if( clickCallback ){
					clickCallback();
				}
			}
		}
	};


	// Firefox button config -----------------------------------------------------------------------
	const FxData_class= function(){
		this.icon= "";	this.text= "";  this.dropm= "";  this.image="";
	};
	const fx_data_max   = new FxData_class(); 
	const fx_data_nomax = new FxData_class(); 

	this.getFxData=  function( isMax ){
		const  fx_data= isMax? fx_data_max: fx_data_nomax ;
		return fx_data;
	};
	

	// floatbars ALLOWED ------------------------------------------------
	this.get_sys_floatbars_ALLOWED=  function(){
		if( Services.appinfo.ID   == "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}" ||
		    Services.appinfo.name == "Pale Moon" ){
		
			// HC *hack!*
			if( Services.hc_allowFT ){
				return true;
			}
			
			return false;
		}
		return true;
	};
	
	//  ...sys_FloatBars_enable_str   --------  // internal switch to completely disable sys_floatbars without any notice
	var     value__sys_floatbars_enable= null;
	
	this.get_sys_floatbars_enable=  function(){
		
		if( value__sys_floatbars_enable === null ){
			const sys_floatbars_enable__KEY=   "extensions.hide_caption." + "plus.z_adv.sys_FloatBars_enable_str"; //2017: cambiado de bool a STRING !!!
			value__sys_floatbars_enable= 
					 thySelf.get_sys_floatbars_ALLOWED()  &&
					 Services.prefs.prefHasUserValue( sys_floatbars_enable__KEY ) &&
					(Services.prefs.getCharPref(      sys_floatbars_enable__KEY )+"").indexOf("floatBars") >= 0;
			
			// set INITIAL value!	
			try{
				if(!Services.prefs.prefHasUserValue( sys_floatbars_enable__KEY ) ){
					Services.prefs.setCharPref(      sys_floatbars_enable__KEY, "none" );
				}
			}catch(ex){ thySelf.debugError("   ignored error: "+ex, ex);  }
			
		}
		return  value__sys_floatbars_enable;
	};
	
	//  ...sys_DynamicBars_enable_str --------  // internal switch to completely disable DynamicBars without any notice 
	var     value__sys_DynamicBars_enable= null;

	this.get_sys_DynamicBars_enable=  function(){
		if( value__sys_DynamicBars_enable === null ){
			const sys_DynamicBars_enable__KEY= "extensions.hide_caption." + "plus.z_adv.sys_DynamicBars_enable_str"; //2017: cambiado de bool a STRING !!!
			if( thySelf.get_sys_floatbars_enable() ){ // sys-FLOATBARS is THE MAIN flag!!
				
				value__sys_DynamicBars_enable= true;
				
			}else{
				value__sys_DynamicBars_enable= 
					 Services.prefs.prefHasUserValue( sys_DynamicBars_enable__KEY ) &&
					(Services.prefs.getCharPref(      sys_DynamicBars_enable__KEY )+"").indexOf("dynBars") >= 0;
			}
			
			// set INITIAL value!	
			try{
				if(!Services.prefs.prefHasUserValue( sys_DynamicBars_enable__KEY ) ){
					Services.prefs.setCharPref(      sys_DynamicBars_enable__KEY, "none" );
				}
			}catch(ex){ thySelf.debugError("   ignored error: "+ex, ex);  }
			
		}
		return  value__sys_DynamicBars_enable;
	};
	
	const DynBars_widgets = new Array('hctp_float_tbox_button'); 
	const DynBars_Elements= new Array('hctp_DynToolbars_Keyset'); 

	function DynBars_delete_forbidden_elems(){
		if( !thySelf.get_sys_DynamicBars_enable() ){
			DynBars_Elements.forEach(function( _id ){
				thySelf.myDumpToConsole("    DynBars:  about to delete elem: "+ _id +"");
				deleteById( _id, thySelf.XUL_main_overlay_doc   );
				deleteById( _id, thySelf.XUL_floatbars_over_doc );
			});
			try{
				thySelf.XUL_main_overlay_doc.getElementById("id_toggle_dyn_toolbars_hcmenu").setAttribute( "disabled", "true");
			}catch(ex){ thySelf.debugError("   ignored error: "+ex, ex);  }
		}
	};
	
	function FloatBars_delete_elems(){
		if( !thySelf.get_sys_floatbars_enable() ){
			try {
				const docEl= thySelf.XUL_floatbars_over_doc.documentElement;
				if( docEl.firstChild ){
					docEl.removeChild( docEl.firstChild );
				}
				if( docEl.firstChild ){ // forbidden 2nd child!!
					thySelf.myDumpToConsole(" err - warning in FloatBars_delete_elems(): forbidden 2nd child!! ");
				}
			} catch (ex) {
	    		thySelf.debugError(" ignoring error in FloatBars_delete_elems()    error: "+ex, ex);
			}
		}
	};

	

	
	// misc utilities ----------------------------------------
	
	this.getUniCharPref= function(prefName, branch){  		// Unicode getCharPref
		try {
			var Ci_nsImyString = thySelf.isFx58orLater? 
				Components.interfaces.nsIPrefLocalizedString:  // for Fx58+
				Components.interfaces.nsISupportsString;
				
			return branch.getComplexValue(prefName, Ci_nsImyString).data;
		} catch (ex) {
	    	thySelf.myDumpToConsole(" ignoring err0r: "+ex);

			return branch.getComplexValue(prefName, Components.interfaces.nsIPrefLocalizedString).data; // working interface for nightly 58.0a1
		}
	};
	this.setUniCharPref= function(prefName, text, branch){  // Unicode setCharPref
		var ustring = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		ustring.data = text;
		try {
			var Ci_nsImyString = thySelf.isFx58orLater? 
				Components.interfaces.nsIPrefLocalizedString:  // for Fx58+
				Components.interfaces.nsISupportsString;
				
			branch.setComplexValue(prefName, Ci_nsImyString, ustring);
		} catch (ex) {
	    	thySelf.myDumpToConsole(" ignoring err0r: "+ex);

			branch.setComplexValue(prefName, Components.interfaces.nsIPrefLocalizedString, ustring); // working interface for nightly 58.0a1
		}
	};
	
	this.getPrefPlus_type= function(pref){
		const pType= Services.prefs.getPrefType(pref);
		switch( pType ){
			case Services.prefs.PREF_STRING:  	return Services.prefs.getCharPref(pref);
			case Services.prefs.PREF_INT:  		return Services.prefs.getIntPref (pref);
			case Services.prefs.PREF_BOOL:  	return Services.prefs.getBoolPref(pref);
			default:	throw (pref+":   Error: pref-type is "+pType); // PREF_INVALID (0) is non-existant right?
		}
	};
	this.setPrefPlus_type= function(pref, val){
		const pType= Services.prefs.getPrefType(pref);
		switch( pType ){
			case Services.prefs.PREF_STRING:  	return Services.prefs.setCharPref(pref, val);
			case Services.prefs.PREF_INT:  		return Services.prefs.setIntPref (pref, val);
			case Services.prefs.PREF_BOOL:  	return Services.prefs.setBoolPref(pref, typeof(val) == "string"? (val.toLowerCase() == "true"): val);
			default:	throw (pref+":   Error: pref-type is "+pType);
		}
	};


	this.hc_parseNumber= function( str, defVal, min, max ){
		try{
			var val= parseFloat(str)
			if( isFinite(val) && val >= min && val <= max ){
				return val;
			}
		}catch(ex){
		}
		return defVal;
	};


	this.getTextFromElement= function( _doc, id, defTxt ){
		var elem= _doc.getElementById(id);
		return ""+(elem? elem.textContent: defTxt);
	};
	
	// Linda herramienta p/ usar en esta 'clase'        		
	//Services.appShell.hiddenDOMWindow.console.trace();

	this.myDumpToConsole      =    function(             aMessage ){
		thySelf.Bstrap.myDumpToConsole_plus( null      , aMessage );
	};
	this.myDumpToConsole_plus =    function( moduleWord, aMessage ){
		thySelf.Bstrap.myDumpToConsole_plus( moduleWord, aMessage );
	};
	
	this.debugError =    function( aMessage, theException ){
		thySelf.Bstrap.debugError( aMessage, theException );
	};

})();  // Singleton-*Instance*-of-this-class!

