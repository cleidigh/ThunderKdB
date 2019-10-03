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

var EXPORTED_SYMBOLS = ['CombinedWeatherModule'];



CombinedWeatherModule.prototype.requestForecast = function(){
    //reset forecast_cache
    this.forecast_cache  = new Map(this.modules.map(m => [m.storeageId, null]));
    for(let module of this.modules){
        module.requestForecast();
    }
};

CombinedWeatherModule.prototype.dummycallback = function(module, forecast){
    this.forecast_cache.set(module.storeageId, forecast);

    let all_modules_done = true;
    for(let f of this.forecast_cache.values()){
        if(f == null){
            all_modules_done = false;
        }
    }
    if(all_modules_done){
        let combined_forecast = new Forecast([]);
        for(let forecast of this.forecast_cache.values()){
            combined_forecast.combine(forecast);
        }
        this.save_callback(combined_forecast)
    }
};

CombinedWeatherModule.class = "combined";
function CombinedWeatherModule(city, submodules, callback) {
    this.save_callback = callback;

    this.modules = submodules;
    this.city_id = city;
    this.storeageId = CombinedWeatherModule.class+this.city_id;
    this.forecast_cache = undefined;


    for(let module of this.modules){
        module.save_callback = this.dummycallback.bind(this, module);
    }
}


