'use strict';

var request = require('request');
var utf8Converter = require('./../../utils/utf8-converter');
var config = require('../../../config/config');

module.exports = function (options, cb) {

    var mailPath = options.path;
    var lang = options.lang;
    var variables = options.variables || {};

    var url = config.mailTemplateURL + mailPath + (lang ? '?lang=' + lang:'');

    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var mailText = response.body;
            if (!mailText) {
                cb(error);
                return;
            }
            mailText = mailText.replace(/^[\s\uFEFF\xA0"]+|[\s\uFEFF\xA0"]+$/g, '');
            mailText = mailText.replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/\\n/g, '');
            mailText = utf8Converter(mailText);

            Object.keys(variables).forEach(function (key) {
                var reg;
                var condititionalKeys = ['IF_INVOICE', 'IF_PAYU'];
                var specialKeys = ['LINK'];
                var foundKey = false;

                condititionalKeys.forEach(function (condititionalKey) {
                    if (key === condititionalKey && variables[key] === true) {
                        reg = new RegExp("%" + key + '%', "g");
                        mailText = mailText.replace(reg, '');
                        foundKey = true;
                    } else if (key === condititionalKey && variables[key] === false) {
                        reg = new RegExp("%"+condititionalKey+"%(\\w|\\W)*%"+condititionalKey+"%");
                        mailText = mailText.replace(reg, '');
                        foundKey = true;
                    }
                });

                specialKeys.forEach(function (condititionalKey) {
                    if (key === condititionalKey && key === 'LINK') {
                        reg = new RegExp('%LINK%', "g");
                        mailText = mailText.replace(reg, '<a href="' + variables[key]+ '">');
                        reg = new RegExp('%END_LINK%', "g");
                        mailText = mailText.replace(reg, '')
                        foundKey = true;
                    }
                });

                if (!foundKey) {
                    reg = new RegExp("%" + key + '%', "g");
                    mailText = mailText.replace(reg, variables[key]);
                }

            });

            cb(null,mailText);
        }
        else if (!error) {
            cb(response.statusCode);
        }
        else {
            cb(error);
        }
    });
};
