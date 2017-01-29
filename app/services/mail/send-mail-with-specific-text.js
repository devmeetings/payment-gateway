'use strict';

var Mailer = require('./../../utils/mailer');
var intercept = require('../../utils/intercept');
var Q = require('q');

module.exports = function (mailText, userTo, title, next) {
    var def = Q.defer();
    Mailer.sendMail({
        from: Mailer.from,
        to: userTo,
        subject: title,
        html: mailText
    }, intercept(next, function () {
        def.resolve();
    }));

    return def.promise;
};