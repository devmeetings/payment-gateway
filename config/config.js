var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

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
    payu: null,
    port: 3000,
    db: 'mongodb://localhost/payment-gateway-production'
    
  }
};

module.exports = config[env];
