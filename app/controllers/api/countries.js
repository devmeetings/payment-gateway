var Country = require('../../models/country');

module.exports = function (router) {
  router.get('/countries/list', function (req, res, next) {
    Country.find({}, function (err, countries) {
      var result = countries.map(function (country){ return country.name});
      res.send(result);
    });
  });

};
