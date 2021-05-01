const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
	title: {
		type: String,
		required: true
	},
	price: {
		type: Number,
		required: true
	},
	description: {
		type: String,
		required: true
	},
	imageUrl: {
		type: String,
		required: true
	},
	userId: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: 'User'
	},
	address: {
		type: String,
		required: true
	},
	lat: {
		type: Number,
		required: true
	},
	long: {
		type: Number,
		required: true
	}
}, { timestamps: false });

module.exports = mongoose.model('Product', productSchema);
