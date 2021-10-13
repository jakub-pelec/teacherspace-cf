import * as express from 'express';
import createAccout from './handlers/createAccount';

export const app = express();

exports.app.post('/create_account', createAccout);