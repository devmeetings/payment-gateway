var Payu = require('../app/utils/payu');
var config = require('./config');

if (config.payu) {
  module.exports = Payu.create(config.payu.id, config.payu.key);
} else {
  module.exports = Payu.test;
}
