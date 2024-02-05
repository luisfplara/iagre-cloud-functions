/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import {onRequest} from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";


import admin = require("firebase-admin");

admin.initializeApp();

const firestore = admin.firestore();
firestore.settings({ ignoreUndefinedProperties: true });

// IAGREapp

import getNewBoletos = require("./IAGREapp/boleto/getNewBoletos")
import getHistoryBoletos = require ("./IAGREapp/boleto/getHistoryBoletos")
import iupayGatteway = require ("./IAGREapp/boleto/iupayGatteway")

import wppNotifyPaymentDaily = require("./IAGREapp/notification/wppNotifyPaymentDaily")
import wppNotifyPaymentWeekly = require("./IAGREapp/notification/wppNotifyPaymentWeekly");


import getNewInvoices = require("./IAGREapp/invoice/getNewInvoices")
import getHistoryInvoices = require ("./IAGREapp/invoice/getHistoryInvoices")
import configurarDestinadas = require ("./IAGREapp/invoice/configurarDestinadas")
exports.boleto = [getNewBoletos, iupayGatteway, getHistoryBoletos];
exports.notify = [wppNotifyPaymentDaily, wppNotifyPaymentWeekly];
exports.invoice = [getNewInvoices, getHistoryInvoices, configurarDestinadas];

// IAGOassist

import ReceivedMessageGateway = require("./IAGOassist/ReceivedMessageGateway")
import IagoAgent = require ("./IAGOassist/IagoAgent")
exports.iagoAssist = [ReceivedMessageGateway, IagoAgent];

