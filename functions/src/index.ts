import * as bodyParser from 'body-parser';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import {app} from './api/apiModule';

admin.initializeApp();

const main = express();
main.use(cors());
const apiPath = '/v1';
main.use(apiPath, app);
main.use(bodyParser.json());

const REGION = 'us-central1';

exports.api = functions.region(REGION).https.onRequest(main);
