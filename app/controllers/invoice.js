var express = require('express');
var moment = require('moment');
var router = express.Router();
var intercept = require('../utils/intercept');
var Settings = require('../models/settings');
var InvoiceNo = require('../models/invoiceNo');
var Claims = require('../models/claims');
var Q = require('q');
var admin = require('./admin');
var Payu = require('../../config/payu');
var config = require('../../config/config');

module.exports = function (app) {
    app.use('/admin', router);
};

router.use(admin.checkIfAdmin);

module.exports.api ={
    getDataForExistingInvoice: getDataForExistingInvoice,
    downloadInvoice: downloadInvoice,
    generateInvoice: generateInvoice
};


router.get('/invoices', function (req, res, next) {
    createDefaultInvoicePrefixIfNotExist().then(function () {
        getAllInvoices(req, res, next);
    });
});

function createDefaultInvoicePrefixIfNotExist () {
    var defer = Q.defer();

    Settings.findOne({key: 'INVOICE_PREFIX'}, function (err, setting) {
        if (err) {
            defer.reject();
        }

        if (!setting) {
            Settings.create({key: 'INVOICE_PREFIX', value: 'RDG/'}, function (err) {
                if (err) {
                    defer.reject();
                }

                defer.resolve();
            });
        } else {
            defer.resolve();
        }
    });

    return defer.promise;
}

function getAllInvoices (req, res, next) {
    var conditions = {
        $or: [
            {
                'payment.id': {
                    $exists: true
                }
            },
            {paidWithoutPayu: true},
            {needInvoice: true}
        ]
    };

    return getInvoices(req, res, next, conditions);
}


function getInvoices (req, res, next, newConditions) {
    var conditions;
    var defaultConditions = {
        event: req.params.ev,
        status: Claims.STATUS.PAYED,
        $or: [
            {
                'payment.id': {
                    $exists: true
                }
            },
            {needInvoice: true}
        ]
    };

    conditions = newConditions || defaultConditions;

    Claims.find(conditions).populate('event').exec(intercept(next, function (claims) {
        Q.all(
            claims.map(function (claim) {
                var def = Q.defer();

                Payu.getOrderInfo(claim.payment.id).on('error', function (err) {
                    def.reject(err);
                }).end(function (resp) {
                    if (!resp.ok) {
                        def.resolve({});

                        return;
                    }

                    var order = resp.body.orders[0];
                    var serviceName = 'Udzia� w DevMeetingu ' + claim.event.title;
                    var buyer = {
                        names: claim.userData.names,
                        email: claim.userData.email,
                        invoice: {
                            recipientName: claim.invoice.recipientName,
                            street: claim.invoice.street,
                            postalCode: claim.invoice.postalCode,
                            city: claim.invoice.city,
                            countryCode: claim.invoice.countryCode,
                            tin: claim.invoice.tin,
                            serviceName: serviceName
                        }
                    };
                    // if user need invoice but didn't put invoice data on order
                    if (claim.needInvoice && (!order.buyer || !order.buyer.invoice)) {
                        order.buyer = buyer;
                    }

                    if (order.buyer && order.buyer.invoice) {
                        var conditions = {
                            _id: claim._id
                        };
                        var update = {
                            $set: {
                                'invoice.recipientName': order.buyer.invoice.recipientName,
                                'invoice.street': order.buyer.invoice.street,
                                'invoice.postalCode': order.buyer.invoice.postalCode,
                                'invoice.city': order.buyer.invoice.city,
                                'invoice.tin': order.buyer.invoice.tin
                            }
                        };
                        Claims.update(conditions, update).exec();
                    }

                    // if user pay withou payu
                    if (claim.paidWithoutPayu && order.status !== 'COMPLETED') {
                        // create new order
                        order = {
                            status: order.status,
                            paymentMethod: 'Przelew',
                            paidWithoutPayu: true,
                            orderId: claim.payment.id,
                            buyer: buyer,
                            totalAmount: claim.amount * 100,
                            currencyCode: 'PLN',
                            orderCreateDate: claim.claimedTime
                        };
                    } else {
                        order.paymentMethod = 'Payu';
                    }

                    order.claim = claim;
                    order.serviceName = serviceName;
                    def.resolve(order);
                });

                return def.promise;
            })
        ).then(function (orders) {
                return Q.all(
                    orders.map(function (order) {
                        var def = Q.defer();

                        Settings.findOne({key: 'INVOICE_PREFIX'}, function (err, setting) {
                            if (err) {
                                def.resolve({});
                                return;
                            }
                            getInvoiceData(order.claim, order, setting).then(function (invoiceData) {
                                order.invoice = invoiceData;

                                Object.keys(invoiceData).forEach(function (key) {
                                    order.invoice[key] = invoiceData[key];
                                });

                                if (order.paidWithoutPayu) {
                                    order.payed = '0,00';
                                    order.stillToPay = '0,00';
                                }

                                def.resolve(order);
                            });
                        });

                        return def.promise;
                    })
                );
            }).then(function (responses) {
                return responses.filter(function (resp) {
                    return resp.buyer && resp.buyer.invoice;
                });
            }).done(function (invoices) {
                res.render('admin/invoices', {
                    title: 'Invoices for ' + req.params.ev,
                    invoices: JSON.stringify(invoices)
                });
            });
    }));
}


router.post('/events/:ev/invoice/:claimId', function (req, res, next) {
        Claims.findOneAndUpdate({
            _id: req.params.claimId
        }, {
            $set: {
                needInvoice: true
            }
        }).exec(intercept(next, function () {
            res.send('ok');
        }));
    }
);


router.post('/claims/get/invoice/:mode/render', function (req, res, next) {
    var invoiceTemplate, data;

    console.log('----------------------  ', req.params.mode);

    if (req.params.mode === 'single') {
        invoiceTemplate = 'invoice/invoice';
        data = req.body;
    } else if (req.params.mode === 'note') {
        invoiceTemplate = 'invoice/correctionOfInvoice';
        data = req.body;
    } else {
        invoiceTemplate = 'invoice/invoices';
        data = JSON.stringify(req.body);
    }
    res.render(invoiceTemplate, {
        data: data
    });
});

router.get('/events/:ev/invoices', function (req, res, next) {
    createDefaultInvoicePrefixIfNotExist().then(function () {
        getInvoices(req, res, next);
    });
});

router.post('/claims/get/invoice/:mode', function (req, res, next) {
    downloadInvoice(req, res, req.body);
});

function generateInvoice(url, data,cb){
    var phantom = require('phantom');
    phantom.create(function (ph) {
        ph.createPage(function (page) {
            page.setPaperSize({
                format: 'A4',
                margin: '20px'
            });
            page.cookies = [{
                'name': 'admin',
                'value': 'Devmeetings1'
            }];

            // change zoom factor based on environment,becouse on windows machine zoom factor differs from linux machine
            if (config.env === 'development') {
                page.setZoomFactor(1.3);
            } else {
                page.setZoomFactor(0.75);
            }

            var settings = {
                operation: 'POST',
                encoding: 'utf8',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(data)
            };

            page.open(url + '/render', settings, function (status) {

                page.evaluate(function (className) {
                    return document.querySelector(className).innerText.replace(/\//g, '_');
                }, renderPage, '.invoice-no');

                function renderPage (invoiceNo) {
                    var file = 'tmp/invoice_' + invoiceNo + '.pdf';
                    page.render(file, function () {
                        page.close();
                        page = null;

                        cb(file, invoiceNo.replace(/_/g, '/'));
                    });
                }
            });
        });
    });
}

function downloadInvoice (req, res, data) {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    generateInvoice(fullUrl, data, function (filePath) {
        res.download(filePath);
    });
}

function getInvoiceData (claim, order, setting) {
    var def = Q.defer();
    var invoiceNo = '';
    var invoicePrefix = '';

    if (!claim) {
        def.resolve({});
        return def.promise;
    }

    if (claim.invoice.invoiceNo) {
        invoiceNo = claim.invoice.invoiceNo;

        if (setting && setting.value) {
            invoicePrefix = setting.value;

            if (invoiceNo.indexOf(invoicePrefix) < 0) {
                var parts = invoiceNo.split('/');

                if (parts.length === 3) { // no prefix
                    invoiceNo = invoicePrefix + invoiceNo;
                } else {
                    invoiceNo = invoiceNo.replace(parts[0], invoicePrefix.slice(0, -1));
                }

                updateClaimInvoiceNo(claim._id, invoiceNo);
            }
        }

        def.resolve({
            invoiceNo: invoiceNo,
            deliveryDate: moment(claim.invoice.deliveryDate).format('YYYY-MM-DD'),
            dateOfPayment: moment(claim.invoice.dateOfPayment).format('YYYY-MM-DD'),
            dateOfInvoice: moment(claim.invoice.dateOfInvoice).format('YYYY-MM-DD'),
            amountNet: claim.amountNet,
            amountGross: claim.amountFormat,
            amountDiff: claim.amountDiff,
            amountPayed: claim.amountPayed,
            amountStillToPay: claim.amountStillToPay
        });
        return def.promise;
    }

    if (!order.buyer || !order.buyer.invoice
        || !order.buyer.invoice.tin
        || !order.buyer.invoice.recipientName) {
        def.resolve({});
        return def.promise;
    }

    invoiceNo = moment(order.orderCreateDate).format('/M/YYYY');

    var year = moment(order.orderCreateDate).format('YYYY');
    var month = moment(order.orderCreateDate).format('M');
    var conditions = {year: year, month: month};
    var update = {$inc: {no: 1}};
    var options = {upsert: true, new: true};

    InvoiceNo.findOneAndUpdate(conditions, update, options, function (err, updatedInvoiceNo) {
        if (err) {
            def.reject();
            return;
        }

        invoiceNo = updatedInvoiceNo.no + invoiceNo;

        if (setting && setting.value) {
            invoiceNo = setting.value + invoiceNo;
        }

        var deliveryDate = moment(order.orderCreateDate);
        var dateOfPayment = moment(deliveryDate).add(11, 'days');
        var dateOfInvoice = moment().format('YYYY-MM-DD');

        deliveryDate = deliveryDate.format('YYYY-MM-DD');
        dateOfPayment = dateOfPayment.format('YYYY-MM-DD');

        updateClaimInvoiceData(claim._id, invoiceNo, deliveryDate, dateOfPayment, dateOfInvoice);

        def.resolve({
            invoiceNo: invoiceNo,
            deliveryDate: deliveryDate,
            dateOfPayment: dateOfPayment,
            dateOfInvoice: dateOfInvoice,
            amountNet: claim.amountNet,
            amountGross: claim.amountFormat,
            amountDiff: claim.amountDiff,
            amountPayed: claim.amountPayed,
            amountStillToPay: claim.amountStillToPay
        });
    });

    return def.promise;
}

function updateClaimInvoiceNo (id, invoiceNo) {
    Claims.update({_id: id}, {
        $set: {
            'invoice.invoiceNo': invoiceNo
        }
    }).exec();
}

function updateClaimInvoiceData (id, invoiceNo, deliveryDate, dateOfPayment, dateOfInvoice) {
    Claims.update({_id: id}, {
        $set: {
            'invoice.invoiceNo': invoiceNo,
            'invoice.deliveryDate': deliveryDate,
            'invoice.dateOfPayment': dateOfPayment,
            'invoice.dateOfInvoice': dateOfInvoice
        }
    }).exec();
}

function resetInvoiceNo (req, res, next) {
    var conditions = {
        event: req.params.ev,
        'payment.id': {
            $exists: true
        }
    };
    var update = {$set: {'invoice.invoiceNo': null}};
    var options = {multi: true};

    Claims.update(conditions, update, options).exec();

    getInvoices(req, res, next);
}

function setUpInvoicePrefix (req, res, next) {
    var invoicePrefix = req.body.invoicePrefix;

    if (invoicePrefix.slice(-1) !== '/') {
        invoicePrefix += '/';
    }

    var conditions = {key: 'INVOICE_PREFIX'};
    var update = {$set: {value: invoicePrefix}};
    var options = {upsert: true, new: true};

    Settings.findOneAndUpdate(conditions, update, options, function (err, updatedSetting) {
        if (err) {
            return;
        }

        getInvoices(req, res, next);
    });
}

router.post('/events/:ev/invoices', function (req, res, next) {
    if (req.body.hasOwnProperty('reset')) {
        resetInvoiceNo(req, res, next);
    } else if (req.body.hasOwnProperty('prefix')) {
        setUpInvoicePrefix(req, res, next);
    } else {
        getInvoices(req, res, next);
    }
});

router.post('/claims/invoice', function (req, res, next) {
    var conditions = {
        'payment.id': req.body.payment
    };
    var update = {
        $set: {
            'invoice.invoiceNo': req.body.invoiceNo,
            'invoice.deliveryDate': new Date(req.body.deliveryDate),
            'invoice.dateOfPayment': new Date(req.body.dateOfPayment),
            'invoice.dateOfInvoice': new Date(req.body.dateOfInvoice),
            'invoice.recipientName': req.body.recipientName,
            'invoice.street': req.body.street,
            'invoice.postalCode': req.body.postalCode,
            'invoice.city': req.body.city,
            'invoice.tin': req.body.tin
        }
    };
    Claims.update(conditions, update).exec();
    res.send('ok');
});


function getDataForExistingInvoice (claim) {
    var order = {};
    var serviceName = 'Udział w DevMeetingu ' + claim.event.title;
    var buyer = {
        names: claim.userData.names,
        email: claim.userData.email,
        invoice: {
            recipientName: claim.invoice.recipientName,
            street: claim.invoice.street,
            postalCode: claim.invoice.postalCode,
            city: claim.invoice.city,
            countryCode: claim.invoice.countryCode,
            tin: claim.invoice.tin,
            serviceName: serviceName
        }
    };

    order = {
        status: 'COMPLETED',
        paymentMethod: claim.paidWithoutPayu ? 'Przelew' : 'Payu',
        paidWithoutPayu: claim.paidWithoutPayu,
        orderId: claim.payment.id,
        buyer: buyer,
        totalAmount: claim.amount * 100,
        currencyCode: 'PLN',
        orderCreateDate: claim.claimedTime
    };

    order.claim = claim;
    order.serviceName = serviceName;
    return getInvoiceData(claim, order).then(function (invoiceData) {

        if (!invoiceData.invoiceNo) {
            return null;
        }

        order.invoice = {};

        Object.keys(invoiceData).forEach(function (key) {
            order.invoice[key] = invoiceData[key];
        });

        if (order.paidWithoutPayu) {
            order.payed = '0,00';
            order.stillToPay = '0,00';
        }

        return order;
    });
};
