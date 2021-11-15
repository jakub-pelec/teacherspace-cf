import * as express from 'express';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {COLLECTIONS} from '../../constants/collections';
import {RESPONSE_CODES} from '../../constants/responseCodes';
import {createResponseMessage} from '../../utils/createResponseMessage';
import {Stripe} from 'stripe';

const stripe = new Stripe(functions.config().stripe.secret, {
	apiVersion: '2020-08-27',
});

export default async (
	request: express.Request,
	response: express.Response
): Promise<express.Response> => {
	const {
		body: {email, password, firstName, lastName, subjects, classes},
	} = request;
	try {
		const customer = await stripe.customers.create({email});
		const intent = await stripe.setupIntents.create({
			customer: customer.id,
		});

		const {id: firestoreID} = await admin
			.firestore()
			.collection(COLLECTIONS.USERS)
			.add({
				firstName,
				lastName,
				email,
				subjects,
				classes,
				customer_id: customer.id,
				setup_secret: intent.client_secret
			});
		const {uid: authID} = await admin.auth().createUser({
			email,
			password,
			disabled: false,
		});
		await admin.auth().setCustomUserClaims(authID, {firestoreID});
		return response.status(200).send(
			createResponseMessage({
				code: RESPONSE_CODES.SUCCES,
				message: 'Account created',
				payload: {firestoreID},
			})
		);
	} catch (e) {
		return response.status(403).send(
			createResponseMessage({
				code: RESPONSE_CODES.FIREBASE_ERROR,
				message: e.message,
			})
		);
	}
};
