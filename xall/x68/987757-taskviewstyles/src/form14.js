const form14 = window.document.getElementById('form14');
form14.addEventListener('click', notifyBackgroundPage14);

function handleResponse14(message) {console.log(`Message from background14: ${message.response14}`)};

function notifyBackgroundPage14(e) {var sending14 = browser.runtime.sendMessage({execute14: "Executing from form14"});
                                                 sending14.then(handleResponse14);}