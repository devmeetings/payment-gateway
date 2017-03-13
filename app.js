var express = require('express');
var config = require('./config/config');
var glob = require('glob');
var mongoose = require('mongoose');
var downloadTranslations = require('./app/utils/downloadTranslations');
var scheduler = require('./app/services/scheduler/scheduler');

mongoose.connect(config.db);
console.log('config.db = ' + config.db);

var db = mongoose.connection;
db.on('error', function () {
    throw new Error('unable to connect to database at ' + config.db);
});

var models = glob.sync(config.root + '/app/models/*.js');
models.forEach(function (model) {
    require(model);
});
var app = express();

downloadTranslations(function () {
    require('./config/express')(app, config, db);
});

scheduler.startScheduler(app);

app.listen(process.env.PORT || config.port);
