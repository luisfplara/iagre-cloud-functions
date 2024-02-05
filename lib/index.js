"use strict";
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
// import {onRequest} from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";
const admin = require("firebase-admin");
admin.initializeApp();
const firestore = admin.firestore();
firestore.settings({ ignoreUndefinedProperties: true });
// IAGREapp
const getNewBoletos = require("./IAGREapp/boleto/getNewBoletos");
const getHistoryBoletos = require("./IAGREapp/boleto/getHistoryBoletos");
const iupayGatteway = require("./IAGREapp/boleto/iupayGatteway");
const wppNotifyPaymentDaily = require("./IAGREapp/notification/wppNotifyPaymentDaily");
const wppNotifyPaymentWeekly = require("./IAGREapp/notification/wppNotifyPaymentWeekly");
const getNewInvoices = require("./IAGREapp/invoice/getNewInvoices");
const getHistoryInvoices = require("./IAGREapp/invoice/getHistoryInvoices");
const configurarDestinadas = require("./IAGREapp/invoice/configurarDestinadas");
exports.boleto = [getNewBoletos, iupayGatteway, getHistoryBoletos];
exports.notify = [wppNotifyPaymentDaily, wppNotifyPaymentWeekly];
exports.invoice = [getNewInvoices, getHistoryInvoices, configurarDestinadas];
// IAGOassist
const ReceivedMessageGateway = require("./IAGOassist/ReceivedMessageGateway");
const IagoAgent = require("./IAGOassist/IagoAgent");
exports.iagoAssist = [ReceivedMessageGateway, IagoAgent];
//# sourceMappingURL=index.js.map