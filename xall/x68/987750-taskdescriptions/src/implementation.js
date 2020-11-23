var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);
    return {
      myapi: {
        descTask: function(id, property, value) {
          ExtensionSupport.registerWindowListener("TaskDescription", {
            chromeURLs: [
              "chrome://calendar/content/calendar-event-dialog.xhtml"
            ],
            onLoadWindow(window) {

              var toolbarButton = window.document.createXULElement("toolbarbutton");
              toolbarButton.setAttribute("id", "task-descriptions");
              toolbarButton.setAttribute("class", "cal-event-toolbarbutton toolbarbutton-1");
              toolbarButton.setAttribute("mode", "dialog");
              toolbarButton.setAttribute("label", "TaskDescriptions");
              toolbarButton.setAttribute("type", "menu");
              toolbarButton.style["list-style-image"] = "url(" + context.extension.getURL("desc16.png") + ")";

              var menuPopup = window.document.createXULElement(
                  "menupopup"
              );
              menuPopup.setAttribute("id", "menu-popup");
              menuPopup.setAttribute("type", "popup");

              var menu1 = window.document.createXULElement(
                  "menu"
              );
              menu1.setAttribute("id", "one");
              menu1.setAttribute("label", "Screen color");

              var menuPopup1 = window.document.createXULElement(
                  "menupopup"
              );
              menuPopup1.setAttribute("id", "oneOne");
              menuPopup1.setAttribute("type", "popup");

              var menuitem1 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem1.setAttribute("id", "oneOneOne");
              menuitem1.setAttribute("label", "Dark screen");
              menuitem1.addEventListener("click", funcOneOneOne);
              function funcOneOneOne() {
                  window.frames[0].document.activeElement.style.backgroundColor = '#303030';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.backgroundColor = '#303030';
              };

              var menuitem2 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem2.setAttribute("id", "oneOneTwo");
              menuitem2.setAttribute("label", "Grey screen");
              menuitem2.addEventListener("click", funcOneOneTwo);
              function funcOneOneTwo() {
                  window.frames[0].document.activeElement.style.backgroundColor = '#808080';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.backgroundColor = '#808080';
              };

              var menuitem3 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem3.setAttribute("id", "oneOneThree");
              menuitem3.setAttribute("label", "Light screen");
              menuitem3.addEventListener("click", funcOneOneThree);
              function funcOneOneThree() {
                  window.frames[0].document.activeElement.style.backgroundColor = '#F1F1F1';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.backgroundColor = '#F1F1F1';
              };

              var menuitem4 = window.document.createXULElement(
                  "menuitem"
              );

              menuitem4.setAttribute("id", "oneOneFour");
              menuitem4.setAttribute("label", "Khaki screen");
              menuitem4.addEventListener("click", funcOneOneFour);
              function funcOneOneFour() {
                  window.frames[0].document.activeElement.style.backgroundColor = '#F0E68C';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.backgroundColor = '#F0E68C';
              };

              var menuitem5 = window.document.createXULElement(
                  "menuitem"
              );

              menuitem5.setAttribute("id", "oneOneFive");
              menuitem5.setAttribute("label", "White screen");
              menuitem5.addEventListener("click", funcOneOneFive);
              function funcOneOneFive() {
                  window.frames[0].document.activeElement.style.backgroundColor = '#FFFFFF';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.backgroundColor = '#FFFFFF';
              };

              
              
              var menu2 = window.document.createXULElement(
                  "menu"
              );
              menu2.setAttribute("id", "two");
              menu2.setAttribute("label", "Font color");
              var menuPopup2 = window.document.createXULElement(
                  "menupopup"
              );
              menuPopup2.setAttribute("id", "twoOne");
              menuPopup2.setAttribute("type", "popup");

              var menuitem6 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem6.setAttribute("id", "twoOneOne");
              menuitem6.setAttribute("label", "Black font");
              menuitem6.addEventListener("click", funcTwoOneOne);
              function funcTwoOneOne() {
                  window.frames[0].document.activeElement.style.color = 'black';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.color = 'black';
              };

              var menuitem7 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem7.setAttribute("id", "twoOneTwo");
              menuitem7.setAttribute("label", "Blue font");
              menuitem7.addEventListener("click", funcTwoOneTwo);
              function funcTwoOneTwo() {
                  window.frames[0].document.activeElement.style.color = 'blue';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.color = 'blue';
              };

              var menuitem8 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem8.setAttribute("id", "twoOneThree");
              menuitem8.setAttribute("label", "Green font");
              menuitem8.addEventListener("click", funcTwoOneThree);
              function funcTwoOneThree() {
                  window.frames[0].document.activeElement.style.color = 'green';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.color = 'green';
              };

              var menuitem9 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem9.setAttribute("id", "twoOneFour");
              menuitem9.setAttribute("label", "Red font");
              menuitem9.addEventListener("click", funcTwoOneFour);
              function funcTwoOneFour() {
                  window.frames[0].document.activeElement.style.color = 'red';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.color = 'red';
              };

              var menuitem10 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem10.setAttribute("id", "twoOneFive");
              menuitem10.setAttribute("label", "White font");
              menuitem10.addEventListener("click", funcTwoOneFive);
              function funcTwoOneFive() {
                  window.frames[0].document.activeElement.style.color = 'white';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.color = 'white';
              };



              var menu3 = window.document.createXULElement(
                  "menu"
              );
              menu3.setAttribute("id", "three");
              menu3.setAttribute("label", "Font family");
              var menuPopup3 = window.document.createXULElement(
                  "menupopup"
              );
              menuPopup3.setAttribute("id", "threeOne");
              menuPopup3.setAttribute("type", "popup");

              var menuitem11 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem11.setAttribute("id", "threeOneOne");
              menuitem11.setAttribute("label", "Font serif");
              menuitem11.addEventListener("click", funcThreeOneOne);
              function funcThreeOneOne() {
                  window.frames[0].document.activeElement.style.fontFamily = 'serif';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontFamily = 'serif';
              };

              var menuitem12 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem12.setAttribute("id", "threeOneTwo");
              menuitem12.setAttribute("label", "Font sans-serif");
              menuitem12.addEventListener("click", funcThreeOneTwo);
              function funcThreeOneTwo() {
                  window.frames[0].document.activeElement.style.fontFamily = 'sans-serif';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontFamily = 'sans-serif';
              };



              var menu4 = window.document.createXULElement(
                  "menu"
              );
              menu4.setAttribute("id", "four");
              menu4.setAttribute("label", "Font Weight");
              var menuPopup4 = window.document.createXULElement(
                  "menupopup"
              );
              menuPopup4.setAttribute("id", "fourOne");
              menuPopup4.setAttribute("type", "popup");

              var menuitem13 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem13.setAttribute("id", "fourOneOne");
              menuitem13.setAttribute("label", "Font bold");
              menuitem13.addEventListener("click", funcFourOneOne);
              function funcFourOneOne() {
                  window.frames[0].document.activeElement.style.fontWeight = 'bold';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontWeight = 'bold';
              };

              var menuitem14 = window.document.createXULElement(
                  "menuitem"
              );

              menuitem14.setAttribute("id", "fourOneTwo");
              menuitem14.setAttribute("label", "Font normal");
              menuitem14.addEventListener("click", funcFourOneTwo);
              function funcFourOneTwo() {
                  window.frames[0].document.activeElement.style.fontWeight = 'normal';
                  window.frames[0].document.activeElement.style.fontStyle = 'normal';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontWeight = 'normal';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontStyle = 'normal';
              };



              var menu5 = window.document.createXULElement(
                  "menu"
              );
              menu5.setAttribute("id", "five");
              menu5.setAttribute("label", "Font Style");
              var menuPopup5 = window.document.createXULElement(
                  "menupopup"
              );
              menuPopup5.setAttribute("id", "fiveOne");
              menuPopup5.setAttribute("type", "popup");


              var menuitem15 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem15.setAttribute("id", "fiveOneOne");
              menuitem15.setAttribute("label", "Font italic");
              menuitem15.addEventListener("click", funcFiveOneOne);
              function funcFiveOneOne() {
                  window.frames[0].document.activeElement.style.fontStyle = 'italic';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontStyle = 'italic';
              };


              var menuitem16 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem16.setAttribute("id", "fiveOneTwo");
              menuitem16.setAttribute("label", "Font normal");
              menuitem16.addEventListener("click", funcFiveOneTwo);
              function funcFiveOneTwo() {
                  window.frames[0].document.activeElement.style.fontWeight = 'normal';
                  window.frames[0].document.activeElement.style.fontStyle = 'normal';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontWeight = 'normal';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontStyle = 'normal';
              };


              var menu6 = window.document.createXULElement(
                  "menu"
              );
              menu6.setAttribute("id", "six");
              menu6.setAttribute("label", "Font Size");
              var menuPopup6 = window.document.createXULElement(
                  "menupopup"
              );
              menuPopup6.setAttribute("id", "sixOne");
              menuPopup6.setAttribute("type", "popup");

              var menuitem17 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem17.setAttribute("id", "sixOneOne");
              menuitem17.setAttribute("label", "Small font");
              menuitem17.addEventListener("click", funcSixOneOne);
              function funcSixOneOne() {
                  window.frames[0].document.activeElement.style.fontSize = 'small';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontSize = 'small';
              };

              var menuitem18 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem18.setAttribute("id", "sixOneTwo");
              menuitem18.setAttribute("label", "Medium font");
              menuitem18.addEventListener("click", funcSixOneTwo);
              function funcSixOneTwo() {
                  window.frames[0].document.activeElement.style.fontSize = 'medium';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontSize ='medium';
              };

              var menuitem19 = window.document.createXULElement(
                  "menuitem"
              );

              menuitem19.setAttribute("id", "sixOneThree");
              menuitem19.setAttribute("label", "Large font");
              menuitem19.addEventListener("click", funcSixOneThree);
              function funcSixOneThree() {
                  window.frames[0].document.activeElement.style.fontSize = 'large';
                  window.frames.opener.document.getElementById('calendar-task-details-description').style.fontSize = 'large';
              };

              var menu7 = window.document.createXULElement(
                  "menu"
              );
              menu7.setAttribute("id", "seven");
              menu7.setAttribute("label", "Table");
              var menuPopup7 = window.document.createXULElement(
                  "menupopup"
              );
              menuPopup7.setAttribute("id", "sevenOne");
              menuPopup7.setAttribute("type", "popup");

              var menuitem20 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem20.setAttribute("id", "sevenOneOne");
              menuitem20.setAttribute("label", "table 1 x 1");
              menuitem20.addEventListener("click", funcSevenOneOne);
              function funcSevenOneOne() {
                  var tableArr = new Array;
tableArr = ['+--+\n|    |\n+--+', '+--+--+\n|    |    |\n+--+--+\n|    |    |\n+--+--+', '+--+--+--+\n|    |    |    |\n+--+--+--+\n|    |    |    |\n+--+--+--+\n|    |    |    |\n+--+--+--+', '+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+'];
                  var tableApply = tableArr[0];
                  window.frames[0].document.activeElement.setRangeText(tableApply);
              };

              var menuitem21 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem21.setAttribute("id", "sevenOneTwo");
              menuitem21.setAttribute("label", "table 2 x 2");
              menuitem21.addEventListener("click", funcSevenOneTwo);
              function funcSevenOneTwo() {
                  var tableArr = new Array;
tableArr = ['+--+\n|    |\n+--+', '+--+--+\n|    |    |\n+--+--+\n|    |    |\n+--+--+', '+--+--+--+\n|    |    |    |\n+--+--+--+\n|    |    |    |\n+--+--+--+\n|    |    |    |\n+--+--+--+', '+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+'];
                  var tableApply = tableArr[1];
                  window.frames[0].document.activeElement.setRangeText(tableApply);
              };

              var menuitem22 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem22.setAttribute("id", "sevenOneThree");
              menuitem22.setAttribute("label", "table 3 x 3");
              menuitem22.addEventListener("click", funcSevenOneThree);
              function funcSevenOneThree() {
                  var tableArr = new Array;
tableArr = ['+--+\n|    |\n+--+', '+--+--+\n|    |    |\n+--+--+\n|    |    |\n+--+--+', '+--+--+--+\n|    |    |    |\n+--+--+--+\n|    |    |    |\n+--+--+--+\n|    |    |    |\n+--+--+--+', '+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+'];
                  var tableApply = tableArr[2];
                  window.frames[0].document.activeElement.setRangeText(tableApply);
              };

              var menuitem23 = window.document.createXULElement(
                  "menuitem"
              );
              menuitem23.setAttribute("id", "sevenOneFour");
              menuitem23.setAttribute("label", "table 4 x 4");
              menuitem23.addEventListener("click", funcSevenOneFour);
              function funcSevenOneFour() {
                  var tableArr = new Array;
tableArr = ['+--+\n|    |\n+--+', '+--+--+\n|    |    |\n+--+--+\n|    |    |\n+--+--+', '+--+--+--+\n|    |    |    |\n+--+--+--+\n|    |    |    |\n+--+--+--+\n|    |    |    |\n+--+--+--+', '+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+\n|    |    |    |    |\n+--+--+--+--+'];
                  var tableApply = tableArr[3];
                  window.frames[0].document.activeElement.setRangeText(tableApply);
              };

              
              menuPopup1.appendChild(menuitem1)
              menuPopup1.appendChild(menuitem2)
              menuPopup1.appendChild(menuitem3)
              menuPopup1.appendChild(menuitem4)
              menuPopup1.appendChild(menuitem5)
              menuPopup2.appendChild(menuitem6)
              menuPopup2.appendChild(menuitem7)
              menuPopup2.appendChild(menuitem8)
              menuPopup2.appendChild(menuitem9)
              menuPopup2.appendChild(menuitem10)
              menuPopup3.appendChild(menuitem11)
              menuPopup3.appendChild(menuitem12)
              menuPopup4.appendChild(menuitem13)
              menuPopup4.appendChild(menuitem14)
              menuPopup5.appendChild(menuitem15)
              menuPopup5.appendChild(menuitem16)
              menuPopup6.appendChild(menuitem17)
              menuPopup6.appendChild(menuitem18)
              menuPopup6.appendChild(menuitem19)
              menuPopup7.appendChild(menuitem20)
              menuPopup7.appendChild(menuitem21)
              menuPopup7.appendChild(menuitem22)
              menuPopup7.appendChild(menuitem23)
              menu1.appendChild(menuPopup1)
              menu2.appendChild(menuPopup2)
              menu3.appendChild(menuPopup3)
              menu4.appendChild(menuPopup4)
              menu5.appendChild(menuPopup5)
              menu6.appendChild(menuPopup6)
              menu7.appendChild(menuPopup7)
              menuPopup.appendChild(menu1);
              menuPopup.appendChild(menu2);
              menuPopup.appendChild(menu3);
              menuPopup.appendChild(menu4);
              menuPopup.appendChild(menu5);
              menuPopup.appendChild(menu6);
              menuPopup.appendChild(menu7);

              toolbarButton.appendChild(menuPopup);
              window.document.getElementById("event-toolbar").appendChild(toolbarButton);
            }
          });
        }
      }
    }
  }

  close() {
    // check all open windows to find the window we manipulated and remove our stuff
    for (let window of Services.wm.getEnumerator(null)) {
      if (window.location.href == "chrome://calendar/content/calendar-event-dialog.xhtml") {
        let element = window.document.getElementById("task-descriptions");
        if (element) element.remove();
      }
    }
    // Stop listening for new windows.
    ExtensionSupport.unregisterWindowListener("TaskDescription");
  }  
  
};