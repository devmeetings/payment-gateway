'use strict';

const request = require('request');
const Tokenizer = require('sentence-tokenizer');
const config = require('../../config/config');
const moment = require('moment');
var cachedData = {};
var lastCache;

const options = {
    url: 'https://www.eventbriteapi.com/v3/users/me/owned_events/?status=live,started,ended',
    headers: {
        'Authorization': 'Bearer ' + config.eventbrite
    }
};

module.exports.get = (lang, callback) => {
    if (moment.isMoment(lastCache) && moment().diff(lastCache, 'hours') < 1 && cachedData[lang]) {
        return callback(cachedData[lang]);
    } else if (moment.isMoment(lastCache)) {
        //Resetuje czas cachowania, dzieki temu jezeli podczas przetwarzania tego zadania pojawi sie nowe zapytanie, to
        // uzytkownik otrzyma wynik z cache, bez ponownego zapytania do eventbrite
        lastCache = moment();
    }

    request(options, function (err, response) {
        let events = [], endedEvents = [];
        if (response && response.statusCode === 200) {
            events = JSON.parse(response.body).events
                .filter(function (event) {
                    return event.status !== 'ended' && event.status !== 'completed';
                })
                .map(enhanceEvent.bind(this, lang));
            endedEvents = JSON.parse(response.body).events
                .filter(function (event) {
                    return event.status === 'ended' || event.status === 'completed';
                })
                .map(enhanceEvent.bind(this, lang));
        }

        lastCache = moment();
        cachedData[lang] = {
            events: events,
            endedEvents: endedEvents.slice(0, 10)
        };
        callback(cachedData[lang]);
    });
};

function enhanceEvent (lang, event) {
    const localLocale = moment(event.start.local).locale(lang);
    const tokenizer = new Tokenizer('LS');
    tokenizer.setEntry(event.description.text);
    event.shortDescription = tokenizer.getSentences().slice(0, 3);
    event.startDateDesc = localLocale.format('LL');
    return event;
}
