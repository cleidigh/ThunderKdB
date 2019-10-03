if (typeof contacttabs == "undefined") {
  var contacttabs = {};
};

contacttabs.Preferences = new function() {
  var self = this;
  var pub = {};

  self.init = function() {
    self.columnsSets();
    self.disableColumnsSets();
    self.loadSettings();
  }

  self.loadSettings = function() {
    var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
    var versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);

    if(versionComparator.compare(xulAppInfo.version, "14.0") <= 0) {
      document.getElementById("useCotaCardEditorLayoutBox").hidden = true;
    }
    window.removeEventListener("load", self.init, false);
  }

  self.columnsSets = function() {
    var col = document.getElementById("cota-EditorLayoutOneCol").selected;
    var col2 = document.getElementById("cota-EditorLayoutTwoCol").selected;

    document.getElementById("cota-EditorLayoutOneBox").collapsed = !col;
    document.getElementById("cota-EditorLayoutTwoBox").collapsed = col;
    document.getElementById("cota-EditorLayoutTwoBox").collapsed = !col2;
  }

  self.disableColumnsSets = function() {
    var ctEditor = document.getElementById("cota-useCotaCardEditorCheckbox").checked;

    document.getElementById("cota-EditorLayoutRadioGroup").disabled = !ctEditor;
    document.getElementById("cota-EditorLayoutOneLabel").disabled = !ctEditor;
    document.getElementById("cota-EditorLayoutOneWidth").disabled = !ctEditor;
    document.getElementById("cota-EditorLayoutOneSuffix").disabled = !ctEditor;
    document.getElementById("cota-EditorLayoutFirstLabel").disabled = !ctEditor;
    document.getElementById("cota-EditorLayoutFirstWidth").disabled = !ctEditor;
    document.getElementById("cota-EditorLayoutFirstSuffix").disabled = !ctEditor;
    document.getElementById("cota-EditorLayoutSecondLabel").disabled = !ctEditor;
    document.getElementById("cota-EditorLayoutSecondWidth").disabled = !ctEditor;
    document.getElementById("cota-EditorLayoutSecondSuffix").disabled = !ctEditor;
  }
};

window.addEventListener("load",
                        contacttabs.Preferences.init,
                        false);
