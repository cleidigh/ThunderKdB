/* eslint-disable object-shorthand */
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("myphoneexplorer@fjsoft.at");
var { mpe } = ChromeUtils.import(extension.rootURI.resolve("modules/mpe.jsm"));

// This is the important part. It implements the functions and events defined in schema.json.
// The variable must have the same name you've been using so far, "MyPhoneExplorer" in this case.
var MyPhoneExplorer = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
	  var debugMode = false;
	  console.log("Loading Experiment");
      mpe.test();
  
  context.callOnClose({close(){
	//console.log("Goodbye world!");
	Cu.unload(extension.rootURI.resolve("modules/mpe.jsm"));
	Services.obs.notifyObservers(null, "startupcache-invalidate", null);
  }});

    return {
      // Again, this key must have the same name.
      MyPhoneExplorer: {
		  
		HandleCommand: function(command)
		{	
				var res = "";
				var chosen;
				var data = "";
	
				if(command == null) {return;}
	
				
				var i = command.indexOf("\r\n");
				if(i >= 0) {
					data = command.substring(i+2);
					command = command.substring(0,i);
				}	
	
				i = command.indexOf('=');
				if(i >= 0) {
					chosen = command.substring(i+1);
					command = command.substring(0,i);
				}
				
				if (debugMode){console.log("command=" + command);}
				
				try{
					if(command == 'debug') {
						mpe.setDebugMode(true);
						debugMode = true;
						return;
					}
					else if(command == 'version' || command == 'info' || command == 'list-info') {
						res = mpe.ListInfo();
					} 
					else if(command == 'list-abooks' || command == 'list-addressbooks') {
						res = mpe.ListABooks((data.indexOf("includeCardbook") != -1));
					}
					else if(command == 'refresh-cardbook') {
						res = mpe.RefreshCardbook();
					}
					else if(command == 'export-cards') {
						res = mpe.WriteCards(chosen ? chosen : mpe.ChosenABook);
					}
					else if(command == 'export-vcards') {
						mpe.WriteVcards(chosen ? chosen : mpe.ChosenABook);
						return;
					}
					else if(command == 'import-cards') {
						mpe.ReadCards(chosen ? chosen : mpe.ChosenABook, data);
					}
					else if(command == 'add-card') {
						res = mpe.AddCard(data);
					}
					else if(command == 'edit-card') {
						res = mpe.EditCard(data);
					}
					else if(command == 'delete-card') {
						res = mpe.DeleteCard(data);
					}
					else if(command == 'list-cals' || command == 'list-calendars') {
						res = mpe.ListCalendars();
					}
					else if(command == 'export-items') {
						var export_items_aac = {
							AsyncActionComplete: function(success) {
								if(success){
									//
								}
							}
						};
		
						mpe.WriteItems(chosen ? chosen : mpe.ChosenCalendar, export_items_aac);
						return;
					}
					else if(command == 'import-items') {
						var import_items_aac = {
							AsyncActionComplete: function(success) {
								if(success){
									//
								}
							}
						};
		
						mpe.ReadItems(chosen ? chosen : mpe.ChosenCalendar,data,import_items_aac);
						return;
					}
					else if(command == 'add-item') {
						mpe.AddItem(data);
						return;
					}
					else if(command == 'edit-item') {
						mpe.EditItem(data);
						return;
					}
					else if(command == 'delete-item') {
						mpe.DeleteItem(data);
						return;
					}
					else {
						throw new Error("Unknown suboption -mpe " + command);
					}
				}catch(e){
					if (e.message != null || e.stack != null){
						res = e.message + "\r\n" + e.stack;
					}else{
						res = e;
					}
					console.error(res);
					command = command + " error";
				}

				
				var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
				observerService.notifyObservers( null,"MyPhoneExplorer_commandResult","result " + command + "\r\n" + res);
		},
		
		onCommandResult: new ExtensionCommon.EventManager({
          context,
          name: "MyPhoneExplorer.onCommandResult",
          register(fire) {
            function myResultObserver()
			{
			  this.register();
			}
			myResultObserver.prototype = {
			  observe: function(subject, topic, data) {
				 fire.async(data);
			  },
			  register: function() {
				var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
				observerService.addObserver(this, "MyPhoneExplorer_commandResult", false);
			  },
			  unregister: function() {
				var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
				observerService.removeObserver(this, "MyPhoneExplorer_commandResult");
			  }
			}
			
			var obs = new myResultObserver();
			
            return function() {
              obs.unregister();
            };
          },
        }).api(),
      },
    };
  }

};