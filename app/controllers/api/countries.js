var Country = require('../../models/country');
var errors = require('domain').create();

module.exports = function (router) {
  router.post('/countries', function (req, res, next) {
        req.body.code = req.body.code.toLowerCase();
        Country.create(req.body, errors.intercept(function (ev) {
          res.send(ev);
        }));
  });

  router.get('/countries/list', function (req, res, next) {
    Country.find({}, function (err, countries) {
      var result = countries.map(function (country){ return country.name});
      res.send(result);
    });
  });

};
