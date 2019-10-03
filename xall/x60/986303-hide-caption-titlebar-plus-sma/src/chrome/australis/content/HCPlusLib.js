
"use strict";

var EXPORTED_SYMBOLS = ["HCPlusLib_class"];

//to use outside:  new HCPlusLib_class( _win );
/**
	 Search & Replace; to get "this.<func-name>="
	(\R\s*)(\b\w*\b\s*):
	\1this.\2=
	 
 **/

var HCPlusLib_class= function( _win ){
	
	const window      = _win;
	const document    = window.document;
	const setTimeout  = window.setTimeout;
	const clearTimeout= window.clearTimeout;
	const getComputedStyle= window.getComputedStyle;
	const parseInt    = window.parseInt;
	const parseFloat  = window.parseFloat;
	const Services    = window.Services;
	
	const HCPlusLib   = this;
	var   HideCaption = window.HideCaption;

	//AFTER HC 'new' instance
	this.set_HideCaption= function(){
		HideCaption = window.HideCaption;
	};
	

	//unloaders
	const unloaders = [];

	const listener_list= [];

	//------------------------------------------

	//SHUTDOWN
	this.hc_shutdown= function() {

		function  style_removeProperty( elem, prop){
			try {
				if( elem ){
					elem.style.removeProperty( prop );
				}
			} catch (e) {  HCPlusLib.debugError(""+e, e);  };
		}
		
		try {
			HCPlusLib.myDumpToConsole(   "Lib  Begin hc_shutdown()  " );

			//removeListeners ANTES q sacar attrs ni nada vd?
			listener_list.reverse().forEach(function( hcEvent ){
				hcEvent.removeEventListener();
			});

			//unloaders
			unloaders.reverse().forEach(function (f) { // reverse() so unload FIRST the LAST thing added, and so on 
				try {
					HCPlusLib.myDumpToConsole( "Lib>>>>  \n"+f );
					f();
				} catch (ex) {
					HCPlusLib.debugError(" hc_shutdown():  ex= "+ex, ex);
				}
			});



			style_removeProperty( document.getElementById("tab-view-deck")                 , "background-color");
			style_removeProperty( document.getElementById("tab-view-deck")                 , "box-shadow");
			
			style_removeProperty( document.getElementById("titlebar-buttonbox-container" ) , "margin-right"    ); 

			// RESTORE ALL
			HCPlusLib.BackupEngine_Styles_Attrs.restore_all_elems();

			const main_attr_list= [
			                       "hcp_hiddencaption", 

			                       "hidechrome", 

			                       HCPlusLib.sAttr_hcp_fx4_titlebar_visible, 
			                       "dz_adv_sysbut_winappear_calc",
			                       "dz_adv_sysbut_winappear_calc_unmax",
			                       "hcp_sysbuttons_active",
			                       "dz_calc_winbkg_color",
			                       "customtheme_tbar_appearance",
			                       "customtheme_bkg_appearance",
			                       "hctp_systemCaption_present",
			                       //"chromemargin",
			                       "dz_fxaustr_syscaption",
			                       "hc-MaxFull",
			                       "hcp_inFullscreen",
			                       "hcp_WinState",

			                       "hctp_hidden_sysborder",
			                       "hctp_show_newCustBorders",

			                       "hctp_fullscrToggler_collapsed",

			                       //"hcp_sys_floatbars_enable",
			                       ];
			HCPlusLib.myDumpToConsole("  about to remove: "+main_attr_list);
			main_attr_list.forEach(function( name ){
				HideCaption.mainW.removeAttribute( name );
			});

			document.getElementById("navigator-toolbox").removeAttribute( "customtheme_tbar_appearance");
			document.getElementById("navigator-toolbox").removeAttribute( "customtheme_bkg_appearance" );

			HideCaption.mainW.setAttribute( "chromemargin", "0,2,2,2");
			
			// CLEAR css props!
			HCPlusLib.Main_css_props.clear();

		} catch (ex) {	HCPlusLib.debugError(" Ignoring error: "+ex, ex);	}
	},
	
	
	// CLASS Hc_Audio  --------------------------------------------------------
	this.Hc_Audio= function( _sFile ){
		var audio      = null; 
		var sFile_local= _sFile;
		
		var on_error_callback= null;

		
		this.sFile= _sFile;
	
		this.getAudio= function( __on_error_callback ){
			try {
				return this.getAudio_throws( __on_error_callback );
				
			} catch (ex) { HCPlusLib.debugError_noAudio(" getAudio() ignored error: "+ex, ex); };
			return {}; //dummy object
		};
		this.getAudio_throws= function( __on_error_callback ){

			if( __on_error_callback ){  // viene una 2da vez -ya sin callb- debido al play() cuando llamaba a HCPlusLib.getAudio().play().
				on_error_callback= __on_error_callback;
			}
			//HCPlusLib.myDumpToConsole_noAudio(" ... stack:  \n" + Components.stack.formattedStack +" \n");

			const errar_word= "error";
			
			function audio_on_errar(event){
				var errCode= audio.error? audio.error.code: "(error==null)"; 
				HCPlusLib.myDumpToConsole_noAudio(" Audio event: "+event.type+"   err0r-code: "+errCode+"   file: "+sFile_local); // HCPlusLib.debugError_noAudio
				//code: 1-aborted, 2-network, 3-decode, 4-src-not-supported (not found?)

				if( on_error_callback ){
					on_error_callback(event);
					on_error_callback= null;  // ONLY ONE call!
				};
			}
			function audio_on_ended(event){
				HCPlusLib.myDumpToConsole_noAudio("                                 Audio Playback ended.   file: "+sFile_local);
			}

			if( audio === null ){  
				audio= new window.Audio(this.sFile);
				
				audio.addEventListener(        errar_word, audio_on_errar, true);
				audio.addEventListener(        "ended"   , audio_on_ended, true);
		 	    unloaders.push(function() {
					audio.removeEventListener( errar_word, audio_on_errar, true);
					audio.removeEventListener( "ended"   , audio_on_ended, true);
    			});
				/**
				listener_list.push( new HideCaption.Hc_EventListener( audio, errar_word, audio_on_errar, true).addEventListener() );
				listener_list.push( new HideCaption.Hc_EventListener( audio, "ended"   , audio_on_ended, true).addEventListener() );
				 **/
		 	    
		 	    // NO puse audio.load() aca pq puede abortar en medio de getOrCreate() y me da mala espina :-)
		 	    // ... aunque AL FINAL al hacer: new Audio() ya aborta tb!
			}
			return audio;
		};
		
		this.play= function(){
			try {
				this.getAudio().play(); // PLAY AUDIO !
		
			} catch (ex) { HCPlusLib.debugError_noAudio(" play() error: "+ex, ex); };
		};
		
		//   toString
		this.toString= function(){return "[Hc_Audio,  file: "+sFile_local+"] ";};
	};


	this.get_audio= function ( _store_key, _sFile, _volume, _onError_callb ) {
		var hcAud= HCPlusLib.getOrCreate( _store_key, function(){
			var hcAudio= new HCPlusLib.Hc_Audio( _sFile );
			hcAudio.getAudio( _onError_callb );
			return hcAudio;
		});
		hcAud.getAudio().volume= _volume;  // VOLUME !
		return hcAud;
	};
	
	// bannedBut_audio
	this.get_bannedBut_audio= function (_volume) {
		_volume = _volume || 0.25;
		//HCPlusLib.myDumpToConsole_noAudio("  get_bannedBut_audio():  _volume = "+_volume ); // TODO:  BEWARE of recursion with audio +  myDumpToConsole!
		//  'virtual_cursor_move.ogg', 'virtual_cursor_key.ogg', 'clicked.ogg',  '../notfound.wav'
		//turn  HCPlusLib.get_audio("bannedBut_audio", 'chrome://global/content/accessibility/virtual_cursor_key.ogg', 0.3  );
		return  HCPlusLib.get_audio("bannedBut_audio", 'chrome://global/content/notfound.wav'                        , _volume );
	};

	// debugSpecial_audio 
	this.play_debugSpecial_audio_Async= function () {  // ASYNC / DELAYED  for more sanity about possible recursions (Ie: at audio-obj creation with a myDumpToConsole()), etc ...
		const obj_key= "debugSpecial_audio"; 
		function onError_play(_ev){
			HCPlusLib.key_delete(obj_key);
			HCPlusLib.get_audio( obj_key, 'chrome://global/content/accessibility/virtual_cursor_move.ogg', 1) // 'virtual_cursor_key' NO SE ESCUCHA YA!!!
			.play();
		}
		setTimeout(function(){
			HCPlusLib.get_audio( obj_key, "chrome://hidecaptionplus/skin/room-joined.mp3"      ,  1, onError_play) // chrome://global/content/notfound.wav
			.play();
		}, 10);
	};
	// dumpConsole_audio 
	this.play_dumpConsole_audio_Async= function () {  // ASYNC / DELAYED 
		const obj_key= "dumpConsole_audio"; 
		function onError_play(_ev){
			HCPlusLib.key_delete(obj_key);
			HCPlusLib.get_audio( obj_key, 'chrome://global/content/notfound.wav', 1)
			.play();
		}
		setTimeout(function(){
			HCPlusLib.get_audio( obj_key, "chrome://global/content/accessibility/virtual_cursor_move.ogg"   , 0.6, onError_play)
			.play();
		}, 10);
	};
	
	
	//
	this.getOrCreate= function ( _sKey, _getter) {
		var obj= this[_sKey];
		if( obj === undefined ){
			obj= _getter();
			this[_sKey]= obj;
			HCPlusLib.myDumpToConsole_noAudio("  getOrCreate("+_sKey+", ...):  new object: "+obj ); // TODO:  BEWARE of recursion with audio +  myDumpToConsole!
		}
		return obj;
	};
	this.key_delete= function ( _sKey ) {
		delete this[_sKey];
	};

	
	// ---- AUDIO preference entry! ------------------------------------------------------------------------------
	
	// necesario solo si se usa dsd options.js ! (por ej. para los Audio paths)
	this.load_osfile_module= function() {
		if( !window.OS ){
			Components.utils.import("resource://gre/modules/osfile.jsm");
			if( !window.OS ){
				throw "no [window.OS]!";
			}
		}
	};

	this.replace_dirs= function( myFile ) {
		HCPlusLib.load_osfile_module();
		const real_homeDir= window.OS.Path.toFileURI(window.OS.Constants.Path.homeDir); 
		myFile = (""+myFile).replace("{%homeDir%}"  , real_homeDir);
		myFile = myFile.replace("{%configDir%}", real_homeDir); // for now, USING HOMEDIR for the Future CONFIGURABLE directory!!! 
		return   myFile; 
	};

	
	this.Hc_Entry_Audio= function( _pref_Name, _eAud_defaultVal ) {
		const audio_pref_name= _pref_Name;
		const entryAudio_self= this;
		
		var   audio_file    = "unknown";
		var   audioFile_real= "unknown";
		var   audio_vol= 1.77; // invalid value to be overriden!
		var   old_played_volume= -1.55, new_played_volume= -1.55;
		var   hcAudio  = null;
		
		
		this.hasValidAudio= function() {	return audio_file != "none";	};
		
		this.get_File   = function() {		return audio_file;		};
		this.get_Volume = function() {		return audio_vol; 		};
		this.get_hcAudio= function() {		return hcAudio; 		};

		this.load      = function() {		loadFromPref();			};
		this.play      = function() {		
			if( hcAudio && audio_file != "none"){
				hcAudio.play();
			}			
		};
	
		this.set_File  = function( __value ) {
			audio_file= __value;
			try {
				set_hcAudio( true ); // true -> play()!
				//this.play();  // si usaba aca "this.hcAudio" me decia que era NULL!!! (¿No es el mismo 'this' q se usa dentro de set_hcAudio() o que?)
				//HCPlusLib.myDumpToConsole("  audio-play: "+ audio_file);
			} catch (ex) {
				HCPlusLib.debugError("  audio_file="+audio_file+"   audio_vol="+audio_vol, ex);
			}
			savePref();
		};
		this.set_Volume= function( __value, _bPlay, event ) {
			if( _bPlay && audio_file != "none" ){
				old_played_volume= new_played_volume;
				new_played_volume= __value;
			}
			audio_vol= __value;
			savePref();
			
			if( _bPlay && audio_file != "none" ){
				//HCPlusLib.myDumpToConsole("  setvol: "+ old_played_volume +"  "+new_played_volume+"  "+audio_file);
				if( old_played_volume != new_played_volume  ||
					event && event.type == "mouseup" ){ // hcAudio &&
					
					//hcAudio.getAudio().volume= audio_vol;
					set_hcAudio( true ); // true -> play()!
				}
			}
		};

		
		this.new__Hcp_PrefValue= function() {
			return  new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", audio_pref_name, function(option_hPrefVal){
				entryAudio_self.load();
			}, _eAud_defaultVal? _eAud_defaultVal : "0.93><ZZZZ><none",              true );
		};
		
		
		//------------------ private space -----------------
		
		function set_hcAudio( doPlay ) {
			audioFile_real= audio_file;
			if(       audio_file ==   "Tick_recommended_1" ){
				audioFile_real= "chrome://hidecaptionplus/skin/Tick-DeepFrozenApps-shortened.ogg";
			}else if( audio_file ==   "chrome://browser/content/loop/shared/sounds/room-joined.ogg" ){
				audioFile_real= "chrome://hidecaptionplus/skin/room-joined.mp3";
			}
			
			HCPlusLib.load_osfile_module();
			const real_homeDir= window.OS.Path.toFileURI(window.OS.Constants.Path.homeDir); 
			audioFile_real= audioFile_real.replace("{%homeDir%}", real_homeDir);
			

			// on FAILURE!! - se daria SOLO en Fx45+
			function onAudiofailure(_ev){
				
				const tokenPrefix1= "chrome://browser/content/loop/shared/sounds/";
				if( audioFile_real.startsWith(              tokenPrefix1 )){
					audioFile_real= audioFile_real.replace( tokenPrefix1, real_homeDir+"/Documents/hctp_config/" ); // same dir as custom files!
				}
				//audioFile_real ="chrome://global/content/notfound.wav?_marca_patito_!";

				
				//same code as below except NO_CALLBACK_ON_FAILURE
				hcAudio= new HCPlusLib.Hc_Audio( audioFile_real );
				if( audio_file != "none" ){
					hcAudio.getAudio(undefined).volume= audio_vol;
					if( doPlay ){	entryAudio_self.play(); 	}
				}
			}
			
			hcAudio= new HCPlusLib.Hc_Audio( audioFile_real );
			if( audio_file != "none" ){
				hcAudio.getAudio(onAudiofailure).volume= audio_vol;
				if( doPlay ){	entryAudio_self.play(); 	}
			}
		};

		function loadFromPref() {
			try {
				var prefValue= HCPlusLib.GetPref_plus( HCPlusLib.CHAR_PREF, audio_pref_name, "0.92><mmm><none");
				prefValue= prefValue.split("><");
				
				audio_vol = prefValue[0];
				audio_file= prefValue[2];
				
				set_hcAudio();
				
			} catch (ex) {
				HCPlusLib.debugError("  audio_file="+audio_file+"   audio_vol="+audio_vol,  ex);
			};
		};
		function savePref() {
			HCPlusLib.do_SetPref_plus( HCPlusLib.CHAR_PREF, audio_pref_name, ""+audio_vol+"><reserved><"+audio_file );
		};
		
	};

	// Audio objects!
	this.Audio_Sound_tic1    = new this.Hc_Entry_Audio( "plus.action.closebut_audio_tic1"   );
	this.Audio_Sound_info1   = new this.Hc_Entry_Audio( "plus.action.closebut_audio_info1"  );
	this.Audio_wheel1        = new this.Hc_Entry_Audio( "plus.action.closebut_audio_wheel1" );
	this.Audio_Sound_action1 = new this.Hc_Entry_Audio( "plus.action.closebut_audio_action1"); 
	this.Audio_Sound_notFound= new this.Hc_Entry_Audio( "plus.action.closebut_audioY_notFound", "0.25><reserved><chrome://global/content/notfound.wav"); 


	//audio-error
	this.audioError_playFor_action1= function( bVolumeSoft ){
		if( HCPlusLib.Audio_Sound_action1.hasValidAudio() ){ // if user CHOOSED a sound for this action, then play() audio-for-banned too! :-)
			HCPlusLib.audio_notFound_play( bVolumeSoft );
		}
	};
	this.audio_notFound_play= function( bVolumeSoft ){
		var _volume= HCPlusLib.Audio_Sound_notFound.get_Volume() * (bVolumeSoft? 0.5 : 1.0);
		if( isNaN(_volume) ){
			_volume= 0.10; // pretty low 
		}
		if( _volume == 0 ){
			_volume= 0.004; // very low! 
		}
		HCPlusLib.myDumpToConsole(" ...  _volume: "+ _volume );
		HCPlusLib.get_bannedBut_audio( _volume ).play();
	};


// -------------------------------------------------------------------------------------------------------------------

  this.Hcp_PrefValue= function Hcp_PrefValue( _TYPE_PREF, _prefKey, _initFunction, _defaultValue, _usesPrefObserver ){

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
			
			//HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").onStartup()");
		}
	};
	this.onShutdown= function() {
		if( usesPrefObserver ){
			//HCPlusLib.preferencesModule.ignore ( prefKey, this.observerPref, this);

			HCPlusLib.gPrefConfig_plus.removeObserver( prefKey, this );
			
			//HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").onShutdown()");
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
				HCPlusLib.myDumpToConsole(" called  Hcp_PrefValue( "+prefKey+" ).observe(...):   new value: "+value+"" );
				this.Init();
				
			}else{      
				//"tab_marginTop_delta_nomax" llama TAMBIEN a "tab_marginTop_delta" , y bueh ....
				//HCPlusLib.myDumpToConsole( "  .... (not an error )  (data != key      ) ignored call to observe for "+prefKey+":  "+ dummySub +", "+ topic +", "+ dummyData);
			}
		}else{ HCPlusLib.myDumpToConsole(    "  .... (not an erro_ )  (topic != changed ) ignored call to observe for "+prefKey+":  "+ dummySub +", "+ topic +", "+ dummyData); 
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
		//PlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").Load():   new value: "+value+", defaultValue: "+defaultValue+"" );
		this.Init();
	};
	
	this.Save= function() {
		HCPlusLib.do_SetPref_plus( _TYPE_PREF, prefKey, value);
		HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").Save():       value: "+value+", defaultValue: "+defaultValue+"" );
		// this.Init();
	};
	
	this.Load_newValue= function() {
		if( usesPrefObserver ){
			return; // RETURN;
		}
		value= HCPlusLib.GetPref_plus( _TYPE_PREF, prefKey, defaultValue);
		HCPlusLib.myDumpToConsole("Hcp_PrefValue("+prefKey+").Load_newValue():   new value: "+value+", defaultValue: "+defaultValue+"" );
		this.Init();
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
	
  };


  this.setAttribute_ifTrue= function( _elem,  _aName, _value ) {
		if( _value ){	_elem.setAttribute   ( _aName  , "true");
		}else{       	_elem.removeAttribute( _aName  );
		}
  };


  this.Hcp_Point= function Hcp_Point(){
		
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
  	};

  	this.Hcp_Pos= function Hcp_Pos(){
		
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
  	};
  	
  	
  	// ------------------------- Css_prop_class -----------------------------------------------------
  	
	this.Css_prop_class= function() {
		
		const props= new Set();
		
		this.setProperty_plus= function( aElem, pName, val, val2) {
			try {
				aElem.style.setProperty( pName, val, val2);
				props.add( {elem: aElem, name: pName} );
			}catch(ex){    HCPlusLib.debugError("error: "+ex, ex); };
		};
		
		this.removeProperty_plus= function( aElem, pName) {
			try {
				aElem.style.removeProperty( pName );
			}catch(ex){    HCPlusLib.debugError("error: "+ex, ex); };
		};
		
		this.clear= function() {
			props.forEach( function( hProp ) {
				try {
					hProp.elem.style.removeProperty( hProp.name );
				}catch(ex){    HCPlusLib.debugError("error: "+ex, ex); };
			})
			props.clear();
		};
	};

	this.Main_css_props= new HCPlusLib.Css_prop_class();


  	// ------------------------- vars -----------------------------------------------------

  	this.UniCHAR_PREF= "UniCHAR_PREF",
  	this.CHAR_PREF= "CHAR_PREF",
  	this.BOOL_PREF= "BOOL_PREF",
  	this.INT_PREF=  "INT_PREF",

	
	this.arrayOptions= new Array(),

	this.sKey_plus_home_enabled                   = "plus.home.enabled",
	this.sKey_plus_home_mainmenu_floating         = "plus.home.mainmenu_floating",
	this.sKey_plus_home_floating_extrabox         = "plus.home.floating_extrabox",
	//deprecated......
	this.sKey_plus_home_mainmenu_float_oldautohide= "plus.home.mainmenu_float_oldautohide",

	this.sKey_plus_fx4_titlebar          = "plus.fx4_titlebar",
	
	this.sAttr_hcp_fx4_titlebar_visible  = "hcp_fx4_titlebar_visible",


	this.set_Firefox_button= function  func__set_Firefox_button(fxBut, fx_data){
			
			if(!HCPlusLib.fxButLabel){
				HCPlusLib.fxButLabel = fxBut.getAttribute("label");
				HCPlusLib.fxBut_1stletter= HCPlusLib.fxButLabel.substring(0, 1);
			}
			
			var sBrandName= HCPlusLib.fxBut_1stletter;
			
			var icon_style= ""+fx_data.icon;
			if( fxBut.keepApStyle ){
				icon_style= fxBut.getAttribute("hcp_appbutton_style");
			}else{ // !fxBut.keepApStyle
				fxBut.setAttribute("hcp_appbutton_style", icon_style);
			}
			if( icon_style=="fx_home.png"      || 
				icon_style=="fx_home_med0.png" ||
				icon_style=="fx_home_med.png"  ){
				sBrandName= HCPlusLib.fxButLabel;
			}
			const text= (""+fx_data.text).substring(0, 180).replace("${BrandName}", sBrandName);
			fxBut.setAttribute("label"   , text );

			const image= HCPlusLib.replace_dirs( ""+fx_data.image );
			fxBut.setAttribute("hc_dropm", fx_data.dropm);
			fxBut.setAttribute("image"   , HCPlusLib.HcSingleton.hc_getFirstWord(image));
			fxBut.setAttribute("hc_image", image); // includes 'inverted', etc
	};
	
	
	
	function new_hPrefValue__fromPrefCss( _prefCss, callBack_func ){

		return new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", _prefCss.get_name(), function(option_hPrefVal){

			_prefCss.honorPref( option_hPrefVal.getVal() );

			callBack_func( option_hPrefVal );

		}, _prefCss.get_defaultVal() , true );
	};
	
	
	this.Load_AllOptions= function() {
    	
		HCPlusLib.getConfig_plus(); //load pref object

		
		this.arrayOptions= new Array();
		
		//option_adv_scrollViaTabBar
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.adv.scroll_via_tabbar"           , function(option_hPrefVal){
					//DELAYED + default= FALSE: bc This was making Tabs SCROLL-ARROWs appear ALWAYS !!
					setTimeout(function() {
						option_hPrefVal.putDomAttribute_ifTrue(document.getElementById("main-window"));
					}, 200); // tested successfully with 50 also :-)
				}, false, true) ); 

		// drag_controls 
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.adv.drag_controls"    , function(option_hPrefVal) {
			option_hPrefVal.setAsDomAttribute(document.getElementById("main-window"));
			//HideCaption.Delayed_calcSpaceForMinMaxCloseButtons();
			
		}, "no_forgn_spaces  reserved", true) );
		
		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.adv.minmaxclose_buttons_skin"    , function(option_hPrefVal) {

			//new dynamic css here!
			HCPlusLib.HcSingleton.MmcButtons_skin.honorPref( option_hPrefVal.getVal() );

			option_hPrefVal.setAsDomAttribute(document.getElementById("main-window"));
					
			var bForced= 
				option_hPrefVal.getVal() == "bs_new" ||
				option_hPrefVal.getVal() == "bs_classic";
			HCPlusLib.setAttribute_withBkp(document.getElementById("main-window"), "dz_adv_minmaxclose_buttons_skin_forced", ""+bForced);

			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus(200);
			
		  }, HCPlusLib.HcSingleton.MmcButtons_skin.get_defaultVal(),  true) );
		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.adv.minmaxclose_buttons_location", function(option_hPrefVal){

			option_hPrefVal.setAsDomAttribute(document.getElementById("main-window")); //"hcp-root-box"

			//calcSpaceForButtons() !!
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus(200);
			
		  }, 'bloc_topright', true) ); 
			//bloc_hidden - bloc_topright
		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.adv.minmaxclose_buttons_loc_nomax", function(option_hPrefVal){

			option_hPrefVal.setAsDomAttribute(document.getElementById("main-window")); //"hcp-root-box"

			//calcSpaceForButtons() !!
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus(200);
		  }, HideCaption.GetCharPref("plus.adv.minmaxclose_buttons_location", 'bloc_topright'), true) ); 
			//bloc_hidden - bloc_topright

		
		//..._showCustomCaption 
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.show_custom_caption"            , function(option_hPrefVal) {
			option_hPrefVal.setAsDomAttribute(document.getElementById("hcp-caption-box"));
			option_hPrefVal.setAsDomAttribute(document.getElementById("main-window"));
			
			//calcSpaceForButtons() !!
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus(200);
		  }, HCPlusLib.getPlatformPlus()!="windows"? "cc_small": "cc_small",   true )  );

		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.show_custom_bdresizers"   	   , function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("main-window"));
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons();
		  }, HCPlusLib.getPlatformPlus()!="windows"? true : true ,              true )  ); // now default is TRUE for windows! 

		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.show_custom_bdresizers_visible", function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("main-window"));
			//HideCaption.Delayed_calcSpaceForMinMaxCloseButtons();
		  }, HCPlusLib.getPlatformPlus()!="windows"? false: false,              true )  ); //
		
		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.show_custom_border_color"      , function(option_hPrefVal){

			HideCaption.querySelectorAll_forEach(
					"#hcp-top-box    	> resizer, " +
					"#hcp-left-box    	> resizer, " +
					"#hcp-right-box  	> resizer, " +
					"#hcp-bottom-box 	> resizer  " ,
					function(elem){
						elem.style.setProperty("border-color", option_hPrefVal.getVal(), ""); // not important
						elem.style.setProperty("color"       , option_hPrefVal.getVal(), ""); // not important // for box-shadow
			});
			
		  }, "rgba(0, 0, 0, 0.4)",              true )  ); 

		
		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.adv.minmaxclose_buttons_canfloat", function(option_hPrefVal){
			HideCaption.TopRightBar_Handler.setOptionFloatingButtons(option_hPrefVal.getVal());
		  }, true,              true )  ); 

		//minmaxclose_floating_activeMillis
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "INT_PREF" , "plus.adv.minmaxclose_floating_activeMillis"    , function(option_hPrefVal){
			HideCaption.TopRightBar_Handler.setActive_millis(option_hPrefVal.getVal());
		  },   0,              true )  ); 
		//minmaxclose_floating_inactiveMillis
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "INT_PREF" , "plus.adv.minmaxclose_floating_inactiveMillis"  , function(option_hPrefVal){
			HideCaption.TopRightBar_Handler.setInactive_millis(option_hPrefVal.getVal());
		  }, 150,              true )  ); 
		
		
		// (Removed!!) SYSTEM_BUTTONs hiding for AeroGLASS !
		HCPlusLib.clearUserPref("plus.adv.sysbuttons_hide_nomax");
		HCPlusLib.clearUserPref("plus.adv.sysbuttons_hide_max");
		
		  
		// HOME TOOLBAR SECTION --------------------
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", HCPlusLib.sKey_plus_home_enabled, function(option_hPrefVal){
			
			option_hPrefVal.setAsDomAttribute(document.getElementById("hctp-appmenu-button-cont-fixed"));
			option_hPrefVal.setAsDomAttribute(document.getElementById("hcp-root-box"));
			
			// TURN OFF main-menu if applicable!!!
//			if( ! option_hPrefVal.getVal() ){
//				HCPlusLib.do_SetPref_plus(HCPlusLib.BOOL_PREF, HCPlusLib.sKey_plus_home_mainmenu_floating, false);
//			}
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus(300);

		  }, true, 				true )  ); 
		  
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", HCPlusLib.sKey_plus_home_mainmenu_floating, function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("menubar-items"));
			option_hPrefVal.setAsDomAttribute(document.getElementById("navigator-toolbox")); //for fixing menubar autohide.
			option_hPrefVal.putDomAttribute_ifTrue(document.getElementById("main-window"));
			HideCaption.HomeToolbarHandler.setOptionFloatingMenu(option_hPrefVal.getVal());
		  }, true, 				true )  ); 

		// .... menuFloat_hStyle  
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.home.menuFloat_hStyle"       , function(option_hPrefVal) {
			option_hPrefVal.setAsDomAttribute(document.getElementById("menubar-items")); //  NO poner en el TOOLBOX!! pq puede ir al floatbars!
		  }, "new16",   true )  );
		
		// .... home_floating_extrabox
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", HCPlusLib.sKey_plus_home_floating_extrabox, function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("menubar-items"));
			option_hPrefVal.putDomAttribute_ifTrue(document.getElementById("main-window"));
		  }, true,				true )  ); // default=true  !!

		//deprecated......
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", HCPlusLib.sKey_plus_home_mainmenu_float_oldautohide, function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("navigator-toolbox")); //for fixing menubar autohide.
		  }, false, 				true )  ); // default=false, 

		//floating_activeMillis
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "INT_PREF" , "plus.home.floating_activeMillis"    , function(option_hPrefVal){
			HideCaption.HomeToolbarHandler.setActive_millis(option_hPrefVal.getVal());
		  },   0,              true )  ); 
		//floating_inactiveMillis
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "INT_PREF" , "plus.home.floating_inactiveMillis"  , function(option_hPrefVal){
			HideCaption.HomeToolbarHandler.setInactive_millis(option_hPrefVal.getVal());
		  }, 150,              true )  ); 
		

		
		function set_all_Fx_buttons( isMax, propName, value ){
			const suffix = isMax?        "max":       "nomax";
			const fx_data= HCPlusLib.HcSingleton.getFxData(isMax);
			if( propName ){
				fx_data[propName]= value;
			}
			HideCaption.querySelectorAll_forEach( ".hctp-appmenu-button-cls."+suffix, function(elem){ 
				HCPlusLib.set_Firefox_button( elem, fx_data );
			});
		
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus(500); // 2 calls bc: image from none to something and way back was not working sometiomes...
			setTimeout( function(){
				HideCaption.calcSpaceForMinMaxCloseButtons(); 
			}, 200);
		}
		
		// icons ...
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.home.buttonicon_max"  ,function(hPref){ set_all_Fx_buttons(true , "icon" , hPref.getVal()); }, "fx_home_smaller.png", true ) );
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.home.buttonicon_nomax",function(hPref){ set_all_Fx_buttons(false, "icon" , hPref.getVal()); }, "fx_home.png"        , true ) );
		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.home.button_appear"  , function(hPref){
			hPref.setAsDomAttribute(document.getElementById("main-window"));
		  }, "lwtheme_transp"     , true )  ); 
		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "UniCHAR_PREF"	, "plus.home.fx_text_max"    , function(hPref){ set_all_Fx_buttons(true , "text" , hPref.getVal()); }, "${BrandName}", true ) );
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "UniCHAR_PREF"	, "plus.home.fx_text_nomax"  , function(hPref){ set_all_Fx_buttons(false, "text" , hPref.getVal()); }, "${BrandName}", true ) );
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF"	, "plus.home.fx_dropm_max"   , function(hPref){ set_all_Fx_buttons(true , "dropm", hPref.getVal()); }, "auto", true ) );
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF"	, "plus.home.fx_dropm_nomax" , function(hPref){ set_all_Fx_buttons(false, "dropm", hPref.getVal()); }, "auto", true ) );
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF"	, "plus.home.fx_image_max"   , function(hPref){ set_all_Fx_buttons(true , "image", hPref.getVal()); }, "", true ) );
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF"	, "plus.home.fx_image_nomax" , function(hPref){ set_all_Fx_buttons(false, "image", hPref.getVal()); }, "", true ) );
		

		// fullscrButs_autohide
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.home.fullscrButs_autohide"   	   , function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("main-window"));
		  }, true                 , true )  ); 
		// fullscrButs_autohide_domFs - for FS VIDEOS only!
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.home.fullscrButs_autohide_domFs"   , function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("main-window"));
		  }, true                 , true )  ); 

		
		
		//(removed) Status Bar - web-title -----
		HCPlusLib.clearUserPref("plus.statusbar_webtitle");

		// small_tabs
		this.arrayOptions.push(   new_hPrefValue__fromPrefCss(  HCPlusLib.HcSingleton.Pref__small_tabs  ,  function(option_hPrefVal){

			//checks for changes...
			
			HCPlusLib.HcSingleton.smallTabs_changed.onChange( option_hPrefVal.getVal() != "no" ); // tracking only enabled/disabled states! 
		  }) ); 
          
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.style.small_tbars" 		, function(option_hPrefVal){
            
			var prefVal_Word1= HCPlusLib.HcSingleton.hc_getFirstWord(option_hPrefVal.getVal());
			
			if( prefVal_Word1=="always" ){	prefVal_Word1= "small_tbars_10";  }
			
			var sNewStyle= null;
			if( prefVal_Word1=="no" ){  // NO !
				sNewStyle= null;
			}else{
				sNewStyle= "chrome://hidecaptionplus_fx/skin/" + HCPlusLib.HcSingleton.smallBars_FxVer_prefix + prefVal_Word1 + ".css";
			}
			
			HCPlusLib.HcSingleton.Small_Toolbars_sheet.setStyleSheet( sNewStyle );
            
		  }, "no"        , true )  ); 

		//style.custom_theme  -- DISABLE for Australis, (for now..) ....
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.style.custom_theme" 		, function(option_hPrefVal){

			// usar esto nuevo:
			//HCPlusLib.HcSingleton.custom_theme_sheet.setStyleSheet( sNewStyle );
			
			/***
			function local_setStyleSheet( sName, bSet ){
				// xx-HCPlusLib.setStyleSheet("chrome://hidecaptionplus_fx/skin/custom/"+sName+"_untested.css", bSet, true); // TODO: enable & test this again  
			}
			if( option_hPrefVal.getVal() != HCPlusLib.last_custom_theme ){
				
				if( HCPlusLib.last_custom_theme != "none" ){   local_setStyleSheet( HCPlusLib.last_custom_theme, false);   }
				if( option_hPrefVal.getVal()    != "none" ){   local_setStyleSheet( option_hPrefVal.getVal()   , true );   }
				HCPlusLib.last_custom_theme= option_hPrefVal.getVal();
			}
			***/
			
		  }, "none"        , true )  ); 

		
		//Fx4 titlebar -----
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", HCPlusLib.sKey_plus_fx4_titlebar   , function(option_hPrefVal){
		
			// FORCING default value for Fx29+ ---------------------
			if( option_hPrefVal.getVal() != "ti_never" ){
				option_hPrefVal.setVal(     "ti_never" );
				// NO hace falta llamar a xx.Init() vd?  Lo estamos ejecutando ya ahora mismo y ademas voy a hacer SAVE del fx-preference tb!

				HCPlusLib.myDumpToConsole( "  ...handler for "+HCPlusLib.sKey_plus_fx4_titlebar+":  FORCING default val= "+option_hPrefVal.getVal() );
				
				setTimeout( function(){
					option_hPrefVal.Save();
				}, 200);
			}
				
			
			var mainWindow= document.getElementById("main-window");
			
			option_hPrefVal.setAsDomAttribute(mainWindow);

			HCPlusLib.myDumpToConsole( "  ...handler for "+HCPlusLib.sKey_plus_fx4_titlebar+":   val= "+option_hPrefVal.getVal() );
			
			//handles sAttr_hcp_fx4_titlebar_visible attr...
			HideCaption.Adjust_fx4_titlebar();
			
			HideCaption.Adjust_ChromeMargin();

			//cuando sale o entra en tabsintitlebar....
			HCPlusLib.set_tab_marginTop_delta();

			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons();
			
		  }, HCPlusLib.getPlatformPlus()!="windows"? "ti_never":"ti_never",              true )  ); 

		
		/***
		//Feb 2012 - Use SYSTEM caption buttons!  ---  forced setting for Fx 12alpha bug
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.adv.sysbuttons_enableXXX"    	, function(option_hPrefVal)... );
		***/
		//(removed option)
		HCPlusLib.clearUserPref("plus.adv.sysbuttons_enable");

		
		//(removed option)
		HCPlusLib.clearUserPref("plus.adv.chromemargin_calc");

		// -------------------------------------------------------------------------------------------------
		
		const onActionBut= function(opt_hPref){
			//opt_hPref.putDomAttribute_ifTrue(document.getElementById("main-window"));
			
			var myKey= opt_hPref.getPrefKey();
			myKey= myKey.substring(myKey.lastIndexOf(".")+1);
			
    		const opt_value= opt_hPref.getVal();
			
	    	//HCPlusLib.myDumpToConsole( " action:  myKey="+myKey);

			const arrOpts= Array.slice( document.getElementById("tt_action_options").getElementsByAttribute("value", opt_value) );
			var thisOpt= arrOpts.length>0? arrOpts[0]: null;
			thisOpt= thisOpt? (""+thisOpt.label).trim(): ("("+opt_value+")");
					
	    	var hAction= document.getElementById("hAction_"+myKey);
	    	if( hAction ){
		    	hAction.setAttribute("value", thisOpt );
		
		    	//hAction.parentNode.collapsed= opt_value == "none";

		    	var atOrigParent= false;
		    	var originalParent= hAction.parentNode.parentNode;
		    	if( originalParent.tagName == "rows" ){
		    		atOrigParent= true;
		    	}else{
			    	originalParent= hAction.parentNode.parentNode.parentNode;
			    	
			    	if( originalParent.tagName != "rows" ){
			    		throw " error, 'rows' not found? ";
			    	}
		    	}
		    	
		    	if( atOrigParent ){
		    		if( opt_value == "none" ){
		    			hAction.parentNode.nextSibling.insertBefore( hAction.parentNode, null ); // meter en el hbox
		    		}
		    	}else{ // NOT  atOrigParent
		    		if( opt_value != "none" ){
		    			originalParent.insertBefore( hAction.parentNode, hAction.parentNode.parentNode );
		    		}
		    	}
		    	
	    	}else{
	    		HCPlusLib.myDumpToConsole( "warn: not found: "+"hAction_"+myKey  );
	    	};
		};
		
		this.arrayOptions.push( this.option_close_button_action= 
        /* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.close_button_action"         , onActionBut, "closetab"  ,	true )  );
		this.arrayOptions.push( this.option_close_button_act1_primary_dblclk= 
		/* */					new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.close_button_act1_primary_dblclk" , onActionBut, "none" ,	true )  );
		this.arrayOptions.push( this.option_close_button_act2_secondary= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.close_button_act2_secondary" , onActionBut, "hc_context",	true )  );
		this.arrayOptions.push( this.option_close_button_act2_secondary_dblclk= 
		/* */					new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.close_button_act2_secondary_dblclk" , onActionBut, "none",	true )  );
		this.arrayOptions.push( this.option_close_button_act3_middle= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.close_button_act3_middle"    , onActionBut, "undoCloseTab",	true )  );
		this.arrayOptions.push( this.option_close_button_act3_middle_dblclk= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.close_button_act3_middle_dblclk" , onActionBut, 	"none"	,	true )  );

		this.arrayOptions.push( this.option_close_button_act_wheel= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.close_button_act_wheel"	    , onActionBut, "none"      ,	true )  );
		this.arrayOptions.push( this.option_close_button_act_wheelLeft= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.close_button_act_wheelLeft"  , onActionBut, "advSelTab" ,	true )  );
		this.arrayOptions.push( this.option_close_button_act_wheelRight= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.close_button_act_wheelRight" , onActionBut, "advSelTab" ,	true )  );

		// sounds!...
		this.arrayOptions.push( HCPlusLib.Audio_Sound_tic1 .new__Hcp_PrefValue() );
		this.arrayOptions.push( HCPlusLib.Audio_Sound_info1.new__Hcp_PrefValue() );
		this.arrayOptions.push( HCPlusLib.Audio_wheel1     .new__Hcp_PrefValue() );
		this.arrayOptions.push( HCPlusLib.Audio_Sound_action1 .new__Hcp_PrefValue() );
		this.arrayOptions.push( HCPlusLib.Audio_Sound_notFound.new__Hcp_PrefValue() );

		
		// ***  FIREFOX BUTTON Actions! *** ----------------------------------
		this.arrayOptions.push( this.option_fxbut_act1_primary= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.fxbut_act1_primary"   , onActionBut, "mainPanelUI",	true )  );
		this.arrayOptions.push( this.option_fxbut_act1_primary_dblclk= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.fxbut_act1_primary_dblclk", onActionBut, "none"	,	true )  );
		this.arrayOptions.push( this.option_fxbut_act2_secondary= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.fxbut_act2_secondary" , onActionBut, "hc_context" ,	true )  );
		this.arrayOptions.push( this.option_fxbut_act2_secondary_dblclk= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.fxbut_act2_secondary_dblclk", onActionBut, "none" ,	true )  );
		this.arrayOptions.push( this.option_fxbut_act3_middle= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.fxbut_act3_middle"	 , onActionBut, "superStop" ,	true )  );
		this.arrayOptions.push( this.option_fxbut_act3_middle_dblclk= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.fxbut_act3_middle_dblclk" , onActionBut, "none" 	,	true )  );

		this.arrayOptions.push( this.option_fxbut_act_wheel= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.fxbut_act_wheel"   	 , onActionBut, "Page_UpDown",	true )  );
		this.arrayOptions.push( this.option_fxbut_act_wheelLeft= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.fxbut_act_wheelLeft"  , onActionBut, "advSelTab"  ,	true )  );
		this.arrayOptions.push( this.option_fxbut_act_wheelRight= 
		/* */                   new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.fxbut_act_wheelRight" , onActionBut, "advSelTab"  ,	true )  );
		//en breve?? -->> plus.action.fxbut_act_mouseenter
		

		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.tooltips", function(option_hPrefVal){
			//option_hPrefVal.setAsDomAttribute(     HideCaption.hcp_root_box);
			
			HideCaption.TipConf.setOption__action_tooltips( ""+option_hPrefVal.getVal() );
			
		  }, "always",          true )  ); //

		
		// poner antiguo boolean val como default!
		// ANTIGUA pref!!: BOOL:  "plus.show_PanelUI_button"
		const show_PanelUI_button__KEY=   "extensions.hide_caption." + "plus.show_PanelUI_button";
		const show_PanelUI_button_2__default= 
			!Services.prefs.prefHasUserValue( show_PanelUI_button__KEY ) ||
			 Services.prefs.getBoolPref(      show_PanelUI_button__KEY )  ? "default": "badge_msg";
 
        //show_PanelUI_button_2 (Fx29+)
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.show_PanelUI_button_2", function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(     HideCaption.hcp_root_box);
			//HideCaption.Delayed_calcSpaceForMinMaxCloseButtons();
		  }, show_PanelUI_button_2__default,          true )  ); //


		//Extra things! (offtopic!, extra options pack NOT directly RELATED to HCT+) -------------------------------------------------
		//bookmark_panel_extrawidth
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.extra.bookmark_panel_extrawidth" , function(option_hPrefVal){
			option_hPrefVal.putDomAttribute_ifTrue(document.getElementById("main-window"));
		  }, false,              true )  ); 

		//super_stop_animations
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.extra.super_stop_animations"   	, function(option_hPrefVal){
			HideCaption.set__super_stop_animations( option_hPrefVal.getVal() );
		  }, false,              true )  ); 

		
		// poner antiguo boolean val como default!
		// ANTIGUA pref!!: BOOL:  "plus.extra.key_close_tab"
		const boolean_close_tab__KEY=   "extensions.hide_caption." + "plus.extra.key_close_tab";
		const default__key_ctrl_w= 
			Services.prefs.prefHasUserValue( boolean_close_tab__KEY ) &&
			Services.prefs.getBoolPref(      boolean_close_tab__KEY )  ? "closeWithHistory  only": "";
		
	    // ctrl + w   -->  close-with-history! 
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.action.key_ctrl_w"			, function(option_hPrefVal){
			HideCaption.set__key_close_tab( option_hPrefVal.getVal() );
		  }, default__key_ctrl_w,  		true )  );

		// ...Hist.mainAction
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.closeWithHist.mainAction"     	, function(option_hPrefVal){
			HCPlusLib.HcSingleton.PgHistory.mainAction= option_hPrefVal.getVal();
		  }, "popup",                 	true )  );
		// ...Hist.lineScan
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.closeWithHist.lineScan"     	, function(option_hPrefVal){
			HCPlusLib.HcSingleton.PgHistory.set_lineScan( option_hPrefVal.getVal() );
			//TODO: llamar al metodo de 'scanFull' aca para sacar el '[R]'estart needed !!. 1ero llegar a la version final de eso!
		  }, "hcLine  only",          	true )  );
		
		
		//fx4_margin_top....
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "INT_PREF", "plus.look.tab_marginTop_delta"        , function(option_hPrefVal){
			
			HCPlusLib.tab_marginTop_delta      = option_hPrefVal.getVal();
			
			HCPlusLib.set_tab_marginTop_delta();
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus();

		  }, 0,              true )  ); 
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "INT_PREF", "plus.look.tab_marginTop_delta_nomax"  , function(option_hPrefVal){
			
			HCPlusLib.tab_marginTop_delta_nomax= option_hPrefVal.getVal();
			
			HCPlusLib.set_tab_marginTop_delta();
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus();

		  }, 0,              true )  ); 


		var tabs_drawInTitlebar_callback = function(){
			
    		HCPlusLib.pref__browser_tabs_drawInTitlebar = window.Services.prefs.getBoolPref( "browser.tabs.drawInTitlebar" ); 
	    	
    		HCPlusLib.myDumpToConsole( "Observer for browser.tabs.drawInTitlebar:  value = "+HCPlusLib.pref__browser_tabs_drawInTitlebar );

    		HCPlusLib.set_tab_marginTop_delta();
    		
    		if( HCPlusLib.HcSingleton.Bstrap.is_shutdown ){
    			return;
    		}
	    	HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus(100);
		};

		// SPECIAL OBSERVER !!!!!---------------------------------------------------------------------------------
		function on_drawInTitlebar(subject, topic, data) {
	    	if (topic == "nsPref:changed"){
				if (data == "browser.tabs.drawInTitlebar"){
					
		    		//Es usado en Fx mismo ----> 'Services.prefs'! - uso para acceder a una pref 'global' fuera de mi branch 
		    		tabs_drawInTitlebar_callback();
				}
	    	}
	    	//HCPlusLib.myDumpToConsole( "Observer for browser.tabs.drawInTitlebar:  "+subject +", "+ topic +", "+ data);
	    	//HCPlusLib.myDumpToConsole( "     HCPlusLib.pref__browser_tabs_drawInTitlebar =   "+HCPlusLib.pref__browser_tabs_drawInTitlebar );
	    };
		window.Services.prefs.addObserver( "browser.tabs.drawInTitlebar", on_drawInTitlebar, false);

		//ADDING a call here, bc this isnt called from Do_Load_AllOptions()
	    tabs_drawInTitlebar_callback(); //dont need DELAYED here right?
		
	    // UNLOADERS ------------------------------ 
	    unloaders.push(function() {
			window.Services.prefs.removeObserver( "browser.tabs.drawInTitlebar", on_drawInTitlebar);
    	});

	    
		//fx4_margin_top - enforce....
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.look.containers_marginTop"  , function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(document.getElementById("main-window")); // zeroAll, no, ....
		  }, "no",              true )  ); 


		//WARN: DON'T USE THIS in WINDOWS! - uses HIDECHROME attr !! works in LINUX-GNOME!
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.critical.use_hidechrome"   , function(option_hPrefVal){
		
			
			// .... user is forced to RESTART firefox to take the OFF value
			if( HCPlusLib.getPlatformPlus() != "windows" ){ // NOT for windows! - default==YES in LINUX!
				HideCaption.use_hidechrome_option = option_hPrefVal.getVal();
			}
			//if(       option_hPrefVal.getVal() == "uhc_yes" )...

			/*
			HideCaption.Adjust_fx4_titlebar();
			
			HideCaption.Adjust_ChromeMargin();

			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons();
			*/
		  }, HCPlusLib.getPlatformPlus()=="linux"? "uhc_yes":"uhc_no",              true )  ); 

		  
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.adv.sysbut_winappear"  , function(option_hPrefVal){

			//used a ..._calc attribute - option_hPrefVal.setAsDomAttribute(document.getElementById("main-window"));

			HideCaption.adv_sysbut_winappear= option_hPrefVal.getVal();
			HideCaption.calc_sysbuttons_active();

			//may-2014: now for lwtheme is setted -moz-appearance:toolbar; that has a border-top: 2px + a margin I set to compensate.

			// HideCaption.set_content_Position(true); // old code
			
	    	HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus();
	    	
	    	//vertMax ..
	    	HideCaption.HcExtras.vertMax_enforceRules();

	    	
		  }, "window  bkg_dblue  bkg_solid"  , true )  ); 


		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.adv.winbkg_color"      ,  function(option_hPrefVal){
			
			// FYI: BEWARE of transparency in MAIN-WINDOW (when glass is off) !
			HideCaption.winbkg_color           = option_hPrefVal.getVal();
			HideCaption.conditional_set_winbkg_color();
			
		  }, "#92ACCE",              true )  ); 
		//this AFTER 'winbkg_color' option, to have loaded the 'winbkg_color' var!
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.adv.winbkg_color_enablelist", function(option_hPrefVal){

			option_hPrefVal.setAsDomAttribute(HideCaption.mainW);
		
			HideCaption.winbkg_color_enablelist= option_hPrefVal.getVal();
			HideCaption.conditional_set_winbkg_color( true ); // reset == true
			
		  }, "not_in_lwtheme",       true )  ); 

		
		//NEW configurable SYSTEM_BORDER!
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.adv.sysborder" , function(option_hPrefVal){

			option_hPrefVal.setAsDomAttribute(HideCaption.mainW);

			var icm= 4;
			
			var _userCm= (""+option_hPrefVal.getVal()).split(" ")[0];
			try {
				icm= parseInt(_userCm);
				if( icm < -1 || icm > 8 ){
					throw "bad sysborder setting: icm="+icm;
				}
			} catch (ex) {
				//HCp
				throw "Error: bad userCM:"+_userCm+"  -  "+ex;
			}

			HideCaption.userChromeMargin= icm;

			
			HCPlusLib.sysborder_real= (""+option_hPrefVal.getVal()).indexOf("real") >= 0;
			
			//depends on HideCaption.systemCaption_present also.
			HCPlusLib.set_sysborder_settings();

			
			HideCaption.Adjust_ChromeMargin();
			
			HideCaption.Delayed_FORCED_calcSpaceForMinMaxCloseButtons(400);
			
			HCPlusLib.Main_css_props.setProperty_plus( HideCaption.mainW, "--hctp_sysborder_sub", (icm==0? 8: (icm<0? 0: icm))+"px", "");
			
		  }, "7 r"        , true )  ); 


		//forbid_fxaustr_syscaption
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.sys.forbid_fxaustr_syscaption" , function(option_hPrefVal){
			//option_hPrefVal.putDomAttribute_ifTrue(document.getElementById("main-window"));
			
			HideCaption.forbid_fxaustr_syscaption= option_hPrefVal.getVal();
			if( window.updateTitlebarDisplay ){ // not in Linux
				window.updateTitlebarDisplay();
			}
			
		  }, false,              true )  ); 

		
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "BOOL_PREF", "plus.home.fullscrWar_Msg_small" , function(option_hPrefVal){
			option_hPrefVal.putDomAttribute_ifTrue(HideCaption.hcp_root_box);
		  }, false,              true )  ); 

		
		//Aqui estaba: topEdge_style: old14, etc.

		
		this.z_sys_intFlags= "";
		// develFlags
		this.arrayOptions.push( new HCPlusLib.Hcp_PrefValue( "CHAR_PREF", "plus.z_sys.intFlags", function(option_hPrefVal){
			option_hPrefVal.setAsDomAttribute(HideCaption.mainW);
			HCPlusLib.z_sys_intFlags= ""+option_hPrefVal.getVal();
			
			HCPlusLib.HcSingleton.DynElemSettings.init( ""+option_hPrefVal.getVal() );
		  }, "",       true )  ); 

		// ---------------------- FLOATING TOOLBARS & OTHER MODULES  Options ---------------------------------------------------
		HideCaption.FloatToolbarsHandler.Load_AllOptions();

		HideCaption.TBoxHide            .Load_AllOptions();

		HideCaption.HcExtras            .Load_AllOptions();

		
		
		//set inits...
		
		
		//onStartup()
		for(var iop=0; iop<this.arrayOptions.length; iop++){
			this.arrayOptions[iop].onStartup();
		}
		
		//load...
		this.Do_Load_AllOptions();
		
		listener_list.push( new HideCaption.Hc_EventListener( window, "fullscreen", HCPlusLib.onFullScreen, false).addEventListener() );  // useCapture= true??

		// Fx APP-MENU
		var appmenuPopup = HCPlusLib.getMainPopup();
		listener_list.push( new HideCaption.Hc_EventListener( appmenuPopup, "popupshown" , HCPlusLib.onAppmenuPopup, false).addEventListener() );
		listener_list.push( new HideCaption.Hc_EventListener( appmenuPopup, "popuphidden", HCPlusLib.onAppmenuPopup, false).addEventListener() );

	},
	this.Do_Load_AllOptions= function() {
		// Load() ALL !!
		for(var iop=0; iop<this.arrayOptions.length; iop++){
			this.arrayOptions[iop].Load();
		}
	},

	this.Do_Load_newValue_AllOptions= function() {
		// Load() ALL !!
		for(var iop=0; iop<this.arrayOptions.length; iop++){
			this.arrayOptions[iop].Load_newValue();
		}
	},
	
	/*
    this.Init_AllOptions= function() {
		// Init() ALL !!
		for(var iop=0; iop<this.arrayOptions.length; iop++){
			this.arrayOptions[iop].Init();
		}
	},
	*/
	
	this.onShutDown_lib= function() {
		try{
			//onShutdown()
			for(var iop=0; iop<this.arrayOptions.length; iop++){
				this.arrayOptions[iop].onShutdown();
			}
		}catch(ex){ this.debugError("error: "+ex, ex); };
	};


	// ------------------------------------------------------------------------------

	this.sysborder_real= false;
	
	this.set_sysborder_settings=  function(){
		
		var icm= HideCaption.userChromeMargin;
		if( HideCaption.systemCaption_present ){
			icm= -1;
		}
		HideCaption.mainW.setAttribute("hctp_hidden_sysborder"   ,  icm == 0? "true": "false");
		HideCaption.mainW.setAttribute("hctp_show_newCustBorders", (icm == 0 || icm == 7) && !HCPlusLib.sysborder_real ? "true": "false");
		
		// vertMax ...
		setTimeout(function(){
			HideCaption.HcExtras.vertMax_moveWin();
		}, 50);
	};


	this.onFullScreen=  function( event ) {

		// call HIDECAPTION's same method
		HideCaption.onFullScreen( event );

		//HCPlusLib.myDumpToConsole("   onFullScreen(), BEFORE DELAY (expecting wrong value):   window.fullScreen= "+window.fullScreen );

		setTimeout( function(){

			HCPlusLib.set_tab_marginTop_delta();
			
			//HCPlusLib.myDumpToConsole("   onFullScreen() AFTER DELAY:   window.fullScreen= "+window.fullScreen );
		  }, 100);
	},
	
	this.tab_marginTop_delta      = 0,
	this.tab_marginTop_delta_nomax= 0,
	

	
	this.pref__browser_tabs_drawInTitlebar= false,
	
	//this.tabsintitlebar_enabled_old= false,
	
	this.set_tab_marginTop_delta= function() {
		
		HCPlusLib.do_set_tab_marginTop_delta();
		
	},
	this.do_set_tab_marginTop_delta= function() {

		if( window.fullScreen ){
			HideCaption.hctp_toparea.style.removeProperty("margin-top");
			return;
		}
		
		var tabsintitlebar_enabled = // anula este feature de mtop.. // allow it for linux ...
					HCPlusLib.getPlatformPlus() == "windows" &&
					"ti_enabled"  ==  document.documentElement.getAttribute( "dz_fx4_titlebar" ) &&
					HCPlusLib.pref__browser_tabs_drawInTitlebar;
		
		if( tabsintitlebar_enabled ){ // NULLIFY effect!
			
			HideCaption.hctp_toparea.style.removeProperty("margin-top");
		}else{ //ENABLED feature!
			
			var mtop= window.windowState == window.STATE_MAXIMIZED?  
						HCPlusLib.tab_marginTop_delta : 
						HCPlusLib.tab_marginTop_delta_nomax;
			if(mtop> 30){ mtop=  30;}
			if(mtop<-35){ mtop= -35;}
			HideCaption.hctp_toparea.style.setProperty("margin-top", mtop+"px", "important");
		}
	},
	
	
	
	// ---- Firefox appmenu -------------------- 
	
	this.appMenuButton_now= null,
	
	this.onAppmenuPopup= function(event){
		if (event.target != HCPlusLib.getMainPopup()){
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
	
	this.popMainMenu= null,
    this.getMainPopup= function(){

        if(!HCPlusLib.popMainMenu){
            HCPlusLib.popMainMenu    = document.getElementById('PanelUI-popup');

            if(!HCPlusLib.popMainMenu){
                HCPlusLib.popMainMenu= document.getElementById('appmenu-popup'); //Fx28- before australis
				
                if(!HCPlusLib.popMainMenu){
					HCPlusLib.popMainMenu= document.getElementById('appMenu-popup'); //Fx58+?
					
					if(!HCPlusLib.popMainMenu){
						throw Error("popup Main Menu NOT FOUND");
					}
                }
            }else{ // 'PanelUI-popup' exists!
                //zz-HCPlusLib.popMainMenu.removeAttribute("hidden"); //should be tried when doing openPopup*()?
            }
            
            HCPlusLib.myDumpToConsole("   HCPlusLib.popMainMenu.id= "+HCPlusLib.popMainMenu.id );
        }
        
        return HCPlusLib.popMainMenu;
    };
    
	this.newEv_wTarget= function( _target ){
		var _mEv= new window.MouseEvent("MY_DUMMY_EV"); // para que lo acepte  PanelUI.show(ev) // no anda: {target  :  _target}
		_target.dispatchEvent(_mEv); // SETS  ev.target !!!!
		// document.createElement("label")
		// _mEv.target= _target;
		return _mEv;
	};
	
    this.openAppmenuPopup= function(event, anchorElem, isAnchored){
		//if(HCPlusLib.isLeftClick(event)){ 
			
			if( HCPlusLib.appMenuButton_now ){ //reset any previous pending button! (happens when i open my context w/fx but on top of main app-menu)
				HCPlusLib.appMenuButton_now.removeAttribute("open");
			}
			HCPlusLib.appMenuButton_now = anchorElem;
            
			var myEvent= event;

			if(    myEvent && myEvent.target && myEvent.target.parentElement && myEvent.target.parentElement.getAttribute("forbidden_anchor_parent") == "true" ){
				myEvent= HCPlusLib.newEv_wTarget(HCPlusLib.ctxMenuOpener); // DON'T TOUCH original ev!
				// 2nd similar check!, go to default...
				if(           myEvent.target && myEvent.target.parentElement && myEvent.target.parentElement.getAttribute("forbidden_anchor_parent") == "true" ){
					myEvent= HCPlusLib.newEv_wTarget(window.gNavToolbox); // DON'T TOUCH original ev!
				}
			}
			// AVOID hidden anchors!!!
			while( myEvent && myEvent.target && myEvent.target.boxObject.height == 0 ){ // eg. check autohidden mmc buttons
				myEvent= HCPlusLib.newEv_wTarget(myEvent.target.parentElement); // DON'T TOUCH original ev!
			}
			if(   !myEvent || !myEvent.target ){
				myEvent= HCPlusLib.newEv_wTarget(window.gNavToolbox); // DON'T TOUCH original ev!
			}
			
			
			if( window.PanelUI ){
				if( isAnchored ){
					//www-HCPlusLib.getMainPopup().openPopup(anchorElem, 'after_start');
					window.PanelUI.show( myEvent );
				}else{
					//www-HCPlusLib.getMainPopup().openPopupAtScreen(anchorElem.boxObject.screenX, anchorElem.boxObject.screenY+anchorElem.boxObject.height, false); 
					window.PanelUI.show( myEvent );
				}
			}else{ // !window.PanelUI  (eg. PALE MOON)
				if(!HCPlusLib.errDone_PanelUI){
					HCPlusLib.errDone_PanelUI= true;
					HCPlusLib.myDumpToConsole("   HCPlusLib:  NO  window.PanelUI " );
				}
				//xx_HCPlusLib.getMainPopup().openPopup(myEvent.target, 'after_start'); // no acepta el target pos. en Pale Moon
				HCPlusLib.getMainPopup().openPopupAtScreen(myEvent.target.boxObject.screenX, myEvent.target.boxObject.screenY+myEvent.target.boxObject.height, false); 
			}
		//}
	};


	// -- BackupEngine ----------------------------------------------------------------------------

	this.BackupEngine_Styles_Attrs= new (function bkp_restorer_Class(){
		
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
	
	
	this.setAttribute_withBkp= function(elem, attrName, value){
		//unloaders -- 1ero hacer el backup!
		HCPlusLib.BackupEngine_Styles_Attrs.backupAttr(elem, attrName);
		
		elem.setAttribute( attrName, value);
	},
	
	this.setAttr_smart= function(elemId, attrName, value, bForced){
		var elem= document.getElementById( elemId );
		HCPlusLib.setAttr_smart_elem(elem, attrName, value, bForced);
	},
	this.setAttr_smart_elem= function(elem, attrName, value, bForced){
		if( elem ){ 
			if( bForced || ! elem.hasAttribute( attrName ) ){
				HCPlusLib.setAttribute_withBkp( elem, attrName, value);
			}
		}
	},
	this.removeAttr_smart= function(elemId, attrName){
		var elem= document.getElementById( elemId );
		if( elem ){ 
			elem.removeAttribute( attrName );
		}
	},

	
	// --------------------------------------------------------------------------------------------------------------- 

	// utility functions ....
	this.isLeftClick= function(event){
		return event && event.button == 0 ;
		//return true;
	},
	
	this.mywait = function(msecs)
	{
		var start = new Date().getTime();
		var cur = start;
		while(cur - start < msecs)
		{
			cur = new Date().getTime();
		}
	},
	
	this.objToString = function(obj){
    	HCPlusLib.objToString_base(obj, false);
    },
    this.objToString_base = function(obj,isLengthyObj){
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
	this.Hc_AddonListener= {
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
	
	//this.baseObjectAddonMgr= {},
	*/
	
	this.CheckNewVersionLaunched= function(){
		try{
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

	this.do_CheckNewVersionLaunched= function( _addonItem ){
		try{
			var current = _addonItem? _addonItem.version:  HideCaption.hctp_current_version;
			//gets the version number.  If NOT IN ADDON then from js file

			var ver= HCPlusLib.GetPref_plus(HCPlusLib.CHAR_PREF, "plus.version", "1.0");

			
			var do_menubar_alert= false;  //!! disabled this
			
			// NEW version of this extension launched!!
			if( do_menubar_alert || ver!=current ){ //&& !firstrun ... // !firstrun ensures that this section does not get loaded if its a first run.
				HCPlusLib.do_SetPref_plus(HCPlusLib.CHAR_PREF, "plus.version", current);

				var params= "?param=ok";

				if( ! HCPlusLib.versionIsLessThan(ver, "1.1") ){ // this ISN'T a BRAND NEW INSTALL!

					if( HCPlusLib.versionIsLessThan(ver, "2.3.2rc2") ){	params += ",mmc_disappeared";   }
				}

				//if( do_menubar_alert ){								params += ",menubar_alert"; 	}
				
				
				params += "&_prev_version="+ver+" &_current_version="+current+"";

				var delayTime= HCPlusLib.HcSingleton.Bstrap.startup_reason_APP_STARTUP? 5000: 1500;

				// Insert code if version is different here => upgrade
				setTimeout( function(){
					var mUrl= "chrome://HideCaptionPlus/locale/newversion.html" + params;
					
					HCPlusLib.popupNotification( HCPlusLib.HcSingleton.special_getStringFromName__newversion_msg__ALL(), 
							21600000, "hctp_newversion", null, /* "addons-notification-icon" */
					        {
								addClose:  true,  // ADD CLOSE as Secondary ENTRY!!
								label:     HCPlusLib.HcSingleton.main_GetStringFromName( "newversion_mainAction" ),
								accessKey: HCPlusLib.HcSingleton.main_GetStringFromName( "newversion_mainAction_key" ),
								callback: function(){
									HCPlusLib.openUILinkIn( window, mUrl,"tab");
								} 
					        }); /* 6 hours timeout */
				}, delayTime);
			}
			HCPlusLib.myDumpToConsole( "CheckNewVersionLaunched() END.  Page-showed="+(ver!=current) );

		}catch(ex){
			HCPlusLib.debugError     ( "CheckNewVersionLaunched():  ERROR: "+ex, ex);
		}finally{
		}
	},

	this.versionIsLessThan = function(a,b) {
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

	this.getMostRecentWindow = function() {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
		var recentWindow = wm.getMostRecentWindow("navigator:browser");
		return recentWindow;
	},
	this.openUILink_inMostRecentWindow = function(event, url) {
		var recentWindow = HCPlusLib.getMostRecentWindow();
		if( recentWindow ){
			if(event){
				HCPlusLib.openUILink  ( recentWindow, url, event, false, true);
			}else{ // ! event
				HCPlusLib.openUILinkIn( recentWindow, url, 'tab');
			}
			recentWindow.focus();
			return true;
		}
		else{
			window.open(url);
			return true;
		}
		
	};
	
	
	this.openUILink   = function( _win, _url, event, aIgnoreButton, aIgnoreAlt ) {
		_win.openUILink( _url, event, aIgnoreButton, aIgnoreAlt );
	};
	
	this.openUILinkIn = function( _win, _url, _where ) {
		_win.openUILinkIn     ( _url, _where );
	};
	
	var readme_count= 1;
	this.OpenReadme_inMostRecentWin= function(event, basePath) {
		if(!basePath){
			basePath= "chrome://HideCaptionPlus/locale/";
		}
		if( ! HCPlusLib.openUILink_inMostRecentWindow( event, basePath+"readme.html?_" + readme_count++ )){ 
			alert('Couldn\'t find browser\'s window'); };
	};

	//<menuitem oncommand="myExtension.OpenReadmePage(event)" label="Click me"/>
	this.OpenReadmePage= function(event) {
		HCPlusLib.openUILink( window, "chrome://HideCaptionPlus/locale/readme.html?_" + readme_count++ , event, false, true);
	};

	this.ProcessAllFFwindows= function(url) {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator);
		var browserEnumerator = wm.getEnumerator("navigator:browser");

		while( browserEnumerator.hasMoreElements() ) {
			var browserWin = browserEnumerator.getNext();
			//Load_newValue() all !
			browserWin.HCPlusLib.Do_Load_newValue_AllOptions();
		}
	};


	/*
	// Open POPUP MENU !
	this.onclickWindowControl= function(e){
        if( e.button==2 || ( e.button==0 && e.ctrlKey==1 )){ // ctrl+click creates problems with buttons
            var wcMenu=document.getElementById('hcp-menu-windowcontrolsXXX')
			wcMenu.showPopup(e.target, -1, -1, 'popup', 'bottomleft', 'topleft');
		}
    },
	*/
	
	
	this.url_addTimestamp= function( _url ) {
		_url= ""+_url;
		const paramDiv= _url.indexOf("?") < 0? "?": "&";
		return _url + paramDiv +"_"+ Date.now();
	};
	
	
	this.optionDialog= null,
	this.openOptionDialog= function(e, _hctp_locale){
		if( HCPlusLib.optionDialog ){
			try{
			HCPlusLib.optionDialog.focus();
			}catch(ex){	
				HCPlusLib.optionDialog= null;
				HCPlusLib.debugError     ( "openOptionDialog():  *IGNORING* ERROR: "+ex, ex);
			}
			//left=100, top=10, 
		}
		
		// hctp_locale:  DON'T use the pref ....userag... bc the current fx-locale can be nonexistant or *disabled* in hctp
		var hctp_locale= "notset";
		try {
			if(_hctp_locale){
				hctp_locale= _hctp_locale;
			}else{
				hctp_locale= (""+HideCaption.hcp_root_box.getAttribute("hctp_locale")).trim();
			}
		} catch (ex) {	HCPlusLib.debugError     ( "  ERROR: "+ex, ex);	}

		//timestamp to fool cache and mlanguage url BUG!!!
		var url= 'chrome://HideCaptionPlus/content/options.xul';
		url= HCPlusLib.url_addTimestamp(url);
		
		//

		HCPlusLib.optionDialog= window.openDialog( url, 'OptDlg_'+hctp_locale, 'chrome,titlebar,toolbar,scrollbars=yes,resizable=yes,centerscreen,dialog=no');
		HCPlusLib.optionDialog.focus(); // por si la lo habia abierto de otro dialogo (multilanguage)
	};
	
	
	
	function removeParams( _str ){
		  var ix= _str.indexOf("?");
		  return ix >= 0 ?  _str.substring(0, ix): _str;
	};
	
	this.openAndReuseOneTabPerURL= function(_url, _bFilterParams ) {
	  var browserEnumerator = Services.wm.getEnumerator("navigator:browser");

	  HCPlusLib.myDumpToConsole( "   openAndReuseOneTabPerURL() ... will open:  "+_url );

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
		  
		  //HCPlusLib.myDumpToConsole( "   ... will compare against:  "+currentBrowser.currentURI.spec );
		  var compare_url    = ""+_url;
		  var compare_current= ""+currentBrowser.currentURI.spec; 
		  if( _bFilterParams ){
			  compare_url    = removeParams(compare_url    );
			  compare_current= removeParams(compare_current);
		  }
		  
		  if (compare_url == compare_current) {

			// The URL is already opened. Select this tab.
			tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];

			if( _bFilterParams ){
				// loadURI !!
				currentBrowser.loadURI( _url );
			}else{
				// reload !!
				currentBrowser.reload();
			}
			
			// Focus *this* browser-window
			browserWin.focus();

			found = true;
			break;
		  }
		}
	  }

	  // Our URL isn't open. Open it now.
	  if (!found) {
		var recentWindow = Services.wm.getMostRecentWindow("navigator:browser");
		if (recentWindow) {
			HCPlusLib.myDumpToConsole( "   ...  will open in exiting window:  "+_url );
		  // Use an existing browser window
			if( recentWindow.delayedOpenTab ){
		  recentWindow.delayedOpenTab(_url);
			}else{
				recentWindow.openLinkIn( _url, "tab", { inBackground: false, fromChrome: true});
			}
		  recentWindow.focus();
		}
		else {
		  HCPlusLib.myDumpToConsole( "   ... (window.open)  will open:  "+_url );
		  // No browser windows are open, so open a new one.
		  window.open(_url);
		}
	  }
	};

	this.getPlatformPlus=  function(){
			try{
				var _oscpu   = (""+window.navigator["oscpu"]).toLowerCase();  //navigator.oscpu could bring undefined warn/error?
				var platform = (""+window.navigator.platform).toLowerCase();

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
	};
	
	
	this.get_sys_floatbars_enable=  function(){
		return  HCPlusLib.HcSingleton.get_sys_floatbars_enable();
	};

	// 'general' switch to activate floatbars (prevent elements DELETION at startup)
	this.get_floatbars_enable_general=  function(){

		if( !HCPlusLib.HcSingleton.get_sys_floatbars_enable() ){
			return false;
		}
		
		return true;
		// aca estaba  "plus.floatbars.act.activate" 
	};
	

	// preferences --------------------------------------------------------------
	this.GetPref_plus = function(_TYPE_PREF, _name, DefVal) {
        try {
        	var retVal= null;
        	
    		HCPlusLib.getConfig_plus();
    		if( HCPlusLib.gPrefConfig_plus.prefHasUserValue(_name) ){
    			retVal= this.do_GetPref_plus(_TYPE_PREF, _name);
    		}
			if( retVal == null && DefVal != null ){
				this.do_SetPref_plus(_TYPE_PREF, _name, DefVal);
				retVal= DefVal;
				HCPlusLib.myDumpToConsole("  ...Pref_plus: ["+_name+"]  setted to default-value -> "+DefVal);
			}
			return retVal;
        }
        catch(ex) {
			HCPlusLib.myDumpToConsole("GetPref_plus( "+_TYPE_PREF+", "+_name+" .) ERR@R: (most probably an ignored one-time-only read-err@r trying to read a missing option for 1st time after a new install) \n    "+ex );
			try {
				if (DefVal != null){
					this.do_SetPref_plus(_TYPE_PREF, _name, DefVal);
					HCPlusLib.myDumpToConsole("  ...Pref_plus: ["+_name+"]  setted to default-value -> "+DefVal);
				}
			}catch(ex2) {
				HCPlusLib.debugError("do_SetPref_plus( "+_TYPE_PREF+", "+_name+" .) ERROR: "+ex2, ex2);
			}
            return DefVal;
        }
    };
	
    this.gPrefConfig_plus= null;
	this.getConfig_plus = function() {
		if( HCPlusLib.gPrefConfig_plus ){
			return;
		}
		var my_prefService= Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);  
		HCPlusLib.gPrefConfig_plus= my_prefService.getBranch("extensions.hide_caption.");
	};
		
	this.do_GetPref_plus = function(_TYPE_PREF, _name) {
		HCPlusLib.getConfig_plus();
		if( 	 _TYPE_PREF == this.BOOL_PREF 	){ return HCPlusLib.gPrefConfig_plus.getBoolPref(_name);
		}else if(_TYPE_PREF == this.CHAR_PREF 	){ return HCPlusLib.gPrefConfig_plus.getCharPref(_name);
		}else if(_TYPE_PREF == this.INT_PREF  	){ return HCPlusLib.gPrefConfig_plus.getIntPref (_name);
		}else if(_TYPE_PREF == this.UniCHAR_PREF){ return HCPlusLib.HcSingleton.getUniCharPref  (_name, HCPlusLib.gPrefConfig_plus);
		}else{	throw ("ERROR: Bad TYPE_PREF !!: "+_TYPE_PREF );
		}
	};
	this.do_SetPref_plus = function(_TYPE_PREF, _name, _val) {
		function checkType(_typeToCheck){
			if( (typeof _val) != _typeToCheck){
				HCPlusLib.debugError("do_SetPref_plus( "+_TYPE_PREF+", "+_name+", "+_val+"  ["+(typeof _val)+"]  ) IGNORED Error: BAD TYPE of Data !?");
			}
		}
		try {
			//HCPlusLib.myDumpToConsole("BEGIN  do_SetPref_plus( "+_TYPE_PREF+", "+_name+", "+_val+"  ["+(typeof _val)+"]  )"); 
			HCPlusLib.getConfig_plus();
			if(      _TYPE_PREF == this.BOOL_PREF 	){ HCPlusLib.gPrefConfig_plus.setBoolPref(_name, _val); checkType("boolean");
			}else if(_TYPE_PREF == this.CHAR_PREF 	){ HCPlusLib.gPrefConfig_plus.setCharPref(_name, _val); checkType("string" );
			}else if(_TYPE_PREF == this.INT_PREF  	){ HCPlusLib.gPrefConfig_plus.setIntPref (_name, _val); checkType("number" );
			}else if(_TYPE_PREF == this.UniCHAR_PREF){ HCPlusLib.HcSingleton.setUniCharPref  (_name, _val, HCPlusLib.gPrefConfig_plus); checkType("string" );
			}else{	throw ("ERROR: Bad TYPE_PREF !!: "+_TYPE_PREF );
			}
		} catch (ex) {
			HCPlusLib.debugError(" Error in do_SetPref_plus():  name= "+_name+"    value= "+_val + "   typeof=["+(typeof _val)+"]    Error= "+ex);
			throw ex;
		};
	};

	// check back compatibility when using: make sure earlier hctp version will create the option again with an acceptable default value.
	this.clearUserPref = function(_name) {
		HCPlusLib.getConfig_plus();
		return HCPlusLib.gPrefConfig_plus.clearUserPref(_name);
		//deleteBranch()
		//resetBranch(_name)  -->  (NS_ERROR_NOT_IMPLEMENTED) [nsIPrefBranch.resetBranch] - Fx16
	};
	

	this.querySelectorAll_forEach= function( rootElem,  cssString, callbackFunc ){
		
		var theList= rootElem.querySelectorAll(cssString);
		theList= Array.slice(theList);
				
		for(var ix= 0; ix<theList.length; ix++){
			callbackFunc(theList[ix]);
		}
	};

	// ----------------------------------------------------------------------------------------------
	
	this.checkAndNotif_when_smallTabs_changed= function( bEnabled, firstTime, changeObj ){
		
		if( firstTime ){
			HCPlusLib.myDumpToConsole( " >>>  checkAndNotif_when_smallTabs_changed()  firstTime:  startup_reason_ADDON_UPGRADE : "+HCPlusLib.HcSingleton.Bstrap.startup_reason_ADDON_UPGRADE +"" );
			
			if( !bEnabled  ){
				return; // if disabled at addon enable/install, no prob!
			}
			if( HCPlusLib.HcSingleton.Bstrap.startup_reason_APP_STARTUP   ){
				return; //initial value at APP_STARTUP.
			}
			if( HCPlusLib.HcSingleton.Bstrap.startup_reason_ADDON_UPGRADE ){
				return;
			}
		}
		
		if( changeObj.is_shutdown ){ // 'lasttime'  hehe
			HCPlusLib.myDumpToConsole( " >>>  checkAndNotif_when_smallTabs_changed()  is_shutdown:  shutdown_reason_ADDON_UPGRADE: "+HCPlusLib.HcSingleton.Bstrap.shutdown_reason_ADDON_UPGRADE+"" );
			
			if( HCPlusLib.HcSingleton.Bstrap.shutdown_reason_ADDON_UPGRADE ){
				return;
			}
		}

		// TMP addon!
		if( window.Tabmix ){
			
			var notifMsg_code= HCPlusLib.HcSingleton.main_GetStringFromName( bEnabled? "smallTbars_enabled__popupNotif": "smallTbars_disabled_popupNotif" );
			
			setTimeout(function() {
				try {
					if(!HCPlusLib.HcSingleton.notified_tabmix ){
						HCPlusLib.HcSingleton.notified_tabmix= true;
						
						HCPlusLib.popupNotification( notifMsg_code, 
								30000, "hctp_smallTabs", null, null, changeObj.is_shutdown); // SKIP unload-notif at shutdown event!!

						window.focus();
					}
				} catch (ex) {
					HCPlusLib.myDumpToConsole("  ignoring error: "+ex );
				};
			}, changeObj.is_shutdown? 2000: 1000 );
			
			try {
				//TODO: tendría  q  correr esto POR CADA WINDOW!!
				//TODO: .. PERO si corro esto dps el user ya no puede volver tranquilamente a como estaban los tabs... vd?
				
				if(!changeObj.shutdown_done && changeObj.is_shutdown ){
					changeObj.shutdown_done= true;
					
					//window.TabmixTabbar.resetHeight(); // pone height = UN SOLO ROW.  Mejor no pongo este vd??
					
					setTimeout( function(){
						if( window.Tabmix.delayedStartup ){
							HCPlusLib.myDumpToConsole( "    .....  about to execute:   window.Tabmix.delayedStartup(); " );
							
							if( window.Tabmix._buttonsHeight === undefined ){
								window.Tabmix._buttonsHeight= 18;
							}
							window.Tabmix.delayedStartup();
						}else{
							HCPlusLib.myDumpToConsole( "    ..... (err) not found!:   window.Tabmix.delayedStartup " );
						}
					}, 700);
				}
				
			} catch (ex) {
				HCPlusLib.debugError(" Ignored issue when trying to reset Tabmix addon:  "+ex, ex);
			}
		}
	},
	

	// ---   popupNotification   --------------------------------------------------------------------------------
	
	this.popupNotification     = function(        sDescription, iTimeOut, sId, anchor_ID, _mainAction,                  _skip_shutdown ){
		return HCPlusLib.popupNotification_plus(  sDescription, iTimeOut, sId, anchor_ID, _mainAction, { skip_shutdown: _skip_shutdown } );
	};
	this.popupNotification_plus= function(        sDescription, iTimeOut, sId, anchor_ID, _mainAction, _extra_options_arg ){

		const extra_options= _extra_options_arg || { };

		// "\u000A \u000D"
		HCPlusLib.myDumpToConsole( " >>> New popupNotification!: \n  "+sDescription+"" );

		const closeAction= {
				label:     HCPlusLib.HcSingleton.main_GetStringFromName( "popupNotif_close" ),
				accessKey: HCPlusLib.HcSingleton.main_GetStringFromName( "popupNotif_accessKey" ),
				callback: function(){ ; } 
		};
		
		const mainActionButton= _mainAction? _mainAction: closeAction;
		
		const extraActionsArray= mainActionButton.addClose? [closeAction]: null;
		
		const notifHolder= {};
		
		notifHolder.notif= window.PopupNotifications.show( 
				window.gBrowser.selectedBrowser, 
				sId? sId: "hctp_default",
				sDescription, //" This is a sample popup \n\r notif \t for \n\r \t\t  SMALL TABS! 2x "
				anchor_ID, /* anchor ID, eg: "addons-notification-icon"  */
				mainActionButton,
				extraActionsArray,
				/***
		        [{  label: "First secondary option",
		            accessKey: "1",
		            callback: function() {
		              alert("First secondary option selected.");
		            }
		        }],
				 ***/
				{   popupIconURL: "chrome://hidecaptionplus/skin/hcp_icon.png",
					/* timeout: Date.now() + 5000, */
					
					//learnMoreURL: "xxxxx", // usar para mi newversion notice?
					
					//displayOrigin: "http://www.mysite.com", 
					
					persistence: 10,
					persistWhileVisible: true,
					
					eventCallback: function(sState){
						//HCPlusLib.myDumpToConsole('sState='+sState+'  \t      \t  hc_notif_smalltabs===this   >>'+(hc_notif_smalltabs===this) );
						
						var self = this;
						
						function clearTime(){
							if( !!self.timeoutID ) {
								window.clearTimeout(self.timeoutID);
								delete self.timeoutID;
								//HCPlusLib.myDumpToConsole(' timeout cleared! ');
							}
						}
						
						if( sState == "dismissed" ){

							if( iTimeOut ){
								clearTime();

								self.timeoutID = window.setTimeout(function(){
									self.remove();
								}, iTimeOut);
								//HCPlusLib.myDumpToConsole(' timeout setted! ');
							}
							
							if( self.timeout_firstDismiss ){
								window.clearTimeout(self.timeout_firstDismiss);
								self.timeout_firstDismiss= null;
								self.owner.panel.removeAttribute("hctp_timeout_dismiss");
							}
							
						}else if( sState == "removed" ){ // clear timeout in any other case
							clearTime();
							
							if( notifHolder && notifHolder.notif ){
								delete notifHolder.notif;
							}
							
						}else if( sState == "shown" ){
							clearTime();
							
							//honor 'timeout_dismiss' , only for 1st Time!
							//HCPlusLib.myDumpToConsole( "    Notif 'shown' " );
							if(!self.firstDone ){
								self.firstDone= true;

								//HCPlusLib.myDumpToConsole( "    ... FIRST time! " );
								if( extra_options.timeout_dismiss ){
									self.owner.panel.setAttribute("hctp_timeout_dismiss", "true");
									self.timeout_firstDismiss= setTimeout( function(){
										self.timeout_firstDismiss= null;
										
										self.owner._dismiss();
										self.owner.panel.removeAttribute("hctp_timeout_dismiss");

									}, extra_options.timeout_dismiss);			
								}
							}
							
						}else{
							clearTime();
						}
					}
				}
		);
		
		// notifHolder.notif.anchorElement.setAttribute("hctp_active");  // mostrar algo girando lentamente?
		
	    // UNLOADERS ------------------------------
		if( !extra_options.skip_shutdown ){
		    unloaders.push(function() {
		    	if( notifHolder.notif ){
		    		notifHolder.notif.remove();
		    		delete notifHolder.notif;
		    	}
	    	});
		}
		
		return notifHolder.notif;
	};

	// onlyForMe()  , for EVENTS!
	this.onlyForMe= function( event, elem ) {
		function _internal_onlyForMe(){
			switch( event.type ){
				case "popupshowing":  return event.target == elem;  //break;
				default:
					HCPlusLib.myDumpToConsole(   "onlyForMe():  error??  '"+event.type+"'   NOT IMPLEMENTED yet" );
					return false;
			}
		}
		
		const retVal= _internal_onlyForMe();
		if(  !retVal ){
			try {
				HCPlusLib.myDumpToConsole(   "onlyForMe():   '"+event.type+"'  target is OTHER: "+event.target.id );
			} catch (ex) {	HCPlusLib.debugError(" onlyForMe():  Ignoring error: "+ex);	}
		}
		return retVal;
	};
	
	
	//FT (old?) msgs ------------------------------------------------------------------------------------
	
	// this.sMsgConfirm_activate= "(sMsgConfirm_activate)";
	// this.sMsgConfirm_disable=  "(sMsgConfirm_disable)";

	
	this.getComputedStyle_property= function( _elem, _prop){
		try {
			var sty= getComputedStyle( _elem ); // no uso el 2do param (pseudoclass/elem?)
			return sty? sty.getPropertyValue(_prop): null;
		} catch (ex) {	HCPlusLib.debugError(" getComputedStyle_property( ..., "+_prop+"):  Ignoring error: "+ex ); }
		return null;
	};

	
	// DEBUG messages ---------------------------
	
	this.bPrintDebug      = null;
	this.bPrintDebug_audio= null;
	
	this.LoadDebugFlag = function(){
		//plis enable debug in option-dialog too!
		if( HCPlusLib.bPrintDebug === null ){
			HCPlusLib.bPrintDebug=       HCPlusLib.GetPref_plus(HCPlusLib.BOOL_PREF, "plus.print_debug"      , false);
		}
		if( HCPlusLib.bPrintDebug_audio === null ){
			HCPlusLib.bPrintDebug_audio= HCPlusLib.GetPref_plus(HCPlusLib.BOOL_PREF, "plus.print_debug_audio", false);
		}
	};
	
	this.debugError_noAudio = function(aMessage, theException){
		
		var exception_copy= theException;
		if( !theException ){
			
			//TODO lanzar esto SIEMPRE, asi tengo el stack de *donde de hizo catch* del error original + llamada a este metodo tb.
			try{
				throw new Error(""); // to get STACKTRACE!
			}catch(myError){
				exception_copy= myError;
			}
		}
		var exception_title= !!theException? (" \n\r>> "+exception_copy): "";
		var myMessage= "[DEBUG HCPlus]: "+aMessage + (exception_copy? exception_title+" \n\r"+exception_copy.stack: "");
		//this.myDumpToConsole_error( aMessage );
		//setTimeout(function() {	throw new Error("" + myMessage); }, 0); // <-- from console2 page
		Components.utils.reportError( "" + myMessage );
		
		if( theException ){
			setTimeout(function() {	throw theException; }, 5); // <-- from console2 page
			//Components.utils.reportError( theException ); // este NO pq se pierde el stack original.
		}
	};
	this.debugError = function( aMessage, theException){
		this.debugError_noAudio(aMessage, theException);

		if( this.bPrintDebug  ||  this.bPrintDebug_audio ){
			// audio!
			HCPlusLib.play_debugSpecial_audio_Async(); // debugSpecial_audio 
		}
	};
	this.debugErr0r= this.debugError; /* with another name for not catching the word "error" in shutdown funcs */
	
	this.myDumpToConsole_error = function(aMessage){
		if( this.bPrintDebug ){
			//this.consoleServ....logStringMessage( "" + aMessage); //new Date() + ":  "
			//setTimeout(function() { throw new Error("[debug] " + aMessage); }, 0); // <-- from console2 page
			Components.utils.reportError( "[debug] " + aMessage );
		}
	};
	this.myDumpToConsole_noAudio = function(aMessage){
		if( this.bPrintDebug ){
			HCPlusLib.HcSingleton.Bstrap.myDumpToConsole_noAudio_plus( null      , aMessage );
		}
	};
	this.myDumpToConsole         = function(            aMessage){
		if( this.bPrintDebug ){ // REDUNDANT check for PERFORMANCE !!!
			HCPlusLib.myDumpToConsole_plus (null      , aMessage);
		}
	};
	this.myDumpToConsole_plus    = function(moduleWord, aMessage){
		if( this.bPrintDebug ){
			try {
				HCPlusLib.HcSingleton.Bstrap.myDumpToConsole_noAudio_plus( moduleWord, aMessage );
				
				var toBeSearched= (""+aMessage).toLowerCase(); 
				if( toBeSearched.indexOf("error") >= 0 ||
					toBeSearched.indexOf("warn" ) >= 0 || 
					toBeSearched.indexOf("exception" ) >= 0 
					){
					//audio!
					HCPlusLib.play_dumpConsole_audio_Async();  // dumpConsole_audio 

					// print an extra ERROR line in console 
					this.myDumpToConsole_error( "[HCTP error/warn/exception str. detected]: "+aMessage );
				}
			} catch (ex) {
				//window.console.log(Components.stack.formattedStack);
				Components.utils.reportError(ex);
				window.console.trace();
			}
		}
		//xxxComponents.utils.reportError(e); // report the error and continue execution
	};
};

