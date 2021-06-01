menuitem1.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "background-color", "Black");
});

menuitem2.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "background-color", "DarkGray");
});

menuitem3.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "background-color", "LightGray");
});

menuitem4.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "background-color", "White");
});

menuitem5.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "background-color", "Blue");
});

menuitem6.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "background-color", "Green");
});

menuitem7.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "background-color", "Khaki");
});

menuitem8.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "background-color", "Red");
});

menuitem9.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "color", "Black");
});

menuitem10.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "color", "DarkGray");
});

menuitem11.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "color", "LightGray");
});

menuitem12.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "color", "White");
});

menuitem13.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "color", "Blue");
});

menuitem14.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "color", "Green");
});

menuitem15.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "color", "Khaki");
});

menuitem16.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "color", "Red");
});

menuitem17.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-family", "serif");
});

menuitem18.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-family", "sans-serif");
});

menuitem19.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-weight", "bold");
});

menuitem20.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-weight", "normal");
});

menuitem21.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-style", "italic");
});

menuitem22.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-style", "normal");
});

menuitem23.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-size", "x-small");
});

menuitem24.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-size", "small");
});

menuitem25.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-size", "medium");
});

menuitem26.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-size", "large");
});

menuitem27.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "font-size", "x-large");
});

menuitem28.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "text-align", "inherit");
    browser.myapi.setOne("calendar-task-details-description", "text-align-last", "justify");
    browser.myapi.setOne("calendar-task-details-description", "white-space", "pre-line");
    browser.myapi.setOne("calendar-task-details-description", "text-align-last", "left");
    browser.myapi.setOne("calendar-task-details-description", "text-justify", "inter-character");
});

menuitem30.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "text-align", "center");
    browser.myapi.setOne("calendar-task-details-description", "text-align-last", "center");
    browser.myapi.setOne("calendar-task-details-description", "white-space", "pre-line");
    browser.myapi.setOne("calendar-task-details-description", "text-align-last", "center");
    browser.myapi.setOne("calendar-task-details-description", "text-justify", "inter-character");
});

menuitem31.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "text-align", "left");
    browser.myapi.setOne("calendar-task-details-description", "text-align-last", "left");
    browser.myapi.setOne("calendar-task-details-description", "white-space", "pre-line");
    browser.myapi.setOne("calendar-task-details-description", "text-align-last", "left");
    browser.myapi.setOne("calendar-task-details-description", "text-justify", "inter-character");
});

menuitem32.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "text-align", "right");
    browser.myapi.setOne("calendar-task-details-description", "text-align-last", "right");
    browser.myapi.setOne("calendar-task-details-description", "white-space", "pre-line");
    browser.myapi.setOne("calendar-task-details-description", "text-align-last", "right");
    browser.myapi.setOne("calendar-task-details-description", "text-justify", "inter-character");
});
menuitem33.addEventListener("click", function() {
    browser.myapi.setTwo();
});

menuitem29.addEventListener("click", function() {
    browser.myapi.setOne("calendar-task-details-description", "text-align", "justify");
    browser.myapi.setOne("calendar-task-details-description", "text-align-last", "justify");
    browser.myapi.setOne("calendar-task-details-description", "white-space", "pre-line");
    browser.myapi.setOne("calendar-task-details-description", "text-align-last", "left");
    browser.myapi.setOne("calendar-task-details-description", "text-justify", "inter-character");
});

menuitem36.addEventListener("click", function() {
targetUrl = browser.runtime.getURL("rainbow.html");

function rainbow() {
browser.windows.create({
              url: targetUrl,
              height: 200,
              width: 450,
              titlePreface: "Other screen colors", 
              state: "normal",
              type: "popup"
  });

};
rainbow();
});