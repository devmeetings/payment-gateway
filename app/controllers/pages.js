var express = require('express'),
  glob = require('glob'),
  path = require('path');


var routers = [];

require('../../config/config').languages.map(function(lang) {

  var router = express.Router();

  glob(__dirname + '/../views/info/' + lang + '/*.jade', {}, function(err, files) {

    files.map(function(file) {
      var staticPage = path.basename(file, '.jade');

      router.get('/' + staticPage, function(req, res) {
        res.render('info/' + lang + '/' + staticPage);
      });

    });
  });

  routers.push({
    lang: lang,
    router: router
  });
});



module.exports = function(app) {
  routers.map(function(r) {
    console.log("use", '/' + r.lang + '/info');
    app.use('/' + r.lang + '/info', r.router);
  });
};
