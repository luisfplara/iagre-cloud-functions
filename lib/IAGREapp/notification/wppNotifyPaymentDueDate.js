"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
// import axios from "axios";
// import { DocumentReference } from "firebase-admin/firestore";
const firestore = admin.firestore();
/*  functions.region("southamerica-east1").
  runWith({
    memory: "128MB",
  }).https.onRequest(
    */
function currencyConver(numero) {
    const formatoMoeda = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
    return formatoMoeda.format(numero);
}
exports.wppNotifyPaymentDueDate = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).pubsub.schedule("0 6 * * *").timeZone("America/Sao_Paulo").onRun(async (context) => {
    var _a, _b, _c;
    const currentDate = new Date();
    const dayFirstHour = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dayLastHour = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23);
    console.log("dayFirstHour -> ", dayFirstHour.getTime());
    console.log("dayLastHour -> ", dayLastHour.getTime());
    const boletosData = await firestore.collection("boleto").where("dueDate_timestamp", ">", dayFirstHour.getTime()).where("dueDate_timestamp", "<=", dayLastHour.getTime()).get();
    console.log("boletosData.docs.length", boletosData.docs.length);
    const listUserBoleto = new Map();
    for (const boleto of boletosData.docs) {
        const userId = boleto.data().user.id;
        if (listUserBoleto.get(userId) == undefined) {
            listUserBoleto.set(userId, [`\n1. ${boleto.data().issuer.name} - valor: ${currencyConver(boleto.data().cost / 100)}`]);
        }
        else {
            const qtdBoletos = (_a = listUserBoleto.get(userId)) === null || _a === void 0 ? void 0 : _a.length;
            (_b = listUserBoleto.get(userId)) === null || _b === void 0 ? void 0 : _b.push(`\n${qtdBoletos + 1}. ${boleto.data().issuer.name} - valor: ${currencyConver(boleto.data().cost / 100)}`);
        }
    }
    console.log(listUserBoleto);
    for (const user of listUserBoleto.keys()) {
        const userData = await firestore.doc("user/" + user).get();
        const userName = (_c = userData.data()) === null || _c === void 0 ? void 0 : _c.display_name;
        // const userPhoneNumber = userData.data()?.phone_number;
        const boletosMessage = listUserBoleto.get(user);
        const message = `Bom dia ${userName}, venho comunicar que os boletos a seguir vemcem hoje: \n` + boletosMessage + "\n\nAcesse o aplicativo da Iagre para mais infomações.";
        axios_1.default.post("https://api.z-api.io/instances/3C6C8B78BF0D4065148B3A8F56A2DE3B/token/B6536D597ED20EE64870609D/send-text", {
            phone: "5548998531406",
            message: message,
        }, {
            headers: {
                "Content-Type": "application/json",
                "Client-Token": "Fd040c9966f2d46e0b33d56fdbf75c9abS",
            },
        });
        console.log(message);
    }
});
//# sourceMappingURL=wppNotifyPaymentDueDate.js.map