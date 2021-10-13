import * as express from 'express';
import * as admin from 'firebase-admin';
import {COLLECTIONS} from '../../constants/collections';
import {RESPONSE_CODES} from '../../constants/responseCodes';
import {createResponseMessage} from '../../utils/createResponseMessage';

export default async (
	request: express.Request,
	response: express.Response
): Promise<express.Response> => {
	const {
		body: {email, password, firstName, lastName},
	} = request;
	try {
		const {id: firestoreID} = await admin
			.firestore()
			.collection(COLLECTIONS.USERS)
			.add({firstName, lastName, email});
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
