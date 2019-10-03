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
let logger = Log.repository.getLogger("lightningweather.provider.yahoo");

var EXPORTED_SYMBOLS = ['YahooWeatherModule'];


YahooWeatherModule.class = "yahoo";
YahooWeatherModule.prototype = Object.create(BaseProvider.prototype);

YahooWeatherModule.prototype.parseForecast = function(http_response){
    let self = this;
    try{
        var response = JSON.parse(http_response.responseText);
        if(response.error != undefined){
            logger.error("http: "+response.error);
            return new Forecast();
        }
        let results = response.query.results || [];
        logger.debug(JSON.stringify(results));
        let daily_forecasts_data = results.channel.map(function(elem){
            let forecast_elem = elem.item.forecast;
            let date = cal.dtz.jsDateToDateTime(new Date(forecast_elem.date), self.tz);
            date.isDate = true;
            return {date: date,
                timestamp: date.nativeTime/1000,
                period:24*60,
                weather:{text:forecast_elem.text, icon: "yahoo/"+forecast_elem.code+"d.png",
                            temp:(parseInt(forecast_elem.high)+parseInt(forecast_elem.low))/2 },
                published: Date.now()}
        });
        return new Forecast(daily_forecasts_data);
    }catch (e){
        logger.error(e);
        return new Forecast();
    }
};

function YahooWeatherModule(location, callback) {
    BaseProvider.call(this, callback, location.tz);
    this.save_callback = callback;
    this.city_woeid = location.id;
    this.baseurl = "https://query.yahooapis.com/v1/public/yql";
    this.storeageId = YahooWeatherModule.class+this.city_woeid;
    let q = "?q=select item.forecast from weather.forecast where woeid = \""+this.city_woeid+"\" and u = \"c\"&format=json";
    this.url = this.baseurl+q;
}
