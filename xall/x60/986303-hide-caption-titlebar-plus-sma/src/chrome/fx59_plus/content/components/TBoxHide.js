
"use strict";

//australis

var EXPORTED_SYMBOLS = ["TBoxHide_class"];

var TBoxHide_class= function( _win ){

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


	this.b_initd= false;

	
	this.Main_IsEnable= function( bEnable ){
		try {
			
			if( this.b_initd == bEnable ){
				HCPlusLib.myDumpToConsole( "   ... Main_IsEnable(): already setted to: "+bEnable );
				return;
			}
			this.b_initd = bEnable;

			
			if( bEnable ){

				//to restore at shutdown! -- poner ANTES del Dynamic...init() !!!!
				HCPlusLib.setAttribute_withBkp(                   window.gNavToolbox, "inactive", "true" );
				HCPlusLib.BackupEngine_Styles_Attrs.backupStyles( window.gNavToolbox, ["top","background-position"] );
				
				
				thySelf.DynamicElemPos.hotspot_style="none"; // TODO falta la PREF? 
				
				thySelf.DynamicElemPos.init( window.gNavToolbox, this.callback_onActive, this.callback_onInactive );
				
				thySelf.DynamicElemPos.on_DOMMenuBarActive= this.on_DOMMenuBarActive;
				
			}else{
				setStyle_top( false );
			}
			
			// addListeners - ALL!!
			this.set_All_EventListeners( bEnable );

			HideCaption.listenDownloads( bEnable );

			
		} catch (ex) {
			HCPlusLib.debugError(" Ignoring error: "+ex, ex);
		}
	};

	// called in DynamicElemPos!
	this.on_DOMMenuBarActive= function( bSet ) {
		window.setTimeout( function(){
			floatBars_setFloatPosition();
		}, 200); // menubar padding transition is ~70 // hasta 170 fallo (opc_transition == "none")
	};
	
	
	var last_active_top_pos= null;
	
	function setStyle_top( bSet ) {

		if( bSet ){
			if( thySelf.DynamicElemPos.floatActivated ){
				
				const mainWbox = HideCaption.mainW.boxObject;
				var diffToScreenY= mainWbox.screenY - mainWbox.y; // ie: -8  in Win7  // window.screenY falla mal en linux al aplicar hidechrome (enable addon), fuera del App-Startup.

				var top_pos_scr = window.screen.availTop; // MINIMUM admitted value
				
				var top_pos= top_pos_scr - diffToScreenY;
				if( top_pos < 0 ){
					top_pos = 0;
				}
				
				top_pos -= 24; //menubar extra space - DEBE coincidir con el css:  --hctp_floatMenubar_height 
			
				if( top_pos === last_active_top_pos ){
					return false; // for performance! 
				}
				last_active_top_pos= top_pos;

				HideCaption.myDumpToConsole("    TBoxHide:  setting position:    "+top_pos+" px");
				
				window.gNavToolbox.style.setProperty("top"                ,  top_pos+"px"               , "" ); //pos_topLeft.Y
				//background-position: right -30px; 
				window.gNavToolbox.style.setProperty("background-position", "right var(--hctp_tbox_bkgPosX)  top "+(-1*top_pos+0)+"px", "" );
				
				// adjust float-bars: *me parecio* q no actualizo en vert_max toggle
				do__fltBrs_setFloatPosition();
			}
		}else{ // !bSet
			last_active_top_pos= null;
			
			window.gNavToolbox.style.removeProperty("top"                 ); //pos_topLeft.Y
			//background-position: right -30px; 
			window.gNavToolbox.style.removeProperty("background-position" );
		}
	};

	
	this.opc_transition= "none";
	
	var expected_delay_transition= 50;
	
	function floatBars_setFloatPosition(){
		// esto FUERA del delay!!, (2017 oct: se suele filtrar una llamada a setFloatPosition() ANTERIOR a esta-con-delay! )
		// ... y TAMBIEN fuera del if-floatActivated y SOLO depende de bTbox_float!
		HideCaption.floatBars_extraGap= thySelf.bTbox_float? -8: 0; // && thySelf.bTbox_active
		// ONLY if I'm activated OR floatbars already ACTIVATED!
		if( thySelf.DynamicElemPos.floatActivated || HideCaption.FloatToolbarsHandler.DynamicElemPos.floatActivated ){
			if( thySelf.opc_transition == "none" ){
				// DIRECT call!
				do__fltBrs_setFloatPosition();
			}else{ // transition  delay!
				window.setTimeout( function(){
					do__fltBrs_setFloatPosition();
					// NESTED!
					window.setTimeout( function(){ 
						do__fltBrs_setFloatPosition();
					}, expected_delay_transition);
				}, expected_delay_transition);
			}
		}
	};
	function do__fltBrs_setFloatPosition(){
		window.setTimeout( function(){
			HideCaption.FloatToolbarsHandler.setFloatPosition();
		}, 0);
	};



	/**
	// transitionend
	// HideCaption.set_EventListener( bAdd, window.gNavToolbox	         , "transitionend", on_toolbox_transitionend, false);
	
	// This could be NOT FIRED!! if css-transition is ruled-out or display:none, before finishing!! 
	function on_toolbox_transitionend( event ) {
		if( event.target !== window.gNavToolbox ){
			return; 
		}
		HCPlusLib.myDumpToConsole("Transition has finished:  "+event.target.id+"            "+event.propertyName+"   "+event.elapsedTime);

		if(       event.propertyName == "margin-top" ){
			do__fltBrs_setFloatPosition();  //QUICK test, needs good 'if' filters
		}else if( event.propertyName == "top" ){ // only when hiding!
			do__fltBrs_setFloatPosition();  //QUICK test, needs good 'if' filters
		}
	};
	**/
	
	
	// -----------------------------------------------------------------------------
	
	this.bTbox_active= false;
	
	this.callb_setActive = function( bActive ){

		thySelf.bTbox_active= bActive;
		
		if( bActive ){
			setStyle_top( true );
		}
		
		//HCPlusLib.myDumpToConsole( "   ... callb_setActive( "+bActive+" )");

		HideCaption.hcp_root_box.setAttribute("hctp_tbox_inactive", "" + !bActive );

		// AT LAST: adjust float-bars!
		floatBars_setFloatPosition();
	};

	this.callback_onActive  =  function() {		thySelf.callb_setActive( true  );	};
	this.callback_onInactive=  function() {		thySelf.callb_setActive( false );	};
	

	// -----------------------------------------------------------------------------

	/**
	 Version NO-TAN-DRAFT! (al final):  esta version tiene estos issues:
	 - Cambia de estado (tbox toggle) aunque el wheel se haga sobre DIV con scrolls internos, pero SOLO para quitar el tbox al inicio! (jfiddle y otros div scrollables)
	 - NO RECUERDA el estado 'float' de paginas sin scroll, luego de tabselect,etc. Hace falta una var/property en 'content' o un attr en su 'browser' element.  
	   (pero tb SOLO? las paginas q perdieron el scroll al 'agrandarse' (ej. de wincommander download page). Y TB el jsfiddle q luego de tabselect regresa a scrollY==0)
	 **/
	
	
	var bTBox_visible= true; // is FLOATing ...
	
	var old_scrY_nonzero= null;

	var scrollto1_ExtraFlag= false;

	
	const Scroll_data=  new  (function(){
		this.old_scrollY= -100;
		this.old_window = null;

		this.forActivate_begin_y= -500;

		var   scrollingUp = null;
		const scr_TimeOut = new HCPlusLib.HcSingleton.Hc_Timeout();
		
		this.reset__act_begin_y  = function(){
			if( window.MousePosTracker ){
				this.forActivate_begin_y = window.MousePosTracker._y;
			}
		};

		//HCPlusLib.get_bannedBut_audio().play();
		
		this.is_scrolled_up  = function(the_content){	var result= this.old_window === the_content && the_content.scrollY < this.old_scrollY;
			if( result ){
				if( scrollingUp !== true ){ // can be NULL or false !!	
					scrollingUp =   true; // BEGGINING of scrolling up!
					this.reset__act_begin_y();
				}
				scr_TimeOut.setTimeout(function(){
					scrollingUp = null;
				}, 1200);
			}
			return result;
		};
		//scrY > 1 para esquivar mi propia llamada a scrollTo(1)
		this.is_scrolled_down= function(the_content){	var result= this.old_window === the_content && the_content.scrollY > this.old_scrollY  && the_content.scrollY > 1;
			if( result ){
				if( scrollingUp !== false  &&  result ){	
					scrollingUp =   false;
				}
				scr_TimeOut.setTimeout(function(){
					scrollingUp = null;
				}, 1200);
			}
			return result;
		};

		this.save_data       = function(the_content){
			this.old_window = the_content;
			this.old_scrollY= the_content.scrollY;	
		};
	})();
	
	
	// const debug_TimeOut = new HCPlusLib.HcSingleton.Hc_Timeout();
	// debug_TimeOut.setTimeout(function(){
	// 	HCPlusLib.myDumpToConsole( "   ... content_scrollY: "+content_scrollY+" " );
	// }, 300);

	
	function onScroll(event) {

		if( !thySelf.scrollCtrl_float ){
			return; // RETURN !!
		}
	
		// content section ------------------------------------------------------------------
		
		const the_content= window.content;
		
		if( !check_content(the_content) ){
			return; // RETURN !!
		}

		
		var content_scrollY= the_content.scrollY;

		
		if( !scrollto1_ExtraFlag ){
			if( content_scrollY > 1 ){
				scrollto1_ExtraFlag= true;
				//HCPlusLib.myDumpToConsole( "   ... scrollto1_ExtraFlag: "+scrollto1_ExtraFlag+" " );
			}
		}else{ // scrollto1_ExtraFlag 
			if( content_scrollY <= 1 ){
				setTimeout(function(){ // delay for not triggering this if user scrolled & just stepped thru 1 and continued ...
					if( the_content.scrollY <= 1 ){ // use *LIVE* value -- Am i *STILL* in this position after some time?
						scrollto1_ExtraFlag= false;
						//HCPlusLib.myDumpToConsole( "   ... scrollto1_ExtraFlag: "+scrollto1_ExtraFlag+"  *DELAYED* " );
					}
				}, 30);
			}
		}
		var scrY_nonzero= content_scrollY > 0;
		
		
		// check movement!! -------------------------------
		if( Scroll_data.is_scrolled_up(the_content) ){
			var _bActivate= true;
			if( window.MousePosTracker && window.MousePosTracker._y - Scroll_data.forActivate_begin_y > -50 ){
				_bActivate= false;				
			}
			if( _bActivate ){
				Scroll_data.reset__act_begin_y();
				
				// moveDownOnly  ---- SPECIAL FLAG !
				thySelf.DynamicElemPos.hotspot_mouse_hover.moveDownOnly= true;
				thySelf.DynamicElemPos.mouse_activate({}, true );
			}
		};
		if( Scroll_data.is_scrolled_down(the_content) ){

			thySelf.DynamicElemPos.mouse_activate({}, false);
		};
		Scroll_data.save_data(the_content);
		
		
		if( scrY_nonzero === old_scrY_nonzero ){
			return;
		}
		
		if( event.type !== "scroll" ){
			HCPlusLib.debugError( " scroll:  BAD event.type:  "+event.type+" " );
			return;
		}
		
		// esto no sirve ... if(event.view === the_content) 
		if( event.target !== the_content.document ){  // check 'target' is THE CURRENT the_content window!!
			//NO LOG here for performance! --- window.console.log('     >>> SKIPPING scroll: other target: '+event.target );
			return;
		}


		//window.console.log -->> delays behind myDump...()
		//		HCPlusLib.myDumpToConsole('     >>>  scrY_nonzero= '+scrY_nonzero
		//				+'  target='    +event.target 
		//				+'  type='      +event.type 
		//		);
		
		if( scrY_nonzero ){
			if( !old_scrY_nonzero ){ // if it's WAS ZERO!!
				//HCPlusLib.myDumpToConsole( "   ... doing XXXprevent..() & scrollTo( ..., 1): " );
				
				if( !enforce_fullScr  &&  bTBox_visible ){
					event.preventDefault();
					event.stopPropagation();
					//the_content.scrollBy(0, 1);
					the_content.scrollTo( the_content.scrollX, 1);
					//setTimeout(function(){
					//	the_content.scrollTo( the_content.scrollX, 1); // ANOTHER TIME!!
					//}, 0);
				}
			}

			update_TBox_visibility(the_content, false);
			
		}else{ // !scrY_nonzero 
			if( scrollto1_ExtraFlag ){
				scrollto1_ExtraFlag= false;
				//HCPlusLib.myDumpToConsole( "   ... scrollto1_ExtraFlag: "+scrollto1_ExtraFlag+"  *BOUNCED*" );

				if( !enforce_fullScr  &&  !bTBox_visible ){
					event.preventDefault();
					event.stopPropagation();
					the_content.scrollBy(0, 1);
					//setTimeout(function(){
					//}, 0);
				}
			}else{
				if( the_content.scrollMaxY == 0 ){
					// no tocar, pq simplemente desaparecio el scroll vertical
				}else{

					update_TBox_visibility(the_content, true);
				}
			}
		}

		old_scrY_nonzero= scrY_nonzero;
	};


	//	window.setTimeout(function(){
	//		if( window.gBrowser.mCurrentBrowser.currentURI.spec !== the_content.document.location.href ){
	//			HCPlusLib.myDumpToConsole(" WARN ! onTabSelect(): uris not equals!");
	//		}
	//		HCPlusLib.myDumpToConsole("        onTabSelect():       uri= "+window.gBrowser.mCurrentBrowser.currentURI.spec);
	//	}, 300);
	
	
	function onTabChanged(event) {
		event= event || {};
		thySelf.tempActivation(event.type, event);
	};

	const tabSel_tOut= new HCPlusLib.HcSingleton.Hc_Timeout();
	
	function onTabSelect(event, param1) {

		// nov-2016: ahora toma el browser/content  CORRECTO! 
		const the_content  = event? event.target.linkedBrowser.contentWindow :  window.content;
		
		const targetBrowser= event? event.target.linkedBrowser:  window.gBrowser.selectedBrowser;
		
		event= event || {};

		
		// 1st the timeout for CLEARING any previous remove right?
		tabSel_tOut.setTimeout(function(){
			HideCaption.hcp_root_box.removeAttribute("no_tbox_trans");
		}, 400);
		HideCaption.hcp_root_box.setAttribute(       "no_tbox_trans", "true" );

		
		//ySelf.DynamicElemPos.active_timeout({}); // FIRST call this, so it can be 'cleared' after, if visible is on!
		thySelf.tempActivation(event.type, event);

		
		const browser_visible= targetBrowser.hc_bTbox_float == false; // undefined & true  are the same!
		
		var   shouldBeVisible= browser_visible;
		
		check_content(the_content); // to set button shadow color
		
		if( thySelf.scrollCtrl_float ){
			if( the_content ){

				// if needed do scroll(1) !!!!
				if( /** param1 && param1.loaded && **/  the_content.scrollMaxY > 0 && the_content.scrollY == 0 && !shouldBeVisible ){
					the_content.scrollTo( the_content.scrollX, 1);

					update_TBox_visibility(the_content, shouldBeVisible, targetBrowser); // just to be sure!
					
					return; // RETURN !!
				}

				scrollto1_ExtraFlag= the_content.scrollY > 1;
				
				var scrY_nonzero= the_content.scrollY > 0;

				if( the_content.scrollMaxY > 0 ){
					shouldBeVisible= !scrY_nonzero;
					if( shouldBeVisible != browser_visible ){
						update_browser_hc_bTbox_float( targetBrowser );
					}
				}else{
					// remains with original (remembered!) value!
				}
				
				if( old_scrY_nonzero === scrY_nonzero  && 
					shouldBeVisible  === bTBox_visible ){
					return;
				}
				old_scrY_nonzero= scrY_nonzero;

				// HCPlusLib.myDumpToConsole('     >>>  scrY_nonzero= '+scrY_nonzero
				//		+'  target='    +event.target 
				//		+'  type='      +event.type 
				// );
			}
		}

		update_TBox_visibility(the_content, shouldBeVisible, targetBrowser);
	};
	

	function  on_DOMContentLoaded(event) {
		
		const the_content= window.content;
		if(  !the_content ){
			return; // RETURN  (e10s)
		}
		
		HCPlusLib.myDumpToConsole( "     ... on_DOMContentLoaded   target= "+event.target+" " );
		var doc = event.target;
		if (doc.nodeName != "#document" || doc.defaultView != doc.defaultView.top ){ // *must be* TOP document (not iframe etc)
			HCPlusLib.myDumpToConsole("                "+event.type+":     doc= "+doc+ "   ***   SKIPPING!!!");
			return; // only documents 
		} 
		if( the_content !== doc.defaultView.top ){
			HCPlusLib.myDumpToConsole("                "+event.type+":     doc= "+doc+ "   ***   SKIPPING!!! (NOT selected tab!)");
			return; // ONLY SELECTED tab!
		}
		
		onTabSelect( undefined, {loaded: true} );
	};


	function onWheel(event) {

		if( event.altKey  &&  window.Services.prefs.getIntPref("mousewheel.with_alt.action") == 1 ){ // is DEFAULT
			thySelf.set_TBox_floating_smart( event.deltaY < 0 , true ); // true == 'hard'
		}

		// inactivate 'menubar'
		if( HideCaption.FloatToolbarsHandler.DynamicElemPos.isDomActive || thySelf.DynamicElemPos.isDomActive ){
			thySelf.DynamicElemPos.dispatch_event("main-menubar", "DOMMenuBarInactive");
		}
		
		if( !thySelf.scrollCtrl_float ){
			return; // RETURN !!
		}

		// content section ------------------------------------------------------------------
		
		const the_content= window.content;
		
		if( !check_content(the_content) ){
			return; // RETURN !!
		}

		/**
		HCPlusLib.myDumpToConsole(' >>> event: '
				+'   type='     +event.type
				+'   deltaY='   +event.deltaY
				+'   detail='   +event.detail 

				+'  shiftKey='  +event.shiftKey 
				+'  ctrlKey='   +event.ctrlKey 
				+'  metaKey='   +event.metaKey  
				+'  altKey='    +event.altKey 
				+'  button='    +event.button 
				+'  buttons='   +event.buttons 
				+'  which='     +event.which  

				+'   target='   +				HideCaption.debugInfoElement(event.target)
				+'   currentTarget='   +		HideCaption.debugInfoElement(event.currentTarget) 
				+'   explicitOriginalTarget=' +	HideCaption.debugInfoElement(event.explicitOriginalTarget) 
				+'   originalTarget='   +		HideCaption.debugInfoElement(event.originalTarget) 
				+'   relatedTarget='   +		HideCaption.debugInfoElement(event.relatedTarget) 
		);
		**/

		/** // ESTO fue para revisar el aparente FIREFOX 45/46 BUG!! dnd el wheel-scroll NO agarra la pag actual si hago back/fw en mi pagina html local!
		//	//HideCaption.wta = event.target;
		//	//HideCaption.wtaO= event.originalTarget;
		//	if( event.target.ownerDocument.defaultView !== the_content ){
		//		HCPlusLib.myDumpToConsole(" warn:  wheel went to NON active window right??   Fx bug??");
		//	}
		//	// aqui chequee uris tb...
		**/
		
		
		if( the_content.scrollY  == 0  &&  bTBox_visible ){ // && el flag no esta todavia ...!!! (solo UN wheel tick para esto!)
			if( event.deltaY > 0 ){
			  if( !enforce_fullScr ){
				the_content.scrollBy(0, 1);

				if( the_content.scrollY == 1 ){ // ie. NOT on addons page with internal list 
					event.preventDefault();
				}
				
				window.setTimeout(function() {
					if( the_content.scrollY == 0  &&  the_content.scrollMaxY > 0 ){ 
						// ej de pagina de jsfiddle:  http://jsfiddle.net/daker/ecpTw/light/  
						// ... no pudo hacer scroll entonces toco el tbox aca mismo!
						// y NO afecto a la pagina de addons-list o about:config

						update_TBox_visibility(the_content, false);

						window.setTimeout(function() {
							the_content.scrollBy(0, 1); // asi no me muestra el tbox de nuevo apenas doy un wheel-up!
						}, 50);
					}
				}, 50);
			  }
			}else{ // deltaY <= 0
			}
		}
		

		
		/** mar-2016: SACO esto pq no me permite mantenerme en 'fullscr' tranquilamente en paginas sin scroll!!
		if( the_content.scrollY  == 0 ){ // habia probado <= 1 no se bien para que (¿seria cuando queria prender y apagar auqnue no hubiera scroll alguno?)
			if( event.deltaY < 0 ){
				if(!bTBox_visible ){  // pasa 1) cuando desaparece el scroll vertical pq se agrando el espacio! y 2) en el fiddle especial cuando esta scrollY==1
					the_content.scrollBy(0, -1);


					update_TBox_visibility(the_content, true);
				}
			}
		}
		**/
		
		
		/***
		xx_else if( the_content.scrollY > 1 && the_content.scrollY < 60 ){ // NO contempla pixel-scroll (como en win con middle-button seguido de wheel
			if( event.deltaY < 0 ){
				event.preventDefault();
				the_content.scrollBy(0, -(the_content.scrollY - 1) );
			}
		}
		 ***/
	}; //onWheel

	
	// fullscreen pref OBSERVER ! ---------------------------------------------------------------------------------
	function on_fullscr_autohide(subject, topic, data) {
    	if (topic == "nsPref:changed"){
			if (data == "browser.fullscreen.autohide"){
				onFullScreen();
			}
    	}
    	HCPlusLib.myDumpToConsole( "  Observer for "+data+":  "+subject +"");
    };

	var enforce_fullScr= false;
	var old_enforce_fullScr= false;

	function onFullScreen() {
		//window.setTimeout(function(){ /* tuve q poner "window." pq daba error not initialized al cambiar la pref "...autohide" */
			enforce_fullScr= false; //2017-oct, disable this!! -- window.fullScreen  &&  window.Services.prefs.getBoolPref("browser.fullscreen.autohide");
			
			const the_content= window.content;

			update_TBox_visibility(the_content, null); // null: just refresh
			
			setStyle_top( true );
		//}, 50);
	};

	// -----------------------------------------------------------------------

	
	function  check_content(the_content){
		
		const __hctp_tBoxHideColor= "--hctp_tBoxHideColor";
		
		if( !the_content ){
			HCPlusLib.myDumpToConsole( "   check_content("+the_content+"), returning FALSE!!" );
			
			// if( thySelf.scrollCtrl_float ){
			//	update_TBox_visibility(the_content, false);
			// }
			
			thySelf.My_css_props.setProperty_plus   ( HideCaption.mainW, __hctp_tBoxHideColor , "orange", "");

			return false;
		}else{
			thySelf.My_css_props.removeProperty_plus( HideCaption.mainW, __hctp_tBoxHideColor );
		}
		
		return true;
	};
		
	
	//nst mainPopupSet = document.getElementById("mainPopupSet");
	//const tab_view_deck= document.getElementById("tab-view-deck");

	//const work_element = document.getElementById('browser-panel');

	const visibility_tOut= new HCPlusLib.HcSingleton.Hc_Timeout();
	
	this.old_bTbox_float= null;
	this.bTbox_float= false;
	
	function  update_TBox_visibility(the_content, __bTBox_visible, targetBrowser, bAvoidStoring ){
		
		if( __bTBox_visible !== null ){
			bTBox_visible= __bTBox_visible;
		}
		
		var bStatic= bTBox_visible || enforce_fullScr;
		
		thySelf.bTbox_float= !bStatic;
		
		if(  thySelf.old_bTbox_float == thySelf.bTbox_float  && 
		     old_enforce_fullScr     == enforce_fullScr         ){
			 return;   
		}
		thySelf.old_bTbox_float =  thySelf.bTbox_float;
		old_enforce_fullScr     =  enforce_fullScr;

		
		if(!targetBrowser ){
			targetBrowser= window.gBrowser.selectedBrowser;
		}
		

		// BEFORE setting  "hctp_tbox_float" 
		// 1st the timeout for CLEARING any previous remove right?
		visibility_tOut.setTimeout(function(){
			HideCaption.hcp_root_box.removeAttribute("no_tbox_float_trans");
		}, 500);
		HideCaption.hcp_root_box.setAttribute(       "no_tbox_float_trans", "true" );
		
		
		//inPopupSet .setAttribute(           "hctp_tbox_float", ""+thySelf.bTbox_float );
		HideCaption.mainW.setAttribute(       "hctp_tbox_float", ""+thySelf.bTbox_float );
		HideCaption.hcp_root_box.setAttribute("hctp_tbox_float", ""+thySelf.bTbox_float );
	
	
		// REMEMBER float state per tab!!
		update_browser_hc_bTbox_float( targetBrowser, bAvoidStoring );

	
		if( thySelf.bTbox_float ){
			//
		}else{ // !thySelf.bTbox_float
			if( window.fullScreen ){
				// RESETEAR esto para fullscreen!!
				window.gNavToolbox.style.removeProperty("margin-top");
				try{
					if( window.FullScreen._isChromeCollapsed === true && typeof(window.FullScreen.hideNavToolbox) == "function" ){
						window.FullScreen._isChromeCollapsed = false;
						window.FullScreen.hideNavToolbox();
					}
				} catch (ex) {	HCPlusLib.debugError(" Ignoring error: "+ex, ex);	}
			}
		}
	
		// AT LAST: adjust float-bars!
		floatBars_setFloatPosition();
	};


	function  update_browser_hc_bTbox_float( targetBrowser, bAvoidStoring ) {
		try{
			if( !bAvoidStoring ){
				targetBrowser.hc_bTbox_float= thySelf.bTbox_float;
				if( HideCaption.tab_dynbars ){
					var tab= window.gBrowser.getTabForBrowser(targetBrowser);
					tab.setAttribute(         "hctp_tbox_float", ""+thySelf.bTbox_float );
				}
			}
		} catch (ex) {	HCPlusLib.debugError(" Ignoring error: "+ex, ex);	}
	};

	
	this.scrollCtrl_float= false;

	this.set_TBox_floating_smart=  function ( _bVisible, _bHard ){ // _bHard -> wheel from button
		if( !thySelf.b_initd ){
			return; // !!
		}
		
		var the_content= window.content;
			
		if( thySelf.scrollCtrl_float ){
			
			// if( !check_content(the_content) ){
			// 	  return; // RETURN !!
			// }

			if( _bHard || the_content && the_content.scrollMaxY == 0 ){
				update_TBox_visibility(the_content, _bVisible);
				// update scroll position too! :-)
				if( !_bVisible && the_content && the_content.scrollMaxY > 0 && the_content.scrollY == 0 ){
					the_content.scrollTo( the_content.scrollX, 1);
				}
			}
		}else{ // !thySelf.scrollCtrl_float
			if( _bHard ){
				update_TBox_visibility(the_content, _bVisible);
			}
		}
	};
	
	
	// tempActivation ----------------------------------------------

	this.tOut_floatActiv= 1500;
	this.tOut_floatTab  = 1100;
	
	this.floatActiv= "";
	this.floatTab  = "";
	
	function isAllowed_byWord( _wList, _word){
		if(    _wList.indexOf( "none" ) >= 0 ){ return false; 	}
		if(    _wList.indexOf( "all"  ) >= 0 ){ return true; 	}
		return _wList.indexOf( _word  ) >= 0 ;
	}
	
   	const active_tOut= new HCPlusLib.HcSingleton.Hc_Timeout();
	
	this.tempActivation=  function ( sReason, event ){
		
		HCPlusLib.myDumpToConsole( "   tempActivation("+sReason+") " );
		
		// onStateChange, locChange_sameDoc
		if( isAllowed_byWord( thySelf.floatActiv, sReason ) ){
			thySelf.DynamicElemPos.active_timeout( event, thySelf.tOut_floatActiv);
		}
		
		if( isAllowed_byWord( thySelf.floatTab  , sReason ) ){
			HideCaption.hcp_root_box.setAttribute("tempActive", "true"  );
			active_tOut.setTimeout( function() {
				HideCaption.hcp_root_box.setAttribute("tempActive", "false" );
			}, thySelf.tOut_floatTab);
		}
	};

	this.update_style_pos=  function( _tOut ){
		if( thySelf.b_initd ){
			window.setTimeout( function(){
				setStyle_top( true );
			}, _tOut? _tOut: 10);
		}
	};
	
	this.onWheel_fromButton=  function( event ){
		thySelf.set_TBox_floating_smart(event.deltaY < 0, true); // true == 'hard'
	};
	
	
	// customization
	this.on_beforecustomization= function(event) {
		if( !thySelf.b_initd ){
			return; // RETURN!!
		}
		enable_css( false );
	};
	this.on_aftercustomization = function(event) {
		if( !thySelf.b_initd ){
			return; // RETURN!!
		}
		enable_css( true ); // ONLY if b_initd !

		if(!thySelf.DynamicElemPos.isKeyActive ){
    		thySelf.DynamicElemPos.key_toggleActivation(event);
    	}
	};

	
	function on_sizemodechange(event) {
		if( window.windowState != window.STATE_MINIMIZED ){
			thySelf.update_style_pos();
		}
	};

	
	this.set_All_EventListeners=  function ( bAdd ){

		HCPlusLib.myDumpToConsole( "   ... TBoxHide:  BEGIN  set_All_EventListeners("+bAdd+") " );

		if( bAdd ){
			// Css_props...
			thySelf.My_css_props= new HCPlusLib.Css_prop_class(); 
			
			if( HideCaption.tab_dynbars ){ // need restart to deactivate :-)
				window.gNavToolbox.setAttribute("tab_dynbars", "true" );
			}
		}

		const the_content= window.content;
		
		//PlusLib.setAttribute_withBkp( mainPopupSet     , "hctp_tbox_float", ""+false ); //only to store original value.
		HCPlusLib.setAttribute_withBkp( HideCaption.mainW, "hctp_tbox_float", ""+false ); //only to store original value.

		// RESET this var! - used in this call:  onTabSelect();
		old_scrY_nonzero= null;

		HideCaption.set_EventListener( bAdd, window.gBrowser			 , "scroll"    , onScroll    , true ); // capture == true! (I'll be the 1st event receiver) 
		HideCaption.set_EventListener( bAdd, window.gBrowser			 , "wheel"     , onWheel     , false);
		
		HideCaption.set_EventListener( bAdd, window.gBrowser.tabContainer, "TabSelect" , onTabSelect  , false);
		HideCaption.set_EventListener( bAdd, window.gBrowser.tabContainer, "TabOpen"   , onTabChanged , false);
		HideCaption.set_EventListener( bAdd, window.gBrowser.tabContainer, "TabMove"   , onTabChanged , false);
		HideCaption.set_EventListener( bAdd, window.gBrowser.tabContainer, "TabClose"  , onTabChanged , false);

		// DOMContentLoaded
		HideCaption.set_EventListener( bAdd, window.gBrowser             , "DOMContentLoaded"   , on_DOMContentLoaded   , false );

		// sizemodechange
		HideCaption.set_EventListener( bAdd, window                      , "sizemodechange"     , on_sizemodechange     , true);  // capture = true !

		// fullscreen checks 
		HideCaption.set_EventListener( bAdd, window			 			 , "fullscreen", onFullScreen, true); // capture == true! 
		if( bAdd ){
			window.Services.prefs.addObserver   ( "browser.fullscreen.autohide", on_fullscr_autohide, false); //TODO: q era este false?
		}else{
			window.Services.prefs.removeObserver( "browser.fullscreen.autohide", on_fullscr_autohide);
		}

		if( bAdd ){
			thySelf.topEdge_hover= document.getElementById("hctp_topEdge_hover");

			
			// Manage Dynamic FLOAT element!
			thySelf.DynamicElemPos.elem_array_for_Active  = new Array(); // simulates array.empty();

			//agregar al array
			thySelf.topEdge_hover.hc_events= new Array("mousemove");
			thySelf.DynamicElemPos.elem_array_for_Active.push( thySelf.topEdge_hover );
			thySelf.DynamicElemPos.elem_array_for_Active.push( window.gNavToolbox );
			/*** no agarra (casi) debido al drag, + los resizers en los borders. 
			var custom_caption= document.getElementById("hcp-caption-box"); // INCLUYE todos los borders!!
			***/
			var hotspot= document.querySelector("#hcp-caption-box  #hcp-top-box"); // top-border, for un-maximized mode!
			if( hotspot ){	thySelf.DynamicElemPos.elem_array_for_Active.push( hotspot );	};
		}
		
		thySelf.DynamicElemPos.set_All_EventListeners( bAdd );
		
		
		if( bAdd ){
			//work_element.style.setProperty(   'margin-top', "-42px");

			thySelf.callback_onInactive(); // necesario dsd q las nuevas prefs pueden hacer q onTabSelect() no haga nada ... vd?? 
			
			onTabSelect(); //update state at init!
			
			window.setTimeout(function() {
				onTabSelect(); //another call DELAYED!!
			}, 300);

			// TKEYlogic: ver hc.js - // puede prenderse con F1 *antes* de habilitar dynbars!
			thySelf.DynamicElemPos.setKeyActive( false ); 
			// empieza como full screen!
			thySelf.DynamicElemPos.mouse_activate({}, false);
			// thySelf.DynamicElemPos.activation_Toggle({}, false, true); // este no hace nada si ya esta 'inactivo' vd?
			
		}else{ // !bAdd
			//work_element.style.removeProperty('margin-top');

			update_TBox_visibility(the_content, true, null, true); // param4 == true, for NOT UPDATING tab-flag!

			
			// CLEAR Css props!
			if( thySelf.My_css_props ){
				thySelf.My_css_props.clear();
				thySelf.My_css_props= new HCPlusLib.Css_prop_class(); // NO 'delete' pq en rapidos toggles, salta 'NPE' en check_content()!
			}
		}

		//CSS FILE
		enable_css( bAdd );
		
	};
	// END set_All_EventListeners() 

	
	//CSS FILE
	function enable_css( bAdd ) {
		// checking HideCaption.is_Customizing
		HCPlusLib.HcSingleton.TBoxHide_sheet.setStyleSheet( bAdd && !HideCaption.is_Customizing? 
			"chrome://HideCaptionPlus/content/components/TBoxHide.css": null );
	};
	
	
    this.get_is_enable= function() {
    	return  this.b_initd;
    };

	
	const proc_enable_tOut  = new HCPlusLib.HcSingleton.Hc_Timeout();
	var   processing_enable = null;
	
	this.toggle_enable= function() {
		if( ! HCPlusLib.HcSingleton.get_sys_DynamicBars_enable() ){
			return; // RETURN !!
		}

		if( processing_enable !== null ){
			// FUERA del try para q no corra un nuevo timeout en el finally!
			HCPlusLib.myDumpToConsole( "   ... Main_IsEnable(): ignoring error! (processing_enable)" );
			return;
		}
		try{
			processing_enable= {};
			
			HCPlusLib.do_SetPref_plus(     "BOOL_PREF", "plus.tBoxHide.enable", !this.get_is_enable() );
			
		} finally {
			proc_enable_tOut.setTimeout( function(){
				processing_enable= null;
			}, 200);
		}
    };
	
	
    //   Load_AllOptions ---------------------------------------------------------------------------------------------
    this.Load_AllOptions= function() {

		this.arrayOptions= HCPlusLib.arrayOptions;

		if( ! HCPlusLib.HcSingleton.get_sys_DynamicBars_enable() ){
			return; // RETURN !!
		}
		
		
        // enable!
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.tBoxHide.enable", function(option_hPrefVal){
			option_hPrefVal.putDomAttribute_ifTrue(document.getElementById("main-window"));
			//HideCaption.Delayed_calcSpaceForMinMaxCloseButtons();
			
			if(!thySelf.alreadyDone ){  // 1st time!
				thySelf.alreadyDone= true;

				// DELAYED - pq los tabs quedaban mal de entrada!, supongo q le jorobaba al TabMix-multirow
				window.setTimeout(function() {
					HCPlusLib.myDumpToConsole("Load_AllOptions!!  ");
			thySelf.Main_IsEnable( !!option_hPrefVal.getVal() );
				}, 3000);
			}else{ // thySelf.alreadyDone
				thySelf.Main_IsEnable( !!option_hPrefVal.getVal() );
			}
			
		  }, false            , true )  ); 


		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.tBoxHide_opc.floatActiv" , function(option_hPrefVal){
			thySelf.floatActiv= ""+option_hPrefVal.getVal();
		  }, "TabOpen"        , true )  ); // all  TabSelect  

		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.tBoxHide_opc.floatTab"   , function(option_hPrefVal){
			thySelf.floatTab  = ""+option_hPrefVal.getVal();
		  }, "all"            , true )  );

		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.tBoxHide_opc.fltTabMain" , function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute( HideCaption.hcp_root_box );
		  }, "busytab  tabInv", true )  );


		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.tBoxHide_opc.transition" , function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute( HideCaption.hcp_root_box );
			thySelf.opc_transition = ""+option_hPrefVal.getVal();
		  }, "fast1"          , true )  );

		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.tBoxHide_opc.scrollCtrl_float", function(option_hPrefVal){
			// xx_tion_hPrefVal.setAsDomAttribute( HideCaption.hcp_root_box );
			thySelf.scrollCtrl_float = (""+option_hPrefVal.getVal()).indexOf("yes") >= 0;
		  }, "no"             , true )  );

		/***
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.xxxxxxx" , function(option_hPrefVal){
			//option_hPrefVal.setAsDomAttribute(HideCaption.mainW);
		  }, "default"        , true )  );
		***/
    };


	//SHUTDOWN
	this.hc_shutdown= function() {
		try {
			HCPlusLib.myDumpToConsole(   "TBoxHide  Begin hc_shutdown()  " );

			// DISABLE, removeListeners .. etc !!!!
			thySelf.Main_IsEnable( false );

		} catch (ex) {	HCPlusLib.debugError(" Ignoring error: "+ex, ex);	}
	};
	
};


