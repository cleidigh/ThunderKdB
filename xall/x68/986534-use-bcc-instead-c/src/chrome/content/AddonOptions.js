UseBccInsteadC.UseBccInsteadCPrefs =
{
  inEditCount: false,

  onLoad: function()
  {
    // remove to avoid duplicate initialization
    removeEventListener("load", UseBccInsteadC.UseBccInsteadCPrefs.onLoad, true);
  
    var widget = document.getElementById("maxCount");
    widget.value = UseBccInsteadC.UseBccInsteadCUtil.getIntPref("extensions.usebccinsteadC.nonBccCount", 10);

    widget = document.getElementById("defaultNewMsgMode");
    widget.selectedIndex = UseBccInsteadC.UseBccInsteadCUtil.getIntPref("extensions.usebccinsteadC.defaultNewMsgMode", -1) + 1;

    // DR: Prefs no longer set automatically in xul prefpane
    widget = document.getElementById("forceBccCheckbox");
    widget.checked = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.forceBcc");
    widget.focus();

    widget = document.getElementById("force");
    widget.checked = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.forceNoSend");

    widget = document.getElementById("play");
    widget.checked = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.playSound");

    widget = document.getElementById("enableChangeAllRecipients");
    widget.checked = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("extensions.usebccinsteadC.enableChangeAll");

    widget = document.getElementById("addUndisclosedRecipients");
    widget.checked = UseBccInsteadC.UseBccInsteadCUtil.getBoolPref("mail.compose.add_undisclosed_recipients");
    
    // DR: Because xul prefpane > onpaneload does not work now
    UseBccInsteadC.UseBccInsteadCPrefs.toggle(true) 
    
    // DR: ondialog removed in TB68 so add listener here:    
    document.addEventListener("dialogextra1", function(event) {
      UseBccInsteadC.UseBccInsteadCPrefs.showHelpWindow(), 
      event.preventDefault(); // Prevent the dialog closing.
    });
    
  },

  validateCount: function()
  {
    if(UseBccInsteadC.UseBccInsteadCPrefs.inEditCount)
    {
      return false;
    }

    UseBccInsteadC.UseBccInsteadCPrefs.inEditCount = true;
    var widget = document.getElementById("maxCount");
    var s = widget.value;
    var re = /^\d+$/;
    var count = parseInt(s, 10);
    var result = false;

    if((null == s.match(re)) || (isNaN(count)) || (count < 0))
    {
      alert(UseBccInsteadC.UseBccInsteadCUtil.getLocalizedString("options.countError"));
      widget.focus();
      result = false;
    }
    else
    {
      UseBccInsteadC.UseBccInsteadCUtil.setIntPref("extensions.usebccinsteadC.nonBccCount", count);
      result = true;
    }

    UseBccInsteadC.UseBccInsteadCPrefs.inEditCount = false;
    return result;
  },

  updateNewMsgMode: function()
  {
    var widget = document.getElementById("defaultNewMsgMode");
    UseBccInsteadC.UseBccInsteadCUtil.setIntPref("extensions.usebccinsteadC.defaultNewMsgMode", widget.selectedItem.value);
  },

  toggle: function(onInit)
  //DR: Included the other labels
  //DR: Don't know why this was ever called with init=false before  
  {
    var checked = document.getElementById("forceBccCheckbox").checked;
    var maxCountLabel = document.getElementById("maxCountLabel");
    var maxCount = document.getElementById("maxCount");
    var force = document.getElementById("force");
    var forceLabel = document.getElementById("forceLabel");
    var play = document.getElementById("play");
    var playLabel = document.getElementById("playLabel");    

    // seems we are called before the value is actually changed except on initial display
    if(!checked)
    {
      (onInit) ? maxCountLabel.disabled = false : maxCountLabel.disabled = true;
      (onInit) ? maxCount.disabled = false : maxCount.disabled = true;
      (onInit) ? force.disabled = false : force.disabled = true;
      (onInit) ? forceLabel.disabled = false : forceLabel.disabled = true;      
      (onInit) ? play.disabled = false : play.disabled = true;
      (onInit) ? playLabel.disabled = false : playLabel.disabled = true;      
    }
    else
    {
      (onInit) ? maxCountLabel.disabled = true : maxCountLabel.disabled = false;
      (onInit) ? maxCount.disabled = true : maxCount.disabled = false;
      (onInit) ? force.disabled = true : force.disabled = false;
      (onInit) ? forceLabel.disabled = true : forceLabel.disabled = false;      
      (onInit) ? play.disabled = true : play.disabled = false;
      (onInit) ? playLabel.disabled = true : playLabel.disabled = false;     
    }
  },
  
  //DR: New fn to replace automatic storing of preference checkboxes  
  setCheckboxPref: function(pref, state)
  {
    UseBccInsteadC.UseBccInsteadCUtil.setBoolPref(pref, state);
    if (pref == "extensions.usebccinsteadC.forceBcc") {
      UseBccInsteadC.UseBccInsteadCPrefs.toggle(true)
    }  
  },

  showHelpWindow: function()
  {
    window.open("chrome://usebccinsteadC/content/Help.xul", "", "chrome,width=600,height=300,resizable,centerscreen");
  }
}

window.addEventListener("load", UseBccInsteadC.UseBccInsteadCPrefs.onLoad, true);
