/*
 The MIT License (MIT)

 Copyright (c) 2017 Thomas Malcher

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */


Components.utils.import("resource://calendar/modules/calUtils.jsm");

var EXPORTED_SYMBOLS = ['WeekViewWeatherModule', 'MonthViewWeatherModule', 'HourlyViewWeatherModule', "weatherview_params"];

var weatherview_params = {
    document_ref: this
};

Components.utils.import("resource://gre/modules/Log.jsm");
let logger = Log.repository.getLogger("lightningweather.view");


function ViewWeatherModule(view) {
    this.view = view;
    this.icon_baseurl = "chrome://lightningweather/skin/default/";
    this.temperature_unit = "C";
}
ViewWeatherModule.prototype.clearWeather = function (mozdate) {
    throw "NOT IMPLEMENTED"
};
ViewWeatherModule.prototype.setWeather = function (mozdate, forecast_elem) {
    throw "NOT IMPLEMENTED"
};
ViewWeatherModule.prototype.setIconBaseUrl = function (icon_baseurl) {
    this.icon_baseurl = icon_baseurl;
};
ViewWeatherModule.prototype.setTemperatureUnit = function (unit) {
    this.temperature_unit = unit;
};

ViewWeatherModule.prototype.temperatureToUnit = function (temp_c) {
    if (this.temperature_unit == "C"){
        return Math.round(temp_c) + "\u2103";
    }else{
        return Math.round((temp_c*1.8)+32) + "\u2109";
    }
};
ViewWeatherModule.prototype.clear = function () {
    let self = this;
    let date_list = this.view.mDateList || this.view.getDateList({}); // one of those ways should always work
    date_list.forEach(function (dt) {
        self.clearWeather(dt);
    });
};

ViewWeatherModule.prototype.forecastTooOld = function(forecast_elem){
    // if forecast for future was last updated more than 24 hours ago
    if (forecast_elem.timestamp > Date.now() && forecast_elem.published < Date.now()-24*60*60*1000){
        return true;
    }
    return false;
};

ViewWeatherModule.prototype.annotate = function (forecast, tz) {
    var self = this;
    let local_startDate = self.view.mStartDate.clone();
    local_startDate.timezone = tz;
    logger.info("show " + forecast.length + " Forecasts from date: " + local_startDate);
    forecast.forEachFrom(local_startDate.nativeTime / 1000, function (elem) {
        if (self.forecastTooOld(elem)){
            return;
        }
        let mozDate = cal.dtz.jsDateToDateTime(new Date(elem.timestamp)).getInTimezone(tz/*self.view.timezone*/);
        mozDate.isDate = true;
        if (mozDate.compare(self.view.endDate) <= 0) { // mozDate < endDate
            logger.debug("render forecast for " + mozDate);
            self.setWeather(mozDate, elem);
        }
    });
};
ViewWeatherModule.prototype.getOrCreateWeatherBox = function (day_col) {
    try {
        let weatherbox = weatherview_params.document_ref.getAnonymousElementByAttribute(day_col, "anonid", "weatherbox");
        if (weatherbox == undefined) {
            weatherbox = weatherview_params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "xul:box");
            let orient = day_col.getAttribute("orient");
            weatherbox.setAttribute("orient", orient);
            weatherbox.setAttribute("flex", "1");
            weatherbox.setAttribute("anonid", "weatherbox");

            let stack = weatherview_params.document_ref.getAnonymousElementByAttribute(day_col, "anonid", "boxstack");
            stack.insertBefore(weatherbox, day_col.topbox || day_col.dayitems);
        }
        return weatherbox
    } catch (ex) {
        logger.error("getOrCreateWeatherBox " + ex)
    }
};
ViewWeatherModule.prototype.clearWeatherBox = function (box) {
    while (box.firstChild) {
        box.removeChild(box.firstChild);
    }
};


WeekViewWeatherModule.prototype = Object.create(ViewWeatherModule);
/***
 *  can be used for Day and WeekView, can only show one Icon for the whole day
 */
function WeekViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    var self = this;
    this.setWeather = function (mozdate, forecast_elem) {
        let weather = forecast_elem.weather;
        try {
            let day_col = this.view.findColumnForDate(mozdate);
            let orient = day_col.column.getAttribute("orient");
            let box = day_col.column.topbox;
            box.setAttribute("orient", orient);
            box.setAttribute("style", 'opacity: 0.4; background-image: url("' + self.icon_baseurl + weather.icon + '") !important; background-size: contain !important;');
        } catch (ex) {
            logger.error("setWeather: " + ex);
        }
    };
    this.clearWeather = function (mozdate) {
        try {
            let day_col = this.view.findColumnForDate(mozdate);
            let box = day_col.column.topbox;
            box.setAttribute("style", "");
        } catch (ex) {
            logger.error("clearWeather: " + ex);
        }
    };
}

HourlyViewWeatherModule.prototype = Object.create(ViewWeatherModule.prototype);
/***
 * can be used for Day and WeekView, uses an own box for showing the weather icons
 */
function HourlyViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    var self = this;
    this.base_style = "opacity: 0.4; background-size: contain; background-repeat: repeat-y; background-position: center center; ";

    this.makeBox = function (startMin, endMin, pixelsPerMinute, parent_orientation) {
        if (endMin <= startMin) {
            return undefined;
        }
        let startPix = Math.round(startMin * pixelsPerMinute);
        let endPix = Math.round(endMin * pixelsPerMinute);
        let durPix = endPix - startPix;
        // calculate duration pixel as the difference between
        // start pixel and end pixel to avoid rounding errors.

        let box = weatherview_params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "box");
        if (parent_orientation == "vertical") {
            box.setAttribute("orient", "vertical");
            box.setAttribute("height", durPix);
            box.setAttribute("width", "100%");
        } else {
            box.setAttribute("orient", "horizontal");
            box.setAttribute("width", durPix);
        }
        return box;
    };

    this.annotateBox = function(box, forecast_elem){
        if (self.forecastTooOld(forecast_elem)){
            return;
        }
        let weather = forecast_elem.weather;
        let icon = this.icon_baseurl + weather.icon;
        box.setAttribute("style", this.base_style + "background-image: url(" + icon + ") !important;");
        //box.setAttribute("style", box.getAttribute("style")+"border: 2px solid red;");
        let temp = parseFloat(weather.temp);
        if (!isNaN(temp)) {
            let l = weatherview_params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "description");
            l.setAttribute('value', this.temperatureToUnit(temp));
            box.appendChild(l);
        }
    };

    this.annotate = function (forecast, tz) {
        let local_startDate = self.view.mStartDate.clone();
        local_startDate.timezone = tz;
        logger.info("show " + forecast.length + " Forecasts from date: " + local_startDate);

        forecast.forEachFrom(local_startDate.nativeTime / 1000, function (elem) {
            let mozdate = cal.dtz.jsDateToDateTime(new Date(elem.timestamp)).getInTimezone(tz); /*self.view.timezone*/
            mozdate.isDate = true;
            let day_entry = self.view.findColumnForDate(mozdate);
            if (!day_entry) {
                return;
            }
            let day_col = day_entry.column;
            let weatherbox = self.getOrCreateWeatherBox(day_col);
            let orient = day_col.getAttribute("orient");
            logger.debug("render forecast for " + mozdate);
            let day_icon = self.icon_baseurl + elem.weather.icon;
            if (elem.nestedForecast && elem.nestedForecast.length > 0) {
                self.clearWeatherBox(weatherbox);
                let curStartMin = day_col.mStartMin;
                elem.nestedForecast.sort();
                elem.nestedForecast.forEach(function (elem2) {
                    let mozdatetime = cal.dtz.jsDateToDateTime(new Date(elem2.timestamp)).getInTimezone(tz); /*self.view.timezone*/
                    logger.trace("render nested forecast for " + mozdatetime);
                    let startMin = mozdatetime.hour * 60 + mozdatetime.minute;
                    let endMin = startMin + elem2.period;
                    // nested forecast doesn't start at beginning of the day
                    if (curStartMin < startMin) {
                        // insert a filling box
                        let b = self.makeBox(curStartMin, startMin, day_col.pixelsPerMinute, orient);
                        self.annotateBox(b, elem); // use forecast element for the whole day
                        weatherbox.appendChild(b);
                        curStartMin = startMin;
                    }
                    if (endMin > day_col.mEndMin) {
                        endMin = day_col.mEndMin
                    }
                    if (endMin <= curStartMin) {
                        return;
                    }
                    let box = self.makeBox(curStartMin, endMin, day_col.pixelsPerMinute, orient);
                    if (box) {
                        self.annotateBox(box, elem2);
                        weatherbox.appendChild(box);
                        curStartMin = endMin;
                    }
                });
                // nested forecast doesn't fill the whole day
                if (curStartMin < day_col.mEndMin) {
                    let b = self.makeBox(curStartMin, day_col.mEndMin, day_col.pixelsPerMinute, orient); // make a box till end of the day
                    self.annotateBox(b, elem); // use forecast element for the whole day
                    weatherbox.appendChild(b);
                }
            } else {
                self.annotateBox(weatherbox, elem);
            }
        });
    };

    this.clearWeather = function (mozdate) {
        try {
            let day_entry = self.view.findColumnForDate(mozdate);
            if (!day_entry) {
                return;
            }
            let day_col = day_entry.column;

            let wbox = this.getOrCreateWeatherBox(day_col);
            if (wbox) {
                this.clearWeatherBox(wbox);
                wbox.setAttribute("style", "");
            }
        } catch (ex) {
            logger.error("clearWeather: " + ex)
        }
    };
}

MonthViewWeatherModule.prototype = Object.create(ViewWeatherModule.prototype);


function MonthViewWeatherModule(view) {
    ViewWeatherModule.call(this, view);
    var self = this;
    this.base_style = "opacity: 0.4; background-size: contain !important; background-position: right bottom !important; background-repeat: no-repeat !important;";
    this.setWeather = function (mozdate, forecast_elem) {
        let weather = forecast_elem.weather;
        try {
            let day_box = this.view.findDayBoxForDate(mozdate);
            let weatherbox = this.getOrCreateWeatherBox(day_box);
            if (!weatherbox ){
                weatherbox = day_box;
            }
            weatherbox.setAttribute("style", this.base_style + "background-image: url(" + this.icon_baseurl + weather.icon + ") !important;");

            let temp = parseFloat(weather.temp);
            if (!isNaN(temp)) {
                let l = weatherview_params.document_ref.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "description");
                l.setAttribute('value', this.temperatureToUnit(temp));
                weatherbox.appendChild(l);
            }
        } catch (ex) {
            logger.error(ex)
        }
    };

    this.clearWeather = function (mozdate) {
        try {
            let day_box = self.view.findDayBoxForDate(mozdate);
            let wbox = this.getOrCreateWeatherBox(day_box);
            if (wbox) {
                this.clearWeatherBox(wbox);
                wbox.setAttribute("style", "");
            }
        } catch (ex) {
            logger.error(ex);
        }
    };
}
