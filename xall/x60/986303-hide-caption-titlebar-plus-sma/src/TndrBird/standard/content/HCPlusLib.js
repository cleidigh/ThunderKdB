
var HCPlusLib = {


  Hcp_PrefValue: function Hcp_PrefValue( _TYPE_PREF, _prefKey, _initFunction, _defaultValue, _usesPrefObserver ){

	var prefKey     = _prefKey;
	var initFunction= _initFunction;
	var value       = null;
	var defaultValue= _defaultValue;
	
	var usesPrefObserver= _usesPrefObserver;
	
	// methods! ---------------------
	
	this.getPrefKey= function(){ return prefKey; };
	
	this.getVal= function()    {
		//HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+"):   getVal() will return: "+value ); 
		return value; 
	};
	this.setVal= function(_val){ value= _val;  };

	this.setInitFunction= function(__initFunction){
		initFunction= __initFunction;
	},
	this.setDefaultValue= function(__defaultValue){
		defaultValue= __defaultValue;
	},
	
	//startup  &   shutdown !!
	this.onStartup = function() { //onLoad() 1 time only func
		if( usesPrefObserver ){
			//HCPlusLib.preferencesModule.observe( prefKey, this.observerPref, this);

			HCPlusLib.gPrefConfig_plus.addObserver( prefKey, this, false); //false= holds a strong reference to aObserver. ONLY for Gecko/Fx 13 +
			
			HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").onStartup()");
		}
	};
	this.onShutdown= function() {
		if( usesPrefObserver ){
			//HCPlusLib.preferencesModule.ignore ( prefKey, this.observerPref, this);

			HCPlusLib.gPrefConfig_plus.removeObserver( prefKey, this );
			
			HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").onShutdown()");
		}
	};
	//OBSERVER !!
	this.observe= function (subject, topic, data) {
		var dummySub = "*";
		var dummyData= "*";
		if (topic == "nsPref:changed"){
			if (data == prefKey){

				//this.Load(); // load prints ANOTHER redundant line in log...
				value= HCPlusLib.GetPref_plus( _TYPE_PREF, prefKey, defaultValue);
				this.Init();
				
				HCPlusLib.myDumpToConsole(" called  Hcp_PrefValue("+prefKey+").observe("+ dummySub +", "+ topic +", "+ dummyData +"):   new value: "+value+"" );
				
			}else{      
				//"tab_marginTop_delta_nomax" llama TAMBIEN a "tab_marginTop_delta" , y bueh ....
				//HCPlusLib.myDumpToConsole( "  .... (not an error )  (data != key      ) ignored call to observe for "+prefKey+":  "+ dummySub +", "+ topic +", "+ dummyData);
			}
		}else{ HCPlusLib.myDumpToConsole(    "  .... (not an error )  (topic != changed ) ignored call to observe for "+prefKey+":  "+ dummySub +", "+ topic +", "+ dummyData); 
		} 
	};
	
	/***
	this.observerPref= function(_newValue) {
		value= _newValue;
		HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").observerPref():   new value: "+value+"");
		this.Init();
	};
	***/
	
	this.Init= function(){
		try{
			if( initFunction && initFunction != null ){
				initFunction(this);
			
				//PlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").Init() internal-func called.   value="+value ); 
			}else{
				HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").Init() internal-func NOT found." ); 
			}
        }catch(ex) {
			HCPlusLib.debugError     ("Hcp_PrefValue("+prefKey+").Init():  ERROR: "+ex, ex);
        }
	};

	this.Load= function() {
		value= HCPlusLib.GetPref_plus( _TYPE_PREF, prefKey, defaultValue);
		HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").Load():   new value: "+value+", defaultValue: "+defaultValue+"" );
		this.Init();
	};
	
	this.Save= function() {
	    HCPlusLib.do_SetPref_plus(     _TYPE_PREF, prefKey, value       );
		//lue= HCPlusLib.GetPref_plus( _TYPE_PREF, prefKey, defaultValue);
		HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").Save():       value: "+value+"" );
		this.Init();
	};
	
	this.Load_newValue= function() {
		if( usesPrefObserver ){
			return; // RETURN;
		}
		value= HCPlusLib.GetPref_plus( _TYPE_PREF, prefKey, defaultValue);
		HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").Load_newValue():   new value: "+value+", defaultValue: "+defaultValue+"" );
		this.Init();
	};
	
	this.LoadOrSave_CheckBox  = function(isLoad, _checkBoxName) {
		if( usesPrefObserver ){
			return; // RETURN;
		}
		try{
			if(_TYPE_PREF !== HCPlusLib.BOOL_PREF){
				throw ("Bad TYPE_PREF !!:"+_TYPE_PREF+"  - must be:"+HCPlusLib.BOOL_PREF );
			}
			
			if(isLoad){		//value= pref.getBoolPref(prefKey);
				document.getElementById(_checkBoxName).checked = (value= HCPlusLib.GetPref_plus(HCPlusLib.BOOL_PREF, prefKey, defaultValue));
    		}else{ 			//value= document.getElementById(_checkBoxName).checked;
				HCPlusLib.do_SetPref_plus(HCPlusLib.BOOL_PREF, prefKey, value= document.getElementById(_checkBoxName).checked);
			}
			HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").LoadOrSave_CheckBox("+isLoad+","+_checkBoxName+"):    value=" + value );
        }catch(ex) {
			HCPlusLib.debugError     ("Hcp_PrefValue("+prefKey+").LoadOrSave_CheckBox("+isLoad+","+_checkBoxName+"):  ERROR: "+ex, ex);
        }
	};
	
    this.LoadOrSave_Radiogroup= function(isLoad, radioGrpId) { //uses lowercase prefValues!!!
		if( usesPrefObserver ){
			return; // RETURN;
		}
      try {
    	if(isLoad){
            value = (""+HCPlusLib.GetPref_plus(HCPlusLib.CHAR_PREF, prefKey, defaultValue)).toLowerCase();
            var radioElem = document.getElementById(""+value);
            if (radioElem)
                document.getElementById(radioGrpId).selectedItem = radioElem;
    	}else{ //save
	        var radioElem = document.getElementById(radioGrpId).selectedItem;
    	    if (radioElem && radioElem.id){
        	    HCPlusLib.do_SetPref_plus(HCPlusLib.CHAR_PREF, prefKey, ""+radioElem.id);
				value= ""+radioElem.id;
			}
    	}
		HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").LoadOrSave_Radiogroup("+isLoad+ "):    value=" + value );
      }
      catch(ex) {
		HCPlusLib.debugError     ("Hcp_PrefValue("+prefKey+").LoadOrSave_Radiogroup("+isLoad+ "):  ERROR: "+ex, ex);
      }
    };
	
	this.setAsDomAttribute     = function(element, onlyForTrue) {
		if(element){
			var attrName= prefKey;
			attrName= attrName.replace("plus.","");
			attrName= attrName.replace(".","_");

			if( onlyForTrue && !value ){
				element.removeAttribute('dz_'+attrName );
			}else{  //put attr!
				HCPlusLib.setAttribute_withBkp   (element, 'dz_'+attrName, value );
			}
		}else{
			HCPlusLib.debugError     ("Hcp_PrefValue("+prefKey+").setAsDomAttribute("+element+ "):  ERROR: bad element");
		}
	};
	
	this.putDomAttribute_ifTrue= function(element) {
		this.setAsDomAttribute(element, true); //onlyForTrue
	};
	
  },


  	Hcp_Point: function Hcp_Point(){
		
		this.X= -10000;
		this.Y= -10000; 
		
		//var X,Y;
		this.getX = function(){ return this.X; };
		this.getY = function(){ return this.Y; };
		
		this.setX = function(_p){ this.X= parseInt(_p); return this; };
		this.setY = function(_p){ this.Y= parseInt(_p); return this; };
		
		this.myclone= function(){
			var aPos= new Hcp_Point();
			aPos.X= this.X;
			aPos.Y= this.Y;
			return aPos;
		};
		
		this.getSum= function( _point2 ){
			var aPos= new Hcp_Point();
			aPos.X= this.X + _point2.X;
			aPos.Y= this.Y + _point2.Y;
			return aPos;
		};
		
		this.getDiff= function( _point2 ){
			var aPos= new Hcp_Point();
			aPos.X= this.X - _point2.X;
			aPos.Y= this.Y - _point2.Y;
			return aPos;
		};
		
		this.enforceMinimumValue= function( _min ){
			if( this.X < _min.X ){ this.X = _min.X; };
			if( this.Y < _min.Y ){ this.Y = _min.Y; };
			return this;
		};
		
		this.toString= function(){
			return "Hcp_Point[ "+this.X+", "+this.Y+" ]";
		};
  	},

  	Hcp_Pos: function Hcp_Pos(){
		
		this.initializedForUse= false;
		
		this.state= -1;
		
		this.X= -10000;
		this.Y= -10000; 
		this.W= -10000;
		this.H= -10000;
		
		//var X,Y,W,H;
		this.getX = function(){ return this.X; };
		this.getY = function(){ return this.Y; };
		this.getW = function(){ return this.W; };
		this.getH = function(){ return this.H; };
		
		this.setX = function(_p){ this.X= parseInt(_p); };
		this.setY = function(_p){ this.Y= parseInt(_p); };
		this.setW = function(_p){ this.W= parseInt(_p); };
		this.setH = function(_p){ this.H= parseInt(_p); };
		
		this.getCenterPt= function(){
			var aPos= new Hcp_Point();
			aPos.X= this.X + (this.W / 2);
			aPos.Y= this.Y + (this.H / 2);
			return aPos;
		};
		this.setCenterX= function(_cX){
			this.setX( _cX - this.getW() /2 );
		};
		this.setCenterY= function(_cY){
			this.setY( _cY - this.getH() /2 );
		};
		
		
		this.myclone= function(){
			var aPos= new Hcp_Pos();
			aPos.initializedForUse= this.initializedForUse;
			aPos.state            = this.state;
			aPos.X= this.X;
			aPos.Y= this.Y;
			aPos.W= this.W;
			aPos.H= this.H;
			return aPos;
		};
		
		this.toString= function(){
			return "Hcp_Pos[ (init'd:"+this.initializedForUse+"): ("+this.state+"), "+this.X+", "+this.Y+", "+this.W+", "+this.H+" ]";
		};
		
		
  	},

  	// ------------------------- vars -----------------------------------------------------

	//preferencesModule: null, //new Preferences("xxx."),

	CHAR_PREF: "CHAR_PREF",
	BOOL_PREF: "BOOL_PREF",
	INT_PREF:  "INT_PREF",

	//option_adv_spaceForButtons_inTabbar: /* will see how i'll use it ...  */
	//	new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.adv.spaceForButtons_inTabbar"   , null, "st_auto"),
	
	option_close_button_action            : null,

	arrayOptions: new Array(),

	sKey_plus_home_enabled                   : "plus.home.enabled",
	sKey_plus_home_mainmenu_floating         : "plus.home.mainmenu_floating",
	sKey_plus_home_floating_extrabox         : "plus.home.floating_extrabox",
	//deprecated......
	sKey_plus_home_mainmenu_float_oldautohide: "plus.home.mainmenu_float_oldautohide",

	sKey_plus_fx4_titlebar          : "plus.fx4_titlebar",
	
	sAttr_hcp_fx4_titlebar_visible  : "hcp_fx4_titlebar_visible",

	
	
	set_Firefox_button: function  func__set_Firefox_button(fxBut, pVal){
			
			if(!HCPlusLib.fxButLabel){
				HCPlusLib.fxButLabel = fxBut.getAttribute("label");
				HCPlusLib.fxBut_1stletter= HCPlusLib.fxButLabel.substring(0, 1);
			}
			
			fxBut.setAttribute("hcp_appbutton_style", pVal);
			if( pVal=="fx_home.png"       || 
				pVal=="fx_home_med0.png"  ||
				pVal=="fx_home_med.png"   ){
				fxBut.setAttribute("label", HCPlusLib.fxButLabel);
			}else{
				fxBut.setAttribute("label", HCPlusLib.fxBut_1stletter);
			}
	},

	doButtonWidth: function(){
			var appmenubutton_placeholder        = document.getElementById("hctp-appmenu-button-placeholder");
			appmenubutton_placeholder.width      = document.getElementById("hctp-appmenu-button").boxObject.width; //-container
			
			var appmenubutton_placeholder_nomax  = document.getElementById("hctp-appmenu-button-placeholder-nomax");
			appmenubutton_placeholder_nomax.width= document.getElementById("hctp-appmenu-button-nomax").boxObject.width; //-container
	},
	
    Load_AllOptions: function() {

    	HCPlusLib.getConfig_plus(); //load pref object

		this.arrayOptions= new Array();
		
		
		// HOME TOOLBAR SECTION --------------------
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", HCPlusLib.sKey_plus_home_enabled,           function(option_hPrefVal){
			
			option_hPrefVal.setAsDomAttribute(HideCaption.mainW);
			option_hPrefVal.setAsDomAttribute(document.getElementById("hctp-appmenu-button-cont-fixed")); // for floating menu

			// TURN OFF main-menu if applicable!!!
//			if( ! option_hPrefVal.getVal() ){
//				HCPlusLib.do_SetPref_plus(HCPlusLib.BOOL_PREF, HCPlusLib.sKey_plus_home_mainmenu_floating, false);
//			}
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons();

		  }, true, 				true )  ); // usesObserver!!

		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", HCPlusLib.sKey_plus_home_mainmenu_floating, function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("menubar-items"));
			option_hPrefVal.setAsDomAttribute(document.getElementById("navigation-toolbox")); //for fixing menubar autohide.
			option_hPrefVal.putDomAttribute_ifTrue(HideCaption.mainW);
			HideCaption.HomeToolbarHandler.setOptionFloatingMenu(option_hPrefVal.getVal());
		  }, true, 				true )  ); // usesObserver!!
		/*
		// .... home_floating_extrabox
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", HCPlusLib.sKey_plus_home_floating_extrabox, function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("menubar-items"));
			option_hPrefVal.putDomAttribute_ifTrue(HideCaption.mainW);
		  }, true,				true )  ); // default=true, usesObserver!!

		//deprecated......
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", HCPlusLib.sKey_plus_home_mainmenu_float_oldautohide, function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("navigator-toolbox")); //for fixing menubar autohide.
		  }, false, 				true )  ); // default=false, usesObserver!!
		*/
		//floating_activeMillis
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "INT_PREF" , "plus.home.floating_activeMillis"    , function(option_hPrefVal){
			HideCaption.HomeToolbarHandler.setActive_millis(option_hPrefVal.getVal());
		  },   0,              true )  ); // usesObserver!!
		//floating_inactiveMillis
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "INT_PREF" , "plus.home.floating_inactiveMillis"  , function(option_hPrefVal){
			HideCaption.HomeToolbarHandler.setInactive_millis(option_hPrefVal.getVal());
		  }, 150,              true )  ); // usesObserver!!
		
		
		
		// icons ...
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.home.buttonicon_max"   , function(option_hPrefVal){

			HCPlusLib.set_Firefox_button(document.getElementById("hctp-appmenu-button"      ), option_hPrefVal.getVal());
				
			//HCPlusLib.doButtonWidth();
			//setTimeout( HCPlusLib.doButtonWidth, 200);
			
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons( true );  // includes doButtonWidth() !
		  }, "fx_home_small.png", true )  ); // usesObserver!!
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.home.buttonicon_nomax" , function(option_hPrefVal){

			HCPlusLib.set_Firefox_button(document.getElementById("hctp-appmenu-button-nomax"), option_hPrefVal.getVal());
			
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons( true );  // includes doButtonWidth() !
		  }, "fx_home.png"        , true )  ); // usesObserver!!

		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.home.button_appear" , function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(HideCaption.mainW);
		  }, "default"        , true )  ); // usesObserver!!


  		//close_button_action
		this.option_close_button_action= new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.close_button_action"   , function(option_hPrefVal){
		  }, "closetab" ,       true );
		this.arrayOptions.push( this.option_close_button_action ); // default_action,  usesObserver!!


        this.arrayOptions.push(	this.close_firsttime_alert = 
                                         new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.action.close_firsttime_alert" , function(option_hPrefVal){
		  }, true,   			true ) );
		

		
		
		
		
		//set inits...
		
/***		
//		//preferencesModule !!
//		try { // for testing in linux-mint+vmware
//			Components.utils.import("resource://HideCaptionTb/Preferences.js", HCPlusLib);
//		}catch(ex) {
//			HCPlusLib.myDumpToConsole("ignoring error (warn) in Components.utils.import()" + ex );
//			var filePreferencesJs= "file:///home/----/Documents/----xxxxxxx@addons.mozilla.org/chrome/resource/Preferences.js";
//			Components.utils.import( filePreferencesJs, HCPlusLib);
//
//			HCPlusLib.debugError("ERROR: "+ex, ex);
//		}
//		HCPlusLib.preferencesModule= new HCPlusLib["Preferences"]("extensions.hide_caption.");
***/		
		
		//onStartup()
		for(var iop=0; iop<HCPlusLib.arrayOptions.length; iop++){
			HCPlusLib.arrayOptions[iop].onStartup();
		}
		
		//load...
		setTimeout(function(){
			HCPlusLib.Do_Load_AllOptions();
		}, 20 );

		
		
		function set_All_EventListeners( bAdd ){
			
			HideCaption.set_EventListener( bAdd, window, "fullscreen", HCPlusLib.onFullScreen, false);  // useCapture= true??

			// Fx APP-MENU
			var appmenuPopup = document.getElementById("appmenu-popup");
			if( appmenuPopup ){ // ONLY exists in TBird 17+
				HideCaption.set_EventListener( bAdd, appmenuPopup, "popupshown",  HCPlusLib.onAppmenuPopup, false);
				HideCaption.set_EventListener( bAdd, appmenuPopup, "popuphidden", HCPlusLib.onAppmenuPopup, false);
			}
		}

		set_All_EventListeners( true );

		// UNLOADERS ------------------------------ 
		HideCaption.unloaders.push(function() {
			set_All_EventListeners( false );  // HCPlusLib
		});
	},
    Do_Load_AllOptions: function() {
		// Load() ALL !!
		for(var iop=0; iop<HCPlusLib.arrayOptions.length; iop++){
			HCPlusLib.arrayOptions[iop].Load();
		}
	},

    Do_Load_newValue_AllOptions: function() {
		// Load() ALL !!
		for(var iop=0; iop<HCPlusLib.arrayOptions.length; iop++){
			HCPlusLib.arrayOptions[iop].Load_newValue();
		}
	},
	
	/*
    Init_AllOptions: function() {
		// Init() ALL !!
		for(var iop=0; iop<HCPlusLib.arrayOptions.length; iop++){
			HCPlusLib.arrayOptions[iop].Init();
		}
	}, 
	*/
	
    onShutDown_lib: function() {
		try{
			//onShutdown()
			for(var iop=0; iop<HCPlusLib.arrayOptions.length; iop++){
				HCPlusLib.arrayOptions[iop].onShutdown();
			}
		}catch(ex){ HCPlusLib.debugError("error: "+ex, ex); };
	},


	// ------------------------------------------------------------------------------

	onFullScreen:  function() {

		setTimeout( function(){

			HCPlusLib.set_tab_marginTop_delta();
			
			//alert("fullScreen= "+window.fullScreen);
		  }, 100);
	},
	
	tab_marginTop_delta      : 0,
	tab_marginTop_delta_nomax: 0,
	
	nav_toolbox: null,
	
	pref__browser_tabs_drawInTitlebar: false,
	
	//tabsintitlebar_enabled_old: false,
	
	set_tab_marginTop_delta: function() {
		
		HCPlusLib.do_set_tab_marginTop_delta();
		
		setTimeout( function(){
			
			/* TODO: no anda cuando dsd 'print preview' por ej TOCA el 'tabsintitlebar'..., etc
			// "tabsintitlebar" part
			var tabsintitlebar_enabled = document.documentElement.getAttribute("tabsintitlebar") == "true"; // not using 'TabsInTitlebar.enabled' for code compatibility future proof...
			if( tabsintitlebar_enabled && ! HCPlusLib.tabsintitlebar_enabled_old ){
				
				HCPlusLib.nav_toolbox.style.setProperty("margin-top", 0+"px", "important");

				//special HACK, fooling TabsInTitlebar calculation.
				try {
					//DELETE flag 1st!
					document.documentElement.removeAttribute("tabsintitlebar");
					TabsInTitlebar._update();
				} catch (ex) {
					HCPlusLib.debugError("TabsInTitlebar._update()  call error: "+ex, ex);
				}
			}
			HCPlusLib.tabsintitlebar_enabled_old = tabsintitlebar_enabled;
			*/
			
			HCPlusLib.do_set_tab_marginTop_delta(); // delayed 2nd call!

		}, 50);
	},
	do_set_tab_marginTop_delta: function() {

		if( window.fullScreen ){
			return;
		}

		if( ! HCPlusLib.nav_toolbox ){
			HCPlusLib.nav_toolbox = document.getElementById("navigator-toolbox");//("tabbrowser-tabs"); //deck: NOP because breaks fullscreen!!!  
		}
		
		
		/* nop, anulo totalmente si esta activo tit , este o no maximizado.
		var tabsintitlebar_enabled = 
					HideCaption.fx4_titlebar_enabled && 
					document.documentElement.getAttribute("tabsintitlebar") == "true"; // not using 'TabsInTitlebar.enabled' for code compatibility future proof...
		 */
		
		/** anulado para ThunderBird
		var tabsintitlebar_enabled = // anula este feature de mtop.. // allow it for linux ...
					HCPlusLib.getPlatformPlus() == "windows" &&
					"ti_enabled"  ==  document.documentElement.getAttribute( "dz_fx4_titlebar" ) &&
					HCPlusLib.pref__browser_tabs_drawInTitlebar;
		
		
		if( tabsintitlebar_enabled ){ // NULLIFY effect!
			
			HCPlusLib.nav_toolbox.style.removeProperty("margin-top");
		}else{ //ENABLED feature!
			
			var mtop= window.windowState == window.STATE_MAXIMIZED?  
						HCPlusLib.tab_marginTop_delta : 
						HCPlusLib.tab_marginTop_delta_nomax;
			if(mtop> 30){ mtop=  30;}
			if(mtop<-35){ mtop= -35;}
			HCPlusLib.nav_toolbox.style.setProperty("margin-top", mtop+"px", "important");
		}
		**/

		// TODO: if( mtop == 0 ){ DELETE_css_rule? }, nop!, crear 2 checkboxes para prender en max y nomax !
	},
	
	
	
	// ---- Firefox appmenu -------------------- 
	
	appMenuButton_now: null,
	
	onAppmenuPopup: function(event){
		if (event.target != document.getElementById("appmenu-popup")){
			return;
		}
		if( !HCPlusLib.appMenuButton_now ){ //cuando clickeo el Fx button original!
			//HCPlusLib.myDumpToConsole("   onAppmenuPopup("+event.type+")    button is null!  (ignored non-error)" );
			return;
		}

		//HCPlusLib.myDumpToConsole("   onAppmenuPopup("+event.type+")    button is: "+HCPlusLib.appMenuButton_now.id );
		if(       event.type == "popupshown" ){ 
			HCPlusLib.appMenuButton_now.setAttribute("open", "true" );
		}else if( event.type == "popuphidden" ){
			HCPlusLib.appMenuButton_now.removeAttribute("open");
			HCPlusLib.appMenuButton_now = null;
		}
	},
	
	openAppmenuPopup: function(event, anchorElem, isAnchored){
		if(HCPlusLib.isLeftClick(event)){ 
			
			if( HCPlusLib.appMenuButton_now ){ //reset any previous pending button! (happens when i open my context w/fx but on top of main app-menu)
				HCPlusLib.appMenuButton_now.removeAttribute("open");
			}
			HCPlusLib.appMenuButton_now = anchorElem;
			
			var appmenu_popup= document.getElementById('appmenu-popup');
			if( !appmenu_popup ){
				
				if( HideCaption.titlebar_elem ){
					appmenu_popup= document.getElementById("hctp-fallback-menu");
				}
			}

			/*
			//test LOCO!  -  MUEVO el "menubar..", tb floodea addEvents vd? 
			appmenu_popup.insertBefore( document.getElementById("mail-menubar"), appmenu_popup.firstChild);
			appmenu_popup.addEventListener("DOMMenuBarActive", function(){
				appmenu_popup.openPopupAtScreen(anchorElem.boxObject.screenX, anchorElem.boxObject.screenY+anchorElem.boxObject.height-1, false); 
			}, false)
			*/

			if( appmenu_popup ){
				if( isAnchored ){
					appmenu_popup.openPopup        (anchorElem, 'after_start');
				}else{
					appmenu_popup.openPopupAtScreen(anchorElem.boxObject.screenX, anchorElem.boxObject.screenY+anchorElem.boxObject.height-1, false); 
				}
			}
		}
	},
	
	
	// ------------------------------------------------------------------------------ Misc ....
	
    setStyleSheet: function(aUrl, aEnable, aIsUsetSheet){
    	try {
    		HCPlusLib.myDumpToConsole(" BEGIN: setStyleSheet( "+aUrl+", "+aEnable+", "+aIsUsetSheet+" ) ");

    		var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
    		.getService(Components.interfaces.nsIStyleSheetService);
    		var ios = Components.classes["@mozilla.org/network/io-service;1"]
    		.getService(Components.interfaces.nsIIOService);
    		var uri = ios.newURI(aUrl, null, null); //"chrome://myext/content/myext.css"

    		var USERorAGENT_SHEET= aIsUsetSheet? sss.USER_SHEET: sss.AGENT_SHEET; // USER_SHEET has MORE priority! (come after AGENT_... in the queue)
    		
    		if( aEnable ){
    			//Note: loadAndRegisterSheet will load the stylesheet *synchronously*, so you should only call this method using *local* URIs.
    			if(!sss.sheetRegistered(     uri, USERorAGENT_SHEET)){
    				sss.loadAndRegisterSheet(uri, USERorAGENT_SHEET);
    			}
    		}else{
    			if( sss.sheetRegistered(     uri, USERorAGENT_SHEET)){
    				sss.unregisterSheet(     uri, USERorAGENT_SHEET); 
    			}
    		}
    	} catch (ex) {
    		HCPlusLib.debugError(" setStyleSheet( "+aUrl+", "+aEnable+", "+aIsUsetSheet+" ) error: "+ex, ex);
    	}
    },
    
    
	setAttr_smart: function(elemId, attrName, value, bForced){
		var elem= document.getElementById( elemId );
		if( elem ){ 
			if( bForced || ! elem.hasAttribute( attrName ) ){
				HCPlusLib.setAttribute_withBkp( elem, attrName, value);
			}
		}
	},
	removeAttr_smart: function(elemId, attrName){
		var elem= document.getElementById( elemId );
		if( elem ){ 
			elem.removeAttribute( attrName );
		}
	},
	 

	// utility functions ....
	isLeftClick: function(event){
		return event && event.button == 0 ;
		//return true;
	},
	
	mywait : function(msecs)
	{
		var start = new Date().getTime();
		var cur = start;
		while(cur - start < msecs)
		{
			cur = new Date().getTime();
		}
	},
	
    objToString : function(obj){
    	HCPlusLib.objToString_base(obj, false);
    },
    objToString_base : function(obj,isLengthyObj){
	  /*
	  try{
		//this.myDumpToConsole("about to print obj: ");
		//this.myDumpToConsole("                       "+obj);
		//var isLengthyObj= true;//( (""+obj) == "[object ChromeWindow]");
		
		var temp = "\n   "+obj+"[";
		var sComma="\n     ";
		var xContent= "";

		for (x in obj){
			try{
				xContent= ("" + obj[x] + "").substr(0,70); //"\n" // ((("+this.objToStringSmall(x)+")))
			}catch(ex){ xContent= "((( error: " + ex + ")))"; };	
			//sComma= ", ";
			if(  isLengthyObj && 
				(xContent.indexOf("function ")==0 || 
				 xContent.indexOf("[object " )==0 ) ){
				continue;
			}
			temp += sComma + x + ":" + xContent;
			//sComma= ", ";
		}
		temp += "\n   ] \n";
		return temp;
	  }
	  catch(ex){ this.debugError("error printing obj: "+obj+"     "+ex, ex);
		  return "(Error:"+ex+")";	
	  };	
	  return "(Error!)";	
	  */
	  return ""+obj;
	},

	/*
	Hc_AddonListener: {
		onEnabling:   	function onEnabling(_addon){
			this.debugMsg(_addon, arguments.callee);
		},
		onEnabled:    	function onEnabled(_addon){
			this.debugMsg(_addon, arguments.callee);
		},
		onDisabling:    function onDisabling(_addon){
			this.debugMsg(_addon, arguments.callee);
		},
		onDisabled:    	function onDisabled(_addon){
			this.debugMsg(_addon, arguments.callee);
		},
		
		onInstalling:   function onInstalling(_addon){
			this.debugMsg(_addon, arguments.callee);
		},
		onInstalled:   	function onInstalled(_addon){
			this.debugMsg(_addon, arguments.callee);
		},
		onUninstalling: function onUninstalling(_addon){
			this.debugMsg(_addon, arguments.callee);
		},
		onUninstalled: 	function onUninstalled(_addon){
			this.debugMsg(_addon, arguments.callee);
		},
		
		debugMsg: function(_addon, msgOperation){
			var msg= _addon.name+" ("+_addon.id+")  "+msgOperation;
			try {
				alert(msg);    
			} catch (e) {}
			HCPlusLib.myDumpToConsole( "addonListener ...  "+msg);
		},
		dummy: null //last comma missing
	},
	
	//baseObjectAddonMgr: {},
	*/
	
	CheckNewVersionLaunched: function(){
		try{
			/*
			var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
									.getService(Components.interfaces.nsIExtensionManager);
			var current = gExtensionManager.getItemForID("hidecaptionplus-dp@dummy.addons.mozilla.org").version;
			*/
            var baseObject = {};
			Components.utils.import("resource://gre/modules/AddonManager.jsm", baseObject ); //HCPlusLib.baseObjectAddonMgr

			var addonManager= baseObject["AddonManager"];
			addonManager.getAddonByID("hidecaptionplus-dp@dummy.addons.mozilla.org", function(_addonItem) {
			   // ASYNCHNONOUS CALL!!! -> can be called at a LATER time!!!
			   HCPlusLib.do_CheckNewVersionLaunched(_addonItem);
			});
			// This code can be executed BEFORE  ASYNCH call in AddonManager.getAddonByID()  above!!
		
			//addonManager.addAddonListener(HCPlusLib.Hc_AddonListener);
			//HCPlusLib.myDumpToConsole( "addAddonListener() END.  ");
			
		}catch(ex){
			HCPlusLib.debugError     ("CheckNewVersionLaunched():  ERROR: "+ex, ex);
		}
	},
	do_CheckNewVersionLaunched: function( _addonItem ){
		try{
			var current = _addonItem? _addonItem.version: "1.unknown";
			//gets the version number.
		
			var ver= HCPlusLib.GetPref_plus(HCPlusLib.CHAR_PREF, "plus.version", "1.0");
			//var firstrun = Prefs.getBoolPref("firstrun");
		  /*
		  if (firstrun){
			Prefs.setBoolPref("firstrun",false  );
			Prefs.setCharPref("version" ,current);
			// Insert code for first run here        
			// The example below loads a page by opening a new tab.
			// Useful for loading a mini tutorial
			window.setTimeo_COMMENTED(function(){
			  gBrowser.selectedTab = gBrowser.addTab("about:mozilla");
			}, 1500); //Firefox 2 fix - or else tab will get closed
		  }
		  */
		  // NEW version of this extension launched!!
		  if (ver!=current ){ //&& !firstrun ... // !firstrun ensures that this section does not get loaded if its a first run.
       	    HCPlusLib.do_SetPref_plus(HCPlusLib.CHAR_PREF, "plus.version", current);
			
       	    var params= "?param=ok";
       	    
       	    if( ! HCPlusLib.versionIsLessThan(ver, "1.1") ){ // this ISN'T a BRAND NEW INSTALL!
       	    	
           	    if( HCPlusLib.versionIsLessThan(ver, "2.3.2rc2") ){	params += ",mmc_disappeared";   }
       	    }
       	    
       	    params += " &_prev_version="+ver+" &_current_version="+current+"";
       	    
			// Insert code if version is different here => upgrade
			setTimeout( function(){
					var mUrl= "chrome://HideCaptionTb/locale/newversion.html" + params;
				
				
					window.openContentTab( mUrl,"tab");
					//window.openUILink("http://hola.com", {});  <--- Thunderbird launchs external app!
				}, 500);
		  }
		  HCPlusLib.myDumpToConsole( "CheckNewVersionLaunched() END.  Page-showed="+(ver!=current) );
		  
		}catch(ex){
			HCPlusLib.debugError     ("CheckNewVersionLaunched():  ERROR: "+ex, ex);
		}finally{
		}
	},

	versionIsLessThan : function(a,b) {
		 try {
			 var my_VersionComparator= Components.classes["@mozilla.org/xpcom/version-comparator;1"]
  										.getService(Components.interfaces.nsIVersionComparator);
			 var ret = my_VersionComparator.compare(a,b);
			 return ret < 0;
		 } catch (ex) {
			 HCPlusLib.debugError     ("versionIsLessThan():  ERROR: "+ex, ex);
			 return true;
		 }
	},
	
	// several funcs for the USER interaction....

    getMostRecentWindow : function() {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
		var recentWindow = wm.getMostRecentWindow("navigator:browser");
		return recentWindow;
	},
    openUILink_inMostRecentWindow : function(event, url) {
		var recentWindow = HCPlusLib.getMostRecentWindow();
		if( recentWindow ){
			if(event){
				recentWindow.openUILink  (url, event, false, true);
			}else{ // ! event
				recentWindow.openUILinkIn(url, 'tab');
			}
			recentWindow.focus();
			return true;
		}
		else{
			window.open(url);
			return true;
		}
	},
	
	OpenReadme_inMostRecentWin: function(event) {
		if( ! HCPlusLib.openUILink_inMostRecentWindow(event,'chrome://HideCaptionTb/locale/readme.html')){ 
			alert('Couldn\'t find browser\'s window'); };
	},

	//<menuitem oncommand="myExtension.OpenReadmePage(event)" label="Click me"/>
	OpenReadmePage: function(event) {
		window.openUILink("chrome://HideCaptionTb/locale/readme.html", event, false, true);
	},

	ProcessAllFFwindows: function(url) {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator);
		var browserEnumerator = wm.getEnumerator("navigator:browser");

		while( browserEnumerator.hasMoreElements() ) {
			var browserWin = browserEnumerator.getNext();
			//Load_newValue() all !
			browserWin.HCPlusLib.Do_Load_newValue_AllOptions();
		}
	},


	/*
	// Open POPUP MENU !
	onclickWindowControl: function(e){
        if( e.button==2 || ( e.button==0 && e.ctrlKey==1 )){ // ctrl+click creates problems with buttons
            var wcMenu=document.getElementById('hcp-menu-windowcontrolsXXX')
			wcMenu.showPopup(e.target, -1, -1, 'popup', 'bottomleft', 'topleft');
		}
    },
	*/
	
	optionDialog: null,
	openOptionDialog: function(e){
		if( HCPlusLib.optionDialog ){
			HCPlusLib.optionDialog.focus();
			//left=100, top=10, 
		}
		//var features = "chrome,titlebar,toolbar,centerscreen,modal";
		HCPlusLib.optionDialog=openDialog('chrome://HideCaptionTb/content/options.xul', 'OptionsDlg', 'chrome,titlebar,toolbar,scrollbars=yes,resizable=yes,centerscreen');
	},
		
		
	openAndReuseOneTabPerURL: function(urlObj) {
	  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
						 .getService(Components.interfaces.nsIWindowMediator);
	  var browserEnumerator = wm.getEnumerator("navigator:browser");

	  HCPlusLib.myDumpToConsole( "   ... will open:  "+urlObj );

	  // Check each browser instance for our URL
	  var found = false;
	  while (!found && browserEnumerator.hasMoreElements()) {
		var browserWin = browserEnumerator.getNext();
		/** @type tb_dummy */
		var tabbrowser = browserWin.gBrowser;

		// Check each tab of this browser instance
		var numTabs = tabbrowser.browsers.length;
		for (var index = 0; index < numTabs; index++) {
		  var currentBrowser = tabbrowser.getBrowserAtIndex(index);
		  
		  HCPlusLib.myDumpToConsole( "   ... will compare against:  "+currentBrowser.currentURI.spec );
		  if (urlObj.url == currentBrowser.currentURI.spec) {

			// The URL is already opened. Select this tab.
			tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];

			// Focus *this* browser-window
			browserWin.focus();

			found = true;
			break;
		  }
		}
	  }

	  // Our URL isn't open. Open it now.
	  if (!found) {
		var recentWindow = wm.getMostRecentWindow("navigator:browser");
		if (recentWindow) {
		  // Use an existing browser window
		  recentWindow.delayedOpenTab(urlObj.url, null, null, null, null);
		}
		else {
		  // No browser windows are open, so open a new one.
		  window.open(urlObj.url);
		}
	  }
	},

	getPlatformPlus:  function(){
			try{
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
				//HCPlusLib.myDumpToConsole( "   ... getPlatformPlus() -> "+retVal );
				return retVal;
			}catch(ex){ HideCaption.debugError("error: "+ex, ex);  }
			return "(error)";
	},
	

	// preferences --------------------------------------------------------------
    GetPref_plus : function(_TYPE_PREF, _name, DefVal) {
		/*
		this.gPrefConfig_plus.prefHasUserValue(_name)?  get_xxxx(...): null;
		No confio en usar prefHasUserValue() para evitar el exception pq si algun dia pongo default values (prefs.js es?) podria retornar false y hacerme perder el default value, vd?
		https://developer.mozilla.org/en-US/docs/Code_snippets/Preferences#Using_prefHasUserValue.28.29
		*/
        try {	
			HCPlusLib.getConfig_plus();
			//lo uso solo para tirar el exception ...
			var hasUserValue= this.gPrefConfig_plus.prefHasUserValue(_name);
			
			var retVal= null;
			try{
				retVal= this.do_GetPref_plus(_TYPE_PREF, _name);
	        }catch(ex1) {
				if( hasUserValue ){
					throw ex1;
				}else if( DefVal != null ){ // solo un "WARNING ..."
					HCPlusLib.myDumpToConsole("GetPref_plus( "+_TYPE_PREF+", "+_name+" .) warning: (most probably a one-time-only issue trying to read a missing option for 1st time after a new install)     " ); // "  \n "+ex1
				}else{
					//outputs almost NOTHING if I'm still reading OLD prefs but had changed default-val to ZERO.
					HCPlusLib.myDumpToConsole("GetPref_plus( "+_TYPE_PREF+", "+_name+" .) : couldn't get it. (maybe attempting to read a deprecated value)    " );
				}
			}

			if( retVal == null && DefVal != null ){
				this.do_SetPref_plus(_TYPE_PREF, _name, DefVal);
				retVal= DefVal;
			}
			return retVal;
        }
        catch(ex) {
			HCPlusLib.myDumpToConsole("GetPref_plus( "+_TYPE_PREF+", "+_name+" .) ERROR: (most probably an ignored one-time-only read-error trying to read a missing option for 1st time after a new install) \n    "+ex );
			try {
				if (DefVal != null){
					this.do_SetPref_plus(_TYPE_PREF, _name, DefVal);
					HCPlusLib.myDumpToConsole("  ... ["+_name+"]  setted to default-value -> "+DefVal);
				}
			}catch(ex2) {
				HCPlusLib.debugError("do_SetPref_plus( "+_TYPE_PREF+", "+_name+" .) ERROR: "+ex2, ex2);
			}
            return DefVal;
        }
    },
	
	gPrefConfig_plus: null,
    getConfig_plus : function() {
		if( HCPlusLib.gPrefConfig_plus ){
			return;
		}
		var my_prefService= Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);  
		HCPlusLib.gPrefConfig_plus= my_prefService.getBranch("extensions.hide_caption.");
	},
			

    do_GetPref_plus : function(_TYPE_PREF, _name) {
		HCPlusLib.getConfig_plus();
		if( 	 _TYPE_PREF == this.BOOL_PREF ){ return HCPlusLib.gPrefConfig_plus.getBoolPref(_name);
		}else if(_TYPE_PREF == this.CHAR_PREF ){ return HCPlusLib.gPrefConfig_plus.getCharPref(_name);
		}else if(_TYPE_PREF == this.INT_PREF  ){ return HCPlusLib.gPrefConfig_plus.getIntPref (_name);
		}else{	throw ("ERROR: Bad TYPE_PREF !!: "+_TYPE_PREF );
		}
	},
    do_SetPref_plus : function(_TYPE_PREF, _name, _val) {
		function checkType(_typeToCheck){
			if( (typeof _val) != _typeToCheck){
				HCPlusLib.debugError("do_SetPref_plus( "+_TYPE_PREF+", "+_name+", "+_val+"  ["+(typeof _val)+"]  ) IGNORED Error: BAD TYPE of Data !?");
			}
		}
		//HCPlusLib.myDumpToConsole("BEGIN  do_SetPref_plus( "+_TYPE_PREF+", "+_name+", "+_val+"  ["+(typeof _val)+"]  )"); 
		HCPlusLib.getConfig_plus();
		if(      _TYPE_PREF == this.BOOL_PREF ){ HCPlusLib.gPrefConfig_plus.setBoolPref(_name, _val); checkType("boolean");
		}else if(_TYPE_PREF == this.CHAR_PREF ){ HCPlusLib.gPrefConfig_plus.setCharPref(_name, _val); checkType("string" );
		}else if(_TYPE_PREF == this.INT_PREF  ){ HCPlusLib.gPrefConfig_plus.setIntPref (_name, _val); checkType("number" );
		}else{	throw ("ERROR: Bad TYPE_PREF !!: "+_TYPE_PREF );
		}
	},

	// check back compatibility when using: make sure earlier hctp version will create the option again with an acceptable default value.
	clearUserPref : function(_name) {
		HCPlusLib.getConfig_plus();
		return HCPlusLib.gPrefConfig_plus.clearUserPref(_name);
		//deleteBranch()
		//resetBranch(_name)  -->  (NS_ERROR_NOT_IMPLEMENTED) [nsIPrefBranch.resetBranch] - Fx16
	},


	
	// -- BackupEngine ----------------------------------------------------------------------------

	BackupEngine_Styles_Attrs: new (function bkp_restorer_Class(){
		
		const my_self  = this;
		const elem_list= new Array();
		
		function setup_elem( elem ){
			if( !elem ){
				return false;
			}
			if( elem_list.indexOf(elem) < 0 ){ // add here to list (for performance)
				if(!elem.hctp_bkp ){
					elem.hctp_bkp= {};
					if(!elem.hctp_bkp.styles ){
						elem.hctp_bkp.styles= {};
					}
					if(!elem.hctp_bkp.attrs ){
						elem.hctp_bkp.attrs = {};
					}
					elem_list.push   (elem);
				}
			}
			return true;
		};
		
		this.backupAttr  = function(elem, attrName){
			if( !setup_elem( elem ) ){
				return;
			}
			if( elem.hctp_bkp.attrs[attrName] === undefined ){
				elem.hctp_bkp.attrs[attrName] = elem.hasAttribute(attrName)? elem.getAttribute(attrName): null;
			}
		};
		this.backupStyles= function(elem, arrCssNames){
			if( !setup_elem( elem ) ){
				return;
			}
			arrCssNames.forEach(function(cssName){
				if( elem.hctp_bkp.styles[cssName] === undefined ){
					elem.hctp_bkp.styles[cssName]             = elem.style.getPropertyValue   (cssName);
					elem.hctp_bkp.styles[cssName+"_priority"] = elem.style.getPropertyPriority(cssName);
				}
			});
		};
		
		// restore -------------------------------------
		this.restore_all= function(elem){
			//if( elem.hctp_bkp.xxx )
			HCPlusLib.myDumpToConsole(" <"+elem.tagName+" #"+(elem.id? elem.id: "---")+" > " );
			
			for( var bkAttr  in elem.hctp_bkp.attrs){
				let bakValue=   elem.hctp_bkp.attrs[bkAttr];
				if( bakValue === null ){
					elem.removeAttribute( bkAttr );
				}else{
					elem.setAttribute   ( bkAttr, bakValue );
				}
				HCPlusLib.myDumpToConsole("        restored Attr: "+bkAttr+"="+bakValue );
			}
			
			for( var cssName in elem.hctp_bkp.styles ){
				if(  cssName.endsWith("_priority") ){
					continue;
				}
				let value   =   elem.hctp_bkp.styles[cssName];
				let priority=   elem.hctp_bkp.styles[cssName+"_priority"];
				elem.style.setProperty( cssName, value, priority);

				HCPlusLib.myDumpToConsole("            restored Style: "+cssName+": "+value+"    "+priority );
			}
			
			delete elem.hctp_bkp;
		};
		this.restore_all_elems= function(){
			HCPlusLib.myDumpToConsole(" restore_all_elems(), BEGIN: ");
			elem_list.forEach(function( elem ){
				my_self.restore_all(elem);
			});
		};
	})(),
	
	
	setAttribute_withBkp: function(elem, attrName, value){
		//unloaders -- 1ero hacer el backup!
		HCPlusLib.BackupEngine_Styles_Attrs.backupAttr(elem, attrName);
		
		elem.setAttribute( attrName, value);
	},
	
	
	// SHUTDOWN 
    hc_shutdown : function() {

		// RESTORE ALL
		HCPlusLib.BackupEngine_Styles_Attrs.restore_all_elems();
    },
	
	
	// DEBUG messages ---------------------------
	
	bPrintDebug: false,
	
	LoadDebugFlag : function(){
		//plis enable debug in option-dialog too!
        if ( this.GetPref_plus(this.BOOL_PREF, "plus.print_debug", false) ){
			HCPlusLib.bPrintDebug= true;
		}
	},
	
	debugError : function(aMessage, theException){
		var myMessage= "HCPlus error: "+aMessage + (theException? "  \n\r> "+theException+" \n\r"+theException.stack: "");
		//this.myDumpToConsole_error( aMessage );
		setTimeout(function() {	throw new Error("[debug] " + myMessage); }, 0); // <-- from console2 page
		if( theException ){
			setTimeout(function() {	throw theException; }, 5); // <-- from console2 page
		}
	},
	consoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
	myDumpToConsole_error : function(aMessage){
		if( this.bPrintDebug ){
			//this.consoleService.logStringMessage( "" + aMessage); //new Date() + ":  "
			setTimeout(function() { throw new Error("[debug] " + aMessage); }, 0); // <-- from console2 page
		}
	},

	myDumpToConsole : function(aMessage){
		if( this.bPrintDebug ){
			this.consoleService.logStringMessage( "" + aMessage); //new Date() + ":  "
		}
		//xxxComponents.utils.reportError(e); // report the error and continue execution
	}
	//, END of 'class'
};

