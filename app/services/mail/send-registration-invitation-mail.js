'use strict';

var moment = require('moment');
var sendMail = require('./send-mail-with-mail-renderer');
var claimDates = require('../../utils/claim-dates');
var config = require('../../../config/config');

module.exports = function sendPaymentCancelMail(options){
    var dates = claimDates(options.claim);
    var LINK_TIME = 48 * 60 * 60 * 1000;
    var mailConfig = {
        path: 'registration-invitation',
        lng: options.lng,
        variables: {
            EVENT_TITLE: options.claim.event.title,
            EVENT_CITY: options.claim.event.city,
            EVENT_DATE: dates.eventDate.format('LLL'),
            END_DATE: moment(new Date(Date.now() + LINK_TIME)).format('LLL')
        },
        title: 'Możliwość rejestracji na ' + options.claim.event.title,
        to: options.claim.userData.email,
        noBcc: true
    };

    sendMail(mailConfig);
};
