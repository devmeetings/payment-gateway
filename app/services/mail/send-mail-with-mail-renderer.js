'use strict';

var Mailer = require('./../../utils/mailer');
var intercept = require('../../utils/intercept');
var mailRenderer = require('./mail-renderer');

module.exports = function sendMail (options) {

    mailRenderer(options, function (error, mailText) {
        if (error) {
            //for now only log to console and prevent sending mail
            console.log('Error during mail rendering: ' + error);
            return;
        }
        var mailOptions = {
            from: Mailer.from,
            to: options.to,
           // bcc: Mailer.bcc,
            subject: options.title,
            html: mailText
        };

        if (options.noBcc) {
            delete mailOptions.bcc;
        }

        if (options.attachments) {
            mailOptions.attachments = options.attachments;
        }

        Mailer.sendMail(mailOptions, intercept(options.next, function () {
            if (options.cb) {
                options.cb();
            } else if (options.res && options.redirectUrl){
                options.res.redirect(options.redirectUrl);
            }
        }));
    });
}
