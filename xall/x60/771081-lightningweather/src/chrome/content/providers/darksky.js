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


Components.utils.import("chrome://lightningweather/content/Forecast.js");
Components.utils.import("resource://gre/modules/Log.jsm");
let logger = Log.repository.getLogger("lightningweather.provider.darksky");


var EXPORTED_SYMBOLS = ['DarkSkyWeatherModule'];

DarkSkyWeatherModule.class = "darksky";
DarkSkyWeatherModule.copyright_info = "<label href='https://darksky.net/poweredby/' class='text-link' value='Powered by Dark Sky'/> <html:br/>" +
                                        "Icons by <label href='http://merlinthered.deviantart.com/art/plain-weather-icons-157162192' class='text-link' value='merlinthered'/>";

DarkSkyWeatherModule.prototype = Object.create(BaseProvider.prototype);

DarkSkyWeatherModule.prototype.parseForecast = function(http_response){
    try{
        let response = JSON.parse(http_response.responseText);
        let daily = response.daily.data || [];
        let hourly = response.hourly.data || [];
        logger.debug("num hourly forecasts "+hourly.length);
        let hourly_forecasts_data = hourly.map(function(datapoint){
            return {
                timestamp: datapoint.time*1000,
                period: 1*60,
                weather: {icon: "forecast.io/"+datapoint.icon, temp: datapoint.temperature },
                published: Date.now()
            }
        });
        let daily_forecasts_data = daily.map(function(datapoint){
            let day_start_time = datapoint.time*1000;
            let day_end_time = (datapoint.time+24*60*60)*1000;
            let nestedForecast = new Forecast(hourly_forecasts_data.filter(p => (day_start_time <= p.timestamp && p.timestamp < day_end_time)));
            logger.debug("got forecast "+datapoint.icon+" for date "+new Date(datapoint.time*1000)+" with "+nestedForecast.length+" nested");
            datapoint.icon = datapoint.icon.replace("night", "day"); // whole day icons should always be day icons
            return {
                timestamp: datapoint.time*1000,
                period: 24*60,
                weather: {icon: "forecast.io/"+datapoint.icon, temp: (parseFloat(datapoint.temperatureMin)+parseFloat(datapoint.temperatureMax))/2 },
                published: Date.now(),
                nestedForecast: nestedForecast
            }
        });
        return new Forecast(daily_forecasts_data);
    }catch (e){
        logger.error(e);
        return new Forecast();
    }
};

function DarkSkyWeatherModule(location, callback, provider_prefs){
    BaseProvider.call(this, callback, location.tz);
    this.save_callback = callback;
    this.geoloc = location.geo;
    this.storeageId = DarkSkyWeatherModule.class+this.geoloc.latitude+this.geoloc.longitude;
    this.tz = location.tz;
    let api_key = provider_prefs.getCharPref("api_key");
    let q = this.geoloc.latitude+","+this.geoloc.longitude;
    this.url = "https://api.darksky.net/forecast/"+api_key+"/"+q+"?exclude=[currently,minutely,alerts,flags]&units=ca";
}
