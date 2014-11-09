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
        enum: ['active', 'waiting', 'payed', 'expired']
    },
    amount: Number,
    userData: {
        name: String
    }
});

ClaimSchema.virtual('date')
    .get(function() {
        return this._id.getTimestamp();
    });

module.exports = mongoose.model('claim', ClaimSchema);

module.exports.STATUS = {
    ACTIVE: 'active',
    WAITING: 'waiting',
    PAYED: 'payed',
    EXPIRED: 'expired'
};