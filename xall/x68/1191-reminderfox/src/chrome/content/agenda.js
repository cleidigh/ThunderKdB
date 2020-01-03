// agenda.js    gW  2019-12-14

if (!gN_agenda)     var gN_agenda = {};

// Get the location of the xsl templates
gN_agenda.prntPath = function(){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    let prnt = reminderfox.util.ProfD_extend('reminderfox')
    prnt.append("printing");
    return prnt;
};

// +++++++++++ Agenda / Printing ++++++++++++++++
/**
 *  Convert reminders to a XML model for XSLT post-processing
 *   Called from XUL like this:
 *    <menuitem id="agendaXML1" class="printXMLsystem"
 *       label="&rf.add.reminders.context.print.all;"
 *       value="eventsAll" oncommand="gN_agenda.xmlPrint(this);" />
 */
gN_agenda.xmlPrint = function(printMode) {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // make sure the printing files are de-zipped
  let aZipDir = "chrome/content/defaults/"
  rmFx_extractXPI(aZipDir)

  let xslFile = "Agenda";
  if (printMode == null) xslFile = "Agenda"
  if (printMode == 'eventsAll') xslFile = "Events(All)"
  if (printMode == 'eventsSelected') xslFile = "Events(Selected)"
  if (printMode == 'install') xslFile = "Installation_Details"
  if (printMode == 'example') xslFile = "template[Example]"

  let xslDoc = gN_agenda.prntPath();
  xslDoc.append(xslFile + ".xsl");

  let isReminder = reminderfox_isReminderTabSelected() ? true : false;

  let parser = new DOMParser()
  var xmlDoc  = parser.parseFromString('<?xml version="1.0" encoding="utf-8"?><general></general>', "application/xml")

  let generalElem = xmlDoc.getElementsByTagName("general")[0];

  let attrElem = xmlDoc.createElement('remindertype');
  attrElem.textContent = isReminder ? "reminder" : "todo's";
  generalElem.appendChild(attrElem);

  attrElem = xmlDoc.createElement('remindertitle');
  attrElem.textContent = reminderfox.tabInfo.tabName;
  generalElem.appendChild(attrElem);

  let cDate = new Date();
  attrElem = xmlDoc.createElement('date');
  attrElem.textContent = cDate.toLocaleDateString();
  generalElem.appendChild(attrElem);

  attrElem = xmlDoc.createElement('time');
  attrElem.textContent = cDate.toLocaleTimeString();
  generalElem.appendChild(attrElem);

  attrElem = xmlDoc.createElement('version');
  attrElem.textContent = "Reminderfox vers." +
    reminderfox.consts.MIGRATED_PREF_VERSION
  generalElem.appendChild(attrElem);

  attrElem = xmlDoc.createElement('template');
  attrElem.textContent = xslDoc.path;
  generalElem.appendChild(attrElem);

  attrElem = xmlDoc.createElement('xlsName');
  attrElem.textContent = xslFile;
  generalElem.appendChild(attrElem);

  attrElem = xmlDoc.createElement('app');
  attrElem.textContent = navigator.userAgent + " (" + navigator.language + ")";
  generalElem.appendChild(attrElem);

  let xmlReminders = document.implementation.createDocument("", "", null);
  let remindersElem = xmlReminders.createElement("reminders");


  let remindersUpcoming = null;
  let remindersToday = null;
  let todaysAndUpcomingReminders;
  let todos = "";
  let lists = ""; // XXX tdb


  //--- Agenda ----------------------
  if (xslFile == 'Agenda') {
    todaysAndUpcomingReminders = reminderfox.overlay.getTodaysAndUpcomingReminders();

    remindersToday = todaysAndUpcomingReminders.today || "";  // make sure it's not empty with "no today reminders"
    agendaElement('today', remindersToday, remindersElem);

    remindersUpcoming = todaysAndUpcomingReminders.upcoming || "";
    agendaElement('upcoming', remindersUpcoming, remindersElem);

    todos = reminderfox.overlay.getVisibleTodos()[reminderfox.consts.DEFAULT_TODOS_CATEGORY] || "";
    agendaElement('todos', todos, remindersElem);
  }  //--- Agenda ----------------------

  else {
  // ---  view & print from  'List' ---------------
    let treeitems, treeLength, indices, row;

    if (xslFile == 'Events(Selected)') {
      // collect the selected row(s) on the List
      if (isReminder) {
        treeitems = document.getElementById("treechildren").childNodes;
        indices = getAllSelectedReminderIndices();
      } else {
        treeitems = document.getElementById("todo_treechildren").childNodes;
        indices = getAllSelectedTodoIndices();
      }

      for (let i = 0; i < indices.length; i++) {
        row = treeitems[indices[i]].childNodes[0];
        buildRow(isReminder, row, remindersElem);
      }

    } else { // Events(All)
      if (isReminder) {
        treeitems = document.getElementById("treechildren").childNodes;
      } else {
        treeitems = document.getElementById("todo_treechildren").childNodes;
      }

      treeLength = treeitems.length;
      for (var i = 0; i < treeLength; i++) {
        row = treeitems[i].childNodes[0];
        buildRow(isReminder, row, remindersElem);
      }
    }
  } // --- view & print from 'List' -------------



  function buildRow(isReminder, row, remindersElem) {
    let attribute, attrValue, attrElem;
    let dateString, shortDay, timeString;

    let id = row.getAttribute("idRef");

    let thisEvent;
    if (isReminder) thisEvent = reminderfox.core.getRemindersById(id);
    if (!isReminder) thisEvent = reminderfox.core.getSpecificTodoById(id);

    let dateRef = row.getAttribute("dateRef");
    let actualDate = new Date(parseInt(dateRef));
    let actualSummary = row.childNodes[1].getAttribute("label");


    let eventElem = xmlReminders.createElement("event");
    let allDayEvent = false;
    let durationTime = 0;

    for (attribute in thisEvent) {
      attrValue = thisEvent[attribute];

      if (thisEvent[attribute] instanceof Date) {
        if (!((attribute == 'endDate') && (allDayEvent == true))) {
          dateTime = attrValue.getTime()

          switch (attribute) {
            case 'date':
              dateString = reminderfox.date.getDateVariableString(thisEvent, actualDate);
              shortDay = reminderfox.date.getDateVariable(thisEvent, actualDate, "[shortDay]");
              timeString = reminderfox.date.getDateVariable(thisEvent, actualDate, "[time]");
              dateRef = actualDate.getTime();
              break;

            case 'endDate':
              actualDate = new Date(+dateRef + +durationTime);
              dateString = reminderfox.date.getDateVariableString(thisEvent, actualDate);
              shortDay = reminderfox.date.getDateVariable(thisEvent, actualDate, "[shortDay]");
              timeString = reminderfox.date.getDateVariable(thisEvent, actualDate, "[time]");
              dateRef = actualDate.getTime();
              break;

            default:
              dateString = reminderfox.date.getDateVariableString(thisEvent, attrValue);
              timeString = reminderfox.date.getDateVariable(thisEvent, attrValue, "[time]");
              shortDay = reminderfox.date.getDateVariable(thisEvent, attrValue, "[shortDay]");
              dateRef = actualDate.getTime();
          }

          attrElem = xmlReminders.createElement(attribute);
          attrElem.textContent = dateString;
          eventElem.appendChild(attrElem);

          attrElem = xmlReminders.createElement(attribute + "_time");
          attrElem.textContent = ((timeString != "") ? timeString : " ");
          eventElem.appendChild(attrElem);

          attrElem = xmlReminders.createElement(attribute + "_shortDay");
          attrElem.textContent = shortDay;
          eventElem.appendChild(attrElem);

          attrElem = xmlReminders.createElement(attribute + "_ref");
          attrElem.textContent = dateRef;
          eventElem.appendChild(attrElem);
        }
      } else {

        switch (attribute) {
          case "priority":
            if (attrValue == "1") attrValue = "I"
            break;
          case "allDayEvent":
            if (attrValue == true) allDayEvent = true;
            break;
          case "durationTime":
            durationTime = attrValue;
            if (attrValue > 86400000) // 24 * 60 * 60 * 1000 = 1 day in ms
              allDayEvent = false;
            break;
          case "messageID":
            if (attrValue != null) // no mail message Id ?
              attrValue = "M";
            break;
        }
        attrElem = xmlReminders.createElement(attribute);
        if (attribute == 'summary') {
          attrElem.textContent = actualSummary;
        } else if (attribute == 'notes') {
          //gW_XXX   how about only printing x lines of Notes?
          attrElem.textContent = attrValue;
        } else {
          attrElem.textContent = attrValue;
        }
        eventElem.appendChild(attrElem);
      }
    }
    remindersElem.appendChild(eventElem);
  }


  function agendaElement(type, events, agendaElem) {
    let attribute, attrValue, attrElem;

    let dateString, dateTime, shortDay, timeString, dateRef, actualDate;
    let actualSummary, allDayEvent, durationTime
    let thisEvent, id, eventElem;

    for (var i = 0; i < events.length; i++) {
      thisEvent = events[i];
      id = thisEvent.id;

      dateRef = thisEvent.date;
      actualDate = dateRef;
      actualSummary = thisEvent.summary;

      eventElem = xmlReminders.createElement(type);
      allDayEvent = false;
      durationTime = 0;

      for (attribute in thisEvent) {
        attrValue = thisEvent[attribute];

        if (thisEvent[attribute] instanceof Date) {
          if (!((attribute == 'endDate') && (allDayEvent == true))) {
            dateTime = attrValue.getTime()

            switch (attribute) {
              case 'date':
                dateString = reminderfox.date.getDateVariableString(thisEvent, actualDate);
                shortDay = reminderfox.date.getDateVariable(thisEvent, actualDate, "[shortDay]");
                timeString = reminderfox.date.getDateVariable(thisEvent, actualDate, "[time]");
                dateRef = actualDate.getTime();
                break;

              case 'endDate':
                actualDate = new Date(+dateRef + +durationTime);
                dateString = reminderfox.date.getDateVariableString(thisEvent, actualDate);
                shortDay = reminderfox.date.getDateVariable(thisEvent, actualDate, "[shortDay]");
                timeString = reminderfox.date.getDateVariable(thisEvent, actualDate, "[time]");
                dateRef = actualDate.getTime();
                break;

              default:
                dateString = reminderfox.date.getDateVariableString(thisEvent, attrValue);
                timeString = reminderfox.date.getDateVariable(thisEvent, attrValue, "[time]");
                shortDay = reminderfox.date.getDateVariable(thisEvent, attrValue, "[shortDay]");
                dateRef = actualDate.getTime();
            }

            attrElem = xmlReminders.createElement(attribute);
            attrElem.textContent = dateString;
            eventElem.appendChild(attrElem);

            attrElem = xmlReminders.createElement(attribute + "_time");
            attrElem.textContent = ((timeString != "") ? timeString : " ");
            eventElem.appendChild(attrElem);

            attrElem = xmlReminders.createElement(attribute + "_shortDay");
            attrElem.textContent = shortDay;
            eventElem.appendChild(attrElem);

            attrElem = xmlReminders.createElement(attribute + "_ref");
            attrElem.textContent = dateRef;
            eventElem.appendChild(attrElem);
          }
        } else {

          switch (attribute) {
            case "priority":
              if (attrValue == "1") attrValue = "I"
              break;
            case "allDayEvent":
              if (attrValue == true) allDayEvent = true;
              break;
            case "durationTime":
              durationTime = attrValue;
              if (attrValue > 86400000) // 24 * 60 * 60 * 1000 = 1 day in ms
                allDayEvent = false;
              break;
            case "messageID":
              if (attrValue != null) // no mail message Id ?
                attrValue = "M";
              break;
          }

          attrElem = xmlReminders.createElement(attribute);
          if (attribute == 'summary') {
            attrElem.textContent = actualSummary;
          } else {
            attrElem.textContent = attrValue;
          }
          eventElem.appendChild(attrElem);
        }
      }
      agendaElem.appendChild(eventElem);
    }
  };

  generalElem.appendChild(remindersElem);
  generalElem.appendChild(gN_agenda.createLocale(xmlReminders));

  let htmlDoc = gN_agenda.prntPath().path + "/viewPrint.htm";
  gN_agenda.xml2HTML(xmlDoc, xslDoc, htmlDoc);
}

/**
 *  Generate a HTML doc transforming XML with XSLT
 *  @parm xmlDoc  xml definition
 *  @parm xslDoc  file holding xsl definition
 *  @parm htmlDoc Path to resulting html file
*/
gN_agenda.xml2HTML= function (xmlDoc, xslDoc, htmlDoc) {
  let getX = "file://" + xslDoc.path   // the selected xsl file
  reminderfox.promiseRequest.get(getX, 'xml')
    .then(function(xFile) {
      let xsltProcessor = new XSLTProcessor();
      xsltProcessor.importStylesheet(xFile);
      let resultDoc = xsltProcessor.transformToFragment(xmlDoc,document);

      let file = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      file.initWithPath(htmlDoc);
      if (file.exists() == false) {
        file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
      }

      let htmlDocu = "<!DOCTYPE html><html>" + resultDoc.childNodes[0].innerHTML + "</html>";
      reminderfox.core.writeStringToFile(htmlDocu, file, true/*isExport*/);
      reminderfox.util.openURL("file://" + htmlDoc);
    });
}


// add elements for 'locale' output
gN_agenda.createLocale= function (xmlReminders) {
  let attrElem;
  let localeElem = xmlReminders.createElement("locale");

  let localeStrings = {
    "title": "rf.printing.title",
    "summary": "rf.html.heading.description",
    "allDayEvent": "rf.add.time.allday",

    "date": 'rf.html.heading.date',
    "date_time": "rf.html.heading.time",
    "completedDate": "rf.add.reminders.tooltip.dateCompleted",

    "date_shortDay": "rf.printing.date_shortDay",
    "date_ref": "rf.printing.date_ref",
    "endDate": "rf.printing.endDate",
    "endDate_time": "rf.printing.endDate_time",
    "endDate_shortDay": "rf.printing.endDate_shortDay",
    "endDate_ref": "rf.printing.endDate_ref",
    "durationTime": "rf.printing.durationTime",

    "priority": "rf.add.mail.message.priority.label",
    "categories": 'rf.add.reminders.tooltip.categories',
    "notes": "rf.add.mail.message.notes",
    "alarm": "rf.reminderoptions.alarm",

    "url": 'rf.add.reminders.tooltip.url',
    "location": "rf.add.reminders.tooltip.locaton",

    "todays": 'rf.printing.todays',
    "upcomings": 'rf.printing.upcomings',
    "todaysAndUpcomings": 'rf.printing.todaysAndUpcomings',
    "reminders": 'rf.printing.reminders',
    "todos": 'rf.printing.todos',
    "lists": 'rf.printing.lists'
  };

  for (let x in localeStrings) {
    attrElem = xmlReminders.createElement(x);
    attrElem.textContent = reminderfox.string(localeStrings[x]);
    localeElem.appendChild(attrElem);
  }
  return localeElem;
}
