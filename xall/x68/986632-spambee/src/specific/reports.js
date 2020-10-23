var index = 0;
var pendingReports = new Set();
var updateInterval = null;
var lastUpdate = Date.now();
var buttonListenersSet = false;
var pageNumber = 1;
var pageLength = 0;
var numberOfPages = 0;

void 0;

window.onbeforeunload = function () {
    verifrom.message.toBackground({status: "close"}, {channel: "reportsTab"});
};
window.onfocus = function () {
    verifrom.message.toBackground({}, {channel: "resetBadge"});
};

function sortReports(reports) {
    reports.sort(function (a, b) {
        var aT = Math.floor(a.time / 1000);
        var bT = Math.floor(b.time / 1000);
        var aST = a.status.time ? Math.floor(a.status.time / 1000) : null;
        var bST = b.status.time ? Math.floor(b.status.time / 1000) : null;
        if (!aST || !bST || aST == bST)
            return aT < bT ? 1 : (aT > bT ? -1 : 0);
        else return aST < bST ? 1 : (aST > bST ? -1 : 0);
    });
    return reports;
}

function toggleClass(selector, name, on) {
    let elements = document.querySelectorAll(selector);
    for (let e of elements) {
        let classes = e.classList;
        if (on===true && classes.contains(name))
            continue;
        if (on===false && classes.contains(name)===false)
            continue;
        classes.toggle(name);
    }
}

function displayReports(first, number, reports) {
    hideSpinner();
    for (let e of document.querySelectorAll('.minimalistBlack>tbody>tr>td')) {
        e.textContent="";
        e.setAttribute('class', '');
    }
    document.getElementById('pageNumber').value = pageNumber;
    document.getElementById('numberPages').textContent = numberOfPages;
    var j = 1;
    for (let i = first; j <= number; i++, j++) {
        let report = reports[i];
        if (!report)
            continue;
        let tr = document.querySelector('.minimalistBlack>tbody>tr:nth-child(' + j + ')');
        let tds = tr.querySelectorAll('td');
        let e = document.createElement('input');
        e.setAttribute('type', 'checkbox');
        e.setAttribute('id', i);
        tds[0].appendChild(e);
        tds[1].textContent = report.time.toLocaleDateString() + " " + report.time.toLocaleTimeString();
        tds[2].textContent = report.sender;
        tds[3].textContent = report.subject;
        e = tds[4];
        if (report.status && report.status.time)
            e.textContent = report.status.time.toLocaleDateString() + " " + report.status.time.toLocaleTimeString();
        e = tds[5];
        if (report.status) {
            let d = document.createElement('div');
            d.setAttribute('class', 'statusDesc');
            var s = document.createElement('span');
            s.setAttribute('data-verifromlocalize', 'reports.status.' + report.status.status + 'Description');
            d.appendChild(s);
            d.appendChild(document.createElement('BR'));
            s = document.createElement('span');
            s.setAttribute('class', 'uid');
            s.textContent = " (" + report.UID + ")";
            d.appendChild(s);
            e.appendChild(d);
            s = document.createElement('span');
            e.setAttribute('class', report.status.status + " reportStatus");
            s.setAttribute('data-verifromlocalize', 'reports.status.' + report.status.status);
            s.textContent=report.status.status;
            e.appendChild(s);
        }
    }

    verifrom.localize(null, window.document);


    if (pageNumber >= numberOfPages) {
        toggleClass('.lastPage','inactive',true);
        toggleClass('.nextPage','inactive',true);
    } else {
        toggleClass('.lastPage','inactive',false);
        toggleClass('.nextPage','inactive',false);
    }
    if (pageNumber <= 1) {
        toggleClass('.firstPage','inactive',true);
        toggleClass('.prevPage','inactive',true);
    } else {
        toggleClass('.firstPage','inactive',false);
        toggleClass('.prevPage','inactive',false);
    }
}

function firstPage() {
    index = 0;
    pageNumber = 1;
    displayReports(index, pageLength, reports);
}

function prevPage() {
    if (index + 1 - pageLength <= 0)
        return;
    index -= pageLength;
    pageNumber--;
    displayReports(index, pageLength, reports);
}

function nextPage() {
    if (index + pageLength >= reports.length)
        return;
    index += pageLength;
    pageNumber++;
    displayReports(index, pageLength, reports);
}

function lastPage() {
    var lastIndex = (numberOfPages - 1) * pageLength;
    if (index >= lastIndex)
        return;
    index = lastIndex;
    pageNumber = numberOfPages;
    displayReports(index, pageLength, reports);
}

function changePage() {
    var p = parseInt(document.getElementById('pageNumber').value);
    if (p <= 0 || p > numberOfPages) {
        document.getElementById('pageNumber').value = pageNumber;
        return;
    }
    index = (p - 1) * pageLength;
    pageNumber = p;
    displayReports(index, pageLength, reports);
}

function deleteSelection() {
    var selection = document.querySelectorAll('.minimalistBlack>tbody>tr>td:nth-child(1)>input:checked');
    var UIDList;
    UIDList = [];
    for (var i = selection.length - 1; i >= 0; i--) {
        var s = selection[i];
        if (s && s.id) {
            UIDList.push(reports[parseInt(s.id)].UID);
        }
    }
    verifrom.console.log(2, 'deleteSelection - delete reports :', UIDList);
    if (UIDList.length > 0) {
        verifrom.message.toBackground({reports: UIDList}, {channel: "deleteReports"});
        displaySpinner();
    }
}

var reportsDBName = "spambee";
var reportsCollection = "reports";

function openReportsDB(callback) {
    verifrom.indexeddb.open(reportsDBName, reportsCollection
        , {keyPath: 'UID', autoIncrement: false}
        , 1
        , function (event) {
            verifrom.console.log(0, 'openReportsDB - Reports DB opened', event);
            callback();
        }
        , function () {
            verifrom.console.log(0, 'openReportsDB - ERROR opening Reports DB', arguments);
            callback();
        }
        , function () {
            verifrom.console.log(0, 'openReportsDB - upgrade required on Reports DB', arguments);
            callback();
        }
    );
}

function requireUpdate(oldStatus, newStatus) {
    oldStatus = translateStatus(oldStatus);
    newStatus = translateStatus(newStatus);
    if (oldStatus === newStatus)
        return false;
    if (oldStatus === "pending")
        return true;
    let priorities = {"phishing": 5, "legit": 4, "suspect": 3, "unknown": 2, "pending": 1};
    if (priorities[oldStatus] < priorities[newStatus])
        return true;
    else return false;
}

function translateStatus(status) {
    var translations = {
        "positive": "phishing",
        "negative": "legit",
        "whitelisted": "legit",
        "suspect": "suspect",
        "pending": "pending",
        "unknown": "unknown",
        "phishing": "phishing",
        "legit": "legit",
        "analysing": "pending"
    };
    return (translations[status] || "pending");
}

function displaySpinner() {
    document.getElementById('spinner').style.visibility="visible";
    document.getElementById('spinner').style.display="inherit";
}

function hideSpinner() {
    document.getElementById('spinner').style.visibility="hidden";
    document.getElementById('spinner').style.display="none";
}

function loadReports() {
    void 0;
    verifrom.message.toBackground({}, {channel: "resetBadge"});
    displaySpinner();
    openReportsDB(function () {
        verifrom.indexeddb.objectStore.getAllItems(reportsDBName, reportsCollection
            , function (dbEvent) {
                lastUpdate = Date.now();
                reports = [];
                var beforeTimeStamp = Date.now() - (90 * 1000);
                var willUpdate = false;
                if (this) {
                    var items = this;
                    verifrom.console.log(2, 'loadReports - got all reports from DB - #items=' + items.length);
                    for (var i = 0; i < items.length; i++) {
                        var reportTime = items[i].time || items[i].reportId;
                        if (!items[i].feedbackTime)
                            items[i].feedbackTime = null;
                        reports.push({
                            id: i,
                            UID: items[i].UID,
                            time: new Date(reportTime),
                            sender: items[i].sender,
                            subject: items[i].subject,
                            status: items[i].status ? {
                                time: new Date(items[i].feedbackTime),
                                status: translateStatus(items[i].status)
                            } : {
                                time: null,
                                status: "pending"
                            }
                        });
                        if (!items[i].status || items[i].status === 'pending') {
                            pendingReports.add(items[i].UID);
                            if (reportTime < beforeTimeStamp)
                                willUpdate = true;
                        }
                    }
                    reports = sortReports(reports);
                }
                pageLength = document.querySelectorAll('.minimalistBlack>tbody>tr').length;
                numberOfPages = Math.ceil(reports.length / pageLength);
                firstPage();
                if (pendingReports.size > 0 && willUpdate)
                    updateInterval = setTimeout(updateReports, 30000);
            }
            , function () {
                verifrom.console.log(0, 'loadReports - Error getting all reports in DB', arguments);
                firstPage();
            }
        );
        if (buttonListenersSet === false) {
            document.querySelector('.firstPage').onclick=firstPage;
            document.querySelector('.prevPage').onclick=prevPage;
            document.querySelector('.nextPage').onclick=nextPage;
            document.querySelector('.lastPage').onclick=lastPage;
            document.querySelector('.deleteRows').onclick=deleteSelection;
            document.querySelector('#pageNumber').onchange=changePage;
            buttonListenersSet = true;
        }
    });
}

function findReportIndex(reportUID) {
    let index = reports.findIndex(element => {
        return element.UID === reportUID;
    });
    if (index >= 0)
        return index;
    else return null;
}

function updateReports(JSONList) {
    try {
        var updates = false;
        clearTimeout(updateInterval);
        updateInterval = -1;
        var _finally = function () {
            toProcess--;
            if (toProcess <= 0 && updates) {
                loadReports();
            }
            if (updateInterval > 0)
                clearTimeout(updateInterval);
            updateInterval = setTimeout(updateReports, 60000);
        };
        var toProcess = JSONList ? JSONList.length : pendingReports.size;
        var applyUpdates = function (JSONresponse) {
            if (JSONresponse && JSONresponse.length > 0) {
                for (var i = 0; i < JSONresponse.length; i++) {
                    var reportStatus = JSONresponse[i];
                    if (translateStatus(reportStatus.s) !== "pending") {
                        verifrom.console.log(4, 'updateReports - got update for UID' + reportStatus.UID + "=" + reportStatus.s);
                        pendingReports.delete(reportStatus.UID);
                        let index = findReportIndex(reportStatus.UID);
                        if (index !== null) {
                            if (reports[index].status && requireUpdate(reports[index].status.status, reportStatus.s))
                                updates = true;
                            _finally();
                        } else {
                            updates = true;
                            return _finally();
                        }
                    } else {
                        verifrom.console.log(4, 'updateReports - no updates yet');
                        _finally();
                    }
                }
            } else {
                toProcess = 0;
                _finally();
            }
        };
        if (toProcess > 0) {
            applyUpdates(JSONList)
        } else {
            updateInterval = null;
        }
    } catch (e) {
        verifrom.console.error(1, 'updateReports - got Exception', e);
        updateInterval = setTimeout(updateReports, 60000);
    }
}

function reportsUpdateMsgHandler(message) {
    if (updateInterval === -1) {
        updateInterval = setTimeout(reportsUpdateMsgHandler.bind(null, message), 10000); 
        return;
    } else if (updateInterval)
        clearTimeout(updateInterval);
    updateInterval = null;
    updateReports(message.reports);
}

void 0;


verifrom.message.addListener({channel: "reportsUpdate"}, reportsUpdateMsgHandler);
verifrom.message.addListener({channel: "reportsDeleted"}, function (message) {
    verifrom.console.log(4, 'reportsDeleted message - ', message);
    loadReports();
});
verifrom.message.addListener({channel: "PayloadPosted"}, function (message) {
    verifrom.console.log(4, 'PayloadPosted message - ', message);
    loadReports();
});

loadReports();
verifrom.message.toBackground({status: "open"}, {channel: "reportsTab"});