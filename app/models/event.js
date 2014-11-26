// Example model

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var EventSchema = new Schema({
    name: {
    	type: String,
    	unique: true,
    	index: true
    },
    isVisible: Boolean,
    title: String,
    description: String,
    openDate: Date,
    tickets: Number,
    ticketsLeft: Number
});

EventSchema.virtual('date')
    .get(function() {
        return this._id.getTimestamp();
    });

module.exports = mongoose.model('event', EventSchema);
