// Example model

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ClaimSchema = new Schema({
    event: {
        type: Schema.Types.ObjectId,
        ref: 'event',
        index: true
    },
    claimedTime: Date,
    validTill: Date,
    status: {
        type: String,
        enum: ['active', 'payed', 'expired']
    },
    userData: {
        name: String
    }
});

ClaimSchema.virtual('date')
    .get(function() {
        return this._id.getTimestamp();
    });

module.exports = mongoose.model('claim', ClaimSchema);