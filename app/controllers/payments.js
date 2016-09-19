var express = require('express');
var config = require('../../config/config');
var paypal = require('paypal-rest-sdk');
var async = require('async');

var router = express.Router();
var moment = require('moment');
var intercept = require('../utils/intercept');
var Country = require('../models/country');
var Payu = require('../../config/payu');
var Claims = require('../models/claims');
var Event = require('../models/event');
var checkIfAdmin = require('./admin').checkIfAdmin;
var createInvoiceForClaim = require('./admin').createInvoiceForClaim;
var invoiceApi = require('./invoice').api;
var mailEventLocation = require('./mail-event-location').api;
var claimDates = require('../utils/claim-dates');
var mailRenderer = require('../utils/mail-renderer');
var mailSender = require('../utils/event-mail-sender');

moment.locale('pl');

module.exports = function (app) {
    app.use('/', router);
};

function generatePaymentConfirmation (req, res, next, claim, cb) {
    function sendMailWithPaymentConfirmation (claim, file, invoiceNo, cb) {
        var options = {
            claim: claim,
            file: file,
            invoiceNo: invoiceNo,
            res: res,
            next: next,
            lng: req.session.lng,
            cb: cb
        };

        mailSender.sendPaymentConfirmationMail(options);
    }

    invoiceApi.getDataForExistingInvoice(claim).then(function (data) {

        if (claim.event.mail.sended) {
            mailEventLocation.sendLocationMail(claim.event._id, claim._id, false, res, next, function () {
            });
        }


        if (data) {

            var fullUrl = req.protocol + '://' + req.get('host') + '/admin/claims/get/invoice/single';

            invoiceApi.generateInvoice(fullUrl, data, function (file, invoiceNo) {
                sendMailWithPaymentConfirmation(claim, file, invoiceNo, cb);
            });
        }
        else {

            sendMailWithPaymentConfirmation(claim, null, null, cb);

        }


    });
}

router.post('/tickets/:claim/notify', function (req, res, next) {

    var order = req.body.order;
    var claimId = order.extOrderId;
    claimId = claimId.split('_')[0];

    if (order.status === 'COMPLETED') {
        // Update status of claim
        Claims.update({
            _id: claimId,
            'payment.id': order.orderId
        }, {
            $set: {
                status: Claims.STATUS.PAYED
            }
        }).exec(intercept(next, function (isUpdated) {
            if (!isUpdated) {
                console.error("Didn't update completed notification", order);
                res.send(200);
                return;
            }
            // send mail with confirmation
            Claims.findById(claimId).populate('event').exec(intercept(next, function (claim) {
                generatePaymentConfirmation(req, res, next, claim, function () {
                    res.send(200);
                });
            }));
        }));
    } else if (order.status === 'PENDING') {
        // Updating status to pending
        Claims.update({
            _id: claimId,
            'payment.id': order.orderId,
            status: Claims.STATUS.WAITING
        }, {
            $set: {
                status: Claims.STATUS.PENDING
            }
        }).exec(intercept(next, function (isUpdated) {
            res.send(200);
        }));
    } else {
        console.warn('Got ignored notification', order);
        res.send(200);
    }
});

// Regenerate payment - user action
// TODO [ToDr] I think that some more security is necessary here
router.post('/events/:id([a-z0-9]{24})/tickets/:claim([a-z0-9]{24})/payment', function (req, res, next) {
    Claims.findOne({
        _id: req.params.claim,
        event: req.params.id
    }).populate('event').exec(intercept(next, function (claim) {
        console.log(claim);
        var num = Math.random() * 100;
        createPaymentForClaim(req, res, next, claim, '_' + num.toFixed(0)[0]);
    }));
});

// Regenerate payment
router.post('/admin/events/:id/tickets/:claim/payment', checkIfAdmin, function (req, res, next) {
    Claims.findOne({
        _id: req.params.claim,
        event: req.params.id
    }).populate('event').exec(intercept(next, function (claim) {
        console.log(claim);
        var num = Math.random() * 100;

        createPaymentForClaim(req, res, next, claim, '_' + num.toFixed(0)[0]);
    }));
});

function extractNames (name) {
    name = name || '';
    var parts = name.split(' ');

    return {
        firstName: parts[0] || '',
        lastName: parts[1] || ''
    };
}

function getPayPalPaymentDetails (req, res, next, claim) {
    console.log('----------------------------------------------------------');
    console.log('--------------  PAYMENT DETAILS REQUEST  ----------------');
    console.log('----------------------------------------------------------');
    console.log(JSON.stringify(req.body));
    paypal.payment.get(req.query.paymentId, function (error, payment) {
        if (error !== null) {
            console.log('ERROR');
            console.log(error);
            res.json(error);
        } else {
            console.log('----------------------------------------------------------');
            console.log('--------------  PAYMENT DETAILS RESPONSE  ----------------');
            console.log('----------------------------------------------------------');
            console.log(JSON.stringify(payment));

            executePayPalPayment(req, res, next, payment, claim);

        }
    });

}


function createPayPalPaymentForClaim (req, res, next, claim, country) {

    var pmtData = {
        intent: 'sale',
        redirect_urls: {
            return_url: config.app.url + '/events/' + req.params.id + '/tickets/' + req.params.claim + '/pp/return',
            cancel_url: config.app.url + '/events/' + req.params.id + '/tickets/' + req.params.claim + '/pp/cancel'
        },
        payer: {
            payment_method: 'paypal'
        },
        transactions: [{
            amount: {
                total: claim.amount,
                currency: country.currency.toUpperCase()
            },
            description: req.t('participationFee') + claim.event.title,
            item_list: {
                items: [{
                    quantity: 1,
                    name: req.t('participationFee') + claim.event.title,
                    price: claim.amount,
                    currency: country.currency.toUpperCase()
                }]
            }
        }]
    };


    async.waterfall([
        function (callback) {
            paypal.generate_token(function (err, token) {
                if (err) {
                    console.log('generate_token ERROR: ');
                    console.log(err);
                    callback(err);
                } else {
                    console.log('----------------------------------------------------------');
                    console.log('----------       ACCESS TOKEN RESPONSE          ----------');
                    console.log('----------------------------------------------------------');
                    console.log(JSON.stringify(token));
                    callback(null, token);
                }
            });
        },
        function (token, callback) {
            paypal.payment.create(pmtData, function (err, response) {
                if (err) {
                    console.log('create payment ERROR: ');
                    console.log(err);
                    callback(err);
                } else {
                    console.log('----------------------------------------------------------');
                    console.log('----------     CREATE PAYMENT RESPONSE          ----------');
                    console.log('----------------------------------------------------------');
                    console.log(JSON.stringify(response));

                    var url = response.links[1].href;
                    var tmpAr = url.split('EC-');
                    var token = {};
                    token.redirectUrl = 'https://www.sandbox.paypal.com/checkoutnow?token=EC-' + tmpAr[1];
                    token.token = 'EC-' + tmpAr[1];
                    console.log('------ Token Split ------');
                    console.log(token);

                    callback(null, token);
                }
            });
        }], function (err, result) {
        if (err) {
            console.log('An ERROR occured!');
            console.log(err);
            res.json(err);
        } else {
            console.log('----------------------------------------------------------');
            console.log('----------        RESPONSE TO CLIENT           ----------');
            console.log('----------------------------------------------------------');
            console.log(JSON.stringify(result));
            res.json(result);
        }
    });
}


function createPaymentForClaim (req, res, next, claim, postfix) {
    postfix = postfix || '';

    var dates = claimDates(claim);

    function sendEventConfirmationMail (claim) {
        var options = {
            claim: claim,
            res: res,
            next: next,
            lng: req.session.lng
        };
        mailSender.sendEventConfirmationMail(options);
    }

    function updateClaimWithPaymentDetails (claim, orderId, redirectUri) {
        claim.status = Claims.STATUS.WAITING;
        claim.validTill = dates.endDate;
        claim.payment = {
            id: orderId,
            url: redirectUri
        };
        claim.save(intercept(next, sendEventConfirmationMail));
    }

    var names = extractNames(claim.userData.names);

    // Generate payment url
    Payu.createOrderRequest({
        notifyUrl: config.app.url + '/tickets/' + claim._id + '/notify',
        continueUrl: config.app.url + '/events/' + claim.event._id + '/tickets/' + claim._id,
        customerIp: Payu.getIp(req),
        description: 'Opłata za udział w ' + claim.event.title,
        currencyCode: 'PLN',
        validityTime: dates.timeToPayInSeconds,
        extOrderId: claim._id.toString() + postfix
    }, [{
        name: 'Udział w ' + claim.event.title,
        unitPrice: claim.amount * 100,
        quantity: 1
    }], {
        email: claim.userData.email,
        firstName: names.firstName,
        lastName: names.lastName
    }).on('error', function () {
        next("Couldn't generate payment");
    }).end(function (res) {
        if (res.ok || res.status === 302) {
            var orderId = res.body.orderId;
            var url = res.body.redirectUri;

            updateClaimWithPaymentDetails(claim, orderId, url);
        } else {
            next('Error while creating payment: ' + res.text);
        }
    });
}

function findClaimById (id, cb, next) {
    Claims.findById(id).populate('event').exec(intercept(next, cb));
}

function initPayment (req, res, next, cb) {
    var paymentAmount = req.body.payment[0] === '-1' ? req.body.payment[1] : req.body.payment;
    if (parseFloat(paymentAmount) < 1) {
        return next('Wrong payment amount');
    }
    var updateClaimProps = {
        status: Claims.STATUS.CREATING_PAYMENT,
        amount: paymentAmount,
        userData: {
            email: req.body.email,
            names: req.body.names
        }
    };
    var showInvoiceData = req.body.showInvoiceData;

    if (showInvoiceData) {
        updateClaimProps.needInvoice = true;
        updateClaimProps.invoice = {
            recipientName: req.body.recipientName,
            street: req.body.street,
            postalCode: req.body.postalCode,
            city: req.body.city,
            tin: req.body.tin
        };
    }

    res.clearCookie('claim', {});

    Claims.findOne({
        'userData.email': req.body.email,
        event: req.params.id,
        status: {
            $in: [Claims.STATUS.WAITING, Claims.STATUS.CREATING_PAYMENT, Claims.STATUS.PENDING, Claims.STATUS.PAYED]
        }
    }).populate('event').exec(intercept(next, function (claim) {
        if (claim) {
            Event.update({
                _id: req.params.id
            }, {
                $inc: {
                    ticketsLeft: 1
                }
            }).exec();

            res.render('registration-event-ticket_inprogress', {
                claim: claim,
                STATUS: Claims.STATUS
            });
        } else {
            Claims.update({
                _id: req.params.claim,
                event: req.params.id,
                validTill: {
                    $gte: new Date()
                },
                status: {$in: [Claims.STATUS.ACTIVE, Claims.STATUS.INVITED]}
            }, {
                $set: updateClaimProps
            }).exec(intercept(next, function (isUpdated) {
                if (!isUpdated) {
                    return res.send(404);
                }

                findClaimById(req.params.claim, function (claim) {
                    cb(req, res, next, claim);
                }, next);
            }));
        }
    }));
}

router.post('/events/:id/tickets/:claim([a-z0-9]{24})', function (req, res, next) {
    initPayment(req, res, next, function (req, res, next, claim) {
        createPaymentForClaim(req, res, next, claim);
    });
});

router.post('/events/:id/tickets/:claim([a-z0-9]{24})/pp', function (req, res, next) {
    initPayment(req, res, next, function (req, res, next, claim) {
        Country.findById(claim.event.country).exec(intercept(next, function (country){
            createPayPalPaymentForClaim(req, res, next, claim, country);
        }));
    });
});

router.get('/events/:id/tickets/:claim([a-z0-9]{24})/pp/cancel', function (req, res, next) {
    findClaimById(req.params.claim, function (claim) {
        if (!claim) {
            return res.send(404);
        }
        res.clearCookie('claim', {});

        Event.update({
            _id: claim.event._id
        }, {
            $inc: {
                ticketsLeft: 1
            }
        }).exec();

        res.redirect(config.app.url + '/events/' + claim.event.name);
    });
});


router.get('/events/:id/tickets/:claim([a-z0-9]{24})/pp/return', function (req, res, next) {

    findClaimById(req.params.claim, function (claim) {
        if (!claim) {
            return res.send(404);
        }

        var dates = claimDates(claim);

        claim.status = Claims.STATUS.WAITING;
        claim.validTill = dates.endDate;
        claim.payment = {
            id: req.query.paymentId,
            paypalToken: req.query.token
        };
        claim.save(intercept(next, function () {

            var options = {
                claim: claim,
                res: res,
                next: next,
                lng: req.session.lng,
                cb: function () {
                    getPayPalPaymentDetails(req, res, next, claim);
                }
            };
            mailSender.sendEventConfirmationMail(options);
        }));

    }, next);
});

function executePayPalPayment (req, res, next, pmtDetails, claim) {

    console.log('----------------------------------------------------------');
    console.log('---------------  EXECUTE PAYMENT REQUEST -----------------');
    console.log('----------------------------------------------------------');
    var execute_details = {'payer_id': pmtDetails.payer.payer_info.payer_id};
    console.log(JSON.stringify(execute_details));
    console.log(JSON.stringify(pmtDetails.id));
    paypal.payment.execute(pmtDetails.id, execute_details, function (err, response) {
        if (err) {
            console.log('execute payment ERROR: ');
            console.log(err);
            res.json(err);
        } else {
            console.log('----------------------------------------------------------');
            console.log('---------------  EXECUTE PAYMENT RESPONSE ----------------');
            console.log('----------------------------------------------------------');
            console.log(JSON.stringify(response));

            claim.status = Claims.STATUS.PAYED;
            claim.save(intercept(next, function () {
                generatePaymentConfirmation(req, res, next, claim, function () {
                   res.redirect(config.app.url + '/events/' + req.params.id + '/tickets/' + req.params.claim);
                });
            }));
        }
    });
};
