/*this.gABS.*/showActivityEvent(0, mabName+' uploaded to local');


function showActivityEvent(type, text) {
  //type=0 success, type=1: error
    //see ...source\mail\components\activity\nsIActivity.idl
    let gActivityManager = Components.classes["@mozilla.org/activity-manager;1"]
                  .getService(Components.interfaces.nsIActivityManager);
    let event = Components.classes["@mozilla.org/activity-event;1"]
                  .createInstance(Components.interfaces.nsIActivityEvent);
    let act=event.QueryInterface(Components.interfaces.nsIActivity);
    event.init(text,  //should be localized
               null,  //initiator (nsIVariant)
               "No junk found", //additional (smaller) text
               Date.now()-3600000,        // start time (wird nicht gezeigt)
               Date.now()         // completion time
          );
    event.contextType = 'Addressbook'; // optional, ???
    event.contextDisplayText = 'abs'; // optional, Steht oberhalb des eigentlichen Events
    event.contextObj = this.gABS.directory;   // optional
    event.iconClass="syncMail"; //see mail/themes/<themename>/mail/activity/activity.css
    //act.displayText="dummy";    //readonly
    event.groupingStyle=Components.interfaces.nsIActivity.GROUPING_STYLE_BYCONTEXT;
    gActivityManager.addActivity(event);
}
