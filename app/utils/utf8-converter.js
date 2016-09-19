'use strict';

module.exports = function (input) {
    var replacements = {
        '0105': "ą",
        '0119': "ę",
        '00F3': "ó",
        '015B': "ś",
        '0107': "ć",
        '017C': "ż",
        '017A': "ź",
        '0144': "ń",
        '0142': "ł",
        '0104': "Ą",
        '0118': "Ę",
        '00D3': "Ó",
        '015A': "Ś",
        '0106': "Ć",
        '017B': "Ż",
        '0179': "Ź",
        '0143': "Ń",
        '0141': "Ł",
        '00A0': ' '
    };

    Object.keys(replacements).forEach(function (key) {
        var reg = new RegExp("\\\\u" + key.toLowerCase(), "g");
        input = input.replace(reg, replacements[key]);
    });

    return input;
};
