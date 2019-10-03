
"use strict";

//for AUSTRALIS

var EXPORTED_SYMBOLS = ["FloatToolbarsHr_class", "FloatHpr_class"];


//STATIC methods! (without 'prototype')
//FloatToolbarsHr_class_ONE_PER_WINDOW.original_BrowserCustomizeToolbar   = function(){},
//FloatToolbarsHr_class_ONE_PER_WINDOW.original_onViewToolbarsPopupShowing= function(aEvent, aInsertPoint){},

var FloatToolbarsHr_class= function ( _win ){

	const window      = _win;
	const document    = window.document;
	const setTimeout  = window.setTimeout;
	const clearTimeout= window.clearTimeout;
	const getComputedStyle= window.getComputedStyle;
	const parseInt    = window.parseInt;
	const parseFloat  = window.parseFloat;
	
	const HCPlusLib   = window.HCPlusLib;
	const HideCaption = window.HideCaption;

	const CustomizableUI= window.CustomizableUI;
	
	//unloaders
	const unloaders = [];

	
	const thySelf= this; //HideCaption.FloatToolbarsHandler
	
	//------------------------------------------
		
		
		this.menubarItems= null,
		this.homeToolbar= null,
		
		this.hctpToolbox= null,
		this.floatbars_upper_hover= null,
		
		this.box_browser= null,
		
		this.fx4ButtonContainer= null,
	
		this.b_initd= false,
		
		this.initHomeToolbar= function(){
			
			// ----------- hcp_sys_floatbars_enable

			thySelf.nav_toolbox= document.getElementById("navigator-toolbox");
    		
			 
			if( HCPlusLib.get_floatbars_enable_general() ){
				// HideCaption.mainW.setAttribute(   "hcp_sys_floatbars_enable", "true");  // not used yet in main fx win
				
			}else{ // DISABLED !
				// HideCaption.mainW.removeAttribute("hcp_sys_floatbars_enable");

				
				//LIGHTWEIGHT THEMES background !!! - aca tb para lwt del TBoxhide!
				HideCaption.FloatHelper.init();


				return; //   RETURN  !!!!
				//           RETURN  !!!!
				//           RETURN  !!!!
			}

			// --------------------------------------------------------------------------

			
			if( this.b_initd ){
				return;
			}
			this.b_initd = true;
			
			

			// SINGLETON-global-init: At VERY begginning , bc there can be several windows opened that calls this main_enable()  
    		HCPlusLib.HcSingleton.floatbarsGlobal_init();
    		

    		// LOAD XUL:  should load it  **AFTER**  registerArea() right?
			if( !document.getElementById( "hctp-toolparent" ) ){
				HideCaption.xul_onLoad(HideCaption.XUL_floatbars_over_doc, unloaders);
			}else{
				HCPlusLib.myDumpToConsole(" ignored error:  repetitive? call to load-over-FLOATBARS ");
			}

			

			this.box_browser = document.getElementById( "browser" );
			this.bottom_box  = document.getElementById( "browser-bottombox" );
			
			
	        //gBrowser.mPanelContainer.addEventListener("mous_move", this._collapseCallback, false);
			// con esto SACAMOS los "mous_out" !!
			//... gBrowser.mPanelContainer -> NO incluye los sidebars!! 

			
			
			//id="PersonalToolbar"
			this.menubarItems= document.getElementById( "hctp-toolparent" ); // "hctp-toolparent"
			this.homeToolbar = document.getElementById( "hctp-appmenu-button-cont-fixed"  ); // deprecating "hcp-home-toolbar" ...  

			this.fx4ButtonContainer= document.getElementById( "appmenu-button-container" );
			if( !this.fx4ButtonContainer ){
				this.fx4ButtonContainer= document.getElementById("appmenu-toolbar-button"); // LINUX FX button
			}
			var appmenuButton= document.getElementById( "appmenu-button" );
			if( this.fx4ButtonContainer!=null && appmenuButton!=null && appmenuButton.parentNode!=null && appmenuButton.parentNode.id != this.fx4ButtonContainer.id ){
				this.fx4ButtonContainer = appmenuButton; // button was moved OUT of its original place (ie. Movable-Fx-button add-on) 
			}


			thySelf.DynamicElemPos.init( this.menubarItems, this.callback_onActive, this.callback_onInactive );

			
			this.hctpToolbox= document.getElementById("hctp-toolbox");
			
			this.floatbars_upper_hover= document.getElementById("hctp_floatbars_upper_hover");

			
			//DELAYED -------------------------------------------
			setTimeout(function() {
				
				//TODO: remove Hard ENABLE
				thySelf.main_enable();

				//this.customize_Initial_Setup_things();

				//LIGHTWEIGHT THEMES background !!!
				HideCaption.FloatHelper.init();


				//TODO: TEMPORARY hack to fix an Fx bug!!! (Fx28-)
				//HideCaption.FloatHelper.set_PlacesViewBase_uninit();

				
				setTimeout(function() {
					// AUSTRALIS: reverse order!!!
					if(     thySelf.nav_toolbox.externalToolbars            &&
					        thySelf.nav_toolbox.externalToolbars.length > 0 ){ //"hctp_MenuAndTitle_Toolbar"
						if( thySelf.nav_toolbox.externalToolbars[0].id != "hctp_MenuAndTitle_Toolbar" ){
							Array.reverse( thySelf.nav_toolbox.externalToolbars );
						}
					}
					
					setTimeout(function() { // sirve de try catch !
						if(!window.Services.hcNoBMinit ){ // DEVEL flag
						
							window.PlacesToolbarHelper.init();  // con este prende!!!
							if( window.BookmarkingUI.onToolbarVisibilityChange ){
								window.BookmarkingUI.onToolbarVisibilityChange();
							}
						}
					}, 50);
					
				}, 300);
				
			}, 500);
				
		}, //END initHomeToolbar


		// Extra (INDEPENDENT) Features ---------------------------------------------------------------------------
		this.init_ExtraFeatures= function FT_init_ExtraFeatures(){ //TODO: mover a un objeto PROPIO!
			
			if( !this.b_initd ){ // hard_disabled
				return;
			}
			
			/**
		    //not-dependent of FLOAT TOOLBARS enable/disable!
		    thySelf.nav_toolbox.addEventListener("customizationchange" , function (ev) {
		    	thySelf.on_customizationchange(ev);
		      }, false);
		     **/
		},
		
		
		this.set_All_EventListeners=  function ( bAdd ){

			HCPlusLib.myDumpToConsole(" Floatbars:   set_All_EventListeners("+bAdd+")");
			
			//CSS FILE added DYNAMICALLY !! 
			HCPlusLib.HcSingleton.FloatBars_sheet.setStyleSheet( bAdd? "chrome://HideCaptionPlus_fx/skin/tbars_extra.css": null );
			//lusLib.setStyleSheet(                          "chrome://HideCaptionPlus_fx/skin/tbars_extra.css",  true, true );
			// update line for australis (q era esto?)

			
			thySelf.DynamicElemPos.elem_array_for_Active  = new Array();  // simulates array.empty();
			
			// usar esto mejor?: thySelf.DynamicElemPos.elem_array_for_Active.push( __elem__ );
			thySelf.toggle_HoverAndDragenter_Elem( this.menubarItems								, bAdd);
			thySelf.toggle_HoverAndDragenter_Elem( this.homeToolbar									, bAdd);
			try{
			  if( thySelf.fx4ButtonContainer ){
				  thySelf.toggle_HoverAndDragenter_Elem( this.fx4ButtonContainer					, bAdd);
			  }
			}catch(ex){ HideCaption.debugError("error: "+ex, ex);  }

			// customizable fx-but
			thySelf.toggle_HoverAndDragenter_Elem( document.getElementById( "hctp_fx_app_button_item"  ) , bAdd); 

			//1st this (looking for 'good' blue-shadow appearance)....
			//TODO: poner esto configurable!
			//thySelf.toggle_HoverAndDragenter_Elem( document.getElementById( "hctp-controls-top-fixed" ), bAdd); //mmc-buttons-RightBar
			//is.toggle_HoverAndDragenter_Elem( document.getElementById( "hcp-rightbar-fixed" )     , bAdd); //mmc-buttons-RightBar container?
			thySelf.toggle_HoverAndDragenter_Elem( document.getElementById( "hcp-mmc-buttons-item" ), bAdd); //mmc-buttons customizable!
			//is.toggle_HoverAndDragenter_Elem( document.getElementById( "navigator-toolbox"  )     , bAdd); //#navigator-toolbox
			
			//     id="tabview-button"
			// xxx thySelf.toggle_HoverAndDragenter_Elem( document.getElementById( "tabview-button" )   	, bAdd); //button in tab-bar....
			
			//id="alltabs-button"
			thySelf.toggle_HoverAndDragenter_Elem( document.getElementById( "alltabs-button" )   	, bAdd); //button in tab-bar....
			
			Array.slice(document.getElementsByAttribute('hctp_ft_minimize','true')).forEach(function(_elem){ 
				thySelf.toggle_HoverAndDragenter_Elem( _elem         								, bAdd);
			});

			//for FULL FLOATING BARS (like Fx FULLSCREEN)
			thySelf.toggle_HoverAndDragenter_Elem( this.floatbars_upper_hover  						, bAdd);

			// MY 'SUPER' Button
			thySelf.toggle_HoverAndDragenter_Elem( document.getElementById( "hctp_floatbars_extra_button" ), bAdd); 

			
			thySelf.DynamicElemPos.set_All_EventListeners( bAdd );
			

			// CUSTOMIZATION  stuff ------------------------------------------------------------------------
			HideCaption.set_EventListener( bAdd, thySelf.nav_toolbox	, "beforecustomization"	, thySelf, false);
			HideCaption.set_EventListener( bAdd, thySelf.nav_toolbox	, "aftercustomization" 	, thySelf, false);

			HideCaption.set_EventListener( bAdd, thySelf.nav_toolbox	, "hcMenu_changed" 		, thySelf, false);
		},
		
		
		// Enable / Disable ---------------------------------------------------------------------------------------
		this.main_enable=  function FT_main_enable(){
			
			// MAIN FLAG!
			thySelf.floatEnabled= true;
			
			// ADD all EventListeners
			thySelf.set_All_EventListeners( true );


			/*** esto movia por ej el webdeveloper toolbar a los FLOATINGs!!
			//init toolbars!
			var tbChanges= false;
			Array.slice(thySelf.nav_toolbox.childNodes).forEach(function(hToolbar){
				if( thySelf.do_jumpToolbar(hToolbar) ){
					tbChanges= true;
				}
				//TODO: set ordinal from  hctp_ordinal
			});

			
			HCPlusLib.myDumpToConsole(" Floatbars init:  tbChanges="+tbChanges);
			// if( tbChanges ) --- aqui intentaba arreglar el viejo problema del splitter entre url y search-bar
			***/
			
			
    		//TODO: check this test-with-tabbar later! (make configurable?) - y MOVER a dnd inicializa todo?
    		//Usar este para ser internacional -  aria-label="Browser tabs"
    		var eTabsToolbar= document.getElementById("TabsToolbar");
    		if(!eTabsToolbar.hasAttribute("toolbarname") ){
    			var tabbar_cmd_label= (""+document.getElementById("hctp-toolbox").getAttribute("tabbar_cmd_label")).trim(); // allow space/s
    			if(!tabbar_cmd_label){
    				tabbar_cmd_label= eTabsToolbar.getAttribute("aria-label"); //uses &tabsToolbar.label; from browser.dtd :-)
    			}
    			if(!tabbar_cmd_label || tabbar_cmd_label=="Browser tabs"){
    				tabbar_cmd_label= "Tabs Toolbar";
    			}
        		HCPlusLib.setAttribute_withBkp( eTabsToolbar, "toolbarname", tabbar_cmd_label);
    		}


			// SET mainmenu position
			thySelf.move_menu_new();

			
    		// "personal-bookmarks" are blank! --- needs the call (here, per window) to: 
    		// window.PlacesToolbarHelper.customizeDone()  or  
    		// window.PlacesToolbarHelper.onWidgetAdded("personal-bookmarks", "", 0);  or
			// window.PlacesToolbarHelper._resetView();
			
			
		},
		this.main_disable= function FT_main_disable(){

			// MAIN FLAG!
			if( !thySelf.floatEnabled ){
				return;  // RETURN !! ----------------------
			}
			thySelf.floatEnabled= false;
			

			// REMOVE all EventListeners
			thySelf.set_All_EventListeners( false );

			// reset position calc...
			thySelf.last_active_top_pos_setted= false;

			
			// RESET mainmenu position -- BEFORE  unregisterArea() !
			thySelf.move_menu_new({}, true);
			
			var mainmenu_inside_float= thySelf.hctpToolbox.querySelector("#menubar-items");
			if( mainmenu_inside_float ){
				
				HCPlusLib.debugError(" Ignoring error: #menubar-items STILL inside floatbars!.  Trying to fix... ");
				
				var toolbar_menubar= document.getElementById( "toolbar-menubar" );
				if(!toolbar_menubar){
					toolbar_menubar= window.gNavToolbox.firstChild; 
				}
				toolbar_menubar.insertBefore(mainmenu_inside_float, toolbar_menubar.firstChild);
			}

			
			
			// SINGLETON-global-disable: ..... there can be several windows opened that calls this ... //TODO  what to do exactly?  
    		HCPlusLib.HcSingleton.floatbarsGlobal_Disable();

    		
    		// AFTER unregisterArea() right?
    		try {
    			Array.slice(thySelf.hctpToolbox.childNodes).forEach(function(hToolbar){
    				HCPlusLib.myDumpToConsole("   Doing:  removing toolbar: "+hToolbar.id+"");

    				//to remove it from menu!??
    				hToolbar.removeAttribute("toolbarname");
    				
    				// REMOVE from externalToolbars !
					if( thySelf.nav_toolbox.externalToolbars ){
						var my_index= thySelf.nav_toolbox.externalToolbars.indexOf(hToolbar);
						if( my_index >= 0 ){
							thySelf.nav_toolbox.externalToolbars.splice( my_index, 1);
						}
					}
    			});
    			
    		} catch (ex) {	HCPlusLib.debugError(" Ignoring error: "+ex, ex);	}


			//TODO aca en move_menu_new() hay codigo GLOBAL q tendria q ir al Singleton!! .. ver bien como separar y q ande y valide todo bien 
			
			// RESET mainmenu position - 2nd TIME, for checking if mainmenu went to PALETTE!
			thySelf.move_menu_new({}, true);
			//mainmenu_inside_palette= thySelf.nav_toolbox.palette.querySelector('#menubar-items'); // inside PALETTE ??
			
			
			
			//TODO: desabilitar "TabsToolbar" menuitem HERE !!!!!!!!!!!
		},

		//SHUTDOWN
		this.hc_shutdown= function() {
			try {
				HCPlusLib.myDumpToConsole(   "FloatBars  Begin hc_shutdown()  " );
				
				this.main_disable();

				
				//eg: deletes the nodes (elems) created with xul_onload() ...
				//unloaders
				unloaders.reverse().forEach(function (f) { // reverse() so unload FIRST the LAST thing added, and so on 
		    		try {
		    			HCPlusLib.myDumpToConsole_noAudio( "FLOATBARS>>>>  \n"+f );
		    			f();
		    		} catch (ex) {
		    			HCPlusLib.debugError(" hc_shutdown():  ex= "+ex, ex);
		    		};
		    	});
				
			} catch (ex) {	HCPlusLib.debugError(" Ignoring error: "+ex, ex);	}
	    },


		// CUSTOMIZATION -----------------------------------------------------------------------------------

		this.handleEvent_customization= function (event){

			//HCPlusLib.myDumpToConsole("    "+event.type+":  BEGIN ");
			
			switch (event.type) {
			  case "beforecustomization":
				  thySelf.menubarItems                      .setAttribute("customizing", "true");
				  thySelf.menubarItems.firstChild           .setAttribute("customizing", "true"); // middle VBOX added later
				  thySelf.menubarItems.firstChild.firstChild.setAttribute("customizing", "true"); 
 
				  //xxxx.DynamicElemPos._setActive_Async(ev);

				  break;
				  
			  case "aftercustomization":
				  thySelf.menubarItems                      .removeAttribute("customizing");
				  thySelf.menubarItems.firstChild           .removeAttribute("customizing");
				  thySelf.menubarItems.firstChild.firstChild.removeAttribute("customizing");
				  //xxxx.DynamicElemPos._setInactive_Async(ev);

				  //floating stay open!
				  if(!thySelf.DynamicElemPos.isKeyActive ){
					  thySelf.DynamicElemPos.key_toggleActivation(event);
				  }
				  
				  // move_menu_new() 
				  setTimeout(function(){
						thySelf.move_menu_new();
				  }, 200);
				  
				  break;
				  
			  case "hcMenu_changed":
				  HCPlusLib.setAttribute_withBkp( HideCaption.mainW, "hctp_hcMenuInToolbar", ""+event.detail.isInToolbar );
				  
				  HideCaption.myDumpToConsole("    hcMenu_changed  en toolbars.js !!!   isInToolbar= "+event.detail.isInToolbar);
				  break;
				  
			}
		},

		/**
		this.on_customizationchange= function INDEPENDENT_OBJ_on_customizationchange(_event){ //TODO: mover este con su kumpa

			//HideCaption.myDumpToConsole("    on_customizationchange:  BEGIN ");
			setTimeout(function(){
				thySelf.customize_move_menu();
			}, 1000);
		},
		**/
		
		this.move_menu_new= function FT_move_menu_new(_event, bReset){

			function set_menu_position( area, position ){
				
				var old_removable= "false";
				if( menubar_items ){
					old_removable= menubar_items.getAttribute("removable");

					//to restore at HCPlusLib.hc_shutdown()!
					HCPlusLib.setAttribute_withBkp( menubar_items, "removable", "true");
					//nubar_items.setAttribute("removable", "true");
				}
				
				CustomizableUI.addWidgetToArea( 'menubar-items', area, position );

				setTimeout(function() {
					if( menubar_items ){
						// xxx menubar_items.setAttribute("removable", old_removable);
					}
				}, 50);
			}

			function reset_menu_position_to_toolbar_menubar(){
				
				set_menu_position( 'toolbar-menubar', 0 );
			}

			// begin --------------------------
			
			if( !CustomizableUI ){
				window.console.log( "Floating Bars needs  CustomizableUI  module.  (move_menu_new)");
				
				return; // RETURN !
			}
			
			try {
				//Place MAIN MENUBAR !! --------------
				var  menubar_items= document.getElementById( "menubar-items" ); //"menubar-items"
				if( !menubar_items ){
					/** El MAINMENU puede NO ESTAR pq:
					 1) Quedo removable=true y el UnregisterArea() lo manda a la PALETA
					 2) El usuario, con otro addon lo mandó a la PALETA
					**/
					HideCaption.debugError(" Ignoring Error: 'menubar-items' id not found!, will try to fix...");
					//return;
				}
				
				

				var   place_Original_mainmenu= CustomizableUI.getPlacementOfWidget('menubar-items');
				// Where's HCP widget? 
				var   place_hcp_mainmenu     = CustomizableUI.getPlacementOfWidget("hcp-main-menu-tbaritem"); //{ area: "AREA_ID", position: 42 // the index in the placements array } 
				if( !!place_hcp_mainmenu && !bReset ){
					// PRESENT !
					setTimeout(function(){
						var hcp_mainmenu= document.getElementById(                 "hcp-main-menu-tbaritem" );
						if(!hcp_mainmenu && place_hcp_mainmenu.area != "PanelUI-contents"){
							// puede estar aca:  area: "PanelUI-contents" 
							HCPlusLib.debugError(" Ignoring warn:  getPlacementOfWidget('hcp-main-menu-tbaritem') returned "+place_hcp_mainmenu.area+", *BUT* my widget ID isnt 'present' ");
						}
					}, 500);
					//if( hcp_mainmenu.nextSibling != menubar_items ) // not placed

					if( !place_Original_mainmenu ){
						HideCaption.debugError("  Notice: 'menubar-items' Placement not found. (it's in the palette?)");
					}
					if( !place_Original_mainmenu ||
						 place_Original_mainmenu.area     != place_hcp_mainmenu.area         || 
						 place_Original_mainmenu.position != place_hcp_mainmenu.position + 1 ){
						//FORBID outside Toolbars (Ie. in Panel-Menu) 
						if( CustomizableUI.getAreaType( place_hcp_mainmenu.area ) == CustomizableUI.TYPE_TOOLBAR ){ //place_hcp_mainmenu.area != "PanelUI-contents"
							// move it!
							set_menu_position( place_hcp_mainmenu.area, place_hcp_mainmenu.position + 1 ); // usa: temp removable=true!
							
						}else{
							HCPlusLib.myDumpToConsole("  Menubar NOT moved to forbidden place:  "+place_hcp_mainmenu.area );
							
							//HCPlusLib.HcSingleton.alert_plus("Customizing Menubar:","Menubar can be placed in a Toolbar only." ); //function(){ window.alert('xxx') }
							
							reset_menu_position_to_toolbar_menubar(); // usa: temp removable=true!
						}
						
						//hcp_mainmenu.parentNode.insertBefore(menubar_items, hcp_mainmenu.nextSibling);
						//HideCaption.myDumpToConsole("    move_menu_new:  menu moved to CUSTOM place!: "+place_hcp_mainmenu );
					}else{
						//HCPlusLib.debugError("  getPlacementOfWidget('menubar-items') returned "+place_Original_mainmenu+", *BUT* it's wrong answer ....? ");
					}
				}else{ 
					// ABSENT  or reset! ! 
					//var toolbar_menubar= document.getElementById( "toolbar-menubar" );
					//if( menubar_items.parentNode != toolbar_menubar ) ...

					// zz_if( !place_Original_mainmenu || place_Original_mainmenu.area  !=  'toolbar-menubar' ) // sometimes this check gets fooled (when were a prev customize error) 

					reset_menu_position_to_toolbar_menubar(); // usa: temp removable=true!
					
					//toolbar_menubar.insertBefore(menubar_items, toolbar_menubar.firstChild);
					HideCaption.myDumpToConsole("    move_menu_new:  menu moved to original place");
				}
				
				
			} catch (ex) { HideCaption.debugError("error: "+ex, ex); }
		},
		
		
		
		
		/*** VIEJO!, movido a devel/
		this.customize_Initial_Setup_things= function(_enabled){
		};
		
		this.customize_cleanup_my_toolbars= function(){
		};
		***/

		
		
		this.toggle_HoverAndDragenter_Elem=  function( _elem, _bAdd){ //mous_over + dragenter !!
			//mas facil es usar directo , para no tener q guardar 1 Hc_EventListener por cada _elem! \/
			//    this.HcEvent_mous_over= new HideCaption.Hc_EventListener(document, "mous_over", this, false);
			if(_elem){
				if(_bAdd){		this.DynamicElemPos.elem_array_for_Active.push(_elem);		
				}else{ 			// nothing ...
				}
			}
		},

		// activate/deactivate vars .....
		this.floatEnabled= false,  // ENABLE Main Flag !!!


		
		this.callb_setActive = function( bActive ){
			
			HideCaption.hcp_root_box.setAttribute("hctp_floatbars_inactive", "" + !bActive );
		};
		
		this.callback_onActive=  function() {
      		if( thySelf.setFloatPosition() ){
				//for FULL (ALL) floating bars!
	      		HideCaption.myDumpToConsole("Performance HIT: calling Delayed_calcSpaceForMinMaxCloseButtons()");
				HideCaption.Delayed_calcSpaceForMinMaxCloseButtons(0); // the .._plus() version make TWO calls!, I want performance here!
      		}
    		thySelf.callb_setActive( true  );
		},
		this.callback_onInactive=  function() {
			//ySelf.last_active_top_pos= -500; // ONLY touch the ..._setted var.
			//thySelf.last_active_top_pos_setted= false;
			
			thySelf.callb_setActive( false );
		},
		

		this.last_active_top_pos= -500,
		this.last_active_top_pos_setted= false,
		
		this.floatbars_upper_hover_setted= false,

		//called also from calcSpaceForButtons...() !!!
		this.setFloatPosition=  function ( isFrom_calcSpace ) { // FT_setFloatPosition <--- esto hace dejar de funcionar el syntax de MYECLIPSE??.....
			
			if( this.floatEnabled && isFrom_calcSpace ){
				//check for FULL floating tbars mode
				if(       thySelf.nav_toolbox.boxObject.height <= 2 ){
					// YES we are in it  :-)
					/* TODO:  only in MAXIMIZED mode! - on top of screen/app , right ?? */
					if(!this.floatbars_upper_hover_setted ){
						this.floatbars_upper_hover_setted= true;
						this.floatbars_upper_hover.style.setProperty(   "top" ,  "0px", "" );
					}
				}else{ // thySelf.nav_toolbox.boxObject.height >  2
					if( this.floatbars_upper_hover_setted ){
						this.floatbars_upper_hover_setted= false;
						this.floatbars_upper_hover.style.removeProperty("top");
					}
				}
			}
			if( this.menubarItems && this.DynamicElemPos.floatActivated ){
				//adjust TOP (& LEFT?) position
				
				var top_pos= -600; // remain this if tbox.h == 0
				
				if( this.hctpToolbox.boxObject.height == 0 ){
					HideCaption.myDumpToConsole("    setting position outside visible area!,  tbox.h == 0  ");
					
				}else{ // normal procedure
					const mainWbox = HideCaption.mainW.boxObject;
					var diffToScreenY= mainWbox.screenY - mainWbox.y; // ie: -8  in Win7  // window.screenY falla mal en linux al aplicar hidechrome (enable addon), fuera del App-Startup.

					//r top_pos = this.box_browser.boxObject.y + HideCaption.mainW.boxObject.y; // fix for ie: mainw margins
					var top_pos_scr = thySelf.nav_toolbox.boxObject.screenY + thySelf.nav_toolbox.boxObject.height; // xx+ HideCaption.mainW.boxObject.y; // fix for ie: mainw margins
					//r left_pos= this.box_browser.boxObject.x;
					
					top_pos_scr += HideCaption.floatBars_extraGap; // for ACTIVE dynbars!
					if( top_pos_scr < window.screen.availTop ){ // screenY MUST be scr..availTop or more!
						top_pos_scr = window.screen.availTop;
					}
					top_pos= top_pos_scr - diffToScreenY;
					if( top_pos < 0 ){
						top_pos = 0;
					}
				}
				
				if( top_pos != this.last_active_top_pos || !this.last_active_top_pos_setted ){

					HideCaption.myDumpToConsole("    setting position:    "+top_pos+"px");

					this.last_active_top_pos_setted= true;
					
					this.menubarItems.style.setProperty("top" ,  top_pos+"px", "" ); //pos_topLeft.Y
					//leave left:0  always, right?
					//is.menubarItems.style.setProperty("left", left_pos+"px", "" ); //pos_topLeft.X
					
					//HideCaption.myDumpToConsole("    setting:    "+"background-position"+": "+"right "+(-1*top_pos+0)+"px");
	
					//background-position: right -30px; 
					this.menubarItems.style.setProperty("background-position", "right "+(-1*top_pos+0)+"px", "" ); //TODO: agregar el 'extraGap' para VertMAX!
					//(adjusted 1px top due to new: background-origin  : border-box;)
				}
				
				if( top_pos == this.last_active_top_pos ){
					return false; // for NOT calling calcSpace...() if position is the SAME.
				}
				this.last_active_top_pos= top_pos;

				
				//DONT CALL THIS HERE!!! (can make a loop..) -->> HideCaption.calcSpaceFor....Buttons();
				return true;
			}
			return false;
		},


	
        this.handleEvent= function (event) {

			// NO HACE FALTA
			// xxx.DynamicElemPos.handleEvent(event);
			
          
			this.handleEvent_customization(event);
        },

        //CALLED by <COMMAND> !!
    	this.key_toggleActivation= function(event){
        	
        	thySelf.DynamicElemPos.key_toggleActivation(event);
    	},

		

        //Load-Options ---------------------------------------------------------------------------------------------
        this.Load_AllOptions= function() {

			if( !this.b_initd ){
				return;
			}
        	
    		this.arrayOptions= HCPlusLib.arrayOptions;
    		
    		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.floatbars.transition"    , function(option_hPrefVal){
    			option_hPrefVal.setAsDomAttribute(HideCaption.mainW);
    		  }, "fast1"        , true )  );

    		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.floatbars.hotspot.style" , function(option_hPrefVal){
    			//option_hPrefVal.setAsDomAttribute(HideCaption.mainW);
    			
    			thySelf.DynamicElemPos.hotspot_style= option_hPrefVal.getVal();
    		  }, "default"        , true )  );

    		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.floatbars.style_bars", function(option_hPrefVal){
    			option_hPrefVal.setAsDomAttribute(HideCaption.mainW);
    		  }, "shadow  disabled"        , true )  );
        };

        
        
        /**** movido a devel/
         *
        
        //TOOLBAR's context menu! ----------------------------------------------------------------------------------
    	//override original method
    	this.hc_onViewToolbarsPopupShowing= function (aEvent, aInsertPoint){
    	}
          
    	this.moveToOther_cmd= function(aEvent) {}
		this.set_jumpToolbar= function(oneBar, bSetToFloating){}
		this.do_jumpToolbar= function(oneBar){}
		
		 *
         ***/


};
// END of 'class'






//for several floating utilities!!! -----------------------------------------------------------------------------------------------
var FloatHpr_class= function ( _win ){

	const window      = _win;
	const document    = window.document;
	const setTimeout  = window.setTimeout;
	const clearTimeout= window.clearTimeout;
	
	const HCPlusLib   = window.HCPlusLib;
	const HideCaption = window.HideCaption;

	
	//------------------------------------------
	
	
		this.arrayForBkgs= [],

		this.lwt_update_ocurred= false,

		this.init= function(){
			var floatHelper= HideCaption.FloatHelper;
			
			//TODO: temp code!! -- can be used for FLOATING MENU too !!!
			this.arrayForBkgs= HideCaption.FloatToolbarsHandler.menubarItems? [HideCaption.FloatToolbarsHandler.menubarItems]: [];

			//<-- para poner MI PROPIO background en el floating!
			setTimeout(function(){
				//init style for MISSING event at STARTUP!!!
				if( ! floatHelper.lwt_update_ocurred ){
					//always present, right? - HideCaption.mainW.getAttribute("lightweightthemes")
					var lwtheme_Attr= HideCaption.mainW.getAttribute("lwtheme");

					//NOT computedStyle() here:
					var headerURL= HideCaption.mainW.style.getPropertyValue("background-image");
					var bkg_color= HideCaption.mainW.style.getPropertyValue("background-color");
					//if we ARE in lwtheme !
					if( lwtheme_Attr == "true" && headerURL ){
						floatHelper.arrayForBkgs.forEach(function(mItem) {
							try {
								floatHelper.setBkgStyles(mItem, headerURL, bkg_color);
							} catch (ex) {
								HideCaption.debugError("error: "+ex, ex);
							}
						}/* nothing more here ok? */);
						
						do_gNavToolbox(headerURL, bkg_color);
					}
				}
			}, 500);
		},
		//Using OBSERVER for lightweight-theme in 'HideCaption'
		//object for "lightweight-theme-styling-update" topic!
		this.lwt_update_obs= {
			observe: function(subject, topic, data) {
	    		/** @type HideCaption.FloatHelper  */
				var floatHelper= HideCaption.FloatHelper;

				var headerURL= null;
				var bkg_color= null;
				try{
					//print("subject:"+subject+"   topic:"+topic+"    data.length:"+data.length +"    data:"+data+" \n");
					var dataObj = JSON.parse(""+data) || {};
					headerURL= dataObj["headerURL"];
					bkg_color= dataObj["accentcolor"];
				}catch(ex){
					//print("    error:"+ex+" \n\n");
					HideCaption.debugError("error: "+ex, ex);
				}
				// background-position: right -30px;

				headerURL= headerURL? ("url(\""+headerURL+"\")"): headerURL;
				
				floatHelper.arrayForBkgs.forEach(function(mItem) {
					try {
						floatHelper.setBkgStyles(mItem, headerURL, bkg_color);
					} catch (ex) {
						HideCaption.debugError("error: "+ex, ex);
					}
				}/* nothing more here ok? */);
				
				do_gNavToolbox(headerURL, bkg_color);
				
				floatHelper.lwt_update_ocurred= true;
			}
		},

		this.setBkgStyles= function(mItem, headerURL, bkg_color) {
		  	//HideCaption.myDumpToConsole("  BEGIN:  setBkgStyles(  , "+headerURL+", "+bkg_color+" ) \n");
			if( headerURL ){
				//print();
				//background-image: : url("http://getpersonas-cdn.mozilla.net/static/1/6/16/newfirefoxheader.png?1299763251");
				mItem.style.setProperty("background-color", ""+bkg_color,  "" );
				mItem.style.setProperty("background-image", ""+headerURL,  "" );
			}else{
				mItem.style.removeProperty("background-color");
				mItem.style.removeProperty("background-image");
				//print("    headerURL:"+"(DELETE it!!!)"+" \n\n");
			}
		};

		function do_gNavToolbox(headerURL, bkg_color){
				// execute even on TBoxHide.disabled!, these vars are needed when user enables it!
				try{
					var mItem= window.gNavToolbox;
					if( headerURL ){
						mItem.style.setProperty("--hctp_dynbars_bkg_color", ""+bkg_color,  "" );
						mItem.style.setProperty("--hctp_dynbars_bkg_image", ""+headerURL,  "" );
					}else{
						mItem.style.removeProperty("--hctp_dynbars_bkg_color");
						mItem.style.removeProperty("--hctp_dynbars_bkg_image");
					}
				}catch(ex){ HideCaption.debugError("error: "+ex, ex);  }
		};
		
};
//END of 'class'

