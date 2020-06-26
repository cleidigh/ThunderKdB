/* globals PlikConnection */

const accountId = (new URL(location.href)).searchParams.get("accountId");
const check_protectedDownloads = document.getElementById('protectedDownloads');
const input_DLUser = document.getElementById('DLUser');
const input_DLPass = document.getElementById('DLPass');

/** main */
(() => {
    addEventlisteners();
    addLocalizedLabels();

    (new PlikConnection(accountId))
        .load()
        .then(copyPropertiesToInputs)
        .then(setServerConstraints);
})();

async function addLocalizedLabels() {
    document.querySelectorAll("[data-i18n]")
        .forEach(element => {
            element.textContent = browser.i18n.getMessage(element.dataset.i18n);
        });
}

async function addEventlisteners() {
    const saveButton = document.getElementById('saveButton');
    saveButton.addEventListener('click', saveInput);

    const configForm = document.getElementById('configForm');
    configForm.addEventListener('input', () => {
        saveButton.disabled = !configForm.checkValidity();
    });

    const check_protectedDownloads = document.getElementById('protectedDownloads');
    check_protectedDownloads.addEventListener('input', setInputsToCheckstate);
}

function setInputsToCheckstate() {
    input_DLUser.disabled = !check_protectedDownloads.checked;
    input_DLUser.required = check_protectedDownloads.checked;
    input_DLPass.disabled = !check_protectedDownloads.checked;
    input_DLPass.required = check_protectedDownloads.checked;
}

function copyPropertiesToInputs(pc) {
    document.querySelectorAll("input").forEach(
        input => {
            if (pc[input.id]) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = pc[input.id];
                }
                else {
                    input.value = pc[input.id];
                }
            }
        }
    );
    setInputsToCheckstate();
    return pc;
}

function setServerConstraints(pc) {
    if (false === pc.server_oneShot) {
        const oneshot_check = document.getElementById('oneShot');
        oneshot_check.disabled = true;
        oneshot_check.checked = false;
    }
    if (pc.server_maxTTL) {
        const ttlInput = document.getElementById('Ttl_days');
        const ttl_in_days = pc.server_maxTTL / (24 * 60 * 60);
        ttlInput.max = ttl_in_days;
        if (ttlInput.value > ttl_in_days) {
            ttlInput.value = ttl_in_days;
        }
    }
    if (false === pc.server_protectedByPassword) {
        const check_protectedDownloads = document.getElementById('protectedDownloads');
        check_protectedDownloads.checked = false;
        check_protectedDownloads.disabled = true;
        setInputsToCheckstate();
    }
    return pc;
}

/* Event Handlers */
async function saveInput(e) {
    e.currentTarget.disabled = true;

    const pc = new PlikConnection(accountId);

    sanitizeInputs();
    copyInputsToProperties();
    await pc.getServerConfiguration();
    setServerConstraints(pc);
    pc.store();

    // Local functions
    function sanitizeInputs() {
        document.querySelectorAll("input").forEach(input => {
            input.value = input.value.trim();
        });

        const serverUrl = document.getElementById('serverUrl');
        if (!serverUrl.value.endsWith('/')) {
            serverUrl.value += '/';
        }
    }

    function copyInputsToProperties() {
        document.querySelectorAll("input").forEach(input => {
            switch (input.type) {
                case 'button':
                case 'reset':
                case 'submit':
                    break;
                case 'checkbox':
                case 'radio':
                    pc[input.id] = input.checked;
                    break;
                default:
                    pc[input.id] = input.value;
                    break;
            }
        });
    }
}