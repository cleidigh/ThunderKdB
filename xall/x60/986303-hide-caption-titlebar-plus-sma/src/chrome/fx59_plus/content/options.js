

//var HideCaption_opt= new HideCaption_opt_class();

//if( typeof(HCPlusLib) != "undefined" ){
//	throw new Error("HCPlusLib is already defined in this scope...");
//}

if( !window.Services ){
		var Cu = Components.utils;

		Cu.import("resource://gre/modules/Services.jsm", window);
		
		//window.console.log("  imported [Services.jsm]    ...  Services="+window.Services);
}

var   HCPlusLib = new HCPlusLib_class      ( window );

var singletonName= "undef";

var rand= Services.hc_rand? Services.hc_rand : "";
// HcSingleton ! - importar capaz dps una clasecita MIA q me de un MISMO 'randKey' q el del bootstrap!!
// Usar este url ABSOLUTO, con el "HideCaptionPlus*" para que NO funcione desde THUNDERBIRD!!
Components.utils.import(singletonName="chrome://HideCaptionPlus_fx/content/"+"HcSingleton.js"+rand , HCPlusLib);

if(!HCPlusLib.HcSingleton.Bstrap ){
	//mejor no uso esto apenas inicia esta clase vd?  -->  HCPlusLib.debugError o el mydump...()
	window.console.log( " TRYing to ignore error...:    HCPlusLib.HcSingleton.Bstrap   NOT FOUND!!! " );
	window.console.log( "    singletonName: "+singletonName);
	HCPlusLib.play_debugSpecial_audio_Async(); 
}



// DOMContentLoaded NOT executing before showpane(xx.src) !!!
// document.addEventListener("DOMContentLoaded", function(event) {});


// CLASS
var HideCaption_opt= new (function HideCaption_opt_class(){

	const main_thySelf= this;

	var   openerChecked= false;
	
	var   isInsideFrame= false;
	
	
	this.get_HCPlusLib= function() { // cree este getter por si alguna vez este js se vuelve un 'js module' ....
		return HCPlusLib; 
	};

	
	this.Init= function() {

		//load debug flag!!
		HCPlusLib.LoadDebugFlag();

		//HCPlusLib.myDumpToConsole("  calling Init() ");
		
		//for using observers here too <- total mess !!
		//HCPlusLib.Load_AllOptions();
		
		//do LOAD ...
		//LoadOrSavePlus(true );
		
		//this.load_osfile_module();
		
		
		HCPlusLib.myDumpToConsole(" filename_optionsXul= "+filename_optionsXul);
		
		
		this.get_mainPrefWindow().setAttribute("platformPlus"    , HCPlusLib.getPlatformPlus() );
		this.get_mainPrefWindow().setAttribute("hcp_platformPlus", HCPlusLib.getPlatformPlus() ); // to make equal to mainwindow (:root)
		
		this.do_onPaneLoad(); // Fx10: no estaba llamando al del 1er y ultimo panel por ej!
		/** Fx40: al final SI LLAMA A todos!!! , solo faltaba poner tb una llamada a HCPlusLib.LoadDebugFlag();!!! ufff!!
		**/
		
		
		//"sys_DynamicBars_enable"
		if( HCPlusLib.HcSingleton.get_sys_DynamicBars_enable() ){
			this.get_mainPrefWindow().setAttribute("hcp_sys_DynamicBars_enable", "true" );
		}

		//"sys_floatbars_ALLOWED"
		this.get_mainPrefWindow().setAttribute("hcp_sys_floatbars_ALLOWED", ""+HCPlusLib.HcSingleton.get_sys_floatbars_ALLOWED() );

		//"sys_floatbars_enable"
		if( HCPlusLib.HcSingleton.get_sys_floatbars_enable() ){
			this.get_mainPrefWindow().setAttribute("hcp_sys_floatbars_enable", "true" );

		}

		//"hctp_isFx57plus"
		this.get_mainPrefWindow().setAttribute("hctp_isFx57plus", ""+HCPlusLib.HcSingleton.isFx57orLater );
		
		/***
		aaa_else{ // sys_floatbars NOT enabled!
			try {
				// I should get the PANE node DIRECTLY with getAnon..(), but the code is good for showing capabilities for other tasks also!
				var parentXbl= document.documentElement;
				var anonElem= parentXbl.ownerDocument.getAnonymousElementByAttribute(parentXbl, "anonid", "selector");

				//HCPlusLib.myDumpToConsole("  about to disable pane='paneTabs' ");
				HCPlusLib.querySelectorAll_forEach( anonElem, "radio[pane='paneTabs']", function(elem){
					elem.disabled= true;
					//HCPlusLib.myDumpToConsole(" ... disabled pane='paneTabs' ! ");
				});
			} catch (ex) {
				HCPlusLib.debugError("Ignoring error: "+ex, ex);
			}
		}
		***/
		
		
		// am i inside a FRAME ???
		check_opener();

		//for COLOR PICKER, ONLY for Australis ------------------------------------------------------------
		set_color_panel_noautohide();
		

		//expand 'homeDir' etc for AUDIO FILES! -- ahora se hace adentro de HC_Entry_Audio
		//main_thySelf.children_expand_vars(document.getElementById("audio1_mpopup"));

		
		if( HCPlusLib.HcSingleton.isFx40orLater ){ // new versions of small-bars css files
			this.get_mainPrefWindow().setAttribute("hctp_isFx40orLater", "true" );
		}
		var isFx61orLater = Services.vc.compare(Services.appinfo.version+"", "60.*" ) > 0;
		this.get_mainPrefWindow().setAttribute("hctp_isFx61orLater", ""+isFx61orLater );

		
		
		this.opt_setAsDomAttribute_fromName("extensions.hide_caption.plus.z_sys.intFlags");
		
		
		// put HCTP Version
		setTimeout(function() {
			const elem_ver= document.getElementById('label_info_hctp_version');
			const hctp_version= HCPlusLib.HcSingleton.Bstrap? HCPlusLib.HcSingleton.Bstrap.startup_data.version: HCPlusLib.HcSingleton.hctp_current_version;
			//HCPlusLib.GetPref_plus(HCPlusLib.CHAR_PREF, "plus.version")
			elem_ver.setAttribute( "value", ""+hctp_version );

			// COMPATIBILITY for Fx6X+ !!
			if( Services.vc.compare(Services.appinfo.version+"", "62.*" ) > 0 ){ // Fx63+
				HCPlusLib.HcSingleton.setStyleSheet("chrome://HideCaptionPlus/content/fx_COMPAT/toolkit/scale_compat.css", true);
			}

		}, 50);
		
		
		this.get_mainPrefWindow().setAttribute("hctp_isReleaseVersion", HCPlusLib.HcSingleton.isReleaseVersion );
		
		
		/**  prueba de addPane() para el FLOATBARS: todo CASI BIEN, solo que no QUEDA PRESELECCIONADO p/ la proxima carga!
	 	<prefpane 	id="paneTabs" label="&tab.float.toolbars;" ... />
		const prefpane= document.createElement("prefpane")
		prefpane.setAttribute("id" , "paneTabs");
		prefpane.setAttribute("src", "chrome://HideCaptionPlus_fx/content/opt_float_tbars.xul");
		prefpane.setAttribute("label", "TEST creation!!");
		prefpane.setAttribute("onpaneload", "HideCaption_opt.do_onPaneLoad(this);");
		//
		main_thySelf.get_mainPrefWindow().addPane(prefpane);
		// probe dps un showPane() q ya no hacia falta
		**/

		
		function  reload_if_diff(){
			var win_location_lower       = (""+window.location).trim().toLowerCase();
			var filename_optionsXul_lower=  filename_optionsXul.trim().toLowerCase();
			
			if( win_location_lower.indexOf("?") < 0 ){   // solo busco 'arreglar' urls sin params (?) .. y TAMBIEN para q no sea un loop de recarga!!!
				if( win_location_lower != filename_optionsXul_lower ){
					
					if( HCPlusLib.bPrintDebug ){
						var msg_str= " Different!!:  \n    " + filename_optionsXul + " \n    " + window.location;
						window.console.log( msg_str );
					}

					window.location= window.location+"?_"+Date.now();
				}
			}else{
				HCPlusLib.myDumpToConsole( "  there IS a: '?'  " );
			}
		};

		// 2 opportunities ...
		setTimeout(function() {

			reload_if_diff();
			
			setTimeout(function() {
				reload_if_diff();
			}, 1000);
		}, 100);

		
		//NICE VISUAL CHECK!
		//document.getElementById('bottom_msg').textContent= ""+ filename_optionsXul +" \n "+ window.location
		
		setTimeout(function() {
			main_thySelf.alert_newversion();
		}, 300);
	};

	
	this.alert_newversion= function() {

		const hctp_version= HCPlusLib.HcSingleton.Bstrap? HCPlusLib.HcSingleton.Bstrap.startup_data.version: HCPlusLib.HcSingleton.hctp_current_version;
	
		var ver= HCPlusLib.GetPref_plus(HCPlusLib.CHAR_PREF, "plus.version_inDialog", "1.0");
		if( ver != hctp_version ){ // firstrun ...
			HCPlusLib.do_SetPref_plus(  HCPlusLib.CHAR_PREF, "plus.version_inDialog", hctp_version);

			if( Services.vc.compare( ver+"", "3.*" ) > 0 ){  // was coming from ver 4 already ?
				return; // so NO ALERT!
			}
			
			try{
				// path manipulation + locale info
				calc__base_loc_path();

				const strBundle= Services.strings.createBundle( HCPlusLib.url_addTimestamp(base_loc_path + "main.properties") );

				var msg_txt= "\n"+HCPlusLib.HcSingleton.special_getStringFromName__newversion_msg__ALL(strBundle)+"\n ";
				Services.prompt.confirmEx(null, " " , msg_txt, Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_OK, "OK", "OK", "OK", null, {});
			} catch (ex) {	
			
				var msg_txt= "\n"+HCPlusLib.HcSingleton.special_getStringFromName__newversion_msg__ALL(         )+"\n ";
				Services.prompt.alert(    null, " " , msg_txt );
				
				HCPlusLib.debugError("  ignoring error: "+ex, ex); 
			}
		}
	};
	
	/***   // hecho en HCPlusLib
	this.load_osfile_module= function() {
		if( !window.OS ){
			Components.utils.import("resource://gre/modules/osfile.jsm");
			if( !window.OS ){
				throw "no [window.OS]!";
			}
		}
	};
	 ***/
	
	function set_color_panel_noautohide() {
		//for COLOR PICKER, ONLY for Australis ------------------------------------------------------------
		
		// document.loadOverlay('chrome://HideCaptionPlus_fp/content/firepicker.xul', {}); // NO!, muevo  el XUL directamente al options.XUL p/ q NO afecte tb al Fx28- 
		
		var hctp_fp_panel= document.getElementById('hctp-fp-panel');
		
		hctp_fp_panel.setAttribute('noautohide', 'true');

		//keydown
		hctp_fp_panel.addEventListener("keydown"  , function(event){
			if(event.keyCode == event.DOM_VK_ESCAPE){
				this.hidePopup(); event.preventDefault();event.stopPropagation();
			}; 
		});

		//popupshown
		hctp_fp_panel.addEventListener("popupshown"  , function(event){
			
			if( HCPlusLib.getPlatformPlus()!="windows" ){
				setTimeout(function(){
					if(Services.focus.activeWindow == null){ window.focus(); } // needed in linux mint at least.
				}, 200);
			}
		});

		//mousedown
		hctp_fp_panel.addEventListener("mousedown", function(event){
			event.stopPropagation(); // STOP here , don't go to main window (and execute hidePopup() )
		});
		HideCaption_opt.get_mainPrefWindow().addEventListener("mousedown", function(event){
			if( hctp_fp_panel.state == "open" ){
				hctp_fp_panel.hidePopup();
			}
			//HCPlusLib.myDumpToConsole(" EVENT: 'mousedown' in  mainPrefWindow ");
		});
	};
	
	
	function check_opener(){
		if(openerChecked){
			return;
		}
		openerChecked= true;

		
		try {
			if( window.opener === null ){
				
				var frame= window.QueryInterface(Components.interfaces.nsIInterfaceRequestor) 
				.getInterface(Components.interfaces.nsIWebNavigation) 
				.QueryInterface(Components.interfaces.nsIDocShell).chromeEventHandler;

				if( frame.tagName == "browser"      ||
					frame.tagName == "xul:browser"  || 
					frame.tagName == "iframe"       ||  
					frame.tagName == "xul:iframe" 
				  ) {
					isInsideFrame= true;
					
					HideCaption_opt.get_mainPrefWindow().setAttribute("hctp_isInsideFrame"    , ""+isInsideFrame ); //.hideOn_insideFrame 

					return;
				}
			}

		} catch (ex) {
			HCPlusLib.debugError(" Error in check_opener(): "+ex, ex);
		}
	};

	
	this.get_mainPrefWindow = function() {
		if( ! this.mainPrefWindow ){
			this.mainPrefWindow= document.getElementsByTagName('prefwindow')[0];
			
			if( this.mainPrefWindow === document.documentElement ){	//HCPlusLib.myDumpToConsole("  OK: mainPrefWindow EQUAL TO documentElement ");
			}else{													HCPlusLib.debugError(" Ignoring Error:  mainPrefWindow NOT EQUAL TO ... documentElement ");
			}
		}
		return this.mainPrefWindow;
	};
	this.mainPrefWindow= null;
	
	
	var hcp_runningInit= false;

	
	this.do_onPaneLoad = function do_onPaneLoad( _thePane_canBeNull ){

		//load debug flag!!
		HCPlusLib.LoadDebugFlag();
		
		//-------------------------------------------
		hcp_runningInit= true;

		
		const paneId= _thePane_canBeNull? _thePane_canBeNull.id: "(null?)";
		
		HCPlusLib.myDumpToConsole("  calling do_onPaneLoad("+paneId+")  ");
		
		try{
			//execute onchange()s !!
			onChangeAll();
		}catch(ex){
			HCPlusLib.debugError     ("  in do_onPaneLoad("+paneId+"): "+ex, ex);
		}

		
		//set audio buttons, etc
		const elems= document.getElementsByAttribute("setsAudioButs", "true");
		if( elems && elems.length > 0 ){
			arr_mlist= Array.slice(elems);
			do_all_Action_mlists();
			
			onLoad_process_Action_mlists();
		}

		
		auto_tooltips(); // for menulists at least!
		
		//test!!
		//do_Preference_controls(); // el colorpickplus 'prende' al inicio
		
		
		setTimeout(function() {
			HideCaption_opt.fx_but_changed({}, '', true  );
			HideCaption_opt.fx_but_changed({}, '', false );
		}, 300);
		

		
		//-------------------------------------------
		hcp_runningInit= false;
		
	};

	function onChangeAll(){

		//execute onchange() !!
		//undefined_setTimeout( function(){ // was HideCaption.XimeDelayed

			//var msg= "prefs: \n\n";
			
			var prefs= document.getElementsByTagName('preference');
			for (var i = 0; i < prefs.length; ++i){
				//msg += prefs[i].id+" \n";
				if( prefs[i].onchange ){
					try{ prefs[i].onchange(); 
					}catch(ex){ 
						HCPlusLib.debugError     (""+ex, ex);
					}
				}
			}
			//HCPlusLib.myDumpToConsole("  Init:    calling onChangeAll()  "+msg);
			
			
			// INIT Menulist_Appbutton  !!
			HideCaption_opt.Menulist_Appbutton.init_All_My_Menulists();

			
		//  }, 10 );
	};


	this.Save = function() {
		
		//do SAVE ...
		//LoadOrSavePlus(false);		
		
		//PROCESS ALL
		HCPlusLib.ProcessAllFFwindows();
		
	    return true;
	};

	
	/*
	//prefpane - helpURI <-  NO!!!, working is ->  helpTopic
	function openPrefsHelp() {
		var helpTopic = document.getElementsByTagName("prefwindow")[0].currentPane.helpTopic;
		var url= 'chrome://HideCaptionPlus/locale/readme.html';
		url += helpTopic? ("#"+helpTopic): ""; // <- this should change in order to work with the page redirection that readme does.
		if( ! HCPlusLib.openUILink_inMostRecentWindow(null,url)){
			alert('Couldn\'t find browser\'s window'); };
	}
	*/

	var recursive_loop_count= 0;
	
	this.mydisable = function mydisable(_prefId, _bDisable){
		
		recursive_loop_count ++;
		if( recursive_loop_count > 50 ){
			throw new Error("   recursive_loop detected in mydisable()!, aborting! ");
		}
		/** @type HTMLElement */
		var _theElem= document.getElementById(_prefId);
		////var _theElem= document.getElementsByAttribute('preference', _prefId)[0];
		if(_theElem){ 
			_theElem.disabled= _bDisable; // MDC says: use js-property instead of Attribute!!
			//_theElem.setAttribute('disabled', _bDisable ); 
			
			if( _theElem.onchange ){
				try{ 
					_theElem.onchange();
				}catch(ex){
					HCPlusLib.debugError     ("  in mydisable(): "+ex, ex);
				}finally{
					
				}
			}
		}else{
			HCPlusLib.debugError("Not found element:  "+_prefId);
		}
		
		recursive_loop_count --;
	};

	this.mydisable_setValue = function mydisable_setValue(_prefId, _bDisable, _value){
		this.mydisable(_prefId, _bDisable);
		// NOT when running onpaneload() - hcp_runningInit !!
		if( ! hcp_runningInit ){
	    	this.pref_setValue(_prefId, _value);
	    } 
	};
	
	
	this.putGrayAsDisabled_attr = function putGrayAsDisabled_attr(_elemId, _bDisable){
		
		/** @type HTMLElement */
		var _theElem= document.getElementById(_elemId);
		if(_theElem){ 
			_theElem.setAttribute('disabled_color', _bDisable );
			
		}else{
			HCPlusLib.debugError("Not found element:  "+_elemId);
		}
	};

	this.pref_setValue = function (_prefId, _value){
		try {
	    var _theElem= document.getElementById(_prefId);
	    if( _theElem!=null   &&   _value !== null && _value !== undefined ){
	        _theElem.value= _value;
	    }
		} catch (ex) {
			HCPlusLib.debugError(""+ex, ex);
		}
	};
	this.pref_getValue = function (_prefId){
	    var _theElem= document.getElementById(_prefId);
	    return _theElem==null? null: _theElem.value;
	};
	
	
	// ----------------------------------------------------------------------------
	
	var e_location  = null;
	var e_loc_nomax = null;
	
	function initialize(){
		if(!e_location ){ e_location  = getElemById("mmc_buttons_location");  }
		if(!e_loc_nomax){ e_loc_nomax = getElemById("mmc_buttons_loc_nomax"); }
	}
	
	function getElemById(_eId){
	    var _theElem= document.getElementById(_eId);
	    if( !_theElem ){
			HCPlusLib.debugError("Not found element:  "+_eId);
	    }
	    return _theElem;
	}
	function getElemById_orDummy(_eId){
	    var _theElem= document.getElementById(_eId);
	    if( !_theElem ){
	    	_theElem= {}; //dummy obj
			//HCPlusLib.myDumpToConsole(" Ignoring: Not found element: "+_eId);
	    }
	    return _theElem;
	}
	
	function getValue_plus(_elem){
		return _elem.disabled? "e_disabled": _elem.value;
	}
	
	// ------  begin 'this' section !! ----------------------------------
	
	this.onChange_mmc_location = function onChange_mmc_location(){
		
		initialize();
		
		//WINDOWS only!
		var pref_fx4_titlebar= HCPlusLib.getPlatformPlus() == "windows"? 
		                              HCPlusLib.GetPref_plus( HCPlusLib.CHAR_PREF, "plus.fx4_titlebar", "") :
		                              "ti_non_windows";

		//Feb 2012: new setting  SYSTEM BUTTONS Enabled !!
		var e_sysbut_winappear = getElemById("adv.sysbut_winappear");
		var enable_system_buts=  e_sysbut_winappear  && e_sysbut_winappear.value == "";
		
		e_location.disabled  = enable_system_buts || pref_fx4_titlebar == 'ti_enabled';
		e_loc_nomax.disabled = enable_system_buts || pref_fx4_titlebar == 'ti_enabled' || pref_fx4_titlebar == 'ti_unmaximized';
		//HCPlusLib.myDumpToConsole("");
		
		var locs_disabled        = 	(e_location.disabled  || e_location.value  == 'bloc_hidden') &&               
									(e_loc_nomax.disabled || e_loc_nomax.value == 'bloc_hidden');
									 
		var locs_non_micro       = 	getValue_plus(e_location ) != 'bloc_micro'  && 
									getValue_plus(e_loc_nomax) != 'bloc_micro' ;
		
		this.mydisable(  'mmc_buttons_canfloat' , locs_non_micro );
		
		//this.mydisable(  'mmc_buttons_skin'     , locs_disabled  ); // always enabled for skinning CUSTOMIZABLE buttons from palette!
		
		//this.mydisable(  'close_button_action'  , locs_disabled  ); // action for close button!
		
	};


	this.onChange_fx4_titlebar = function(self){
		
		var thySelf= this;
		
		//setAttribute(...)
		this.opt_setAsDomAttribute(self);
		
		
		//var id_tabs_drawInTitlebar= 'tabs_drawInTitlebar';
		//var val_tabs_dInTitle= thySelf.pref_getValue(id_tabs_drawInTitlebar);
		
		//enable/disable here !
	    //this.mydisable(   id_tabs_drawInTitlebar, self.value != 'ti_enabled');

		this.mydisable(  "adv.sysbut_winappear" , self.value == 'ti_enabled' );
		
		
	    //disable all these ONLY on WINDOWS !  (let Linux,. etc use them!, when there is NOT fx4-titlebar )
	    if( HCPlusLib.getPlatformPlus() == "windows" ){

	    	mydisable(         'show_custom_caption', 	self.value != 'ti_never');
	    	mydisable(         'show_custom_bdresizers',self.value != 'ti_never');

	    	thySelf.onChange_mmc_location();
	    	//mydisable(         'mmc_buttons_location', 	self.value == 'ti_enabled');
	    	//mydisable(         'mmc_buttons_loc_nomax',	self.value == 'ti_enabled' || self.value == 'ti_unmaximized');
	    	
	    	//disable(         'mmc_buttons_skin',   	self.value == 'ti_enabled'); //redundant
	    	
	    	thySelf.refresh_tab_marginTop_delta_all();
	    	
	    }// windows only

	    thySelf.refresh_fx_buttonicons(); // 'home.buttonicon_max' , etc
	    
	};

	
	var gPrefConfig_plus= null;
	function getConfig_plus() {
		if( gPrefConfig_plus ){
			return gPrefConfig_plus;
		}
		var my_prefService= Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);  
		return gPrefConfig_plus= my_prefService.getBranch("");
	};
	

	function getBoolPref( prefName ){	return getConfig_plus().getBoolPref( prefName );	}; // Services.prefs  -> "Services is not defined" error!
	//Services.prefs.getCharPref(
	
	
	this.refresh_fx_buttonicons = function(){
		
		/***
		 *  NEW: Always enabled bc of new CUSTOMIZABLE FX Button (from palette)!
		 * 
		//here for all systems, windows, linux, etc 
		var pref_fx4_titlebar = HCPlusLib.GetPref_plus( HCPlusLib.CHAR_PREF, "plus.fx4_titlebar", "");
		var elem_home_enabled = document.getElementById(  'home.enabled'  ); //ignoring null
		var home_enabled      = elem_home_enabled? elem_home_enabled.value: true; //assumes enabled if can't find it yet (when executing from other panel...)
		
		getElemById_orDummy( 'home.buttonicon_max'  ).disabled = !home_enabled || pref_fx4_titlebar == 'ti_enabled';
		getElemById_orDummy( 'home.buttonicon_nomax').disabled = !home_enabled || pref_fx4_titlebar == 'ti_enabled' || pref_fx4_titlebar == 'ti_unmaximized';
		getElemById_orDummy( 'home.button_appear'   ).disabled = !home_enabled;
		***/
	};
	
	
	this.refresh_tab_marginTop_delta_all = function(){
		
		//WINDOWS only!
		var pref_fx4_titlebar= HCPlusLib.getPlatformPlus() == "windows"? 
		                              HCPlusLib.GetPref_plus( HCPlusLib.CHAR_PREF, "plus.fx4_titlebar", "") :
		                              "ti_non_windows";
		
		var tabsInTitlebar_enabled= getBoolPref( "browser.tabs.drawInTitlebar" ) && pref_fx4_titlebar == 'ti_enabled';
		
		// mydisable() does a RECURSIVE LOOP !!!! bc I put this in the "onchange" too!!!
    	//is.mydisable(      'tab_marginTop_delta', 		         pref_fx4_titlebar == 'ti_enabled');
    	//is.mydisable(      'tab_marginTop_delta_nomax',	         pref_fx4_titlebar == 'ti_enabled');
    	
		getElemById_orDummy(         'tab_marginTop_delta'      ).disabled = tabsInTitlebar_enabled;
		getElemById_orDummy(         'tab_marginTop_delta_nomax').disabled = tabsInTitlebar_enabled;

		if( tabsInTitlebar_enabled ){
			HCPlusLib.setAttr_smart   ( "marginTop_delta_main_label", "tooltip", "tt_disabled_by_tabsinTb", true);
		}else{
			HCPlusLib.removeAttr_smart( "marginTop_delta_main_label", "tooltip");
		}
	};


	this.opt_setAsDomAttribute_fromName = function(prefName){
		this.do_opt_setAsDomAttribute( prefName,  Services.prefs.getCharPref(prefName) );
		//TODO: usar Services.prefs.getPrefType() !!
	}

	this.opt_setAsDomAttribute = function(prefElem){
		this.do_opt_setAsDomAttribute(prefElem.name, prefElem.value);
	}

	this.do_opt_setAsDomAttribute = function(attrName, value){
		
		attrName= (""+attrName).replace("extensions.hide_caption.plus.","");
		attrName= "dz_" + attrName.replace(/\./g, "_"); // "g" - flags in replace() were DEPRECATED //using global flag
		
		this.get_mainPrefWindow().setAttribute(attrName, ""+value );
	};


	this.generic_option_alert_flag= false;

	this.confirm_delete_preference= function(elem, default_value){
		if( default_value === undefined || elem.value == default_value ){

			setTimeout(function(){ // con delay BORRA de verdad!
				if( HideCaption_opt.generic_option_alert_flag ){ // this 'synchronize' variable DOESN'T WORK! (Ie. 2nd onclick-in-popupmenu 'arrives' after 1st alert closes with ESC)
					return;
				}
				HideCaption_opt.generic_option_alert_flag= true;
				if( confirm(" Delete this legacy Option? \n     (recommended/default value will be used) " ) ){ // + HideCaption_opt.generic_option_alert_flag
					//getElemById( elem.getAttribute("preference") ).reset();
					var prefName= ""+getElemById( elem.getAttribute("preference") ).getAttribute("name");
					prefName= prefName.replace("extensions.hide_caption.","");

					HCPlusLib.clearUserPref(prefName); // earlier hctp versions will create this again with 'never'
				}
				HideCaption_opt.generic_option_alert_flag= false;
			}, 100);

		}
	};
	
	this.oncommand_remove_checkbox= function(elem, default_value){
		if( default_value ){
			alert(' Option turned to default: ('+(elem.checked?'on':'off')+'). \n Checkbox will disappear when focus goes away.');
		}   
	};

	
	var bOld_Activate= null;
	// main_floatbars__oncommand
	this.main_floatbars__oncommand= function(elem, id_activate,  id_deactivate){
		var bActivate= elem.value != 'none';
		if( bOld_Activate != bActivate  &&  id_activate ){ // id_activate is undefined for onload()
			Services.prompt.alert( window, '  ', bActivate? 
				HCPlusLib.HcSingleton.getTextFromElement(document, id_activate  , "("+id_activate  +")") :
				HCPlusLib.HcSingleton.getTextFromElement(document, id_deactivate, "("+id_deactivate+")")
				);
		}
		bOld_Activate= bActivate;
		
		// console.log("ft_value: ",  bActivate);
		// HCPlusLib.sMsgConfirm_activate
		// HCPlusLib.sMsgConfirm_disable
	};

	

	// Firefox Button  options ---------------------------------------
	this.fx_but_changed = function( prefElem_dummy, propName_dummy, isMax ) {
		
		setTimeout(function(){
			const suffix = "isMax_"+isMax;
			const fx_data= HCPlusLib.HcSingleton.getFxData(isMax);
			
			//const value= prefElem.value;
			//if( propName ){
			//	fx_data[propName]= value;
			//}
			
			HCPlusLib.querySelectorAll_forEach( main_thySelf.get_mainPrefWindow(), ".hctp-appmenu-button-cls."+suffix, function(elem){ 
				HCPlusLib.set_Firefox_button( elem, fx_data );
			});
		}, 10);
	};
	
	
	
	// AUDIO - options -----------------------------------------------
	
	const SCALE_MULTIPLIER= 50.0;
	
	var audio_obj= null;
	
	this.Audio_openPopup= function( _anchorElem, __audio_object ) {
		
		audio_obj= __audio_object;

		audio_obj.load();
		
		document.getElementById('audio1_mlist' ).value= audio_obj.get_File();
		document.getElementById('audio1_volume').value= audio_obj.get_Volume()*SCALE_MULTIPLIER;

		document.getElementById('hctp-sound-panel').setAttribute("hc_anchorElem_id", _anchorElem.id );
		//al final hacer el open!
		//no ayuda este hide -- document.getElementById('hctp-sound-panel').hidePopup();
		document.getElementById('hctp-sound-panel').openPopup( _anchorElem );
	}
	this.hcSoundPanel_onpopupshown = function(event, elem) {
		if( event.target == elem ){ // abria tb para el menulist(menupopup) y 2 tooltips! oh!
			//play it!
			audio_obj.play();
		}
	};
	this.Audio_onMenulistCommand= function( __value              ) {	audio_obj.set_File  ( __value                                     ); };
	this.Audio_onVolumeChange   = function( _elem, _bPlay, event ) {	audio_obj.set_Volume( _elem.value/SCALE_MULTIPLIER, _bPlay, event );
		_elem.setAttribute("tooltiptext", "Volume: "+_elem.value/SCALE_MULTIPLIER);
	};

	/***
	this.expand_vars= function( elem ) {

		this.load_osfile_module();

		const real_homeDir= window.OS.Path.toFileURI(window.OS.Constants.Path.homeDir); 
		elem.value= elem.value.replace("{%homeDir%}", real_homeDir);


	};
	***/
	/***
	this.children_expand_vars= function( parent_popup ) {
		HCPlusLib.myDumpToConsole("  children_expand_vars():  id: "+parent_popup.id );
		//for ALL menuitems...
		Array.slice(parent_popup.childNodes).forEach(function(menuItem) {
			if( menuItem.localName=="menuitem" ){ // hay m-separator y tooltip tb
				main_thySelf.expand_vars( menuItem );
			}
		});
	};
	***/
	
	//  -----------------------------------------------
	
	function setAudioButton( butId, title) {
		const theButton= document.getElementById(butId);
		
		if( title && title != "" ){
			if( title.trim() != "" ){
				theButton.label= title;
			}
			theButton.classList.remove("h_disabled");
			//theButton.collapsed= false;
		}else{
			theButton.classList.add   ("h_disabled");
			//theButton.collapsed= true;
		}
		//HCPlusLib.myDumpToConsole("  setAudioButton("+butId+"):  collapsed="+theButton.collapsed+"    "+title);
	}
	
	this.onCommand_Menulist_withAudio= function(_mlist) { // NECESITO onselect tb, para tomar cuando cambio dsd about:config !
		
		do_all_Action_mlists(); // called at init() time also.
	};
	
	// attr "setsAudioButs"
	var arr_mlist= new Array();

	function do_all_Action_mlists( do_final_touch ) {

		const buts= {};
		buts["but_Sound_tic_1"  ]= "";
		buts["but_Sound_info1"  ]= "";
		buts["but_Sound_wheel1" ]= "";
		buts["but_Sound_action1"]= "";
				
		arr_mlist.forEach(function(mlist){
			
			/**
			var mlist= document.getElementById(mlist_id);
			if(!mlist){
				HCPlusLib.myDumpToConsole(" error:  not found elem. id= "+mlist_id);
				return;
			}
			**/

			if( !do_final_touch ){
				
				if(!mlist.selectedItem  ||  
					mlist.selectedItem != mlist.old_selectedItem ){
						
					mlist.old_selectedItem= mlist.selectedItem;
					
					do_all_Action_mlists( true );
					return;
				};
				
			}else{ // do_final_touch
				
				//HCPlusLib.myDumpToConsole("  mlist_id="+mlist_id+"   value= "+(mlist.selectedItem? mlist.selectedItem.value: "(no_selitem)"));

				if( mlist.selectedItem ){
					switch(mlist.selectedItem.value){
					case "closetab":		  buts["but_Sound_tic_1"  ]="   "; 	break;
					case "closeWithHistory":  buts["but_Sound_tic_1"  ]="   ";  buts["but_Sound_info1"]="    ";  break;
					case "advSelTab":		  buts["but_Sound_wheel1" ]="   "; 	break;
					case "zapFrames":		  buts["but_Sound_action1"]="   ";  break;
					case "zapImages":		  buts["but_Sound_action1"]="   ";  break;
					case "closeNewerWindow":  buts["but_Sound_action1"]="   ";  break;
					}
				}
			}
		}); // forEach
		
		if( do_final_touch ){
			for( prop in buts ){
				setAudioButton( prop,  buts[prop]);
			}
		}
	};
	
	
	//--------------------------------------------------------------------

	function get_mitem( holder, actionId ) {
		const mitem= holder.querySelector('menuitem[value="'+actionId+'"]');
		return mitem;
	}
	
	function attribute_addWord(_elem, _aName, _word){ // esto *PUEDE* agregar *UNA* copia extra de word con los espacios (y no importa para mi uso)
		var val= _elem.getAttribute(_aName);
		_word= " "+_word+" ";
		if( (""+val).indexOf(_word) < 0 ){ // no existe
			_elem.setAttribute(_aName, val + _word );
		}
	}
	
	function onLoad_process_Action_mlists() {

		arr_mlist.forEach(function(mlist){

			function process_token( actionId, tokenWord ) {
				if( !actionId ){
					return;
				}
				const defs_holder= document.documentElement.querySelector('#hc_recom_and_defaults');

				const target_mitem= get_mitem( mlist      , actionId ); 
				const def_mitem   = get_mitem( defs_holder, actionId );
				if(   def_mitem ){
					copyAttribute( target_mitem, def_mitem, "label");
				}
				//rget_mitem.setAttribute("is_"+tokenWord, "true");
				attribute_addWord( target_mitem, "hc_flags", tokenWord );
			}

			if(!mlist.h_onload){
				mlist.h_onload= true;

				mlist.getAttribute("recom").split(",").forEach(function(actionId) {	process_token(actionId, "recom" );	}); 
				mlist.getAttribute("defau").split(",").forEach(function(actionId) {	process_token(actionId, "defau" );	});
			}

			if( mlist.auto_tt){
				set_auto_tt(mlist); // copia varios attrs!!
			}

		}); // forEach
	};

	
	
	//------------------------------------
	
	function auto_tooltips() {
		try {
			do_auto_tooltips();
		} catch (ex) {
			HCPlusLib.debugError("",ex);
		}
	};

	//HCPlusLib.HcSingleton.arrTEST= new Array();	
	//HCPlusLib.HcSingleton.arrTEST.push(elem_mlist);
	
	function copyAttribute( dest, orig, aName ){
		if(          orig.hasAttribute   (aName) ){
			let tt=  orig.getAttribute   (aName); 
			dest         .setAttribute   (aName, tt);
		}else{ dest      .removeAttribute(aName    );	
		}
	};
	
	function set_auto_tt(mlist) {
		// set tooltips!
		const attr_value= mlist.value;
		if( mlist.hc_value != attr_value ){
			mlist.hc_value  = attr_value;

			var mitem= mlist.querySelector('menuitem[value="'+attr_value+'"]');
			if(!mitem ){
				mitem= document.createElement("box"); //empty elem
				mitem.setAttribute("tooltiptext", "("+attr_value+")"); // for devel mainly! 
				
				window.setTimeout(function(){
					mlist.setAttribute("tooltiptext", "("+mlist.value+")");
				}, 300);
			}

			copyAttribute(mlist, mitem, "tooltip"    );
			copyAttribute(mlist, mitem, "tooltiptext");

			// flags para default, recommeded, deprecated, invalid, etc....
			copyAttribute(mlist, mitem, "hc_flags");
			
			/**
			if( mlist.getAttribute("setsAudioButs") == "true" ){
				copyAttribute(mlist, mitem, "is_recom");
				copyAttribute(mlist, mitem, "is_defau");
			}
			**/
		}
	};

	function do_auto_tooltips() {
		const menulists= Array.slice(document.documentElement.querySelectorAll("menulist"));
		menulists.forEach(function(mlist) {
			if(!mlist.auto_tt){
				mlist.auto_tt= true;

				if( mlist.hasAttribute("tooltip") || mlist.hasAttribute("tooltiptext") ){
					HCPlusLib.myDumpToConsole("  warning:  menulist#"+mlist.id+" already has attr. tooltip*  ");
					return;
				}
				
				//if(!mlist.classList.contains("tt_onlyme") ){
				//    mlist.classList.add     ("tt_onlyme");
				//}
				
				mlist.addEventListener("select", function( event ) {
					set_auto_tt(event.target);
				}, false); // listener select
				
				set_auto_tt(mlist); // load 1st time! if addEvent didn't failed, hehe
			}
		});
	};

	
	// testing appearance glow when changing control/pref values! ------------------------------
	function do_Preference_controls() {
		
		function set_control(mlist, avoidStyle) {
			const attr_value= mlist.tagName=="checkbox"? mlist.checked: mlist.value;
			if( mlist.control_value != attr_value ){
				mlist.control_value  = attr_value;
				
				if( !avoidStyle ){
					mlist.setAttribute("h_changed", "true");
					
					setTimeout(function() {
						mlist.removeAttribute("h_changed");
					}, 300);
					
					// HCPlusLib.debugError("testeo de stack"); // el colorpickplus 'prende' al inicio
				}
			};			
		};
		
		const prefControls= Array.slice(document.documentElement.querySelectorAll("*[preference]"));
		prefControls.forEach(function(mlist) {
			if(!mlist.auto_prefControl){
				mlist.auto_prefControl= true;

				set_control(mlist, true);

				mlist.addEventListener("change", function( event ) {
					set_control(event.target);
				}, false); // listener select
				mlist.addEventListener("select", function( event ) {
					set_control(event.target);
				}, false); // listener select
				mlist.addEventListener("command", function( event ) {
					set_control(event.target);
				}, false); // listener select
				
				//set_control(mlist); // load 1st time! if addEvent didn't failed, hehe
			};
		});
	};
	
	
	// preferences ----------------------------------------------------------------
	
	/***
		const myBranch= Services.prefs.getBranch("extensions.hide_caption.");
		const actionPrefs= myBranch.getChildList("plus.action.")
		var strOut= "";
		actionPrefs.sort().forEach( function(pref){ 
			function inQuotes(str){ return '\"'+str+'\"';}
			
			var pVal= HCPlusLib.HcSingleton.getPrefPlus_type("extensions.hide_caption."+pref);
			strOut+= inQuotes(pref)+"  \t: " + inQuotes(pVal) + ", \n";
		});
		console.log(strOut);
		// SACAR dps: second_dblClick y mover al 1er lugar el '1ero' ...
	 ***/
	
	const action_prefs_default= {
			"plus.action.close_button_action"  				: "closetab", 
			"plus.action.close_button_act1_primary_dblclk"  : "none", 
			"plus.action.close_button_act2_secondary"  		: "hc_context", 
			"plus.action.close_button_act2_secondary_dblclk": "none", 
			"plus.action.close_button_act3_middle"  		: "undoCloseTab", 
			"plus.action.close_button_act3_middle_dblclk"  	: "none", 
			"plus.action.close_button_act_wheel"  		: "none", 
			"plus.action.close_button_act_wheelLeft"  	: "advSelTab", 
			"plus.action.close_button_act_wheelRight"  	: "advSelTab", 
			"plus.action.closebut_audio_action1"  	: "0.93><reserved><none", 
			"plus.action.closebut_audio_info1"  	: "0.93><reserved><none", 
			"plus.action.closebut_audio_tic1"  		: "0.92><reserved><none", 
			"plus.action.closebut_audio_wheel1"  	: "0.93><reserved><none", 
			"plus.action.closebut_audioY_notFound"  : "hc_default",
			"plus.action.closebut_mouseClick"  	: "false", 
			"plus.action.fxbut_act1_primary"  			: "mainPanelUI", 
			"plus.action.fxbut_act1_primary_dblclk"  	: "none", 
			"plus.action.fxbut_act2_secondary"  		: "hc_context", 
			"plus.action.fxbut_act2_secondary_dblclk"	: "none", 
			"plus.action.fxbut_act3_middle"  			: "superStop", 
			"plus.action.fxbut_act3_middle_dblclk"		: "none", 
			"plus.action.fxbut_act_wheel"  				: "Page_UpDown", 
			"plus.action.fxbut_act_wheelLeft"  			: "advSelTab", 
			"plus.action.fxbut_act_wheelRight"  		: "advSelTab", 	
	};
	
	const action_prefs_Recom1= {
			"plus.action.close_button_action"  				: "closeWithHistory", 
			"plus.action.close_button_act1_primary_dblclk"  : "none", 
			"plus.action.close_button_act2_secondary"  		: "undoCloseTab", 
			"plus.action.close_button_act2_secondary_dblclk": "none", 
			"plus.action.close_button_act3_middle"  		: "hc_context", 
			"plus.action.close_button_act3_middle_dblclk"  	: "ShowAllTabs", 
			"plus.action.close_button_act_wheel"  		: "Page_UpDown", 
			"plus.action.close_button_act_wheelLeft"  	: "advSelTab", 
			"plus.action.close_button_act_wheelRight"  	: "advSelTab", 
			"plus.action.closebut_audio_action1"  	: "0.50><reserved><chrome://global/content/accessibility/clicked.ogg", 
			"plus.action.closebut_audio_info1"  	: "0.24><reserved><chrome://browser/content/loop/shared/sounds/room-joined.ogg", 
			"plus.action.closebut_audio_tic1"  		: "0.24><reserved><Tick_recommended_1", 
			"plus.action.closebut_audio_wheel1"  	: "0.40><reserved><chrome://global/content/accessibility/virtual_cursor_key.ogg", 
			"plus.action.closebut_audioY_notFound"  : "hc_default",
			"plus.action.closebut_mouseClick"  	: "false", 
			"plus.action.fxbut_act1_primary"  			: "mainPanelUI", 
			"plus.action.fxbut_act1_primary_dblclk"  	: "FullScreen", 
			"plus.action.fxbut_act2_secondary"  		: "BrowserReload", 
			"plus.action.fxbut_act2_secondary_dblclk"	: "none", 
			"plus.action.fxbut_act3_middle"  			: "superStop", 
			"plus.action.fxbut_act3_middle_dblclk"		: "none", 
			"plus.action.fxbut_act_wheel"  				: "advSelTab", 
			"plus.action.fxbut_act_wheelLeft"  			: "closeNewerWindow", 
			"plus.action.fxbut_act_wheelRight"  		: "zapFrames", 	
	};
	
	const action_prefs_Recom2_annoyances= {
			"plus.action.close_button_action"  				: "closeWithHistory", 
			"plus.action.close_button_act1_primary_dblclk"  : "none", 
			"plus.action.close_button_act2_secondary"  		: "undoCloseTab", 
			"plus.action.close_button_act2_secondary_dblclk": "none", 
			"plus.action.close_button_act3_middle"  		: "hc_context", 
			"plus.action.close_button_act3_middle_dblclk"  	: "ShowAllTabs", 
			"plus.action.close_button_act_wheel"  		: "Page_UpDown", 
			"plus.action.close_button_act_wheelLeft"  	: "advSelTab", 
			"plus.action.close_button_act_wheelRight"  	: "advSelTab", 
			"plus.action.closebut_audio_action1"  	: "0.50><reserved><chrome://global/content/accessibility/clicked.ogg", 
			"plus.action.closebut_audio_info1"  	: "0.24><reserved><chrome://browser/content/loop/shared/sounds/room-joined.ogg", 
			"plus.action.closebut_audio_tic1"  		: "0.24><reserved><Tick_recommended_1", 
			"plus.action.closebut_audio_wheel1"  	: "0.40><reserved><chrome://global/content/accessibility/virtual_cursor_key.ogg", 
			"plus.action.closebut_audioY_notFound"  : "hc_default",
			"plus.action.closebut_mouseClick"  	: "false", 
			"plus.action.fxbut_act1_primary"  			: "closeNewerWindow", 
			"plus.action.fxbut_act1_primary_dblclk"  	: "FullScreen", 
			"plus.action.fxbut_act2_secondary"  		: "zapFrames", 
			"plus.action.fxbut_act2_secondary_dblclk"	: "NewTab", 
			"plus.action.fxbut_act3_middle"  			: "mainPanelUI", 
			"plus.action.fxbut_act3_middle_dblclk"		: "none", 
			"plus.action.fxbut_act_wheel"  				: "advSelTab", 
			"plus.action.fxbut_act_wheelLeft"  			: "superStop", 
			"plus.action.fxbut_act_wheelRight"  		: "BrowserReload", 
			"plus.action.tooltips"             : "blockFirst  std",
	};

	const action_prefs_Recom2_1= {
			//"extensions.hide_caption.plus.action.key_ctrl_w": "closeWithHistory  only", // no pq esto queda aunque se pruebe otros vd? ...
		
			"plus.action.close_button_act2_secondary"  		: "ShowAllTabs", 
			"plus.action.close_button_act2_secondary_dblclk": "undoCloseTab", 
			"plus.action.close_button_act3_middle_dblclk"  	: "NewTab", 
			
			"plus.action.fxbut_act2_secondary_dblclk"	: "toggleCssDevPx", 
			"plus.action.fxbut_act3_middle_dblclk"		: "DynBars_toggle", 
	};
	
	function storePrefs_fromArray( prefs_obj, _elem ){

		if( _elem  &&  !confirm( _elem.getAttribute("label") ) ){
			return;
		}
		for( _pref in prefs_obj ){
			//console.log(_pref);
			if( prefs_obj[_pref] == "hc_default" ){
				Services.prefs.clearUserPref(          "extensions.hide_caption." + _pref, prefs_obj[_pref]);
			}else{
				HCPlusLib.HcSingleton.setPrefPlus_type("extensions.hide_caption." + _pref, prefs_obj[_pref]);
			}
		}
	};
	
	this.storePrefs_default	 = function( _elem ){			storePrefs_fromArray(action_prefs_default			, _elem);	};
	this.storePrefs_Recom1	 = function( _elem ){			storePrefs_fromArray(action_prefs_Recom1 			, _elem);	};
	this.storePrefs_Recom2_annoyances = function( _elem ){	storePrefs_fromArray(action_prefs_Recom2_annoyances	, _elem);	};
	
	this.storePrefs_Recom2_1 = function( _elem ){			if( !confirm( _elem.getAttribute("label") ) ){	return;	}
	/* */													storePrefs_fromArray(action_prefs_Recom2_annoyances	, null);
	/* */						    setTimeout(function(){	storePrefs_fromArray(action_prefs_Recom2_1			, null);	}, 10); }

	
	
	// path manipulation! ----------------------------------------------
	
	var base_loc_path = null;
	var htcp_locale_lcase= null;
	
	
	function removeParams( _str ){
		  var ix= _str.indexOf("?");
		  return ix >= 0 ?  _str.substring(0, ix): _str;
	};

	function calc__base_loc_path() {
		if( base_loc_path ){
			return;
		}
		
		/***
		// esto era cuando contruia mis url en base a 'override's!!
		filename_optionsXul= filename_optionsXul.toLowerCase();
		if( filename_optionsXul.startsWith(                 "chrome://hidecaptionplus_") ){
			var url_lang_token= filename_optionsXul.replace("chrome://hidecaptionplus_", "");
			url_lang_token= url_lang_token.substring(0, url_lang_token.indexOf("/"))
			
			base_loc_path = "chrome://hidecaption_loc/content/"+url_lang_token+"/";
		}else{
			
			base_loc_path = "chrome://hidecaptionplus/locale/"; // DEFAULT LANGUAGE!
		}
		***/
		
		var optionsXul_filename = filename_optionsXul.indexOf("options_in.xul") >= 0? "options_in.xul" : "options.xul";
		
		base_loc_path= removeParams( filename_optionsXul.replace("content/"+optionsXul_filename, "locale/") );
		
		
		htcp_locale_lcase= (""+document.documentElement.getAttribute("hctp_locale")).trim().toLowerCase(); 

		HCPlusLib.myDumpToConsole("base_loc_path    = "+base_loc_path );
		HCPlusLib.myDumpToConsole("htcp_locale_lcase= "+htcp_locale_lcase);
	};

	this.OpenReadme_inMostRecentWin= function(event, basePath) {

		// path manipulation
		calc__base_loc_path();
		
		HCPlusLib.OpenReadme_inMostRecentWin(null, base_loc_path);
	};

	
	// ----------------------
	
	function GetStringFromName_plus( _sKey, hc_localeStrBundle ) {
		try {
			return hc_localeStrBundle.GetStringFromName( _sKey );
		} catch (ex) {
			HCPlusLib.debugError("Ignoring error: "+ex, ex);
			return "(internal error for msg: '"+_sKey+"')";
		}
	};
	
	this.on_popupNotification	= function( _elem ){
		const msg_key= _elem.value;
		if( msg_key == "" ){
			return;
		}
		
		const theWindow= HCPlusLib.getMostRecentWindow();

		theWindow.focus();

		
		// path manipulation
		calc__base_loc_path();

		const hc_localeStrBundle= Services.strings.createBundle( HCPlusLib.url_addTimestamp(base_loc_path + "main.properties") );

		var value_txt= msg_key == "newversion_msg__ALL" ?
				HCPlusLib.HcSingleton.special_getStringFromName__newversion_msg__ALL( hc_localeStrBundle ):
				GetStringFromName_plus( msg_key, hc_localeStrBundle );
		
		var mUrl= HCPlusLib.url_addTimestamp(base_loc_path + "newversion.html");
		theWindow.HCPlusLib.popupNotification( value_txt,  // "newversion_msg" 
				216000, "hctp_TEST_MSGS", null, /* "addons-notification-icon" */
		        {
					addClose:  true,  // ADD CLOSE as Secondary ENTRY!!
					label:     GetStringFromName_plus( "newversion_mainAction"    , hc_localeStrBundle ),
					accessKey: GetStringFromName_plus( "newversion_mainAction_key", hc_localeStrBundle ),
					callback: function(){
						HCPlusLib.openUILinkIn( theWindow, mUrl,"tab");
					} 
		        }); /* 6 hours timeout */

		// CLEANING CACHE !!!
    	Services.strings.flushBundles();
	};

	
	// MULTILANGUAGE PANEL !!! -------------------------------------------------------
	this.botTransNotes_onpopupshowing= function( event, _elem ) {
		// path manipulation + locale info
		calc__base_loc_path();
		
		HCPlusLib.querySelectorAll_forEach( _elem, "button[h_locale='" + htcp_locale_lcase + "']", function( el ) {
			el.classList.add("strong");
			el.setAttribute("tooltip", "h_lang_status");
		});
	};
	this.openDialog= function(url, winName) {
		
		url= HCPlusLib.url_addTimestamp(url);
		
		if( isInsideFrame ){
			HCPlusLib.openAndReuseOneTabPerURL(url, true); // filter '?' and params!!!
		}else{
			var dlg= window.openDialog( url, winName, 'chrome,titlebar,toolbar,scrollbars=yes,resizable=yes,centerscreen,dialog=no');
			dlg.focus();
		}
	};


	/*** jode el menulist cuando deberia quedar EN BLANCO (cuando la opcion cargada no esta en la lista)
	 
	//this.put_all__hc_caption();

	this.put_all__hc_caption = function() {
		window.setTimeout(function(){
			HCPlusLib.querySelectorAll_forEach( document, "*[hc_caption]", function(elem){
				put_hc_caption(elem);
			});
		}, 3000);
	};
	function put_hc_caption(elem){
		const hc_caption= elem.getAttribute( "hc_caption");
		if( hc_caption ){
			elem.removeAttribute("hc_caption");
			const vbox = document.createElement("vbox");
			const label= document.createElement("label");
			label.setAttribute( "class",   "hc_caption  default_label");
			label.setAttribute( "value",  hc_caption);
			elem.parentNode.insertBefore( vbox, elem );
			vbox.insertBefore( label, null );
			vbox.insertBefore( elem , null  );
		}
	};
	***/

	
})();


