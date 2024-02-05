"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// import axios = require("axios");
const express = require("express");
const cors = require("cors");
const axios_1 = require("axios");
// const firestore = admin.firestore();
const app = express();
const firestore = admin.firestore();
app.use(cors());
app.use(express.json());
async function iupayGetBoleto(token, user, externalId) {
    try {
        const boletosData = await axios_1.default.get("https://api.iupay.com.br/api/v1/boletos/" + externalId, {
            headers: {
                "X-Source-Id": "6578634bb012ad5ad6bd33eb",
                "X-Source-Secret": "wp49f7nIrd8QWTPLHcMmsxDNBj2zCU",
                "Authorization": `Bearer ${token}`,
            },
        });
        const boleto = boletosData.data;
        boleto.user = user;
        boleto.isNew = true;
        boleto.paid_out = false;
        boleto.dueDate_timestamp = Date.parse(boleto.dueDate);
        boleto.issueDate_timestamp = Date.parse(boleto.issueDate);
        console.log(boleto);
        await firestore.collection("boleto").add(boleto);
    }
    catch (erro) {
        console.log("erro iupayGetBoletos: ", erro);
    }
}
async function iupayAuth(userId, externalId, user) {
    try {
        const auth = await axios_1.default.post("https://api.iupay.com.br/api/v1/users/authenticate?" + new URLSearchParams({
            externalId: userId,
        }), {}, {
            headers: {
                "X-Source-Id": "6578634bb012ad5ad6bd33eb",
                "X-Source-Secret": "wp49f7nIrd8QWTPLHcMmsxDNBj2zCU",
            },
        });
        const token = auth.data.token;
        await iupayGetBoleto(token, user, externalId);
    }
    catch (erro) {
        console.log("erro iupayAuth: ", erro.response.data);
    }
}
app.post("/boleto", async (req, res) => {
    if (req.method == "POST") {
        const iupaySettingsDoc = await firestore.collection("iupay_settings").where("externalId", "==", req.body.userId).get();
        const user = iupaySettingsDoc.docs[0].data().user;
        // console.log(user);
        await iupayAuth(req.body.userId, req.body.externalId, user);
    }
    res.send({ "status": "ok" });
});
app.post("/dda", async (req, res) => {
    console.log(req.body);
    res.send({ "status": "ok" });
});
app.post("/estadoPagamento", async (req, res) => {
    console.log(req.body);
    res.send({ "status": "ok" });
});
exports.iupayGatteway = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).https.onRequest(app);
//# sourceMappingURL=iupayGatteway.js.map