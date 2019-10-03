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
Components.utils.import("resource://calendar/modules/calUtils.jsm");

Components.utils.import("resource://gre/modules/Log.jsm");
let logger = Log.repository.getLogger("lightningweather.provider.openweather");

var EXPORTED_SYMBOLS = ['OpenWeathermapModule'];


OpenWeathermapModule.class = "openweather";
OpenWeathermapModule.copyright_info = "Provided by <label href='https://openweathermap.org/' class='text-link' value='OpenWeatherMap'/>";

OpenWeathermapModule.prototype = Object.create(BaseProvider.prototype);

OpenWeathermapModule.prototype.parseForecast = function(http_response) {
    let self = this;
    try{
        var response = JSON.parse(http_response.responseText);
        if(response.cod != 200 || !Array.isArray(response.list)){
            logger.error("http: "+http_response.responseText);
            return new Forecast();
        }
    }catch (e) {
        logger.error("ERROR: "+e);
        return new Forecast();
    }

    let list = response.list.map(function(elem){
        let datetime = cal.dtz.jsDateToDateTime(new Date(elem.dt*1000)).getInTimezone(self.tz);
        let date = datetime.clone();
        date.isDate = true;
        return {
            timestamp: elem.dt*1000,
            period: 3*60,
            weather: {icon: "openweather/"+elem.weather[0].icon+".png", temp: elem.main.temp, humidity: elem.main.humidity },
            published: Date.now(),
            datetime: datetime,
            date: date,
            debugdate: elem.dt_txt
        }
    });
    let grouped_forecast = new Map();
    list.forEach(function(e){
        let key = e.date.nativeTime/1000;
        if(grouped_forecast.has(key)){
            let elem_list = grouped_forecast.get(key);
            elem_list.push(e);
            grouped_forecast.set(key, elem_list);
        }else {
            grouped_forecast.set(key, [e]);
        }
    });

    let daily_forecasts_data = [];
    grouped_forecast.forEach(function(hourly_forecasts, date_timestamp){
        logger.debug(date_timestamp+" has "+ hourly_forecasts.length+" forecasts");
        hourly_forecasts = hourly_forecasts.map(function(e){
            return {timestamp: e.timestamp,
                period:e.period ,
                weather:e.weather,
                published:e.published }
        });
        hourly_forecasts.sort(function(a, b){ return (a.timestamp < b.timestamp)? -1:
            (a.timestamp > b.timestamp)? 1: 0;});

        let midday_timestamp = date_timestamp + 12*3600*1000;
        let avg_day_weather = undefined;
        hourly_forecasts.reduce(function(best_delta, elem){
            let delta = Math.abs(elem.timestamp - midday_timestamp);
            if(delta < best_delta){
                best_delta = delta;
                avg_day_weather = elem.weather;
            }
            return best_delta;
        }, Infinity);

        let nestedForecast = new Forecast(hourly_forecasts);
        daily_forecasts_data.push({
            timestamp: date_timestamp,
            period:24*60,
            weather: avg_day_weather,
            published: Date.now(),
            nestedForecast: nestedForecast
        });
    });
    return new Forecast(daily_forecasts_data);
};

function OpenWeathermapModule(city, callback, provider_prefs) {
//http://api.openweathermap.org/data/2.5/forecast?id=2778067&APPID=c43ae0077ff0a3d68343555c23b97f5f
//http://api.openweathermap.org/data/2.5/weather?id=2778067&APPID=c43ae0077ff0a3d68343555c23b97f5f
    BaseProvider.call(this, callback, city.tz);
    this.location = city.geo;
    this.storeageId = OpenWeathermapModule.class+this.location.latitude+this.location.longitude;
    let api_key = provider_prefs.getCharPref("api_key");
    this.url = "http://api.openweathermap.org/data/2.5/forecast?lat="+this.location.latitude+"&lon="+this.location.longitude+"&APPID="+api_key+"&units=metric";
}
