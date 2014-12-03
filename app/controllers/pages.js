var express = require('express'),
    router = express.Router(),
    glob = require('glob'),
    path = require('path');

module.exports = function(app) {
  app.use('/info/', router);
};



glob(__dirname + '/../views/info/*.jade', {}, function(err, files) {

  files.map(function(file) {
    var staticPage = path.basename(file, '.jade');

    router.get('/' + staticPage, function(req, res) {
      res.render('info/' + staticPage);
    });

  });
});
