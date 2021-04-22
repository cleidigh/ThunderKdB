const tryParseOrReturnDefault = (content, defaultValue) => {
    if (typeof content === 'object' && content !== null) {
        console.warn('object already deserialized');
        return content;
    }

    if (typeof content === 'string') {
        return JSON.parse(content || 'null') || defaultValue;
    }

    if (typeof content === 'boolean') {
        return content;
    }

    if (typeof content === 'number') {
        return content;
    }

    return defaultValue;
};

const stateSerializerV1 = () => {
    const serializeMindr = mindr =>
        JSON.stringify({ ...mindr, due: mindr.due.toISOString() });
    const deserializeMindr = serializedMindr => {
        // 
        const mindr = tryParseOrReturnDefault(serializedMindr, null);
        if (mindr === null) {
            throw new Exception(
                'cannot load persisted mindrs due to a fallback to (null)'
            );
        }

        mindr.due = new Date(Date.parse(mindr.due));

        return mindr;
    };

    const storeState = async state => {
        const { mindrs, presets, settings, metaData = {} } = state;

        const serializedMindrs = (mindrs || []).map(serializeMindr);
        const serializedTimePresets = (presets?.time || []).map(item =>
            JSON.stringify(item)
        );
        const serializedActionsPreset = (presets?.actions || []).map(item =>
            JSON.stringify(item)
        );
        const serializedSettings = JSON.stringify(settings);
        const serializedMetaData = JSON.stringify(metaData);

        await browser.storage.local.set({
            storageVersion: 1,
            mindrs: serializedMindrs,
            metaData: serializedMetaData,
            settings: serializedSettings,
            ['presets.time']: serializedTimePresets,
            ['presets.actions']: serializedActionsPreset
        });
    };

    const loadState = async () => {
        const storage = await browser.storage.local.get(null);

        const mindrs = (storage?.mindrs || []).map(deserializeMindr);
        const metaData =
            tryParseOrReturnDefault(storage?.metaData || 'null') || {};
        const settings =
            tryParseOrReturnDefault(storage?.settings || 'null') || {};
        const time = (storage?.['presets.time'] || []).map(item =>
            JSON.parse(item)
        );
        const actions = (storage?.['presets.actions'] || []).map(item =>
            JSON.parse(item)
        );
        const storageVersion = storage?.storageVersion || 1;

        return {
            storageVersion,
            mindrs,
            metaData,
            settings,
            presets: {
                time,
                actions
            }
        };
    };

    return { loadState, storeState };
};

const mapper = {
    1: stateSerializerV1
};

export const getStorageAdapter = (version = 1) => {
    const adapter = mapper[version];
    if (!adapter) {
        throw new Exception(
            `No storage adapter found for mailmindr storage version '${version}'`
        );
    }

    return adapter();
};

export const getCurrentStorageAdapterVersion = () => {
    return Object.keys(mapper)
        .map(item => parseInt(item, 10))
        .sort((a, b) => a - b)
        .pop();
};
