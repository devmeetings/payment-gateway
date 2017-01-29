'use strict';

var cancelTicket = require('./cancel-ticket');
var setTicketAsPendingForOfflinePayment = require('./set-ticket-as-pending-for-offline-peyment');
var addNewClaimFromAdminPanel = require('./add-new-claim-from-admin-panel');
var countClaimsByStatus = require('./count-claims-by-status');
var countClaimsForVip = require('./count-claims-for-vip');
var countClaimsForSponsor = require('./count-claims-for-sponsor');

module.exports = {
    cancelTicket: cancelTicket,
    setTicketAsPendingForOfflinePayment: setTicketAsPendingForOfflinePayment,
    addNewClaimFromAdminPanel: addNewClaimFromAdminPanel,
    countClaimsByStatus: countClaimsByStatus,
    countClaimsForVip: countClaimsForVip,
    countClaimsForSponsor: countClaimsForSponsor
};
