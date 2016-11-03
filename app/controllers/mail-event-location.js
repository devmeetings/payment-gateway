var express = require('express');
var router = express.Router();
var admin = require('./admin');

var sendLocationMail = require('../services/mail/send-location-mail-for-payed-claim');

module.exports = function (app) {
    app.use('/admin', router);
};

router.use(admin.checkIfAdmin);

module.exports.api ={
    sendLocationMail: sendLocationMail
};

router.post('/events/:ev/users/notify', function (req, res, next) {
    sendLocationMail(req.params.ev, null, req.body.test, req, res, next, function (){
        res.send(200);
    });
});
