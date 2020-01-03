/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let fileProgressBar, fileProgressLabelString, fileProgressLabel;

function updateCounts(m_index, m_count, a_index, a_count, show) {
  if (m_index !== -1) {
    let dmessage = aewindow.aeStringBundle
      .GetStringFromName("ProgressDialogProgressOf")
      .replace("%1$s", (m_index + 1)).replace("%2$s", m_count);
    document.getElementById("progress_message")
      .setAttribute('mode', 'determined');
    document.getElementById("progress_message")
      .setAttribute('value', ((m_index + 1) / m_count) * 100);
    document.getElementById("status2").setAttribute('value', dmessage);
  }
  let amessage = "";
  if (a_index !== -1) {
    amessage = aewindow.aeStringBundle
      .GetStringFromName("ProgressDialogProgressOf")
      .replace("%1$s", (a_index + 1)).replace("%2$s", a_count);
    //document.getElementById("progress_attachment").setAttribute('mode','determined');
    document.getElementById("progress_attachment")
      .setAttribute('value', ((a_index + 1) / a_count) * 100);
      if (show) {
        document.getElementById("filenamehbox").removeAttribute('hidden');
      }
  } else {
    document.getElementById("progress_attachment")
      .setAttribute('value', 0);
      if (show) {
        document.getElementById("filenamehbox").setAttribute('hidden', 'true');
      }
  }
  //dump("amessage: "+amessage);
  document.getElementById("status3").setAttribute('value', amessage);
}

function updateSubject(subject) {
  document.getElementById("subjecttext")
    .setAttribute('value', subject);
}

function updateFilename(filename) {
  document.getElementById("filenametext")
    .setAttribute('value', filename);
}

function toggleText(show) {
  if (show) {
    document.getElementById("subjecthbox").removeAttribute('hidden');
    document.getElementById("filenamehbox").removeAttribute('hidden');
  } else {
    document.getElementById("subjecthbox").setAttribute('hidden', 'true');
    document.getElementById("filenamehbox").setAttribute('hidden', 'true');
  }
}

function setupFileProgress() {
  fileProgressBar = document.getElementById("progress_file");
  fileProgressLabelString = aewindow.aeStringBundle.GetStringFromName(
    "ProgressDialogProgressTextFile");
  fileProgressLabel = document.getElementById("status4");

  fileProgressLabel.setAttribute('value', fileProgressLabelString.replace(
    "%1$s", "?").replace("%2$s", "?"));
}

function updateFileProgress(val, maxv) {
  if (val === -1 && maxv === -1) {
    fileProgressBar.setAttribute('mode', 'undetermined');
    return;
  }
  fileProgressBar.setAttribute('mode', 'determined');
  fileProgressBar.setAttribute('value', (val / maxv) * 100);
  fileProgressLabel.setAttribute('value', fileProgressLabelString.replace(
      "%1$s", Math.round(val / 1024)).replace("%2$s", Math.round(maxv /
    1024)));
}
