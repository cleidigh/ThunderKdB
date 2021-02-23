/*
 * Macro Template
 *
 * Copyright (C) 2013 - 2021  NISHIMURA Ryohei
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// source: https://weeknumber.net/how-to/javascript
Date.prototype.getWeek = function() {
    var date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    var week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
        - 3 + (week1.getDay() + 6) % 7) / 7);
}

//returns the relative day in the week of date d
//based on: https://stackoverflow.com/a/62899412/704329
// d - some date
// dy - day of week to calculate date
//    1 - return date of Monday of the week of d
//    2 - return date of Tuesday of the week of d
//    ...
//    7 - date of Sunday 
function getRelativeDayInWeek(d, dy) {
    d = new Date(d);
    var day = d.getDay();
    if (day == 0) { 
        day = 7; 
    }
    var diff = d.getDate() + dy - day;
    return new Date(d.setDate(diff));
}


browser.tabs.onCreated.addListener(async (tab) => {
    var replaceMacros = function(s, date) {
        var padZero = function(x, n) {
            var padZeroSub = function(s, i) {
                if (i <= 0) {
                    return s;
                } else {
                    return padZeroSub("0" + s, i - 1);
                }
            };
            var s = x.toString();
            return padZeroSub(s, n - s.length);
        };
        var regexs = [
            [ /{{{y}}}/g, function(date) {
                return date.getFullYear().toString();
            } ],
            [ /{{{yyyy}}}/g, function(date) {
                return padZero(date.getFullYear(), 4);
            } ],
            [ /{{{M}}}/g, function(date) {
                return (date.getMonth() + 1).toString();
            } ],
            [ /{{{MM}}}/g, function(date) {
                return padZero(date.getMonth() + 1, 2);
            } ],
            [ /{{{MMM}}}/g, function(date) {
                return ["Jan", "Feb", "Mar", "Apr",
                    "May", "Jun", "Jul", "Aug",
                    "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
            } ],
            [ /{{{MMMM}}}/g, function(date) {
                return ["January", "February", "March",
                    "April", "May", "June",
                    "July", "August", "September",
                    "October", "November", "December"][date.getMonth()];
            } ],
            [ /{{{d}}}/g, function(date) {
                return date.getDate().toString();
            } ],
            [ /{{{dd}}}/g, function(date) {
                return padZero(date.getDate(), 2);
            } ],
            [ /{{{E}}}/g, function(date) {
                return ["Sunday", "Monday", "Tuesday", "Wednesday",
                    "Thursday", "Friday", "Saturday"][date.getDay()];
            } ],
            [ /{{{EEE}}}/g, function(date) {
                return ["Sun", "Mon", "Tue", "Wed",
                    "Thu", "Fri", "Sat"][date.getDay()];
            } ],
            [ /{{{H}}}/g, function(date) {
                return date.getHours().toString();
            } ],
            [ /{{{HH}}}/g, function(date) {
                return padZero(date.getHours(), 2);
            } ],
            [ /{{{m}}}/g, function(date) {
                return date.getMinutes().toString();
            } ],
            [ /{{{mm}}}/g, function(date) {
                return padZero(date.getMinutes(), 2);
            } ],
            [ /{{{s}}}/g, function(date) {
                return date.getSeconds().toString();
            } ],
            [ /{{{ss}}}/g, function(date) {
                return padZero(date.getSeconds(), 2);
            } ],
            [ /{{{w}}}/g, function(date) {
                return date.getWeek().toString();
            } ],
            [ /{{{w1}}}/g, function(date) {
                monday = getRelativeDayInWeek(date, 1);
                return monday.toLocaleDateString({month: '2-digit', day: '2-digit'});
            } ],
            [ /{{{w5}}}/g, function(date) {
                friday = getRelativeDayInWeek(date, 5);
                return friday.toLocaleDateString({month: '2-digit', day: '2-digit'});
            } ],
        ];
        for (var i = 0; i < regexs.length; ++i) {
            s = s.replace(regexs[i][0], regexs[i][1](date));
        }
        return s;
    };
    // Sleep for a second to wait for all of the fields filled.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Call getComposeDetails twice.
    // Hack for the problem that details of replies cannot be got correctly.
    await browser.compose.getComposeDetails(tab.id);
    let details = await browser.compose.getComposeDetails(tab.id);
    if (details) {
        let date = new Date();
        let oldSubject = details.subject;
        let newSubject = replaceMacros(oldSubject, date);
        if (details.isPlainText) {
            let oldBody = details.plainTextBody;
            let newBody = replaceMacros(oldBody, date);
            browser.compose.setComposeDetails(tab.id, { plainTextBody: newBody, subject: newSubject });
        } else {
            let oldBody = details.body;
            let newBody = replaceMacros(oldBody, date);
            browser.compose.setComposeDetails(tab.id, { body: newBody, subject: newSubject });
        }
    }
});
console.log("macrotemplate loaded")
