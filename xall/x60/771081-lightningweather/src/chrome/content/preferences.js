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

var providers = {};
Components.utils.import("chrome://lightningweather/content/providers/openweather.js", providers);
//Components.utils.import("chrome://lightningweather/content/providers/yahoo.js", providers);
Components.utils.import("chrome://lightningweather/content/providers/darksky.js", providers);
//Cu.import("chrome://lightningweather/content/providers/combined.js", providers);

Components.utils.import("chrome://lightningweather/content/Forecast.js");
Components.utils.import("resource://gre/modules/Log.jsm");
let logger = Log.repository.getLogger("lightningweather.preferences");

var NO_RESULTS_VALUE = "_";

lightningweather_prefs = {

    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.lightningweather."),

    provider_list: [],
    selected_provider: null,
    query: "Graz, AT",

    onLoad: function(){
        logger.debug("PREFERENCE window loaded"+window.buttons+document.buttons);
        for(let provider in providers){
            if( providers.hasOwnProperty( provider ) && provider != "CombinedWeatherModule") {
                this.provider_list.push(providers[provider])
            }
        }

        // instantiate
        this.geolookup = new GeoLookup();
        this.location_list = document.getElementById("location_list");
        let provider_list_inp = document.getElementById('provider_list');
        for(let provider of this.provider_list){
            provider_list_inp.appendItem(provider.class, provider.class, provider.class+" Weather API");
        }
        let unit_list = document.getElementById("unit_control");

        // retrieve default values
        let default_provider_idx = 0;
        try{
            this.query = this.prefs.getCharPref("location_query");
            let provider_instance_description = JSON.parse(this.prefs.getCharPref("provider"));
            default_provider_idx = this.provider_list.findIndex(p => p.class == provider_instance_description.provider_name);
            if(default_provider_idx == -1) {
                default_provider_idx = 0;
            }
            var selected_location = provider_instance_description.location;
        }catch(e) {
            default_provider_idx = this.provider_list.findIndex(p => p.class == "yahoo");
            this.query = "Graz, AT";
        }
        let default_unit_idx = 0;
        try {
            let default_unit = this.prefs.getCharPref("units");
            logger.debug("previously saved unit: " + default_unit);
            for(let i=0; i < unit_list.itemCount; i++){
                if(unit_list.getItemAtIndex(i).value == default_unit){
                    default_unit_idx = i;
                    logger.debug("found saved index: " + default_unit_idx);
                }
            }
        }catch(e) {}

        // populate window based on default values
        this.location_list.inputField.placeholder = this.query;
        provider_list_inp.selectedIndex = default_provider_idx;
        provider_list_inp.doCommand();

        unit_list.selectedIndex = default_unit_idx;

        this.geolookup.locations(this.query, function(locations){
            this.setLocationList(locations);
            // find the old saved location on the basis of the geo location and select it
            let default_location_idx = locations.findIndex(function(e, i){
                let this_location = JSON.parse(e[1]).geo;
                return (this_location.latitude == selected_location.geo.latitude &&
                        this_location.longitude == selected_location.geo.longitude);
            }.bind(this));
            this.location_list.selectedIndex = default_location_idx;
            this.location_list.menupopup.hidePopup();
        }.bind(this));
    },
    onclick: function(event){
        this.location_list.value = this.query;
        //this.location_list.select();
    },
    providerSelected: function(event){
        this.selected_provider = this.provider_list[event.currentTarget.selectedIndex];
        let container = document.getElementById("copyright_info");
        while(container.firstChild)
            container.removeChild(container.firstChild);
        if(this.selected_provider.copyright_info){
            let copyright_info = "<box xmlns:html='http://www.w3.org/1999/xhtml' xmlns='http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'>"+this.selected_provider.copyright_info+"</box>";
            var parser = new DOMParser();
            let copyright_info_node = parser.parseFromString(copyright_info, "text/xml").documentElement;
            container.appendChild(copyright_info_node);
        }
    },

    locationQueryChanged: function(event){
        this.query = event.currentTarget.value;
        logger.debug("location_query changed: "+ this.query);
        this.updateLocationList(this.query);
    },

    updateLocationList: function(user_input){
        if(!user_input || user_input.length < 3){
            this.setLocationList([]);
            return;
        }
        this.geolookup.locations(user_input, this.setLocationList.bind(this));
    },

    setLocationList: function(locations){
        let count = this.location_list.itemCount;
        while(count-- > 0){
            this.location_list.removeItemAt(0);
        }
        if(locations == undefined){
            this.location_list.appendItem("error occured", NO_RESULTS_VALUE);
        }else if(locations.length == 0){
            this.location_list.appendItem("no results", NO_RESULTS_VALUE);
        }else{
            locations.forEach(function(e, i){
                this.location_list.appendItem(e[0], e[1], e[2]);
            }.bind(this));
        }
        this.location_list.menupopup.openPopup(this.location_list, "after_start", 0,0,true);
    },

    locationSelected: function(event){
        let selected_item = event.target.selectedItem;
        if(!selected_item || selected_item.value == NO_RESULTS_VALUE){
            logger.debug("No results Clear Selection");
        }else{
            logger.debug("location selected "+selected_item.label+" - "+ selected_item.value);
            this.query = selected_item.label;
        }
    },

    apply: function(){
        let unit_list = document.getElementById("unit_control");
        logger.debug("save unit: " + unit_list.selectedItem.value);
        this.prefs.setCharPref("units", unit_list.selectedItem.value);

        let selected_location = this.location_list.selectedItem;
        if(selected_location && selected_location.value != NO_RESULTS_VALUE){
            logger.debug("save Prefs");
            this.prefs.setCharPref("provider", JSON.stringify({"provider_name":this.selected_provider.class,"location": JSON.parse(selected_location.value)}));
            this.prefs.setCharPref("location_query", this.query);
            logger.info("SAVE "+this.prefs.getCharPref("provider"));
            return true;
        }else{
            let error_msg_elem = document.getElementById("error_msg_container");
            if(this.location_list.itemCount == 0 || this.location_list.getItemAtIndex(0).value == NO_RESULTS_VALUE){
                error_msg_elem.innerHTML = "Please enter a valid query";
                error_msg_elem.openPopup(this.location_list);
            }else{
                error_msg_elem.innerHTML = "Please select a location";
                error_msg_elem.openPopup(this.location_list);
            }

            window.setTimeout(function(){error_msg_elem.hidePopup()}, 1000);
            return false;
        }
    }
};
