var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

module.exports = nodemailer.createTransport(smtpTransport({
  port: 587,
  host: 'smtp.mandrillapp.com',
  auth: {
    user: 'zwolinskipiotr@gmail.com',
    pass: '-7ilnw_1ZPaoE3lqFsAQOQ'
  }
}));

module.exports.from = 'DevMeetings <registration@devmeetings.org>';
module.exports.bcc = 'tomek@devmeetings.com, piotr@devmeetings.com';
