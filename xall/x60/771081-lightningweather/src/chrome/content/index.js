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



Cu.import("chrome://lightningweather/content/SimpleStorage.js");
Cu.import("chrome://lightningweather/content/WeatherViews.js");

var weatherProviders = {};
Cu.import("chrome://lightningweather/content/providers/openweather.js", weatherProviders);
Cu.import("chrome://lightningweather/content/providers/openweather.js", weatherProviders);
Cu.import("chrome://lightningweather/content/providers/yahoo.js", weatherProviders);
Cu.import("chrome://lightningweather/content/providers/darksky.js", weatherProviders);
//Cu.import("chrome://lightningweather/content/providers/combined.js", weatherProviders);

Components.utils.import("chrome://lightningweather/content/Forecast.js");

// reference to the document used by WeatherViews
weatherview_params.document_ref = document;
var prefsService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);

Components.utils.import("resource://gre/modules/Log.jsm");
let root_logger = Log.repository.getLogger("lightningweather");
root_logger.addAppender(new Log.DumpAppender(new Log.BasicFormatter()));
root_logger.level = Log.Level.Warn;
let logger = Log.repository.getLogger("lightningweather.index");


var lightningweather = {
    views: null,
    storage: SimpleStorage.createCpsStyle("teste"),
    forecastModule: null,
    forecast: null,
    prefs: prefsService.getBranch("extensions.lightningweather."),
    tz_service: Components.classes["@mozilla.org/calendar/timezone-service;1"].getService(Components.interfaces.calITimezoneProvider),
    forecast_timeout: 6*60*60*1000, //duration in ms after which a new Forecast gets requested
    prefObserver: {
        observe: function (subject, topic, data) {
            logger.debug("subject: " + subject + " topic: " + topic + " pref: " + data);
            if (topic != "nsPref:changed") return;
            if (data == "provider") { // if user selected a new Provider
                let provider_instance_description = JSON.parse(lightningweather.prefs.getCharPref("provider"));
                if (provider_instance_description) {
                    lightningweather.forecastModule = lightningweather.createForecastModule(provider_instance_description.provider_name, provider_instance_description.location);
                    lightningweather.forecast = null;
                    logger.info("Prefs Use ForecastModule: " + provider_instance_description.provider_name + " " + JSON.stringify(provider_instance_description.location));
                    //\\ get or load and request
                    lightningweather.updateCurrentView();
                }
            }else if (data == "icon_set"){
                let icon_set = lightningweather.prefs.getCharPref("icon_set");
                for (let key in lightningweather.views) {
                    if (lightningweather.views.hasOwnProperty(key)) {
                        lightningweather.views[key].setIconBaseUrl("chrome://lightningweather/skin/"+icon_set+"/");
                    }
                }
                lightningweather.updateCurrentView();
            }else if (data == "units"){
                let unit = lightningweather.prefs.getCharPref("units");
                logger.debug("Selected Unit" + unit);
                for (let key in lightningweather.views) {
                    if (lightningweather.views.hasOwnProperty(key)) {
                        lightningweather.views[key].setTemperatureUnit(unit);
                    }
                }
                lightningweather.updateCurrentView();
            }
        }
    },
    createForecastModule: function (provider_name, location) {
        for (let provider in weatherProviders) {
            if (weatherProviders.hasOwnProperty(provider) && weatherProviders[provider].class == provider_name) {
                location.tz = lightningweather.tz_service.getTimezone(location.tz || "Europe/Vienna");
                // use mergeForecast as save_callback for requestForecast
                let module_prefs = prefsService.getBranch("extensions.lightningweather."+provider_name+".");
                return new weatherProviders[provider](location, lightningweather.mergeForecast, module_prefs);
            }
        }
        return undefined;
    },
    onLoad: function () {
        lightningweather.prefs.addObserver("", lightningweather.prefObserver, false);

        let icon_set = "default";
        let temperature_unit = "C";
        try {
            temperature_unit = lightningweather.prefs.getCharPref("units");
        }catch(e) { }
        try {
            icon_set = lightningweather.prefs.getCharPref("icon_set");
        }catch(e) { }
        lightningweather.views = {
            "day": new HourlyViewWeatherModule(document.getElementById("day-view")),
            "week": new HourlyViewWeatherModule(document.getElementById("week-view")),
            "month": new MonthViewWeatherModule(document.getElementById("month-view")),
            "multiweek": new MonthViewWeatherModule(document.getElementById("multiweek-view"))
        };
        for (let key in lightningweather.views) {
            if (lightningweather.views.hasOwnProperty(key)) {
                let weather_mod = lightningweather.views[key];
                weather_mod.setIconBaseUrl("chrome://lightningweather/skin/"+icon_set+"/");
                weather_mod.setTemperatureUnit(temperature_unit);
                weather_mod.view.addEventListener("viewloaded", lightningweather.onViewLoaded);
                weather_mod.view.viewBroadcaster.addEventListener(key + "viewresized", lightningweather.onResize.bind(lightningweather, weather_mod));
            }
        }

        try {
            let provider_instance_description = JSON.parse(lightningweather.prefs.getCharPref("provider"));
            logger.info("Init Use ForecastModule: " + provider_instance_description.provider_name + " " + JSON.stringify(provider_instance_description.location));
            lightningweather.forecastModule = lightningweather.createForecastModule(provider_instance_description.provider_name, provider_instance_description.location);
        } catch (e) {
            logger.error("Error in reading Preferences: use default hardcoded ForecastModule: darksky Graz", e);
            lightningweather.forecastModule = lightningweather.createForecastModule("darksky", {"id":"548536", "tz":"Europe/Vienna", "geo":{"latitude":"47.068562","longitude":"15.44318"}});
        }

        //\\ get or load and request
        lightningweather.updateCurrentView();
    },

    onViewLoaded: function () {
        logger.debug("loaded view " + currentView().type);
        lightningweather.updateCurrentView()
    },

    onResize: function (weather_mod) {
        logger.trace("resize view " + weather_mod.view.type);
        weather_mod.clear();
        lightningweather.updateCurrentView();
    },

    updateCurrentView: function(){
        let weather_mod = lightningweather.views[currentView().type];
        weather_mod.clear();
        if (lightningweather.forecast instanceof Forecast) {
            weather_mod.annotate(lightningweather.forecast, lightningweather.forecastModule.tz);
            lightningweather.tryUpdateForecast();
        } else {
            logger.debug("updateCurrentView: no forecast available -> try to load");
            lightningweather.loadForecast();
        }
    },
    loadForecast: function(){
        lightningweather.storage.get(lightningweather.forecastModule.storeageId, function (forecast_data) {
            if (forecast_data) {
                logger.debug("found forecast in Storage " + forecast_data.length);
                lightningweather.forecast = new Forecast(forecast_data);
            } else { // no forecast in object or storage -> request
                logger.debug("No forecast in Storage!");
                lightningweather.forecast = new Forecast();
            }
            lightningweather.updateCurrentView();
        });
    },
    /***
     * merge given Forecast with possibly existing Forecast
     * @param forecast
     */
    mergeForecast: function (forecast) {
        if (!forecast || !(forecast instanceof Forecast) || forecast.length == 0) {
            logger.debug("empty Forecast -> nothing to merge, nothing to update");
            return;
        }
        if (lightningweather.forecast instanceof Forecast) {
            forecast.combine(lightningweather.forecast);
            lightningweather.forecast = forecast;
            lightningweather.updateCurrentView();
            lightningweather.saveForecast();
        } else { // check storage
            lightningweather.storage.get(lightningweather.forecastModule.storeageId, function (forecast_data) {
                let existing_forecast = new Forecast();
                if (forecast_data) {
                    logger.debug("found forecast in Storage " + forecast_data.length);
                    existing_forecast = new Forecast(forecast_data);
                } else { // no forecast in object or storage -> request
                    logger.debug("No forecast in Storage!");
                }
                forecast.combine(existing_forecast);
                lightningweather.forecast = forecast;
                lightningweather.updateCurrentView();
                lightningweather.saveForecast();
            });
        }
    },
    saveForecast: function(){
        lightningweather.storage.set(lightningweather.forecastModule.storeageId, lightningweather.forecast, function (k) {
            logger.debug("saved forecast for id "+lightningweather.forecastModule.storeageId+" into DB")
        });
    },
    /**
     * request an update of the Forecast
     */
    tryUpdateForecast: function () {
        logger.debug("try to Update Forecast");
        if (!lightningweather.forecastModule) {
            lightningweather.onLoad();
        }
        if (lightningweather.forecastModule) {
            if (!(lightningweather.forecast instanceof Forecast) || lightningweather.forecast.age() < Date.now()-lightningweather.forecast_timeout){ // after forecast_timeout ms the Forecast is too old
                logger.info("Forecast too old -> request new one");
                lightningweather.forecastModule.requestForecast();
            }
        }
    }
};

window.addEventListener("load", lightningweather.onLoad, false);
window.setInterval(lightningweather.tryUpdateForecast, 5*60*1000);  // check for forecast update every 5 minutes
