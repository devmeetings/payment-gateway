'use strict';

var config = require('../../../config/config');
var claimTimeToPay = require('../../utils/claim-time-to-pay').claimTimeToPay;

module.exports =  function buildNewClaim (eventId, claim) {
    var newClaim = {
        event: eventId,
        claimedTime: new Date(),
        validTill: new Date(claimTimeToPay()),
        status: claim.status,
        extra: {
            vip: claim.extra.vip,
            sponsor: claim.extra.sponsor
        },
        userData: {
            email: claim.user.email,
            names: claim.user.names
        }
    };

    if (claim.userNeedInvoice) {
        newClaim.invoice = setUpInvoiceData(claim);
    }

    return newClaim;
};

function setUpInvoiceData (claim) {
    return {
        recipientName: claim.invoice.recipientName,
        street: claim.invoice.street,
        postalCode: claim.invoice.postalCode,
        city: claim.invoice.city,
        tin: claim.invoice.tin
    };
}
