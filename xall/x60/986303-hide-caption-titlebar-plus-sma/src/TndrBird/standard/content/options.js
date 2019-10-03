

//var HideCaption_opt= new HideCaption_opt_class();

// CLASS
var HideCaption_opt= new (function HideCaption_opt_class(){

	
	this.Init= function() {

		//load debug flag!!
		HCPlusLib.LoadDebugFlag();

		//HCPlusLib.myDumpToConsole("  calling Init() ");
		
		//for using observers here too <- total mess !!
		//HCPlusLib.Load_AllOptions();
		
		//do LOAD ...
		//LoadOrSavePlus(true );
		
		this.get_mainPrefWindow().setAttribute("platformPlus"    , HCPlusLib.getPlatformPlus() );
		this.get_mainPrefWindow().setAttribute("hcp_platformPlus", HCPlusLib.getPlatformPlus() ); // to make equal to mainwindow (:root)
		
		this.do_onPaneLoad(); // Fx10: no estaba llamando al del 1er y ultimo panel por ej!
		
		
		// TEMP solution for 1 only panel visible!
		try{
			//cument.documentElement.setAttribute( "lastSelected", "paneContent");
			document.documentElement.showPane( document.getElementById("paneContent") );
		}catch(ex){
			HCPlusLib.debugError     ("  in mydisable(): "+ex, ex);
		}
		
	};
	
	this.get_mainPrefWindow = function() {
		if( ! this.mainPrefWindow ){
			this.mainPrefWindow= document.getElementsByTagName('prefwindow')[0];
		}
		return this.mainPrefWindow;
	};
	this.mainPrefWindow= null;
	
	
	var hcp_runningInit= false;

	
	this.do_onPaneLoad = function do_onPaneLoad(){

		hcp_runningInit= true;
		
		//HCPlusLib.myDumpToConsole("  calling Init() - do_onPaneLoad()  ");
		
		try{
			//execute onchange()s !!
			onChangeAll();
		}catch(ex){
			HCPlusLib.debugError     ("  in mydisable(): "+ex, ex);
		}
		
		hcp_runningInit= false;
	};

	function onChangeAll(){

		//execute onchange() !!
		//undefined_HideCaption.timeDelayed( function(){

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
	function LoadOrSavePlus(isLoad){
		//Gives ERROR when using SEPARATE-XUL_FILES for panes !!
		//HCPlusLib.option_xxxxxxxxxxx.      LoadOrSave_Radiogroup(isLoad, "use_caption_id");

		return true;
	};
	*/

	/*
	//prefpane - helpURI <-  NO!!!, working is ->  helpTopic
	function openPrefsHelp() {
		var helpTopic = document.getElementsByTagName("prefwindow")[0].currentPane.helpTopic;
		var url= 'chrome://HideCaptionTb/locale/readme.html';
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
	    var _theElem= document.getElementById(_prefId);
	    if( _theElem!=null   &&   _value !== null && _value !== undefined ){
	        _theElem.value= _value;
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
		var pref_fx4_titlebar= ""; //HCPlusLib.getPlatformPlus() == "windows"? 
		                           //   HCPlusLib.GetPref_plus( HCPlusLib.CHAR_PREF, "plus.fx4_titlebar", null) :
		                           //   "ti_non_windows";

		//Feb 2012: new setting  SYSTEM BUTTONS Enabled !!
		var e_sysbuttons_enable= getElemById("sysbuttons_enable");
		var e_sysbut_winappear = getElemById("adv.sysbut_winappear");
		var enable_system_buts=  e_sysbuttons_enable && e_sysbuttons_enable.value == true &&
		                         e_sysbut_winappear  && e_sysbut_winappear.value == "";
		
		e_location.disabled  = enable_system_buts || pref_fx4_titlebar == 'ti_enabled';
		e_loc_nomax.disabled = enable_system_buts || pref_fx4_titlebar == 'ti_enabled' || pref_fx4_titlebar == 'ti_unmaximized';
		//HCPlusLib.myDumpToConsole("");
		
		var locs_disabled        = 	(e_location.disabled  || e_location.value  == 'bloc_hidden') &&               
									(e_loc_nomax.disabled || e_loc_nomax.value == 'bloc_hidden');
									 
		var locs_non_micro       = 	getValue_plus(e_location ) != 'bloc_micro'  && 
									getValue_plus(e_loc_nomax) != 'bloc_micro' ;
		
		this.mydisable(  'mmc_buttons_canfloat' , locs_non_micro );
		
		this.mydisable(  'mmc_buttons_skin'     , locs_disabled  );
		this.mydisable(  'close_button_action'  , locs_disabled  ); // action for close button!
	};
	

	this.onChange_fx4_titlebar = function(self){
		
		var thySelf= this;
		
		//setAttribute(...)
		this.opt_setAsDomAttribute(self);
		
		
		var id_tabs_drawInTitlebar= 'tabs_drawInTitlebar';
		
		var val_tabs_dInTitle= thySelf.pref_getValue(id_tabs_drawInTitlebar);
		
		//enable/disable here !
	    this.mydisable(   id_tabs_drawInTitlebar, self.value != 'ti_enabled');

		this.mydisable(  "adv.sysbut_winappear" , self.value == 'ti_enabled' );
		
		this.putGrayAsDisabled_attr( "redlabel_system_but_always", self.value == 'ti_enabled' ); //red-text
				
	    if( !hcp_runningInit ){
	    	
	    	//TODO : In the future I have to check this for CONCURRENCY!! 
	    	
		    if( self.value == 'ti_enabled' && val_tabs_dInTitle ){
		    	
		    	//alert(val_tabs_dInTitle+"   "+ typeof(val_tabs_dInTitle) );
		    	
		    	//toggles back and forth  with delay....
		    	
		    	thySelf.pref_setValue(id_tabs_drawInTitlebar, false);
			    setTimeout( function(){
			    	thySelf.pref_setValue(id_tabs_drawInTitlebar, val_tabs_dInTitle);
			    }, 300);
		    }
	    }

	    //disable all these ONLY on WINDOWS !  (let Linux,. etc use them!, when there is NOT fx4-titlebar )
	    if( HCPlusLib.getPlatformPlus() == "windows" ){

	    	mydisable(         'show_custom_caption', 	self.value != 'ti_never');
	    	mydisable(         'show_custom_bdresizers',self.value != 'ti_never');

	    	mydisable(         'sysbuttons_hide_max', 	self.value == 'ti_enabled');
	    	mydisable(         'sysbuttons_hide_nomax', self.value == 'ti_enabled' || self.value == 'ti_unmaximized');

	    	thySelf.onChange_mmc_location();
	    	//mydisable(         'mmc_buttons_location', 	self.value == 'ti_enabled');
	    	//mydisable(         'mmc_buttons_loc_nomax',	self.value == 'ti_enabled' || self.value == 'ti_unmaximized');
	    	
	    	//disable(         'mmc_buttons_skin',   	self.value == 'ti_enabled'); //redundant
	    	
	    	thySelf.refresh_tab_marginTop_delta_all();
	    	
	    }// windows only

	    thySelf.refresh_fx_buttonicons(); // 'home.buttonicon_max' , etc
	    
	};

	
	
	this.refresh_fx_buttonicons = function(){
		
		//here for all systems, windows, linux, etc 
		var pref_fx4_titlebar = ""; //HCPlusLib.GetPref_plus( HCPlusLib.CHAR_PREF, "plus.fx4_titlebar", null);
		var elem_home_enabled = document.getElementById(  'home.enabled'  ); //ignoring null
		var home_enabled      = elem_home_enabled? elem_home_enabled.value: true; //assumes enabled if can't find it yet (when executing from other panel...)
		
		getElemById_orDummy( 'home.buttonicon_max'  ).disabled = !home_enabled || pref_fx4_titlebar == 'ti_enabled';
		getElemById_orDummy( 'home.buttonicon_nomax').disabled = !home_enabled || pref_fx4_titlebar == 'ti_enabled' || pref_fx4_titlebar == 'ti_unmaximized';
	};
	
	
	this.refresh_tab_marginTop_delta_all = function(){
		
		//WINDOWS only!
		var pref_fx4_titlebar= ""; // HCPlusLib.getPlatformPlus() == "windows"? 
		                           //   HCPlusLib.GetPref_plus( HCPlusLib.CHAR_PREF, "plus.fx4_titlebar", null) :
		                           //   "ti_non_windows";
		
		var tabsInTitlebar_enabled= false; //getBoolPref( "browser.tabs.drawInTitlebar" ) && pref_fx4_titlebar == 'ti_enabled';
		
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
	
	this.opt_setAsDomAttribute = function(prefElem){
		
		var attrName= prefElem.name;
		attrName= attrName.replace("extensions.hide_caption.plus.","");
		attrName= "dz_" + attrName.replace(".","_");
		
		this.get_mainPrefWindow().setAttribute(attrName, ""+prefElem.value );
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
			alert(' Option turned '+(elem.checked?'on':'off')+'. \n Checkbox will disappear when focus goes away.');
		}   
	};

})();

