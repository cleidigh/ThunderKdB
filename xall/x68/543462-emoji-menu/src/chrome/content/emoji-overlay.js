var emoji_menu = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
  },
  
  openPopup: function() {
    //Set focus to the textbox
    document.getElementById("emojiSearchBox").focus();
  },
  
  emojiInsert: function(emoji) {
    try
    {
      //This will create an outer and inner span around the emoji unicode caracter
      //In Thunderbird, extra CSS is added to hide the inner one and add background image to outer one
      var editor = GetCurrentEditor();
      var selection = editor.selection;
      var extElement = editor.createElementWithDefaults("span");

      var intElement = editor.createElementWithDefaults("span");
      if (!intElement)
        return;

      var txt = ""; //Literal text to be added to element
      var e1class = "e1"; //Element class that will assign backgroun image
      var emojiCodes = emoji.split(" ");
      emojiCodes.forEach(function(emojiCode){
        txt += String.fromCodePoint(parseInt(emojiCode, 16));
        if (emojiCode != "200D" && emojiCode != "FE0F")
          e1class += "-" + emojiCode;
      });

      extElement.setAttribute("class", "emojione " + e1class ); //Add classes

      var txtElement =  editor.document.createTextNode(txt);
      if (!txtElement)
        return;

      intElement.appendChild(txtElement);
      extElement.appendChild(intElement);

      //Will remove outer span on deletion of inner text
      extElement.addEventListener("DOMSubtreeModified", function(){
        setTimeout(function(){ //on a timeout to avoid bug that moves selection to beginning
          extElement.parentNode.removeChild(extElement);
        }, 0);
      });

      //Append outer span to editor
      editor.insertElementAtSelection(extElement,true);
      window.content.focus();
    }
    catch (e)
    {
        dump("Exception occured in emoji insert function\n");
    }
  },

  emojiShowHide: function(categoryToShow) {
    //List categories
    var categories = ["People", "Nature", "Food", "Travel", "Activities", "Objects", "Symbols", "Flags", "Search"];

    //Hide all non-selected categories and show the selected category
    categories.forEach(function(category) {
      if (category == categoryToShow) { //show category
        document.getElementById("emojiGrid" + category).setAttribute("hidden","false"); //show

        if (category != "Search") { //Search is excepted due to lack of category button
          document.getElementById("emojiCat" + category).className = "emojiSelectedCategory"; //turn to blue
        }

      } else { //hide category
        document.getElementById("emojiGrid" + category).setAttribute("hidden","true"); //hide
        document.getElementById("emojiCat" + category).className = ""; //turn to black
        document.getElementById("emojiCat" + category).checked = false; //ensure unchecking when Search is selected
      }
      
    });
  },
  
  emojiSearchChange: function(textbox) {
    var searchstring = textbox.value;
    
    if (searchstring.length > 1) { //Only do stuff for string 2 letters or longer
      emoji_menu.emojiShowHide("Search");
      
      //Find emojis that match search
      var emojiButtons = document.getElementsByClassName('emojibutton');
      var emojisFound = Array.prototype.filter.call(emojiButtons, function(emojiButton){
        var emojiDescription = emojiButton.getAttribute("tooltiptext").toLowerCase();
        var emojiTags = emojiButton.getAttribute("tags").toLowerCase();
        return (emojiDescription.indexOf(searchstring.toLowerCase()) > -1 || emojiTags.indexOf(searchstring.toLowerCase()) > -1);
      });
      
      //Populate <rows> with emojis
      var grid = document.getElementById("emojiGridSearch");
      var rows = grid.firstChild;
      rows.innerHTML = ""; //clear previous results
      
      var newrow = document.createElement("row");
      
      for (index = 0; index < emojisFound.length; ++index) {
	
        if (index % 20 == 0 && index > 0) { //row length
          rows.appendChild(newrow);
          var newrow = document.createElement("row");
        }
        
        var foundClone = emojisFound[index].cloneNode(true);
        foundClone.className = ""; //avoid getting re-found
        newrow.appendChild(foundClone);
      }
      
      //Insert text if no emojis were found
      if (emojisFound.length == 0) {
        var noemojis = document.createElement("label");
        noemojis.setAttribute("value", "No emojis were found for '" + searchstring + "'.");
        noemojis.setAttribute("style", "margin: 1em 2em 1em 2em;");
        newrow.appendChild(noemojis);
      }
      
      //Append Emojis
      rows.appendChild(newrow);
    }
    
    return true;
  }
};

window.addEventListener("load", function () { emoji_menu.onLoad(); }, false);