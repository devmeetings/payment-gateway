'use strict';

module.exports = function (translator) {
    var result = {
        alert: {},
        payment: {}
    };
    result.alert.header = translator('ticket.alert.header');
    result.alert.paragraph = translator('ticket.alert.paragraph');
    result.alert.timeout = translator('ticket.alert.timeout');
    result.alert.timeoutInfoPart1 = translator('ticket.alert.timeoutInfoPart1');
    result.alert.timeoutInfoPart1 = translator('ticket.alert.timeoutInfoPart2');
    result.title = translator('ticket.title');
    result.mail = translator('ticket.mail');
    result.names = translator('ticket.names');
    result.btnConfirm = translator('ticket.btnConfirm');
    result.payment.title = translator('ticket.payment.title');
    result.payment.declaredAmount = translator('ticket.payment.declaredAmount');
    result.payment.diplomaInfo = translator('ticket.payment.diplomaInfo');

    return result;
};
