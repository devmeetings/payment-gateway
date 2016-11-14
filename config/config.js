var path = require('path');
var rootPath = path.normalize(__dirname + '/..');
var env = process.env.NODE_ENV || 'development';

var languages = ['pl', 'en', 'de'];

var config = {
  development: {
    claim_time: 48 * 60 * 60 * 1000,
    root: rootPath,
    redirectUrl:'http://fronteos.mydevil.net/projects/_test/devmeetings',
    app: {
      name: 'payment-gateway',
      url: 'http://localhost:3000'
    },
    payu: null,
    port: 3000,
    db: 'mongodb://localhost/payment-gateway-development',
    sentryDsn: false,
    mailTemplateURL: 'http://fronteos.mydevil.net/projects/_test/devmeetings/wp-json/mail/'
  },

  test: {
    claim_time: 48 * 60 * 60 * 1000,
    root: rootPath,
    redirectUrl:'http://fronteos.mydevil.net/projects/_test/devmeetings',
    app: {
      name: 'payment-gateway',
      url: 'http://reg-test.devmeetings.pl'
    },
    payu: null,
    port: 3000,
    db: 'mongodb://localhost/payment-gateway-staging',
    sentryDsn: false,
    mailTemplateURL: 'http://fronteos.mydevil.net/projects/_test/devmeetings/wp-json/mail/'
  },

  production: {
    claim_time: 48 * 60 * 60 * 1000,
    root: rootPath,
    redirectUrl:'http://devmeetings.com',
    app: {
      name: 'payment-gateway',
      url: 'http://devmeetings.com'
    },
    payu: {
      id: '183152',
      key: '8da6d279e0b48992aa164b5a431a78b7'
    },
    port: 3000,
    db: 'mongodb://localhost/payment-gateway-production',
    sentryDsn: 'https://08525662ea9f4e4a9aaaec77999ae3cb:21f7694047b84f868e44a0baa0d81b3a@app.getsentry.com/51486',
    mailTemplateURL: 'http://fronteos.mydevil.net/projects/_test/devmeetings/wp-json/mail/'
  }
};

module.exports = config[env];
module.exports.languages = languages;
module.exports.env = env;
