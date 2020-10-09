var index=0;
var pendingReports=new Set();
var updateInterval=null;
var lastUpdate=Date.now();
var buttonListenersSet=false;
var pageNumber=1;
var pageLength=0;
var numberOfPages=0;
var reports=[];
var worker;

function sortReports(reports) {
    reports.sort(function(a,b){
        var aT=Math.floor(a.time/1000);
        var bT=Math.floor(b.time/1000);
        var aST=a.status.time ? Math.floor(a.status.time/1000) : null;
        var bST=b.status.time ? Math.floor(b.status.time/1000) : null;
        if (!aST || !bST || aST==bST)
            return aT < bT ? 1 : (aT > bT ? -1 : 0);
        else return aST < bST ? 1 : (aST > bST ? -1 : 0);
    });
    return reports;
}

function selectRow(event) {
    void 0;
    var row=event.currentTarget;
    row.querySelector('checkbox').checked=!row.querySelector('checkbox').checked;
}

function selectOnColumn(event) {
    void 0;
    var elements=document.elementsFromPoint(event.clientX, event.clientY);
    var found=false;
    for (var i=0;found===false && i<elements.length;i++) {
        if (elements[i].className==="selectRow" && elements[i].localName==="checkbox") {
            found=true;
            elements[i].checked=!elements[i].checked;
        }
    }
}

function displayReports(first,number,reports) {
    var stringsBundle = opener.Services.strings.createBundle("chrome://spambee/locale/spambee.properties");
    hideSpinner();
    document.querySelector("window#spambee-reports hbox vbox vbox.TableAndStatus grid.minimalistBlack.tableAndStatus columns column").onclick=selectOnColumn;
    document.getElementById('pageNumber').value=pageNumber;
    document.getElementById('numberPages').value=numberOfPages;
    var j=2;
    for (var i=first;j<=number+1;i++,j++) {
        var report=reports[i];
        var row=document.querySelector('.minimalistBlack>rows>row:nth-child('+j+')');
        if (!report) {
            var select=row.querySelector('checkbox');
            select.collapsed=true;
            select.checked=false;
            select.id="";
            var cells=row.querySelectorAll('description');
            cells[0].value="";
            cells[1].value="";
            cells[2].value="";
            cells[3].value="";
            var s=cells[4];
            s.value="";
            s.tooltip="";
            s.className="reportStatus";
            continue;
        }
        row.querySelector('checkbox').collapsed=false;
        row.querySelector('checkbox').id=i;
        row.querySelector('checkbox').checked=false;
        row.onclick=selectRow;
        var cells=row.querySelectorAll('description');
        cells[0].value=report.time.toLocaleDateString()+" "+report.time.toLocaleTimeString();
        cells[1].value=report.sender;
        cells[2].value=report.subject;
        var s=cells[4];
        if (report.status) {

            if (report.status.time)
                cells[3].value=report.status.time.toLocaleDateString()+" "+report.status.time.toLocaleTimeString();
            else cells[3].value="";
            s.className=report.status.status+" reportStatus";
            s.value=stringsBundle.GetStringFromName('spambee.reports.status.'+report.status.status);
            s.tooltipText=stringsBundle.GetStringFromName('spambee.reports.status.'+report.status.status+'Description');
        } else {
            s.value="";
            s.tooltip="";
            s.className="reportStatus";
        }
    }
    if (numberOfPages===1)
        document.querySelector('#pageNumber').disabled=true;
    else {
        document.querySelector('#pageNumber').disabled=false;
        document.querySelector('#pageNumber').onchange=changePage;
    }
    if (pageNumber>=numberOfPages) {
        document.querySelector('.lastPage').collapsed=true;
        document.querySelector('.nextPage').collapsed=true;
    } else {
        document.querySelector('.lastPage').collapsed=false;
        document.querySelector('.nextPage').collapsed=false;
    }
    if (pageNumber<=1) {
        document.querySelector('.firstPage').collapsed=true;
        document.querySelector('.prevPage').collapsed=true;
    } else {
        document.querySelector('.firstPage').collapsed=false;
        document.querySelector('.prevPage').collapsed=false;
    }
}

function firstPage() {
    index=0;
    pageNumber=1;
    displayReports(index,pageLength,reports);
}

function prevPage() {
    if (index+1-pageLength<=0)
        return;
    index-=pageLength;
    pageNumber--;
    displayReports(index,pageLength,reports);    
}

function nextPage() {
    if (index+pageLength>=reports.length)
        return;
    index+=pageLength;
    pageNumber++;
    displayReports(index,pageLength,reports);
}

function lastPage() {
    var lastIndex=(numberOfPages-1)*pageLength;
    if (index>=lastIndex)
        return;
    index=lastIndex;
    pageNumber=numberOfPages;
    displayReports(index,pageLength,reports);   
}

function changePage() {
    var p=parseInt(document.querySelector('#pageNumber').value);
    if (p<=0 || p>numberOfPages)
    {
        document.querySelector('#pageNumber').value=pageNumber;
        return;
    }
    index=(p-1)*pageLength;
    pageNumber=p;
    displayReports(index,pageLength,reports);
}

function deleteSelection() {
    var selection=document.querySelectorAll('grid.minimalistBlack.tableAndStatus > rows > row > checkbox[checked=true]');
    var UIDList;
    UIDList=[];
    for (var i=selection.length-1;i>=0;i--) {
        var s=selection[i];
        if (s && s.id) {
            var id=parseInt(s.id);
            if (s.id.length===0 || id > reports.length || id<0 || !reports[id])
                continue;
            UIDList.push(reports[id].UID);
        }
    }
    void 0;
    if (UIDList.length>0) {
        worker.postMessage({reports:UIDList},{channel:"deleteReports"});
        displaySpinner();
    }
}

function requireUpdate(oldStatus, newStatus) {
    oldStatus=translateStatus(oldStatus);
    newStatus=translateStatus(newStatus);
    if (oldStatus===newStatus)
        return false;
    if (oldStatus==="pending")
        return true;
    var priorities={"phishing":5,"legit":4,"spam":5,"scam":5,"suspect":3,"unknown":2,"pending":1};
    if (priorities[oldStatus]<priorities[newStatus])
        return true;
    else return false;
}

function translateStatus(status) {
    var translations={
        "positive":"phishing",
        "negative":"legit",
        "whitelisted":"legit",
        "suspect":"suspect",
        "pending":"pending",
        "unknown":"unknown",
        "phishing":"phishing",
        "legit":"legit",
        "analysing":"pending",
        "scam":"scam",
        "spam":"spam"
    };
    return (translations[status] || "pending");
}

function displaySpinner() {
    document.getElementById('spinner').hidden=false;
    document.getElementById('spinner').collapsed=false;
}

function hideSpinner() {
    document.getElementById('spinner').hidden=true;
    document.getElementById('spinner').collapsed=true;
}

var reportsLoadedListener=false;
function loadReports() {
    displaySpinner();
    if (reportsLoadedListener===false) {
        reportsLoadedListener=true;
        worker.addListener("reportsLoaded",function(items){
            lastUpdate=Date.now();
            reports=[];
            var beforeTimeStamp=Date.now()-(90*1000);
            var willUpdate=false;
            items=items.reports;
            if (items) {
                void 0;
                for (var i=0;i<items.length;i++) {
                    var reportTime=items[i].time || items[i].reportId;
                    if (!items[i].feedbackTime)
                        items[i].feedbackTime=null;
                    reports.push({
                        id:i,
                        UID:items[i].UID,
                        time:new Date(reportTime),
                        sender:items[i].sender,
                        subject:items[i].subject,
                        status:items[i].status ? {
                            time:new Date(items[i].feedbackTime),
                            status:translateStatus(items[i].status)
                        } : {
                            time:null,
                            status:"pending"
                        }
                    });
                    if (!items[i].status || items[i].status==='pending') {
                        pendingReports.add(items[i].UID);
                        if (reportTime < beforeTimeStamp)
                            willUpdate=true;
                    }
                }
                reports=sortReports(reports);
            }
            pageLength=document.querySelectorAll('.minimalistBlack>rows>row').length-1;
            numberOfPages=Math.ceil(reports.length/pageLength);
            firstPage();
            if (pendingReports.size>0 && willUpdate)
                updateInterval=setTimeout(updateReports,30000);
        });
    }
    worker.postMessage({},{channel:"loadReports"});
    if (buttonListenersSet===false) {
        document.querySelector('.firstPage').onclick=firstPage;
        document.querySelector('.prevPage').onclick=prevPage;
        document.querySelector('.nextPage').onclick=nextPage;
        document.querySelector('.lastPage').onclick=lastPage;
        var deleters=document.querySelectorAll('.deleteRows');
        for (var i=0;i<deleters.length;i++)
            deleters[i].onclick=deleteSelection;
        document.querySelector('#pageNumber').onclick=changePage;
        buttonListenersSet=true;
    }
}

function findReportIndex(reportUID) {
    var index=reports.findIndex(function(element){
       return element.UID===reportUID;
    });
    if (index>=0)
        return index;
    else return null;
}

function updateReports(JSONList) {
    try {
        var updates=false;
        clearTimeout(updateInterval);
        updateInterval=-1;
        var _finally = function() {
            toProcess--;
            if (toProcess<=0 && updates) {
                loadReports();
            }
            if (updateInterval>0)
                clearTimeout(updateInterval);
            try {
                updateInterval=setTimeout(updateReports,60000);
            } catch(e) {
                void 0;
            }
        };
        var toProcess=JSONList ? JSONList.length : pendingReports.size;
        var applyUpdates=function(JSONresponse) {
            if (JSONresponse && JSONresponse.length>0) {
                for (var i=0;i<JSONresponse.length;i++) {
                    var reportStatus=JSONresponse[i];
                    if (translateStatus(reportStatus.s)!=="pending") {
                        void 0;
                        pendingReports.delete(reportStatus.UID);
                        var index=findReportIndex(reportStatus.UID);
                        if (index!==null) {
                            if (reports[index].status && requireUpdate(reports[index].status.status,reportStatus.s))
                                updates=true;
                            _finally();
                        } else {
                            updates=true;
                            return _finally();
                        }
                    } else {
                        void 0;
                        _finally();
                    }
                }
            } else {
                toProcess=0;
                _finally();
            }
        };
        if (toProcess>0) {
            applyUpdates(JSONList)
        } else {
            updateInterval=null;
        }
    } catch(e) {
        void 0;
        updateInterval=setTimeout(updateReports,60000);
    }
}

function reportsUpdateMsgHandler(message) {
    if (updateInterval===-1) {
        updateInterval=setTimeout(reportsUpdateMsgHandler.bind(this,message),10000); 
        return;
    }
    else if (updateInterval>0)
        clearTimeout(updateInterval);
    updateInterval=null;
    updateReports(message.reports);
}

window.addEventListener("load", function (e) {
    worker = opener ? opener.spambee_verifromSafeBrowsing : null;
    if (!worker) {
        worker = new verifrom.worker('chrome://spambee/content/spambee/worker/verifromSafeBrowsing.js');
    }
    worker.addListener("reportsUpdate",function(message) {
        void 0;
        reportsUpdateMsgHandler(message);
    });
    worker.addListener("reportsDeleted", function(message){
        void 0;
        loadReports();
    });
    worker.addListener("newReport", function(message) {
        void 0;
        loadReports();
    });
    loadReports();
});

window.addEventListener("close", function (e) {
    if (worker && typeof worker.close==='function' && worker !== (opener ? opener.spambee_verifromSafeBrowsing : null))
        worker.close();
});

window.addEventListener("focus", function (e) {
    if (worker)
        worker.postMessage({},{channel:"resetbadge"});
});