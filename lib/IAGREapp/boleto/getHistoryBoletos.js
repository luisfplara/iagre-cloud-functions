"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
const limit = 60;
const firestore = admin.firestore();
const today = new Date();
const yesterday = new Date();
yesterday.setDate((today.getDate() - 1));
const yesterdayString = yesterday.toISOString().split("T")[0];
async function iupayGetBoletos(token, user, page) {
    try {
        const boletosData = await axios_1.default.get("https://api.iupay.com.br/api/v1/boletos?" + new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            max_created_at: yesterdayString,
        }), {
            headers: {
                "X-Source-Id": "6578634bb012ad5ad6bd33eb",
                "X-Source-Secret": "wp49f7nIrd8QWTPLHcMmsxDNBj2zCU",
                "Authorization": `Bearer ${token}`,
            },
        });
        const listBoletos = boletosData.data;
        console.log(`user: ${user.id} page: ${page} -: boletos na pagina: ${listBoletos.length} total de boleto: ${(page * limit) + (listBoletos.length)}`);
        for (const boleto of listBoletos) {
            boleto.user = user;
            boleto.isNew = true;
            boleto.paid_out = false;
            boleto.dueDate_timestamp = Date.parse(boleto.dueDate);
            boleto.issueDate_timestamp = Date.parse(boleto.issueDate);
            await firestore.collection("boleto").add(boleto);
        }
        if (listBoletos.length >= limit) {
            return await iupayGetBoletos(token, user, page + 1);
        }
        return (page * limit) + (listBoletos.length);
    }
    catch (erro) {
        console.log("erro iupayGetBoletos: ", erro.response.data);
    }
}
async function iupayAuth(externalId, user) {
    try {
        const auth = await axios_1.default.post("https://api.iupay.com.br/api/v1/users/authenticate?" + new URLSearchParams({
            externalId: externalId,
        }), {}, {
            headers: {
                "X-Source-Id": "6578634bb012ad5ad6bd33eb",
                "X-Source-Secret": "wp49f7nIrd8QWTPLHcMmsxDNBj2zCU",
            },
        });
        const token = auth.data.token;
        await iupayGetBoletos(token, user, 0);
    }
    catch (erro) {
        console.log("Erro iupayAuth: ", erro.response.data);
    }
}
exports.getHistoryBoletos = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).firestore
    .document("iupay_settings/{docId}")
    .onCreate(async (snap, context) => {
    console.log("New IUPAY user created, waiting 5 minutes to get his boletos.");
    setTimeout(async () => {
        const externalId = snap.data().externalId;
        const user = snap.data().user;
        console.log("Buscando historico de boletos para o usuário: " + user);
        console.log("yesterday -----> ", yesterdayString);
        try {
            await iupayAuth(externalId, user);
        }
        catch (erro) {
            console.log("erro getNewBoletos", erro.response.data);
        }
    }, 300000);
});
//# sourceMappingURL=getHistoryBoletos.js.map