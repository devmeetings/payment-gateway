'user strict';

var Mailer = require('./../../utils/mailer');
var mailRenderer = require('./mail-renderer');

module.exports = function sendMail (options) {

    mailRenderer(options, function (mailText) {
        var mailOptions = {
            from: Mailer.from,
            to: options.to,
            bcc: Mailer.bcc,
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
            } else {
                options.res.redirect(options.redirectUrl);
            }
        }));
    });
}
