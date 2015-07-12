var path = require('path');
var rootPath = path.normalize(__dirname + '/..');
var env = process.env.NODE_ENV || 'development';

var languages = ['pl', 'en'];

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'payment-gateway',
      url: 'http://localhost:3000'
    },
    payu: null,
    port: 3000,
    db: 'mongodb://localhost/payment-gateway-development'

  },

  test: {
    root: rootPath,
    app: {
      name: 'payment-gateway',
      url: 'http://devmeetings.pl'
    },
    payu: null,
    port: 3000,
    db: 'mongodb://localhost/payment-gateway-test'

  },

  production: {
    root: rootPath,
    app: {
      name: 'payment-gateway',
      url: 'http://devmeetings.com'
    },
    payu: {
      id: '183152',
      key: '8da6d279e0b48992aa164b5a431a78b7'
    },
    port: 3000,
    db: 'mongodb://localhost/payment-gateway-production'

  }
};

module.exports = config[env];
module.exports.languages = languages;
