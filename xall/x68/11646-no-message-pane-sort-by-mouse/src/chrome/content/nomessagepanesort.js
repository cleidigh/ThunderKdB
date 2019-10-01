if(!org) var org={};
if(!org.janek) org.janek={};

org.janek.nomessagepanesort = new function() {
  // Objekt zum Zugriff auf die Logkonsole.
  var consoleService =
    Components.classes["@mozilla.org/consoleservice;1"]
              .getService(Components.interfaces.nsIConsoleService);

  // Objekt zum Zugriff auf Preferencen
  var prefs = null;

  var pub = {};

  //
  // Logging
  //
  var log = function(msg){
    consoleService.logStringMessage("nomessagepanesort: " + msg);
  };

  //
  // Initialisiere das Addin
  //
  pub.init = function() {
    var threadPaneBox = document.getElementById('threadPaneBox');

    // Registriere den Eventhandler für Mausclicks an der Threadpane
    threadPaneBox.addEventListener('click', pub.columnClick, true);

    // Register to receive notifications of preference changes
    prefs = Services.prefs.getBranch('extensions.nomessagepanesort.');

    pub.syncToggleActiveMenuItemToPref();
  };


  //
  // Eventhandler für Mausclicks.
  //
  // Wenn das Addin vom Nutzer aktiviert ist, werden Klicks auf die Header
  // der Message Pane verschluckt und damit ignoriert.
  //
  pub.columnClick = function(event) {
    var active = prefs.getBoolPref("active");

    // Verarbeite Events nur dann, wenn der Nutzer das Addin aktiviert hat
    if (active) {
      var target = event.originalTarget;

      // Das Klickevent wird verschluckt, wenn auf den treecol-Header
      // geklickt wurde. Ein Ctrl-Klick wird jedoch _nicht_
      // verschluckt, um einfaches Sortieren zu ermöglichen.
      if(target.localName == "treecol" &&
         (event.ctrlKey == false &&
          event.altKey == false &&
          event.metaKey == false)) {
        event.stopPropagation();
      }
    }
  };

  //
  // Aktiviere/Deaktiviere das Addin über eine Pref
  //
  pub.toggleActive = function() {
    var active = prefs.getBoolPref("active");
    var menuItem = document.getElementById('toggleNoMessagePaneSortMenuItem');

    // Speichere den neuen Zustand in den Preferences.
    prefs.setBoolPref("active", !active);

    // Synchronisiere das Menü mit dem aktuellen Wert der pref
    pub.syncToggleActiveMenuItemToPref();
  }

  //
  // Wertet die Pref aus und setzt das checked-Attribut des
  // Menüeintrages entsprechend
  //
  // Der Menüeintrag ist aktiviert, wenn die Sortierung per Mausklick
  // erlaubt sein soll
  //
  pub.syncToggleActiveMenuItemToPref = function() {
    // Ermittele den aktuellen Wert der pref
    var active = prefs.getBoolPref("active");

    // Ermittele das menuitem
    var menuItem = document.getElementById('toggleNoMessagePaneSortMenuItem');

    // Setze das checked-Attribute entsprechend zum Wert der pref
    menuItem.setAttribute("checked", !active);

    // Wenn das Addin nicht aktiviert ist, entferne das checked-Attribut
    if(active)
      {
        menuItem.removeAttribute("checked");
      }
  }

  pub.observe = function(subject, topic, data)
   {
     if (topic != "nsPref:changed")
       {
         return;
       }

    // Synchronisiere das Menü mit dem aktuellen Wert der pref
    pub.syncToggleActiveMenuItemToPref();
   }

  return pub;
};


// Initialize add-on
window.addEventListener(
  "load",
  org.janek.nomessagepanesort.init,
  false);
