'use strict';

var sendMail = require('./send-mail-with-mail-renderer');
var claimDates = require('../../utils/claim-dates');
var config = require('../../../config/config');

module.exports = function sendEventConfirmationMail (options) {
    var dates = claimDates(options.claim);
    var mailConfig = {
        path: 'event-confirmation',
        lng: options.lng,
        variables: {
            LINK: config.app.url + '/events/' + options.claim.event._id + '/tickets/' + options.claim._id,
            EVENT_TITLE: options.claim.event.title,
            EVENT_CITY: options.claim.event.city,
            EVENT_DATE: dates.eventDate.format('LLL'),
            END_DATE: dates.endDate.format('LLL')
        },
        title: 'Potwierdzenie rejestracji na ' + options.claim.event.title,
        to: options.claim.userData.email,
        res: options.res,
        next: options.next,
        redirectUrl: options.claim.payment.url,
        cb: options.cb
    };

    sendMail(mailConfig);
};