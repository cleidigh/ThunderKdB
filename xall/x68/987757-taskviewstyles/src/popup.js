btn2.addEventListener('click', function () { SetTaskDetailsBackgroundColor("#303030")});
btn3.addEventListener('click', function () { SetTaskDetailsBackgroundColor("#808080")});
btn4.addEventListener('click', function () { SetTaskDetailsBackgroundColor("#F1F1F1")});
btn5.addEventListener('click', function () { SetTaskDetailsBackgroundColor("#F0E68C")});
btn6.addEventListener('click', function () { SetTaskDetailsBackgroundColor("#FFFFFF")});

btn8.addEventListener('click', function () { SetTaskDetailsFontColor("black")});
btn9.addEventListener('click', function () { SetTaskDetailsFontColor("blue")});
btn10.addEventListener('click', function () { SetTaskDetailsFontColor("green")});
btn11.addEventListener('click', function () { SetTaskDetailsFontColor("red")});
btn12.addEventListener('click', function () { SetTaskDetailsFontColor("white")});

btn14.addEventListener('click', function () { SetTaskDetailsFontFamily("serif")});
btn15.addEventListener('click', function () { SetTaskDetailsFontFamily("sans-serif")});

btn17.addEventListener('click', function () { SetTaskDetailsFontWeight("bold")});
btn18.addEventListener('click', function () { SetTaskDetailsFontWeight("normal")});

btn20.addEventListener('click', function () { SetTaskDetailsFontStyle("italic")});
btn21.addEventListener('click', function () { SetTaskDetailsFontStyle("normal")});

btn23.addEventListener('click', function () { SetTaskDetailsFontSize("small")});
btn24.addEventListener('click', function () { SetTaskDetailsFontSize("medium")});
btn25.addEventListener('click', function () { SetTaskDetailsFontSize("large")});

btn27.addEventListener('click', function () { SetTaskDetailsTextAlignment("inherit")});
btn28.addEventListener('click', function () { 
	SetTaskDetailsTextAlignment("justify")
	// justify has some extra styles but we do not need an extra function just for these
	browser.SetStyle.set("calendar-task-details-description", 'text-align', 'justify');
	browser.SetStyle.set("calendar-task-details-description", 'text-align-last', 'justify');
	browser.SetStyle.set("calendar-task-details-description", 'white-space', 'pre-line');
	browser.SetStyle.set("calendar-task-details-description", 'text-align-last', 'left');
	browser.SetStyle.set("calendar-task-details-description", 'text-justfy', 'inter-character');
});
btn29.addEventListener('click', function () { SetTaskDetailsTextAlignment("center")});
btn30.addEventListener('click', function () { SetTaskDetailsTextAlignment("left")});
btn31.addEventListener('click', function () { SetTaskDetailsTextAlignment("right")});

// ---------------------------------

function SetTaskDetailsBackgroundColor(color) {
	browser.SetStyle.set("calendar-task-details-description", "background-color", color);
};

function SetTaskDetailsFontColor(color) {
	browser.SetStyle.set("calendar-task-details-description", "color", color);
};

function SetTaskDetailsFontFamily(family) {
	browser.SetStyle.set("calendar-task-details-description", "font-family", family);
};

function SetTaskDetailsFontWeight(weight) {
	browser.SetStyle.set("calendar-task-details-description", "font-weight", weight);
};

function SetTaskDetailsFontStyle(style) {
	browser.SetStyle.set("calendar-task-details-description", "font-style", style);
};

function SetTaskDetailsFontSize(size) {
	browser.SetStyle.set("calendar-task-details-description", "font-size", size);
};

function SetTaskDetailsTextAlignment(alignment) {
	browser.SetStyle.set("calendar-task-details-description", "text-align", alignment);
	browser.SetStyle.set("calendar-task-details-description", "text-align-last", alignment);
};