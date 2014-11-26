var nodemailer = require('nodemailer');

module.exports = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'server@todr.me',
    pass: 'bLj6L=KR'
  }
});
