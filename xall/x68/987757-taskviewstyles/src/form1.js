const form1 = window.document.getElementById('form1');
form1.addEventListener('click', notifyBackgroundPage1);

function handleResponse1(message) {console.log(`Message from background1: ${message.response1}`)};

function notifyBackgroundPage1(e) {var sending1 = browser.runtime.sendMessage({execute1: "Executing from form1"});
                                                 sending1.then(handleResponse1);}