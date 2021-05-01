const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
	body: {
		type: String,
		required: true
	},
	userEmail: {
		type: String,
		required: true
	},
    productId: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: 'Product'
	},
    replyTo: {
		type: Schema.Types.ObjectId,
		required: false,
		ref: 'Comment'
	}
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
