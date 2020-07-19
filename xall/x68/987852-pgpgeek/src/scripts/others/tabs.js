
displayTab = function(id){
    itemsTab = document.getElementsByClassName('inactiveTab');
    for (var i in itemsTab){
        if (typeof itemsTab[i] != 'object') 
            continue;
        itemsTab[i].setAttribute('class', 'inactiveTab');
    }
    $(id).setAttribute('class', 'inactiveTab activeClass');
};

$('#actions-tab').addEventListener('click',     displayTab.bind(null,   '#box-actions'));
$('#settings-tab').addEventListener('click',    displayTab.bind(null,   '#box-settings'));
$('#others-tab').addEventListener('click',      displayTab.bind(null,   '#box-others'));