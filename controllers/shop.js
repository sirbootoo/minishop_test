const fs = require('fs');
const geolib = require('geolib');
const path = require('path');

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');
const Comment = require('../models/comment');

const errorHandler = require('../util/error_handler');
let { ITEMS_PER_PAGE } = require('../util/constants');

const { validationResult } = require('express-validator/check');
const { deleteFile } = require('../util/file');

ITEMS_PER_PAGE = 20;

exports.getProducts = (req, res, next) => {
	const page = Number.parseInt(req.query.page) || 1;
	let totalItems;
	const user = req.user;

	Product.countDocuments()
		.then(numProducts => {
			totalItems = numProducts;
			return Product.find()
				.skip((page - 1) * ITEMS_PER_PAGE)
				.limit(ITEMS_PER_PAGE).lean();
		})
		.then(products => {
			let prodLength = products.length;
			let productsArr = [];
			while(prodLength--) {
				let product = products[prodLength];
				let distanceFromUser = geolib.getPreciseDistance(
					{ latitude: product.lat, longitude: product.long },
					{ latitude: user.lat, longitude: user.long },
				)
				product.distanceFromUser = distanceFromUser || 0;
				productsArr.push(product)
			}
			productsArr.sort((a,b)=> {
				return a.distanceFromUser - b.distanceFromUser;
			});
			res.render('shop/product-list', {
				prods: productsArr,
				pageTitle: 'All Products',
				path: '/products',
				totalProducts: totalItems,
				currentPage: page,
				hasNextPage: ITEMS_PER_PAGE * page < totalItems,
				hasPreviousPage: page > 1,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
			});
		})
		.catch(err => errorHandler(err, next));
};

exports.getProduct = (req, res, next) => {
	Product.findById(req.params.productId)
		.then(product => {
			res.render('shop/product-detail', {
				product: product,
				pageTitle: product.title,
				path: '/products'
			});
		})
		.catch(err => errorHandler(err, next));
};

exports.getIndex = (req, res, next) => {
	const page = Number.parseInt(req.query.page) || 1;
	let totalItems;

	Product.countDocuments()
		.then(numProducts => {
			totalItems = numProducts;
			return Product.find()
				.skip((page - 1) * ITEMS_PER_PAGE)
				.limit(ITEMS_PER_PAGE);
		})
		.then(products => {
			res.render('shop/index', {
				prods: products,
				pageTitle: 'Shop',
				path: '/',
				totalProducts: totalItems,
				currentPage: page,
				hasNextPage: ITEMS_PER_PAGE * page < totalItems,
				hasPreviousPage: page > 1,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
			});
		})
		.catch(err => errorHandler(err, next));
};

exports.getCart = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then(user => {
			const cartProducts = user.cart.items;
			res.render('shop/cart', {
				path: '/cart',
				pageTitle: 'Your Cart',
				products: cartProducts
			});
		})
		.catch(err => errorHandler(err, next));
};

exports.postCart = (req, res, next) => {
	const inputs = req.body;
	Product.findById(inputs.productId)
		.then(product => {
			return req.user.addToCart(product);
		})
		.then(() => {
			res.redirect('/cart');
		})
		.catch(err => errorHandler(err, next));
};

exports.postDeleteCartItem = (req, res, next) => {
	const prodId = req.body.productId;
	Product.findById(prodId)
		.then(product => {
			return req.user.deleteFromCart(product);
		})
		.then(() => {
			res.redirect('/cart');
		})
		.catch(err => errorHandler(err, next));
};

exports.getCheckout = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then(user => {
			const cartProducts = user.cart.items;
			let total = 0;
			cartProducts.forEach(prod => {
				total += prod.productId.price;
			});
			res.render('shop/checkout', {
				path: '/checkout',
				pageTitle: 'Checkout',
				products: cartProducts,
				totalSum: total
			});
		})
		.catch(err => errorHandler(err, next));
};

exports.getOrders = (req, res, next) => {
	Order.find()
		.where('user', req.user._id)
		.then(orders => {
			res.render('shop/orders', {
				path: '/orders',
				orders: orders,
				pageTitle: 'Your Orders'
			});
		})
		.catch(err => errorHandler(err, next));
};

exports.postCreateOrder = (req, res, next) => {
	req.user
		.addOrder()
		.then(() => {
			res.redirect('/orders');
		})
		.catch(err => errorHandler(err, next));
};

exports.getOrderInvoice = (req, res, next) => {
	const orderId = req.params.orderId;
	Order.findById(orderId)
		.then(order => {
			if (!order) {
				return next(new Error('No order found!'));
			}

			if (order.user.toString() !== req.user._id.toString()) {
				return next(new Error('Unauthoried!'));
			}

			const pdf = new PDFDocument();
			const invoiceName = 'invoice-' + orderId + '.pdf';
			const invoicePath = path.join('data', 'invoices', invoiceName);

			pdf.pipe(fs.createWriteStream(invoicePath));
			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
			pdf.pipe(res);

			pdf.fontSize(26).text('Invoice');
			pdf.fontSize(14).text('------------------------');

			let totalPrice = 0;
			order.items.forEach(item => {
				totalPrice = totalPrice + item.productId.price * item.quantity;
				pdf.fontSize(14).text(item.productId.title + ' - $' + item.productId.price + ' x ' + item.quantity);
			});

			pdf.text('------------------------');
			pdf.text('Total: $' + Math.round(totalPrice));
			pdf.end();
		})
		.catch(err => next(err));
};

exports.getComments = (req, res, next) => {
	const page = Number.parseInt(req.query.page) || 1;
	const productId = req.query.productId;
	let totalItems;

	Comment.find({productId}).countDocuments()
		.then(numComments => {
			totalItems = numComments;
			return Comment.find({productId})
				.skip((page - 1) * ITEMS_PER_PAGE)
				.limit(ITEMS_PER_PAGE);
		})
		.then(comments => {
			res.render('shop/comment-list', {
				comments,
				productId,
				pageTitle: 'All Comments',
				path: '/comments',
				totalComments: totalItems,
				currentPage: page,
				hasNextPage: ITEMS_PER_PAGE * page < totalItems,
				hasPreviousPage: page > 1,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
			});
		})
		.catch(err => errorHandler(err, next));
};

exports.getAddComment = (req, res, next) => {
	const productId = req.params.productId;
	res.render('shop/add-comment', {
		productId,
		pageTitle: 'Comment on product',
		path: 'add-comment/'+productId,
		editing: false,
		validationErrors: [],
		product: {},
		hasError: false
	});
};

exports.postAddComment = (req, res, next) => {
	const inputs = req.body;
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(422).render('shop/add-comments', {
			pageTitle: 'Add Comment',
			path: 'add-comment/'+productId,
			editing: false,
			validationErrors: errors.array(),
			product: inputs,
			hasError: true
		});
	}

	const comment = new Comment({
		body: inputs.body,
		productId: inputs.productId,
		replyTo: inputs.replyTo,
		userEmail: req.user.email
	});
	comment
		.save()
		.then(() => {
			res.redirect('/');
		})
		.catch(err => {
			return errorHandler(err, next);
		});

}
