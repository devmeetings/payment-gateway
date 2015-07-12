var router = require('express').Router();

module.exports = function (app) {
  app.use('/api', router);

  require('./events')(router);
};
