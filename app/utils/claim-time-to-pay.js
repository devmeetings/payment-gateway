'use strict';

var daysToPay = 2;
var timeToPayInSeconds = daysToPay * 3600 * 24;

module.exports = {
    claimTimeToPay: claimTimeToPay,
    timeToPayInSeconds: timeToPayInSeconds
};

function claimTimeToPay () {
    return Date.now() + 1000 * timeToPayInSeconds;
};
