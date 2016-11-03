'use strict';

var sendEventConfirmationMail = require('./send-event-confirmation-mail');
var sendPaymentConfirmationMail = require('./send-payment-confirmation-mail');
var sendEventLocationMail = require('./send-event-location-mail');
var sendPaymentCancelMail = require('./send-payment-cancel-mail');
var sendPaymentReminderMail = require('./send-payment-reminder-mail');
var sendRegistrationInvitationMail = require('./send-registration-invitation-mail');

module.exports = {
    sendEventConfirmationMail: sendEventConfirmationMail,
    sendEventLocationMail: sendEventLocationMail,
    sendPaymentCancelMail: sendPaymentCancelMail,
    sendPaymentConfirmationMail: sendPaymentConfirmationMail,
    sendPaymentReminderMail: sendPaymentReminderMail,
    sendRegistrationInvitationMail: sendRegistrationInvitationMail
};
