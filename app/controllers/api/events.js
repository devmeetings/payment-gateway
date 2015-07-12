var Event = require('../../models/event');
var errors = require('domain').create();

module.exports = function (router) {
  router.post('/events', function (req, res) {
    Event.create(req.body, errors.intercept(function (ev) {
      res.send(ev);
    }));
  });
};
