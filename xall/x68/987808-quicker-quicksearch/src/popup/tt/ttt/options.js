/*
 * License:  see License.txt

 * Code  for TB 78 or later: Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
 
 * Copyright: Klaus Buecher/opto 2021
 * Contributors:  see Changes.txt
 */


var bgrPage = null ;

let dataSet = null;
/*
bgrPage =  messenger.runtime.getBackgroundPage();
window.setTimeout( ()=>{let zzz=0;}, 300);
if (!bgrPage.dataSet) console.log("no bgr page after start delay", bgrPage);
dataSet = bgrPage.dataSet;
*/


async function onLoad(event) {
  //console.log("loaded");
  bgrPage =  await messenger.runtime.getBackgroundPage();
  if (!bgrPage.dataSet) console.log("onLoad", bgrPage);
  dataSet = bgrPage.dataSet;
  var saveBtn = document.getElementById("saveTable");
  //    console.log(saveBtn);
  saveBtn.addEventListener("click", save, true);
  //    console.log(saveBtn);
  var addBtn = document.getElementById("addInp");
  addBtn.addEventListener("click", addRow, true);  
  showTable();
  //    await preferences.init(); 
  }
  
  document.addEventListener("DOMContentLoaded", onLoad, false);
  


const createdCell = function(cell, cellData, rowData, rowIndex, colIndex) {
    let original;
   // console.log(cell);
    if (colIndex==2) {
      cell.addEventListener('click', function(e) {
        const row = table.row(e.target.parentElement);
//        console.log('Row changed: ', row);
//        console.log('Row index: ', rowIndex);
        bgrPage.dataSet.splice(rowIndex,1);
//        console.log(bgrPage.dataSet);
//        console.log(table);
        row.remove().draw();
        table.rows().invalidate().draw();
       // row.invalidate();
      });
 
      }   
    if (colIndex!=2) {
    cell.setAttribute('contenteditable', true)
    cell.setAttribute('spellcheck', false)
    //cell.setAttribute('style', "{  white-space: normal;}");
  
    cell.addEventListener('focus', function(e) {
      original = e.target.textContent
    })
  
    cell.addEventListener('blur', function(e) {
      if (original !== e.target.innerText) {
        const row = table.row(e.target.parentElement);
        let jj = 0;
        let str = e.target.innerText;
        for (jj= 0; jj < str.length;jj++ )  console.log(" ", str.charCodeAt(jj,1));
   //console.log(row);
   //bgrPage.dataSet[rowIndex][colIndex]= e.target.innerText;
   dataSet[rowIndex][colIndex]= e.target.innerText;
   //row.invalidate();
   //table.rows().invalidate().draw();
 //       console.log('Row changed: ', row.data())
      }
    })

  }
  }
 var table  = null; 

async function save(event) {

//    console.log("table");
//    console.log(table.data().toArray());
    dataSet = table.data().toArray();
//    console.log(bgrPage.dataSet);
//    console.log(bgrPage);
    let prefJson = JSON.stringify(table.data().toArray());
//    preferences.setPref("dataSet",prefJson );
//browser.storage.set("dataSet",prefJson);
  //  bgrPage.saveDataset(dataSet);
  messenger.runtime.sendMessage({
    dataSetValues: dataSet
  });
}


async function onLoad(event) {
//console.log("loaded");
bgrPage =  await messenger.runtime.getBackgroundPage();
if (!bgrPage.dataSet) console.log("onLoad", bgrPage);
dataSet = bgrPage.dataSet;
    var saveBtn = document.getElementById("saveTable");
//    console.log(saveBtn);
    saveBtn.addEventListener("click", save, true);
//    console.log(saveBtn);
    var addBtn = document.getElementById("addInp");
    addBtn.addEventListener("click", addRow, true);  
    console.log("before showtable", dataSet);
    showTable();
//    await preferences.init(); 
}

document.addEventListener("DOMContentLoaded", onLoad, false);

async function showTable() {
/*
bgrPage =  await messenger.runtime.getBackgroundPage();
if (!bgrPage.dataSet) console.log("showTable", bgrPage);
dataSet = bgrPage.dataSet;
*/

setTimeout( function() {
  let z=0;;
}, 200);



$(document).ready(function() {



  table = $('#example1').DataTable(
        {
            "pageLength": 25,
            data: dataSet,
       //     "dom": '<"wrapper"lf><t>p',
       columnDefs: [{ 
        targets: '_all',
        createdCell: createdCell
      }],
             columns:[
                {title: "Shortcut text", width: "20%"},
                {title: "Replacement text"},
                {
                  width: "8%",
          //        data: "ID",
                  render:function (data, type, row) {
                          return `<button class='delete' >delete</button>`;
              }
            }
                 ]

        }
    );
    setTimeout( function() {
        $('.dataTables_filter').addClass('pull-right');
        $('.dataTables_length').addClass('pull-left');
    }, 200);



//    console.log (table);
//    console.log(table.data().toArray());


  });


} 



async function addRow(event) {
  let key = document.getElementById("shortcutInp");
  let repl = document.getElementById("repInp");
  table.row.add([key.value, repl.value.replaceAll("\n", "<br/>"), ""]).draw();
};


//);


