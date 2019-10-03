
// Based on userChrome.js
// Copyright (c) 2017 Haggai Nuchi
// Available for use under the MIT License:
// https://opensource.org/licenses/MIT


(function(){

  const absolutePath = ""+Components.stack.filename;
  
  try{
	const addonRoot= absolutePath.substring(0, absolutePath.indexOf("defaults/hc_"));

	
	// console.log( " *****************  Services.hhh_loaded: " + Services.hhh_loaded  );
	Services.hhh_loaded= true;

	// block this temporarily!
	// Services.appShell.hiddenDOMWindow.hhh_loaded= 666;

	// console.log( " *****************  hiddenDOMWindow.hhh_loaded: " + Services.appShell.hiddenDOMWindow.hhh_loaded  );
	if(!Services.appShell.hiddenDOMWindow.hhh_loaded ){
		Services.appShell.hiddenDOMWindow.hhh_loaded= true;
		
		
		// SOLO EL PATH, SIN el filename!!!
		var fileRoot = addonRoot.replace("file:///","").replace("jar:","").replace("!/","").replace(/\//gi,"\\");
		fileRoot= decodeURIComponent( fileRoot );
		// console.log( "Preparado especial: " + fileRoot );
		fileRoot = new FileUtils.File( fileRoot );
		Components.manager.addBootstrappedManifestLocation(fileRoot);

		
		var hc_bstrap= Components.utils.import( addonRoot + "bootstrap.js"+"?_rand="+Math.random());

		hc_bstrap.ADDON_UPGRADE=22222;
		hc_bstrap.APP_STARTUP  =11111;

		hc_bstrap.console= window.console;

		hc_bstrap.startup( { /* NO version here */ installPath: fileRoot } );
	}else{
		//
	}
  }catch(ex){
	console.log( "ERROR in hc_userChrome.js: ", ex );
	console.log( "  MY absolutePath: ", absolutePath );
  }

})();

