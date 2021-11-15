// @ts-nocheck

import * as bodyParser from 'body-parser';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import {app} from './api/apiModule';

import {Logging} from '@google-cloud/logging';
import {Stripe} from 'stripe';

const logging = new Logging({
	projectId: process.env.GCLOUD_PROJECT,
});

admin.initializeApp();

const main = express();
main.use(cors());
const apiPath = '/v1';
main.use(apiPath, app);
main.use(bodyParser.json());

const REGION = 'us-central1';

exports.api = functions.region(REGION).https.onRequest(main);

const stripe = new Stripe(functions.config().stripe.secret, {
	apiVersion: '2020-08-27',
});

exports.addPaymentMethodDetails = functions.firestore
	.document('/users/{userId}/payment_methods/{pushId}')
	.onCreate(async (snap, context) => {
		try {
			const paymentMethodId = snap.data().id;
			const paymentMethod = await stripe.paymentMethods.retrieve(
				paymentMethodId
			);
			await snap.ref.set(paymentMethod);
			// Create a new SetupIntent so the customer can add a new method next time.
			const intent = await stripe.setupIntents.create({
				customer: `${paymentMethod.customer}`,
			});
			await snap.ref.parent.parent.set(
				{
					setup_secret: intent.client_secret,
				},
				{merge: true}
			);
			return;
		} catch (error) {
			await snap.ref.set(
				{error: userFacingMessage(error)},
				{merge: true}
			);
			await reportError(error, {user: context.params.userId});
		}
	});

exports.createStripePayment = functions.firestore
	.document('users/{userId}/payments/{pushId}')
	.onCreate(async (snap, context) => {
		const {amount, currency, payment_method} = snap.data();
		try {
			const customer = (await snap.ref.parent.parent.get()).data()
				.customer_id;
			const idempotencyKey = context.params.pushId;
			const payment = await stripe.paymentIntents.create(
				{
					amount,
					currency,
					customer,
					payment_method,
					off_session: false,
					confirm: true,
					confirmation_method: 'manual',
				},
				{idempotencyKey}
			);
			await snap.ref.set(payment);
		} catch (error) {
			functions.logger.log(error);
			await snap.ref.set(
				{error: userFacingMessage(error)},
				{merge: true}
			);
			await reportError(error, {user: context.params.userId});
		}
	});

exports.confirmStripePayment = functions.firestore
	.document('users/{userId}/payments/{pushId}')
	.onUpdate(async (change, context) => {
		if (change.after.data().status === 'requires_confirmation') {
			const payment = await stripe.paymentIntents.confirm(
				change.after.data().id
			);
			change.after.ref.set(payment);
		}
	});

exports.cleanupUser = functions.auth.user().onDelete(async (user) => {
	const dbRef = admin.firestore().collection('users');
	const customer = (await dbRef.doc(user.uid).get()).data();
	await stripe.customers.del(customer.customer_id);
	const batch = admin.firestore().batch();
	const paymetsMethodsSnapshot = await dbRef
		.doc(user.uid)
		.collection('payment_methods')
		.get();
	paymetsMethodsSnapshot.forEach((snap) => batch.delete(snap.ref));
	const paymentsSnapshot = await dbRef
		.doc(user.uid)
		.collection('payments')
		.get();
	paymentsSnapshot.forEach((snap) => batch.delete(snap.ref));

	await batch.commit();

	await dbRef.doc(user.uid).delete();
	return;
});

const reportError = (err, context = {}) => {
	const logName = 'errors';
	const log = logging.log(logName);

	const metadata = {
		resource: {
			type: 'cloud_function',
			labels: {function_name: process.env.FUNCTION_NAME},
		},
	};

	const errorEvent = {
		message: err.stack,
		serviceContext: {
			service: process.env.FUNCTION_NAME,
			resourceType: 'cloud_function',
		},
		context: context,
	};

	return new Promise((resolve, reject) => {
		log.write(log.entry(metadata, errorEvent), (error) => {
			if (error) {
				return reject(error);
			}
			return resolve();
		});
	});
}

const userFacingMessage = (error) => {
	console.log(error);
	return error.type
		? error.message
		: 'An error occurred, developers have been alerted';
}
