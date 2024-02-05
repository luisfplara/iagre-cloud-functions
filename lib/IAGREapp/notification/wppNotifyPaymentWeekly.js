"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
const firestore = admin.firestore();
function currencyConver(numero) {
    const formatoMoeda = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
    return formatoMoeda.format(numero);
}
exports.wppNotifyPaymentWeekly = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).pubsub.schedule("0 6 * * 1").timeZone("America/Sao_Paulo").onRun(async (context) => {
    var _a, _b, _c, _d, _e, _f;
    const currentDate = new Date();
    const dayFirstHour = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dayLastHour = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7, 23);
    console.log("dayFirstHour -> ", dayFirstHour.getTime());
    console.log("dayLastHour -> ", dayLastHour.getTime());
    const boletosData = await firestore.collection("boleto").where("dueDate_timestamp", ">", dayFirstHour.getTime()).where("dueDate_timestamp", "<=", dayLastHour.getTime()).orderBy("dueDate_timestamp").get();
    console.log("boletosData.docs.length", boletosData.docs.length);
    const listUserBoleto = new Map();
    for (const boleto of boletosData.docs) {
        const userId = boleto.data().user.id;
        if (listUserBoleto.get(userId) == undefined) {
            listUserBoleto.set(userId, [`\n\n1. ${boleto.data().issuer.name} _${boleto.data().issuer.name}_ \n* *vencimento:* ${boleto.data().dueDate}\n* *valor:* ${currencyConver(boleto.data().cost / 100)}`]);
        }
        else {
            const qtdBoletos = (_a = listUserBoleto.get(userId)) === null || _a === void 0 ? void 0 : _a.length;
            (_b = listUserBoleto.get(userId)) === null || _b === void 0 ? void 0 : _b.push(`\n\n${qtdBoletos + 1}. _${boleto.data().issuer.name}_ \n* *vencimento:* ${boleto.data().dueDate} \n* *valor:* ${currencyConver(boleto.data().cost / 100)}`);
        }
    }
    console.log(listUserBoleto);
    for (const user of listUserBoleto.keys()) {
        const userData = await firestore.doc("user/" + user).get();
        const userName = (_c = userData.data()) === null || _c === void 0 ? void 0 : _c.display_name;
        const userPhoneNumber = (_d = userData.data()) === null || _d === void 0 ? void 0 : _d.phone_number;
        const boletosMessage = listUserBoleto.get(user);
        if ((_f = (_e = userData.data()) === null || _e === void 0 ? void 0 : _e.account_settings) === null || _f === void 0 ? void 0 : _f.weekly_payment_notify) {
            const message = `Bom dia ${userName}, essa semana, você tem os seguintes pagamentos para realizar: \n\n*Boletos*\n` + boletosMessage + "\n*Notas Fiscais*\nnotassssss\n\nAcesse o aplicativo da Iagre para mais infomações.";
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
//# sourceMappingURL=wppNotifyPaymentWeekly.js.map