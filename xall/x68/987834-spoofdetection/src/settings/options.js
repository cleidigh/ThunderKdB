const DEFAULT_VALUES = {
    local_only : false,
    api_value : 2,
    spf_value : 10,
    origin_value : 10,
    bl_value : 20,
    tz_value : 5,
    needed_score : 15
};

/*
 *  setting the listeners which are used
 */
function setup_listeners() {
    document.body.addEventListener("change", update_shown_Values);
    document.getElementById("standard").addEventListener("click", () => {
        resetValues();
        update_shown_Values();
    });
    document.getElementById("save").addEventListener("click", () => {
        update_Prefs();
    });
}

/*
 *  loading the prefs when the page is called to show the current values
 */
async function load_Prefs() {
    let prefs = await browser.storage.local.get("Prefs");
    let settings = prefs.Prefs;
    if (settings != null && settings != undefined){
        for (let key of Object.keys(settings)){
            let elem = document.getElementById(key);
            if (!elem) {
                continue;
            }
            if (elem.type == "checkbox") {
                elem.checked = settings[key];
            } else {
                elem.value = settings[key];
            }
        }
    }else{
        resetValues();
    }
    update_shown_Values();
}

/*
 * updates the values shown in the label
 */
function update_shown_Values(){
    document.getElementById("spfVal").innerHTML = document.getElementById("spf_slider").value;
    document.getElementById("tzVal").innerHTML = document.getElementById("tz_slider").value;
    document.getElementById("blVal").innerHTML = document.getElementById("bl_slider").value;
    document.getElementById("oriVal").innerHTML = document.getElementById("origin_slider").value;
    document.getElementById("apiVal").innerHTML = document.getElementById("api_slider").value;
    document.getElementById("neededScore").innerHTML = document.getElementById("needed_score_slider").value;
}


/*
 * resets the values of the sliders and checkbox to the standard values given in DEFAULT_VALUES
 */
function resetValues(){
    document.getElementById("localOnly").checked = DEFAULT_VALUES.local_only;
    document.getElementById("spf_slider").value = DEFAULT_VALUES.spf_value;
    document.getElementById("tz_slider").value = DEFAULT_VALUES.tz_value;
    document.getElementById("bl_slider").value = DEFAULT_VALUES.bl_value;
    document.getElementById("origin_slider").value = DEFAULT_VALUES.origin_value;
    document.getElementById("api_slider").value = DEFAULT_VALUES.api_value;
    document.getElementById("needed_score_slider").value = DEFAULT_VALUES.needed_score;
}

/*
 *  Read changed values, show the new values and then store under `prefs` in the local storage
 */
function update_Prefs() {
    let prefs = {
        //string     aString: document.getElementById("aNumber").value
        //integer    aNumber: parseInt(document.getElementById("aNumber").value, 10)
        //boolean    aboolean: document.getElementById("aboolean").checked

        localOnly: document.getElementById("localOnly").checked,
        spf_slider: document.getElementById("spf_slider").value,
        tz_slider: document.getElementById("tz_slider").value,
        bl_slider: document.getElementById("bl_slider").value,
        origin_slider: document.getElementById("origin_slider").value,
        api_slider: document.getElementById("api_slider").value,
        needed_score_slider: document.getElementById("needed_score_slider").value
    };
    browser.storage.local.set({"Prefs": prefs});
}

document.addEventListener("DOMContentLoaded", setup_listeners);
document.addEventListener("DOMContentLoaded", load_Prefs);