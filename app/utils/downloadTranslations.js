'use strict';

var request = require('request');
var config = require('../../config/config');
var path = require('path');
var fs = require('fs');

module.exports = function (cbOnEnd) {

    var dowloadTranslations = function (lang, cb) {
        request(config.translateURL + '?lang=' + lang, function (error, response) {
            if (!error && response.statusCode === 200) {
                var result = JSON.parse(JSON.parse(response.body, function (key, val) {
                    return val.replace(/\\"/g, '#').replace('\n', '').replace(',}', '}');
                }));

                if (Object.keys(result).length === 0) {
                    cb();
                } else {
                    var localesPath = path.join(__dirname, '../../locales', lang, '/translation.server.json');

                    fs.writeFile(localesPath, JSON.stringify(result), function (err) {
                        cb();
                    })
                }

            }
            else cb();

        });
    };

    dowloadTranslations('pl', function () {
        dowloadTranslations('de', function () {
            dowloadTranslations('en', function () {
                dowloadTranslations('es', function () {
                    cbOnEnd();
                });
            });
        })
    });
};
