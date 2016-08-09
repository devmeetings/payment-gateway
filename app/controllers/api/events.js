var Event = require('../../models/event');
var errors = require('domain').create();

module.exports = function (router) {
  router.post('/events', function (req, res) {
    req.body.ticketsLeft = req.body.ticketsLeft || req.body.tickets;

    Event.findOne({
      name: req.body.name
    }).exec(function (err, event){
      if (event) {
        Event.update({
          _id: event._id
        },req.body, errors.intercept(function (ev) {
          res.send(ev);
        }));
      } else {
        Event.create(req.body, errors.intercept(function (ev) {
          res.send(ev);
        }));
      }
    });


  });

};
