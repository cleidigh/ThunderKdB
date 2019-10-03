
"use strict";

var EXPORTED_SYMBOLS = ["HcExtras_class"];

var HcExtras_class= function( _win ){

	const window      = _win;
	const document    = window.document;
	const setTimeout  = window.setTimeout;
	const clearTimeout= window.clearTimeout;
	const screen      = window.screen;
	const parseInt    = window.parseInt;
	const parseFloat  = window.parseFloat;

	const HCPlusLib   = window.HCPlusLib;
	const HideCaption = window.HideCaption;

	
	const thySelf= this;

	//------------------------------------------

	
	this.CROSS_MAX_LIMIT = 5;
	this.CROSS_TIME_RESET= 800; // NO bastaba con 7 y 500 cuando recargaba mi dialog inside frame!!

	// CHECK2 --------
	this.CROSS_MAX_LIM__CHECK2  = 10;
	this.CROSS_TIME_RES__CHECK2 = 5000; // aumenta al triple la relacion!


	const Vert_Max= new (function(){

		const myDumpToConsole         = function(            aMessage){
			//if( this.bPrintDebug ) // REDUNDANT check for PERFORMANCE !!!
			HCPlusLib.myDumpToConsole_plus ("VertMax"      , aMessage);
		};

		
		var browser_border_end__elem= null;
		function get__browser_border_end__width() {
			try {
				if(!browser_border_end__elem ){
					browser_border_end__elem= document.getElementById("browser-border-end"); 
				}
				return browser_border_end__elem.boxObject.width;
			} catch (ex) {
				HCPlusLib.debugError(" Ignoring error: "+ex, ex);	
				return 0;
			}
		}

		
		var observer_attr = null; 
		function store_obs_attrs  ( _obs ){	if( observer_attr    ){	observer_attr   .disconnect();	}	observer_attr   = _obs;	}

		
		this.pref_behavior= "";
		this.snap_right  = false;
		this.snap_left   = false;
		this.snap_top    = true ;  // TRUE by default here 
		this.snap_bottom = false;
		
		
		// bordes extras del unmax ...
		var bWidth_right= 1;
		var bWidth_left = 1;
		
		
		const __hcGap_vertMaxim   = "--hcGap_vertMaxim",
		      __hctp_gapInnerRight= "--hctp_gapInnerRight",
		      __hctp_gapInnerLeft = "--hctp_gapInnerLeft";

		const VM_css_props= new HCPlusLib.Css_prop_class(); 
		
				
		// core code --------------------------------------------------------------------
		
		var     isEnabled= false;
		this.vm_isEnabled= function() {		return isEnabled;	};
		
		const setEnabled= function(_bEnab){
			if( isEnabled != _bEnab){
				isEnabled  = _bEnab;

				// attr in hcp_root_box
				HCPlusLib.setAttribute_ifTrue( HideCaption.hcp_root_box, "hctp_vertical_maxim__ENABLED"  , _bEnab );
				
				// *NO* prender este css en startup pq puede haber filtros que no permitan el ENABLE!!!
				HCPlusLib.HcSingleton.VerticalMaxim_sheet.setStyleSheet( !_bEnab? null: "chrome://HideCaptionPlus_fx/content/components/VerticalMaxim.css" );
				
				// TBoxHide
				HideCaption.TBoxHide.update_style_pos( 250 ); // el move_window() suele dar un buen delay!
			}
		};
		
		const canBe_Enabled= function( tryToEnable ){
			
			//const my_alert_id= "vertMax_alerts";
			
			//TODO: poner mas filtros??
			
			/***
			// ONLY for RC !!!!
			if( HCPlusLib.HcSingleton.isReleaseVersion ){
				myDumpToConsole( "    canBe_Enabled() is FALSE!!  -  bc of forbidden rule:  isReleaseVersion is TRUE (warn) " );
				return false;
			}
			***/
			
			var alertMsg="";
			var allowed= true;
			var showAlert= false;
			
			var forbiddenPopup_text = false;
			
			function isPopup_from_chromehidden() {
				var chromehidden= window.document.documentElement.getAttribute("chromehidden"); // used by FF to disable sidebars & toolbas in POPUPS !!!
				return (chromehidden && chromehidden != "" );
			}
			
			if( HideCaption.isPopup || isPopup_from_chromehidden() ){
				allowed= false;
				
				if(!thySelf.cancelNextAlert_forbiddenPopup ){
					
					alertMsg += " * Not applicable in Popup window/s \n\n";
					forbiddenPopup_text= true;
					showAlert= true;
				}else{ // cancel it!
					myDumpToConsole( "  canBe_Enabled() is FALSE!! ,  bc of forbidden rule:  isPopup is TRUE   (& CANCELLING this alert)" );
				}
			}
			
			if( window.devicePixelRatio < 1 ){ // if moveTo() behave weird for 1.25 I can't even imagine for 0.x !! 
				alertMsg += " * Preference: \"size of text and other items ...\" [layout.css.devPixelsPerPx]   (or internal variable: window.devicePixelRatio)  can't be less than 1 \n\n";
				allowed= false;
				showAlert= true;
			}
			
			if( (""+HideCaption.adv_sysbut_winappear).trim().length < 2 ){
				alertMsg += " * " + HCPlusLib.HcSingleton.main_GetStringFromName( "enabledCustomMMC_mandatory" )+"\n\n";
				allowed= false;
				showAlert= true;
			}
			
			// aqui estaba lo de 'titlebar_new15' 

			// TODO: hay q poner en most_recent_windows() nomas! ... cuando seteo dsd la pref directo! (por ej dsd el dialog)
			if( !allowed && showAlert ){
				if( isEnabled  ||  tryToEnable ){
					//TODO: my_alert_id 
					const secondsAfter_WinOpened= (new Date().getTime() - window.HideCaption.opened_time)/1000;
					if(   secondsAfter_WinOpened > 5 ){
						HideCaption.alert_panel( null, document.getElementById("navigator-toolbox"), 
								HCPlusLib.HcSingleton.main_GetStringFromName( "VertMax_WarnTitle" )+"\n\n" + alertMsg);
						if( forbiddenPopup_text ){
							thySelf.cancelNextAlert_forbiddenPopup = true;
						}
					}
				}
			}else{ // allowed
				//TODO: HideCaption.alert_panel_close( my_alert_id );
			}
			
			return allowed;
		};

		// this
		this.vm_canBe_Enabled= function( tryToEnable ) {		
			return canBe_Enabled( tryToEnable );	
		};

		
		// this
		this.vm_enforceRules= function(){
			if( isEnabled ){
				if( !canBe_Enabled() ){
					// TURN OFF
					Vert_Max.set_Listeners( false );
				}
			}else{ // !isEnabled
				Vert_Max.honor_prefState();
			}
		};
		
		
		var offset_devPR= 0;

		//    active flag ---------------------------------------------
		var     isActive= false;
		this.vm_isActive= function() {		return isActive;	};
		
		var     isActive_with_Top= false;
		
		const canBe_Active= function( /* _bSoft */ ){

			const internal__canBe_Active= function(){
				if( !isEnabled ){
					return false;
				}
				if( window.windowState != window.STATE_NORMAL ){
					myDumpToConsole( "    canBe_Active() is FALSE!!  -  bc of forbidden windowState ("+window.windowState+") " );
					return false;
				}
				
				//TODO: poner MAS filtros?
				
				return true;
			};

			//const bForced= !_bSoft; // toda esta logica del bForced todavia NO esta probada...
			
			const canBe  = internal__canBe_Active();
			if(   canBe != isActive ){
				//if( bForced  ||  window.windowState != window.STATE_MINIMIZED ){ // DON"T touch atts (affecting css) for MINIMIZED
					HCPlusLib.setAttribute_ifTrue( HideCaption.mainW, "hctp_vertical_maxim_active"  , canBe);
				//}
				
				// calc extra width, ONLY for unmax!  -  EACH TIME bc user can eg. enable Aero Basic , etc
				if( canBe ){
					if( window.windowState == window.STATE_NORMAL ){
						bWidth_right= bWidth_left = get__browser_border_end__width();
						
						offset_devPR = window.devicePixelRatio > 1 && window.devicePixelRatio < 2? 1: 0;
					}
				}
			}
			isActive= canBe;			

			
			const _canBe_active_with_Top  = canBe && Vert_Max.snap_top;
			if(   _canBe_active_with_Top != isActive_with_Top ){
				//if( bForced  ||  window.windowState != window.STATE_MINIMIZED ){ // DON"T touch atts (affecting css) for MINIMIZED
					HCPlusLib.setAttribute_ifTrue( HideCaption.mainW, "hctp_vertical_maxim_act__TOP", _canBe_active_with_Top);
				//}
			}
			isActive_with_Top= _canBe_active_with_Top;

			
			return canBe;
		};
		

		// CLASS 
		function Boundary_class( iAm_X ) {
			
			//const bound_TimeOut = new HCPlusLib.HcSingleton.Hc_Timeout();

			var old_val= 0;
			
			var limit_count_started= false;
			var times_crossed= 0;
			
			// * CHECK_2 *!! ----------------
			var times_cros_CHECK2= 0;

			
			// this -----------------------------------------------------------
			
			this.check_crossing= function( val ){
				if( old_val > 0  &&  val < 0  ||
				    old_val < 0  &&  val > 0  ){

					// BOUNDARY CROSSED!
					times_crossed ++;

					if(!limit_count_started){
						limit_count_started= true;
						
						//if(!bound_TimeOut.isWaiting() ) // bound_TimeOut.xxx
						setTimeout(function() {
							limit_count_started= false;
							times_crossed= 0;
							//myDumpToConsole( "                   .. doing RESET !! " );
						}, HideCaption.HcExtras.CROSS_TIME_RESET );
					}
					
					// * CHECK_2 *!! ----------------
					if( times_cros_CHECK2 <= 0 ){
						setTimeout(function() {
							times_cros_CHECK2= 0;
							//myDumpToConsole( "                   .. doing RESET * CHECK_2 *!! " );
						}, HideCaption.HcExtras.CROSS_TIME_RES__CHECK2 ); // ~ SIX times more!
						times_cros_CHECK2++;
					}else{ // times_cros_CHECK2 > 0
						times_cros_CHECK2++;
					}
					
				}
				old_val= val;
				
				const MIN_ALLOWED_VAL= 8; // arbitrario para NO filtrar erroneamente movimientos grandes!! (MENOR a 10 p/ q SI haga el moveBy(x, -10) de 'mi' top )
				
				// se calcula la ultima parte en muy pocos casos (performance!)
				if( times_cros_CHECK2 < HideCaption.HcExtras.CROSS_MAX_LIM__CHECK2  &&
				    times_crossed     < HideCaption.HcExtras.CROSS_MAX_LIMIT        || 
				    (iAm_X && Vert_Max.snap_left ? (val < 0 || val > MIN_ALLOWED_VAL): (val > 0 || val < -MIN_ALLOWED_VAL)) ){ // negativo solo p/ LEFT, y positivo p/ right, bottom, rezise ...
					return true;
				}else{
					myDumpToConsole( "  STOPPING ...  times_crossed= "+times_crossed+",    times_cros_CHECK2= "+times_cros_CHECK2+"   " );
					return false;
				}
			};
			
			//this.get_times_crossed= function() {	return times_crossed;	};
			
		}; // END CLASS
		const Xmove_check= new Boundary_class( true );
		const Ymove_check= new Boundary_class();
		const Hsize_check= new Boundary_class();
		const Wsize_check= new Boundary_class();


		
		//nst elem_browserPanel= document.getElementById("main-window");  // NO browser-panel in Fx 60 
		
		const elem_content_deck= document.getElementById("content-deck"); // NO browser-panel in Fx 60 

		var elem_lowest_box    = document.getElementById("browser-bottombox");
		if(!elem_lowest_box ){
			elem_lowest_box = elem_content_deck;
		}
		
		
		const vertical_maxim_test=  HCPlusLib.getPlatformPlus()=="windows"? 10: 0; // ZERO works for LINUX!!

		this.window_moved= function( value, oldValue, _msgCaller) {
			// DELAYED!!
			setTimeout(function(){
				Vert_Max.window_moved_NOW( value, oldValue, _msgCaller);
			}, 10);
		}
	  	this.window_moved_NOW= function( value, oldValue, _msgCaller) {
			if( value == oldValue ){
				return;
			}
	  		if( !canBe_Active( true ) ){ // true == modo_soft
	  			return;
	  		}
			
			
			//myDumpToConsole( "  * window_moved( "+value+",  "+oldValue+",  '"+_msgCaller+"' )" );
			
			var my_win_screenX = window.screenX;
			if( my_win_screenX == -32000 ){
				my_win_screenX = -100;  // arbitrary value
				myDumpToConsole( "     screenX  was -32000 !!!  (warn, error?) , fixed... " );
			}

			
			//availLeft puede ser hasta negativo en mi left-monitor!
			var target_X = my_win_screenX;
			if( Vert_Max.snap_right && !Vert_Max.snap_left ){ // ONLY right!
				const leftOuterGap = elem_content_deck.boxObject.screenX - window.screenX;
				target_X = screen.availLeft + screen.availWidth + bWidth_right /* window.devicePixelRatio*/ - leftOuterGap - elem_content_deck.boxObject.width;
			}
			if( Vert_Max.snap_left  ){
				target_X = screen.availLeft                     - bWidth_left  /* window.devicePixelRatio*/ + (window.screenX    - elem_content_deck.boxObject.screenX);
				//myDumpToConsole( "       w.sX: "+window.screenX+", elem.sX: "+elem_content_deck.boxObject.screenX+" ) " );
			}


			var target_Y = window.screenY;
			if( Vert_Max.snap_top ){
				target_Y = screen.availTop - vertical_maxim_test;
			}
			// bottom only!
			if( !Vert_Max.snap_top && Vert_Max.snap_bottom ){
				const bottomGap= window.screenY + window.outerHeight - elem_lowest_box.boxObject.screenY - elem_lowest_box.boxObject.height;
				
				var deltaH   = screen.availHeight + bottomGap - window.outerHeight;
				if( deltaH < 0 ){
					myDumpToConsole( "     .. WILL DO:  resizeBy() " );
					window.resizeBy( 0, deltaH); // 1ero esto p/ no mover DOS veces!!
					deltaH= 0;  // Bingo!
				}
				target_Y = screen.availTop + deltaH;
			}

			var local_offset_devPR= offset_devPR;
			
			// for moveBy()
			var mvBy_X= target_X - window.screenX;
			var mvBy_Y= target_Y - window.screenY;
			
			if( mvBy_X != 0  ||  
			    mvBy_Y != 0  ){
				//myDumpToConsole( "       w.sX: "+window.screenX+", w.sY: "+window.screenY+" ) " );

				// FIXING BUG **JUMPING window** for d.p.ratio=1.25, (left/right pos OR height MAY jump 2px ...)
				//TODO: estos 2 checks hay q DESDOBLAR (c/u pone su var a 0) cuando quiera hacer por ej left y bottom!!
				
				const Xmove_check_check_crossing__mvBy_X  = Xmove_check.check_crossing( mvBy_X );
				const Ymove_check_check_crossing__mvBy_Y  = Ymove_check.check_crossing( mvBy_Y );
				if( ! Xmove_check_check_crossing__mvBy_X ){
					myDumpToConsole("  NOT DOING  moveBy( "+mvBy_X+", -- )  anymore!! (warn)  ");
					mvBy_X= 0;
					local_offset_devPR= 0;
				}

				if( ! Ymove_check_check_crossing__mvBy_Y ){
					myDumpToConsole("  NOT DOING  moveBy( --, "+mvBy_Y+" )  anymore!! (warn)  ");
					mvBy_Y= 0;
				}
				
				
				if( Xmove_check_check_crossing__mvBy_X   ||
				    Ymove_check_check_crossing__mvBy_Y   ){
					myDumpToConsole( "     .. WILL DO:  moveBy( "+mvBy_X+", "+mvBy_Y+" )        target( "+target_X+", "+target_Y+" ) " );
					window.moveBy  ( mvBy_X, mvBy_Y );
					// CAN'T USE moveTo() !! bc of IMPRESSIVE Fx BUG!! with [layout.css.devPixelsPerPx] == 1.25 ; doing moveTo(75, x), got screenX == 74 (1 px less!). Fx 51.0a2 (2016-09-28), Win7-64 Glass, 1366x768
					// Estoy permitiendo _nomas_ el (0,0) aqui (cuando hay un corte-de-crossing), para no agregar mas IFs !
				}else{
					// NO meter RESET aca , pq da 2 'hits' y eso vd??
				}
			}
			
			// top AND bottom:  do-resize!
			if( Vert_Max.snap_top && Vert_Max.snap_bottom ){
				var visible_height= elem_lowest_box.boxObject.screenY + elem_lowest_box.boxObject.height - HideCaption.hcp_root_box.boxObject.screenY;

				var rzBy_H  = screen.availHeight - visible_height;
				//myDumpToConsole( "     ..    w_outerH: "+window.outerHeight+",  elem_h: "+visible_height+" ) " );
				if( rzBy_H != 0 ){
					//var target_W = window.outerWidth; 
					if( Hsize_check.check_crossing( rzBy_H ) ){
						myDumpToConsole( "     .. WILL DO:                            resizeBy( "+0+", "+rzBy_H+" ) " );
						window.resizeBy( 0, rzBy_H ); // + vertical_maxim_test 
					}else{
						myDumpToConsole("  NOT DOING  resizeBy( "+0+", "+rzBy_H+" )  anymore!! (warn)  ");
					}
				}
			}

			// "HORIZONTAL Maximize" - horiz-resize!
			if( Vert_Max.snap_left && Vert_Max.snap_right ){
				var rzBy_W  = screen.availWidth - elem_content_deck.boxObject.width + bWidth_left + bWidth_right + 1; // mas 1 p/ q agarre bien el scrollbar vert!
				//myDumpToConsole( "     ..    w_outerW: "+window.outerWidth+",  elem_w: "+elem_content_deck.boxObject.width+" ) " );
				if( rzBy_W != 0 ){
					if( Wsize_check.check_crossing( rzBy_W ) ){
						myDumpToConsole( "     .. WILL DO:                            resizeBy( "+rzBy_W+", "+0+" ) " );
						window.resizeBy( rzBy_W, 0 ); 
					}else{
						myDumpToConsole("  NOT DOING  resizeBy( "+rzBy_W+", "+0+" )  anymore!! (warn)  ");
					}
				}
			}

			
			// calc INNER_GAPs !!
			if( Vert_Max.snap_right ){
				// esta tb [window.mozInnerScreenX] pero esta en float con decimales ... (para dev==1.25)
				const gapInnerLeft = elem_content_deck.boxObject.screenX - HideCaption.mainW.boxObject.screenX + HideCaption.mainW.boxObject.x; 
				
				const gapInnerRight= window.innerWidth - elem_content_deck.boxObject.width - gapInnerLeft + bWidth_right
					- local_offset_devPR;
				VM_css_props.setProperty_plus( HideCaption.mainW, __hctp_gapInnerRight, gapInnerRight+"px", "");
			}
			if( Vert_Max.snap_left  ){
				// A ESTE 'gapInnerLeft' se suma el [bWidth_left]!
				const gapInnerLeft = elem_content_deck.boxObject.screenX - HideCaption.mainW.boxObject.screenX + HideCaption.mainW.boxObject.x + bWidth_left
					- local_offset_devPR; 
				VM_css_props.setProperty_plus( HideCaption.mainW, __hctp_gapInnerLeft , gapInnerLeft +"px", "");
			}
	  	};

	  	
		const my_TimeOut = new HCPlusLib.HcSingleton.Hc_Timeout();

		var old_windowState= -123;
		
		const on_sizemodechange =  function( event ) {
			myDumpToConsole( "   ... [sizemodechange]   windowState = " + window.windowState );
			
			// NICE!, avoids flicker on top-area! - NOT from minimized bc screenX comes with -32000 !!, and do ALWAYS some delay bc from maximized it comes with -8 too!
			if( window.windowState == window.STATE_NORMAL    &&  
			    old_windowState    != window.STATE_MINIMIZED ){
				setTimeout(function(){
				  	Vert_Max.window_moved_NOW( -1, -2, "on_sizemodechange(),  (almost)  NOT delayed **");
				}, 1);
			}
			
			old_windowState = window.windowState;
			
			my_TimeOut.setTimeout(function(){
			  	Vert_Max.window_moved( -1, -2, "on_sizemodechange(), delayed ");
			}, 200);
		};


	  	// listeners --------------------------------------
		
		this.prefValue= "";
		
		this.honor_prefState= function() {
			
			if( !Vert_Max.canStartup ){
				myDumpToConsole( "   vm.canStartup is still FALSE! " );
				return; // RETURN!
			}
			
			Vert_Max.set_Listeners( Vert_Max.prefValue == "yes" );
		};
		
		var listeners_loaded= false;
		
		this.set_Listeners=  function ( bAdd ){
			myDumpToConsole( "   ... BEGIN  set_Listeners("+bAdd+") " );
			
			if( bAdd && !canBe_Enabled( bAdd ) ){
				myDumpToConsole( "   ...  CAN'T be enabled!! " );

				setEnabled( false );
				return;
			}

			
			if( listeners_loaded == bAdd ){	myDumpToConsole( "   ... set_Listeners("+bAdd+"),  ALREADY in that state!! " );   return; }
			listeners_loaded= bAdd;

			
			HideCaption.set_EventListener( bAdd, window, "sizemodechange" , on_sizemodechange  , true);  // capture = true !
			
			if( bAdd ){  // Activate !!

				// ENABLED  =  true
				setEnabled( bAdd ); // setea  bWidth_right, etc

				VM_css_props.setProperty_plus( HideCaption.mainW, __hcGap_vertMaxim, vertical_maxim_test+"px", "");
				
				//ore_obs_screenY( HideCaption.observe_attribute( HideCaption.mainW, "screenY", Vert_Max.window_moved ) );
				
				store_obs_attrs  ( HideCaption.observe_attribute_fromArray( HideCaption.mainW, ["screenX", "screenY", "height", "width"] , Vert_Max.window_moved ) );
				
				//EXECUTE one time!
			  	Vert_Max.window_moved( -1, -2, "at add-listeners");
			  	
				const secondsAfter_WinOpened= (new Date().getTime() - window.HideCaption.opened_time)/1000;
				if(   secondsAfter_WinOpened < 5 ){
					setTimeout(function() {
						//EXECUTE DELAYED!
					  	Vert_Max.window_moved( -1, -2, "DELAYED at add-listeners");
					}, 2000);
				}
				
			}else{ // !bAdd - // DE-Activate !!

				// CLEAR css props!
				VM_css_props.clear();

				//ore_obs_screenY( null );
				store_obs_attrs  ( null );

				
				// only in STATE_NORMAL
				if( window.windowState == window.STATE_NORMAL ){
			  		//if( canBe_Active() )
					const moveY= window.screenY - screen.availTop;
					if(   moveY < 0 ){
					  	window.moveBy( 0, -moveY );
					}
					if( Vert_Max.snap_top && Vert_Max.snap_bottom ){
						const resizeH= window.outerHeight - screen.availHeight;
						if(   resizeH > 0 ){
						  	window.resizeBy( 0, -resizeH );
						}
					}
				}

		  		// ENABLED  =  false  (done at bottom!)
				setEnabled( bAdd );
				
				canBe_Active(); // hace removeAttr..() y setea isActive = false.  Y tb ASEGURA q los attrs queden bien (p.e. en modo MINIMIZED) 
			}
		};
		// END set_Listeners()
	
		
		this.onChange_behavior= function( _behavior) {
			
			Vert_Max.pref_behavior = _behavior;
			//rt_Max.do_resize  = _behavior.indexOf("resize") >= 0;
			Vert_Max.snap_right = _behavior.indexOf("right" ) >= 0;
			Vert_Max.snap_left  = _behavior.indexOf("left"  ) >= 0;
			Vert_Max.snap_top   = _behavior.indexOf("top"   ) >= 0;
			Vert_Max.snap_bottom= _behavior.indexOf("bottom") >= 0;

			canBe_Active(); // esta llamada previa, q parece redundante, es para ASEGURAR q los attrs queden bien (p.e. en modo MINIMIZED) 
			
			Vert_Max.window_moved( -1, -2, "pref:  behavior");  // calls canBe_Active(), that sets attributes.
		};

	})();
	
	
	this.vertMax_isEnabled= function() {
		return Vert_Max.vm_isEnabled();
	};
	
	this.vertMax_isActive= function() {
		if( !Vert_Max.vm_isEnabled() ){
			return false; // RETURN!!
		}
		return Vert_Max.vm_isActive();
	};
	
	this.vertMax_moveWin= function() {
		if( !Vert_Max.vm_isEnabled() ){
			return false; // RETURN!!
		}
	  	Vert_Max.window_moved( -1, -2, "vertMax_moveWin()");
	};
	
	this.vertMax_snapHoriz= function() {
		if( !Vert_Max.vm_isEnabled() ){
			return false; // RETURN!!
		}
		if( !Vert_Max.vm_isActive() ){ // quiero asegurar preguntando por los 2: enable y active
			return false; // RETURN!!
		}
		return Vert_Max.snap_left || Vert_Max.snap_right;
	};
	
	// enforceRules
	this.vertMax_enforceRules= function() {
		Vert_Max.vm_enforceRules();
	};
	
	
	this.vertMax_toggleEnable= function() {
		function _setPref( _val ) {
			window.Services.prefs.setCharPref(  "extensions.hide_caption." + "plus.vert_max", _val );
		}
		
		if( Vert_Max.vm_isEnabled() )        {	_setPref("no");
		}else{  // NOT ENABLED
			if( Vert_Max.prefValue == "yes" ){	Vert_Max.honor_prefState();
			}else                            {	if( Vert_Max.vm_canBe_Enabled(true) ){	_setPref("yes");	}
			}
		}

		// update MENUITEM 
		this.vertMax_update_mitem();
	};
	
	// update MENUITEM 
	this.vertMax_update_mitem= function() {
		try {
			document.getElementById('mitem__vertical_maxim_toggle').setAttribute('checked', Vert_Max.vm_isEnabled() );
	    }catch(ex){ HCPlusLib.debugError("error: "+ex, ex);  }
	};
	
	
    //   Load_AllOptions ---------------------------------------------------------------------------------------------
    this.Load_AllOptions= function() {

		this.arrayOptions= HCPlusLib.arrayOptions;

		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.vert_max"          , function(option_hPrefVal){
			//option_hPrefVal.setAsDomAttribute(HideCaption.mainW);
			
			Vert_Max.prefValue= ""+option_hPrefVal.getVal();
			
			Vert_Max.honor_prefState();
			
		  }, "no"        , true )  );

		setTimeout(function() {
			Vert_Max.canStartup= true; // canStartup: used for nice/timely checking of (forbidden) POPUP window!!

			Vert_Max.honor_prefState();
		}, 100 );
		
		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.vert_max.behavior" , function(option_hPrefVal){
			
			option_hPrefVal.setAsDomAttribute(HideCaption.mainW);
			option_hPrefVal.setAsDomAttribute(HideCaption.hcp_root_box);
			
			Vert_Max.onChange_behavior( ""+option_hPrefVal.getVal() );
			
		  }, "default top bottom resize"        , true )  );  //TODO:  SACAR 'resize' de aqui vd??
		
    };

    

	//SHUTDOWN
	this.hc_shutdown= function() {
		try {
			HCPlusLib.myDumpToConsole(   "HcExtras  Begin hc_shutdown()  " );

			Vert_Max.set_Listeners( false );

		} catch (ex) {	HCPlusLib.debugError(" Ignoring error: "+ex, ex);	}
	};
	
};


