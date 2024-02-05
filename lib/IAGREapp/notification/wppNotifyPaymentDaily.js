"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
// import axios from "axios";
// import { DocumentReference } from "firebase-admin/firestore";
const firestore = admin.firestore();
function currencyConver(numero) {
    const formatoMoeda = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
    return formatoMoeda.format(numero);
}
exports.wppNotifyPaymentDaily = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).pubsub.schedule("0 6 * * 2-7").timeZone("America/Sao_Paulo").onRun(async (context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const currentDate = new Date();
    const dayFirstHour = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dayLastHour = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23);
    console.log("dayFirstHour -> ", dayFirstHour.getTime());
    console.log("dayLastHour -> ", dayLastHour.getTime());
    const boletosData = await firestore.collection("boleto").where("dueDate_timestamp", ">", dayFirstHour.getTime()).where("dueDate_timestamp", "<=", dayLastHour.getTime()).orderBy("dueDate_timestamp").get();
    console.log("boletosData.docs.length", boletosData.docs.length);
    const listUserBoleto = new Map();
    for (const boleto of boletosData.docs) {
        const userId = boleto.data().user.id;
        if (listUserBoleto.get(userId) == undefined) {
            listUserBoleto.set(userId, [`\n\n1. _${boleto.data().issuer.name}_ \n* *valor:* ${currencyConver(boleto.data().cost / 100)}`]);
        }
        else {
            const qtdBoletos = (_a = listUserBoleto.get(userId)) === null || _a === void 0 ? void 0 : _a.length;
            (_b = listUserBoleto.get(userId)) === null || _b === void 0 ? void 0 : _b.push(`\n\n${qtdBoletos + 1}. _${boleto.data().issuer.name}_ \n* *valor:* ${currencyConver(boleto.data().cost / 100)}`);
        }
    }
    const parcelasData = await firestore.collection("invoice_parcelas").where("dVenc_timestamp", ">", dayFirstHour.getTime()).where("dVenc_timestamp", "<=", dayLastHour.getTime()).get();
    console.log("parcelasData.docs.length", parcelasData.docs.length);
    const listUserParcelas = new Map();
    for (const parcela of parcelasData.docs) {
        const userId = parcela.data().user.id;
        const invoiceDetail = await parcela.data().invoice_detail.get();
        const emitName = (_e = (_d = (_c = invoiceDetail.data()) === null || _c === void 0 ? void 0 : _c.emit) === null || _d === void 0 ? void 0 : _d.xFant) !== null && _e !== void 0 ? _e : (_g = (_f = invoiceDetail.data()) === null || _f === void 0 ? void 0 : _f.emit) === null || _g === void 0 ? void 0 : _g.xNome;
        if (listUserParcelas.get(userId) == undefined) {
            listUserParcelas.set(userId, [`\n\n1. _${emitName}_ \n* *valor:* ${currencyConver(parcela.data().vDup)} \n* *parcela:* ${parcela.data().nDup} de ${parcela.data().qtd_duplicatas}`]);
        }
        else {
            const qtdParcelas = (_h = listUserParcelas.get(userId)) === null || _h === void 0 ? void 0 : _h.length;
            (_j = listUserParcelas.get(userId)) === null || _j === void 0 ? void 0 : _j.push(`\n\n${qtdParcelas + 1}. _${emitName}_ \n* *valor:* ${currencyConver(parcela.data().vDup)} \n* *parcela:* ${parcela.data().nDup} de ${parcela.data().qtd_duplicatas}`);
        }
    }
    // aaaa
    console.log(listUserBoleto);
    for (const user of listUserBoleto.keys()) {
        const userData = await firestore.doc("user/" + user).get();
        const userName = (_k = userData.data()) === null || _k === void 0 ? void 0 : _k.display_name;
        const userPhoneNumber = (_l = userData.data()) === null || _l === void 0 ? void 0 : _l.phone_number;
        const boletosMessage = listUserBoleto.get(user);
        const parcelasMessage = listUserParcelas.get(user);
        if ((_o = (_m = userData.data()) === null || _m === void 0 ? void 0 : _m.account_settings) === null || _o === void 0 ? void 0 : _o.daily_payment_notify) {
            const message = `\nBom dia ${userName}, venho comunicar que você tem os seguintes pagamentos para realizar hoje: \n\n*Boletos*` + boletosMessage + "\n\n*Parcelas das Notas Fiscais*" + parcelasMessage + "\n\nAcesse o aplicativo da Iagre para mais infomações.";
            axios_1.default.post("https://api.z-api.io/instances/3C6C8B78BF0D4065148B3A8F56A2DE3B/token/B6536D597ED20EE64870609D/send-text", {
                phone: userPhoneNumber,
                message: message,
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "Client-Token": "Fd040c9966f2d46e0b33d56fdbf75c9abS",
                },
            });
            console.log(message);
        }
    }
});
//# sourceMappingURL=wppNotifyPaymentDaily.js.map