'use strict';

module.exports = function (translator) {
    var result = {
        alert: {},
        payment: {},
        invoice: {}
    };
    result.alert.header = translator('ticket_alert_header');
    result.alert.paragraph = translator('ticket_alert_paragraph');
    result.alert.timeout = translator('ticket_alert_timeout');
    result.alert.timeoutInfoPart1 = translator('ticket_alert_timeoutInfoPart1');
    result.alert.timeoutInfoPart2 = translator('ticket_alert_timeoutInfoPart2');
    result.title = translator('ticket_title');
    result.contactData = translator('ticket_contactData');
    result.mail = translator('ticket_mail');
    result.names = translator('ticket_names');
    result.btnConfirm = translator('ticket_btnConfirm');
    result.payment.title = translator('ticket_payment_title');
    result.payment.declaredAmount = translator('ticket_payment_declaredAmount');
    result.payment.diplomaInfo1 = translator('ticket_payment_diplomaInfo1');
    result.payment.diplomaInfo2 = translator('ticket_payment_diplomaInfo2');
    result.payment.another = translator('ticket_payment_another');
    result.invoice.title = translator('ticket_invoice_title');
    result.invoice.recipientName = translator('ticket_invoice_recipientName');
    result.invoice.tin = translator('ticket_invoice_tin');
    result.invoice.street = translator('ticket_invoice_street');
    result.invoice.postalCode = translator('ticket_invoice_postalCode');
    result.invoice.city = translator('ticket_invoice_city');
    result.invoice.wantToReceiveInvoice = translator('ticket_invoice_wantToReceiveInvoice');
    result.yourAmount = translator('ticket_yourAmount');

    return result;
};
