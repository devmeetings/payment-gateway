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
    payment: {
      id: String,
      url: String
    },
    userData: {
        email: String,
        names: String
    }
});

ClaimSchema.virtual('date')
    .get(function() {
        return this._id.getTimestamp();
    });

module.exports = mongoose.model('claim', ClaimSchema);

module.exports.STATUS = {
    ACTIVE: 'active',
    CREATING_PAYMENT: 'creatingPayment',
    WAITING: 'waiting',
    PENDING: 'pending',
    PAYED: 'payed',
    EXPIRED: 'expired'
};
