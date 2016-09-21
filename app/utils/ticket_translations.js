'use strict';

module.exports = function (translator) {
    var result = {
        alert: {},
        payment: {},
        invoice: {}
    };
    result.alert.header = translator('ticket.alert.header');
    result.alert.paragraph = translator('ticket.alert.paragraph');
    result.alert.timeout = translator('ticket.alert.timeout');
    result.alert.timeoutInfoPart1 = translator('ticket.alert.timeoutInfoPart1');
    result.alert.timeoutInfoPart2 = translator('ticket.alert.timeoutInfoPart2');
    result.title = translator('ticket.title');
    result.contactData = translator('ticket.contactData');
    result.mail = translator('ticket.mail');
    result.names = translator('ticket.names');
    result.btnConfirm = translator('ticket.btnConfirm');
    result.payment.title = translator('ticket.payment.title');
    result.payment.declaredAmount = translator('ticket.payment.declaredAmount');
    result.payment.diplomaInfo = translator('ticket.payment.diplomaInfo');
    result.payment.another = translator('ticket.payment.another');
    result.invoice.title = translator('ticket.invoice.title');
    result.invoice.recipientName = translator('ticket.invoice.recipientName');
    result.invoice.tin = translator('ticket.invoice.tin');
    result.invoice.street = translator('ticket.invoice.street');
    result.invoice.postalCode = translator('ticket.invoice.postalCode');
    result.invoice.city = translator('ticket.invoice.city');
    result.invoice.wantToReceiveInvoice = translator('ticket.invoice.wantToReceiveInvoice');
    result.yourAmount = translator('ticket.yourAmount');

    return result;
};
