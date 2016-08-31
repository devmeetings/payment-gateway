var express = require('express');
var glob = require('glob');
var session = require('express-session');
const MongoStore = require('connect-mongo')(session);

var i18next = require('i18next');
var i18Middleware = require('i18next-express-middleware');
var i18Backend = require('i18next-node-fs-backend');
var raven = require('raven');
var logger = require('morgan');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compress = require('compression');
var methodOverride = require('method-override');

module.exports = function (app, config, mongooseConnection) {
    app.use(session({
        secret: 'ThIsiSATRueSSecre1t',
        saveUninitialized: false, // don't create session until something stored
        resave: false, //don't save session if unmodified
        store: new MongoStore({mongooseConnection: mongooseConnection})
    }));

    i18next
        .use(i18Middleware.LanguageDetector)
        .use(i18Backend)
        .init({
            detection: {
                order: ['session'],
                lookupSession: 'lng',
            },
            backend: {
                loadPath: config.root + '/locales/{{lng}}/{{ns}}.json'
            },
            lng: 'pl'
        });

    app.use(i18Middleware.handle(i18next));



    app.set('views', config.root + '/app/views');
    app.set('view engine', 'jade');

    app.use(raven.middleware.express.requestHandler(config.sentryDsn));
    app.use(favicon(config.root + '/public/img/favicon.ico'));
    app.use(logger('dev'));
    app.use(bodyParser.json({limit: '50mb'}));
    app.use(bodyParser.urlencoded({
        limit: '50mb',
        extended: true
    }));
    app.use(cookieParser());
    app.use(compress());
    app.use(express.static(config.root + '/public'));
    app.use(methodOverride());

    var controllers = glob.sync(config.root + '/app/controllers/*.js');
    controllers.forEach(function (controller) {
        require(controller)(app);
    });

    app.use(raven.middleware.express.errorHandler(config.sentryDsn));

    app.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    if (app.get('env') === 'development') {
        app.use(function (err, req, res) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err,
                title: 'error'
            });
        });
    }

    app.use(function (err, req, res) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {},
            title: 'error'
        });
    });
};
