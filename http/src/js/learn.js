import {httpAsync} from "./networking";
import {store} from "./store";

function getTrackingServer() {
    return store.getState().config.trackingURL.replace("/track", "");
}

function recalculate(cb) {
    const group = store.getState().config.trackingGroup;
    httpAsync(getTrackingServer() + "/calculate?group=" + group, cb);
}

function sendFingerprints(fingerprints, cb) {
    httpAsync(getTrackingServer() + "/learn", (res) => {
        res = JSON.parse(res);
        if (!res.success) throw "Error whilst sending fingerprints (" + res.message + ")!";
        recalculate(cb); // TODO: Run recalculate only when inserting new locations
    }, "POST", JSON.stringify(fingerprints));
}

function getFingerprints(cb) {
    httpAsync("/scan", (env) => {
        env = JSON.parse(env);
        if (typeof cb === 'function') cb(env);
    });
}

export function updateLocations() {
    const group = store.getState().config.trackingGroup;
    httpAsync(getTrackingServer() + "/locations?group=" + group, (locations) => {
        locations = JSON.parse(locations);
        console.log("Locations: ", locations);
    });
}

export function learnOnce(roomName, cb) {
    console.log("Scanning for networks . . .");
    getFingerprints((fingerprints) => {
        console.log("Found " + fingerprints['wifi-fingerprint'].length + " networks.");
        fingerprints.location = roomName;
        fingerprints.time = new Date().getTime();
        sendFingerprints(fingerprints, cb);
    });
}

export function learn(roomName, noInit) {
    if (!noInit)
        store.dispatch({
            type: 'LEARN',
            room: roomName
        });
    else
        roomName = store.getState().learning;

    if (roomName)
        learnOnce("bedroom", learn.bind(this, null, true));
}

export function stopLearning() {
    store.dispatch({ type: 'STOP_LEARNING' });
}
