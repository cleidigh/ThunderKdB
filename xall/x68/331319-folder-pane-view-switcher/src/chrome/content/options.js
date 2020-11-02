
 var FPVSOptions = {
    mapping: [
        ["FolderPaneSwitcher-arrows-checkbox", "arrows", "bool"],
        ["FolderPaneSwitcher-delay-textbox", "delay", "string"],
        // Currently disabled
        //["FolderPaneSwitcher-drop-delay-textbox", "dropDelay", "int"],
    ],
    chkboxSt:{},
    menuChangeHandler: async function(event) {

        var menu_checkbox = event.target;
        menu_id = menu_checkbox.getAttribute("id");

        arrows_id = menu_id.replace('menu', 'arrows');
        var arrows_checkbox = document.getElementById(arrows_id);
        let status=document.getElementById(menu_id).checked;
        //arrows_checkbox.disabled=true;
        document.getElementById(arrows_id).disabled=true;
        if(menu_checkbox.checked)
        { //arrows_checkbox.disabled=false;
            document.getElementById(arrows_id).removeAttribute("disabled");
        }
        /*
        var menu_checkbox = event.target;
        menu_id = menu_checkbox.getAttribute("id");
        arrows_id = menu_id.replace('menu', 'arrows');
        var arrows_checkbox = document.getElementById(arrows_id);
        arrows_checkbox.disabled = ! menu_checkbox.hasAttribute("checked");
        */
    },

    loadPrefs: async function() {
        var i=0;
        mapping.forEach( async function(mapping) {

            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;



            switch (pref_type) {
            case "int":
                elt.value = await browser.fpvs_optionsAPI.getIntPref(pref);
                break;
            case "bool":
                elt.checked = await browser.fpvs_optionsAPI.getBoolPref(pref);
                if( elt_id.endsWith("_menu_checkbox")){
                var obj={
                    id :elt_id,
                    chkst:elt.checked
                };
                FPVSOptions.chkboxSt[i]=obj; i++;}
                break;
            case "string":
                elt.value = await browser.fpvs_optionsAPI.getStringVPref(pref);
                break;
            case "char":
                elt.value =  await browser.fpvs_optionsAPI.getCharPref(pref);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }

        });
    },

    gviews:null,
    onLoad: async function() {
        try{

      var lblckbx_shFPA = document.getElementById("lblckbx_showFPA");
      var lblFPV_dlytxtbx = document.getElementById("lbl_FPV-delay-textbox");
      var lbl_EnblDsbl= document.getElementById("lbl_EnblDsbl");
      lblckbx_shFPA.value=browser.i18n.getMessage("lblckbx_showFPA");
      lblFPV_dlytxtbx.value=browser.i18n.getMessage("lblnmbr_delayBFVS");
      lbl_EnblDsbl.value=browser.i18n.getMessage("lbl_EnblDsbl");

        browser.fpvs_optionsAPI.init();
        var btn_ok =document.getElementById("btn_accept");

        var btn_cancel =document.getElementById("btn_extra1");
        btn_cancel.addEventListener("click", function(event) {
            FPVSOptions.loadPrefs();
        });
        btn_ok.addEventListener("click", function(event) {
          FPVSOptions.validatePrefs();
        });
         mapping = FPVSOptions.mapping;
        var preferences = document.getElementById("fpvs-preferences");
          var table = document.getElementById("tbl_enbldsblViews");
             var  views = await browser.fpvs_optionsAPI.getViews();
             this.gviews=views;
            var row_position=0;
            for (var viewNum in views) {
            var row=table.insertRow(row_position);
            var cell1=row.insertCell(0);
            var cell2=row.insertCell(1);
            var cell3=row.insertCell(2);
            var prefName = "views." + viewNum + ".menu_enabled";
            var menu_checkbox = document.createElement("input");
            menu_checkbox.setAttribute('type','checkbox');
            var box_id = viewNum + "_menu_checkbox";
            menu_checkbox.setAttribute("id", box_id);
            mapping.push([box_id, prefName, "bool"]);
            if (views[viewNum]['name'] == "all") {
                // All Folders view can't be completely disabled.
                menu_checkbox.setAttribute("checked", true);
                menu_checkbox.disabled = true;
            }
            prefName = "views." + viewNum + ".arrows_enabled";
            var arrows_checkbox = document.createElement("input");
            arrows_checkbox.setAttribute('type','checkbox');
            box_id = viewNum + "_arrows_checkbox";
            arrows_checkbox.setAttribute("id", box_id);
            mapping.push([box_id, prefName, "bool"]);
            menu_checkbox.addEventListener("click",FPVSOptions.menuChangeHandler,true);
                cell1.appendChild(menu_checkbox);
                cell2.appendChild(arrows_checkbox);
           var label = document.createElement("label");
                    browser.fpvs_optionsAPI.viewsBranch();
                   var y = await browser.fpvs_optionsAPI.getStringPref(viewNum + ".display_name")
                   label.appendChild(document.createTextNode(y));
            cell3.appendChild(label);
            table.appendChild(row);
            row_position +1;
        }
       await FPVSOptions.loadPrefs();
       var i;
       try{
        mapping.forEach(function(mapping) {
            if (! mapping[0].endsWith("_menu_checkbox")) return;
            menu_checkbox=document.getElementById(mapping[0]);
            menu_id = menu_checkbox.getAttribute("id");
            arrows_id = menu_id.replace('menu', 'arrows');
            //let bool=menu_checkbox.hasAttribute("checked");

            for ( var num in FPVSOptions.chkboxSt){
            if (menu_id==FPVSOptions.chkboxSt[num]['id'])
            {
                     if(FPVSOptions.chkboxSt[num]['chkst'])
                    { //arrows_checkbox.disabled=false;
                        document.getElementById(arrows_id).removeAttribute("disabled");
                    }
                else{
                    console.log(FPVSOptions.chkboxSt[num]['chkst']);
                    document.getElementById(arrows_id).disabled=true;
                    }
                break;
            }
        }
/*
           FPVSOptions.menuChangeHandler(
                {'target': document.getElementById(mapping[0])});
*/

        });
    }
    catch(err){
        console.error(err);
    }
}

catch(err)
{
    alert(err) ;
}
    },

    validatePrefs: function(event) {
        try{
        FPVSOptions.mapping.forEach(function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                browser.fpvs_optionsAPI.setIntPref(pref, elt.value);
                break;
            case "bool":
                browser.fpvs_optionsAPI.setBoolPref(pref, elt.checked);
                break;
            case "string":
                browser.fpvs_optionsAPI.setStringPref(pref, elt.value);
                break;
            case "char":
                browser.fpvs_optionsAPI.setCharPref(pref, elt.value);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });}
        catch(err){
            throw new Error(err);
        }
        observer();
        return true;
    }
};
var observer =  async function (){
    gviews=await browser.fpvs_optionsAPI.getViews();
    for (var name in gviews) {
        view = gviews[name];
         browser.fpvs_api.observe("", "",
                   name + '.menu_enabled');
      }
}
window.addEventListener("load",FPVSOptions.onLoad,true);