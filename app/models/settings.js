var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SettingsSchema = new Schema({
	key: String,
	value: String
});

module.exports = mongoose.model('settings', SettingsSchema);
