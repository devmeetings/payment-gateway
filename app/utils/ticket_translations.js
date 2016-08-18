'use strict';

module.exports = function (translator) {
    var result = {
        ticket: {
            alert: {}
        }
    };
    result.ticket.alert.header = translator('ticket.alert.header');
    result.ticket.alert.paragraph = translator('ticket.alert.paragraph');

    return result;
};
