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

var EXPORTED_SYMBOLS = ['Forecast', 'BaseProvider', 'GeoLookup'];

Components.utils.import("resource://gre/modules/Log.jsm");
let logger = Log.repository.getLogger("lightningweather.forecast");

Components.utils.importGlobalProperties(["XMLHttpRequest"]);

/* A ForecastElement is an obj with the following attributes
 ForecastElement(){
 this.weather
 this.timestamp
 this.published
 this.period
 this.nestedForecast
 }
 */


/*** mergeForecastElements
 *
 * merges two ForecastElement objects into one
 * This does not make a copy it manipulates one of the input parameters
 * @param e1
 * @param e2
 * @returns {*}
 */
function mergeForecastElements(e1, e2) {
    if (e1 == null) {
        return e2;
    } else if (e2 == null) {
        return e1;
    }

    if (e1.timestamp != e2.timestamp || e1.period != e2.period) {
        return;
    }

    let merged, other = null;
    if (e1.published > e2.published) {
        merged = e1;
        other = e2;
    } else {
        merged = e2;
        other = e1;
    }

    // merge nested Forecast if exists
    let nestedForecast = null;
    if (merged.nestedForecast != null && other.nestedForecast != null) {
        merged.nestedForecast.combine(other.nestedForecast);
    } else if (merged.nestedForecast == null) { // if newer has no nested Forecast use the one from older element
        merged.nestedForecast = other.nestedForecast;
    }
    return merged
}

/*
    A Forecast is a Sequence of ForecastElements
 */
var IForecast = {
    forEach: function (func) {
        this._data.forEach(func);
    },
    forEachFlat: function (func) {
        this._data.forEach(function (elem) {
            func(elem);
            if (elem.nestedForecast) {
                elem.nestedForecast.forEachFlat(func)
            }
        });
    },
    forEachFrom: function (start_timestamp, func) {
        this.forEach(function (elem) {
            if (elem.timestamp >= start_timestamp) {
                func(elem)
            }
        })
    },

    combine: function (other) {
        if (!(other instanceof Forecast)) {
            other = new Forecast(other);
        }

        if (other.granularity != undefined && this.granularity != undefined && other.granularity != this.granularity) {
            logger.info("cannot combine, granularity is different " + other.granularity + " != " + this.granularity);
            return;
        }
        other.forEach(function (elem) {
            this.add(elem);
        }.bind(this));
    },
    add: function (elem) {
        let i = this._data.findIndex(function (e) {
            return (e.timestamp > elem.timestamp)
        });
        if (i === -1) { // no element in self._data is later than elem
            if (this._data.length > 0 && this._data[this._data.length - 1].timestamp == elem.timestamp) {  // last element of self._data can be equal
                logger.trace("merge last " + (new Date(this._data[this._data.length - 1].timestamp)).toUTCString() + " with " + (new Date(elem.timestamp)).toUTCString());
                elem = mergeForecastElements(this._data[this._data.length - 1], elem);
                this._data[this._data.length - 1] = elem;
            } else {  // all elements are earlier
                logger.trace("append " + (new Date(elem.timestamp)).toUTCString());
                this._data.push(elem);
            }
        } else if (i === 0) { // all elements in self._data are later than elem
            logger.trace("prepend " + (new Date(elem.timestamp)).toUTCString() + " to " + (new Date(this._data[0].timestamp)).toUTCString());
            this._data.splice(0, 0, elem);
        } else if (i > 0) {
            if (this._data[i - 1].timestamp == elem.timestamp) {
                logger.trace("merge " + (new Date(this._data[i - 1].timestamp)).toUTCString() + " at " + (i - 1) + " with " + (new Date(elem.timestamp)).toUTCString());
                elem = mergeForecastElements(this._data[i - 1], elem);
                this._data[i - 1] = elem;
            } else {
                logger.trace("insert " + (new Date(elem.timestamp)).toUTCString());
                this._data.splice(i, 0, elem);
            }
        }
    },
    limitTo: function (start_datetime, end_datetime) {
        let start_timestamp = start_datetime.getTime();
        let end_timestamp = end_datetime.getTime();
        this.sort();
        this._data = this._data.filter(function (elem) {
            if (elem.timestamp < start_timestamp || elem.timestamp > end_timestamp) {
                return false;
            }
            return true;
        })
    },

    sort: function () {
        this._data.sort(function (a, b) {
            if (a.timestamp < b.timestamp) {
                return -1;
            } else if (a.timestamp > b.timestamp) {
                return 1;
            } else {
                return 0;
            }
        });
    },

    setData: function (data) {
        if (data != null && Array.isArray(data)) {
            this._data = data;
            this._data.forEach(function (elem) {
                if (elem.nestedForecast != null && !(elem.nestedForecast instanceof Forecast)) {
                    elem.nestedForecast = new Forecast(elem.nestedForecast);
                }
            });
            this.sort();
            //this.updateGranularity();
        } else {
            logger.info("setData: not valid data " + data)
        }
    },

    toString: function () {
        return "[" + this._data.reduce(function (s, e) {
                return s + e.timestamp + ", ";
            }, "Forecast: ") + "]";
    },

    toJSON: function () {
        return this._data;
    },
    age: function () {
        let most_recent = (new Date(0)).getTime();
        this.forEachFlat(function (elem) {
            if (elem.published >= most_recent) {
                most_recent = elem.published
            }
        });
        return most_recent;
    }
};

Object.defineProperties(IForecast, {
    "length": {
        "get": function () {
            return this._data.length;
        }
    }
});

Object.defineProperties(IForecast, {
    "granularity": {
        "get": function () {
            if (this._data.length == 0) {
                return undefined;
            } else if (this._data.length > 0 && this._data[0].period != undefined) {
                return this._data.every(e => (e.period == this._data[0].period)) ? this._data[0].period : -1;
            } else {
                return -1;
            }
        }
    }
});


/*** Forecast constructor
 *
 * A Forecast obj is the main data holder
 * It enhances a list of ForecastElements with functions for merging
 *
 * @param data: list of ForecastElements
 * @constructor
 */
Forecast.prototype = IForecast;
function Forecast(data) {
    let self = this;
    this._data = [];

    this.setData(data);
    this.sort();
    //this.updateGranularity();
}


let provider_logger = Log.repository.getLogger("lightningweather.provider");

BaseProvider.prototype.error = function () {
    provider_logger.info("request error " + this.req.status + " -- " + this.req.statusText);
    this.save_callback(new Forecast())
};
BaseProvider.prototype.success = function (event) {
    provider_logger.debug("got response ");
    let forecast = this.parseForecast(event.currentTarget);
    provider_logger.info("got forecast of length " + forecast.length);
    this.save_callback(forecast);
};
BaseProvider.prototype.requestForecast = function () {
    if (this.url == null) {
        provider_logger.error("City not given");
        this.save_callback(new Forecast())
    }
    if (this.req.readyState != 0 && this.req.readyState != 4) {
        provider_logger.trace("request already running - state: " + this.req.readyState);
        return;  // already waiting for a response -> no need to request it again
    }
    provider_logger.debug("going to request: " + this.url);
    this.req.open("GET", this.url);
    this.req.send();
    provider_logger.info("request sent");
};
BaseProvider.prototype.parseForecast = function () {
    throw "NOT IMPLEMENTED"
};

function BaseProvider(callback, tz) {
    this.tz = tz;
    this.save_callback = callback;
    this.storeageId = Math.floor(Math.random() * 1000).toString(36);
    this.req = new XMLHttpRequest();
    this.req.timeout = 5000;
    this.req.addEventListener("error", this.error.bind(this));
    this.req.addEventListener("abort", this.error.bind(this));
    this.req.addEventListener("timeout", this.error.bind(this));
    this.req.addEventListener("load", this.success.bind(this));
}


function GeoLookup() {
    this.req = new XMLHttpRequest();
    this.req.timeout = 2000;
}
GeoLookup.prototype.error = function (callback, event) {
    provider_logger.debug("request error " + this.req.status + " -- " + this.req.statusText);
    callback([]);
    // clone request to remove all eventListeners
    let new_req = new XMLHttpRequest();
    new_req.timeout = this.req.timeout;
    this.req = new_req;
};
GeoLookup.prototype.success = function (callback, event) {

    let locations = this.parseLocations(event.currentTarget);
    callback(locations);
    // clone request to remove all eventListeners
    let new_req = new XMLHttpRequest();
    new_req.timeout = this.req.timeout;
    this.req = new_req;
};

GeoLookup.prototype.locations = function (query, callback) {

	let params =      "?" + "app_id=xYsBmRETfFtFtIe1ZKUb";
	params = params + "&" + "app_code=TDDQb0gn-Dmo3WqGPee_Og";
    params = params + "&" + "gen=9";
    params = params + "&" + "searchtext=" + query;
    params = params + "&" + "locationattributes=adminInfo,timeZone";

    if (this.req.readyState != 0 && this.req.readyState != 4) {
        provider_logger.debug("request already running - state: " + this.req.readyState);
        this.req.abort();
    }
    this.req.addEventListener("error", this.error.bind(this, callback));
    this.req.addEventListener("abort", this.error.bind(this, callback));
    this.req.addEventListener("timeout", this.error.bind(this, callback));
    this.req.addEventListener("load", this.success.bind(this, callback));
    this.req.open("GET", "https://geocoder.api.here.com/6.2/geocode.json" + params);
    this.req.send();
};

GeoLookup.prototype.parseLocations = function (http_response) {
    let result_locations = [];
    try {
        const response = JSON.parse(http_response.responseText);
        if (response.Response == undefined) {
            provider_logger.info("ERROR: " + http_response.responseText);
            return [];
        }
        if (response.Response.View.length == 0) {
            return [];
        }
	    result_locations = response.Response.View[0].Result;
    } catch (e) {
        provider_logger.error(e);
        return [];
    }
    let locations = result_locations.map(function (location) {
		let geo = { "latitude":location.Location.DisplayPosition.Latitude, "longitude":location.Location.DisplayPosition.Longitude};
		let name = location.Location.Address.Label;
		let tz = location.Location.AdminInfo.TimeZone.id;
		let id = location.Location.LocationId;
		
		return [name, JSON.stringify({'geo': geo, 'id': id, 'tz': tz}), name];
	});
    return locations;
};
