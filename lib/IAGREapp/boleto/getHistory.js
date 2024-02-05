"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
const limit = 10;
const firestore = admin.firestore();
async function iupayGetBoletos(token, user, page) {
    try {
        const boletosData = await axios_1.default.get("https://api.iupay.com.br/api/v1/boletos?" + new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        }), {
            headers: {
                "X-Source-Id": "6578634bb012ad5ad6bd33eb",
                "X-Source-Secret": "wp49f7nIrd8QWTPLHcMmsxDNBj2zCU",
                "Authorization": `Bearer ${token}`,
            },
        });
        const listBoletos = boletosData.data;
        console.log(`user: ${user.id} page: ${page} boletos na pagina: ${listBoletos.length}`);
        for (const boleto of listBoletos) {
            boleto.user = user.ref;
            boleto.isNew = true;
            boleto.paid_out = false;
            boleto.dueDate_timestamp = Date.parse(boleto.dueDate);
            boleto.issueDate_timestamp = Date.parse(boleto.issueDate);
            await firestore.collection("boleto").add(boleto);
        }
        if (listBoletos.length >= limit) {
            await iupayGetBoletos(token, user, page + 1);
        }
    }
    catch (erro) {
        console.log("erro iupayGetBoletos: ", erro);
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
        console.log("erro iupayAuth: ", erro.response.data);
    }
}
exports.getHistory = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).https.onRequest(async (req, res) => {
    const iupaySettingsDoc = await firestore.collection("iupay_settings").get();
    console.log("iupaySetting: ", iupaySettingsDoc.docs.length);
    const promises = [];
    for (const iupaySetting of iupaySettingsDoc.docs) {
        const externalId = iupaySetting.data().externalId;
        const user = iupaySetting.data().user;
        promises.push(iupayAuth(externalId, user));
    }
    await Promise.all(promises);
    res.status(200).send({ "message": "all " });
});
//# sourceMappingURL=getHistory.js.map