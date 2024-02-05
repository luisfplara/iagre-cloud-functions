"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
// import admin = require("firebase-admin");
// const firestore = admin.firestore();
const axios_1 = require("axios");
const FormData = require("form-data");
async function configDestinadas(userRef, plugStoreSettingsData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    try {
        const user = await userRef.get();
        const form = new FormData();
        const file = await axios_1.default.get(plugStoreSettingsData.data().certificate_pfx, { responseType: "stream" });
        form.append("cert_pfx", file.data, "cert_pfx_" + user.id + ".pfx");
        form.append("cert_password", plugStoreSettingsData.data().certificate_pass);
        form.append("dfe_cert_concentrating", "0");
        form.append("uf", (_b = (_a = user.data()) === null || _a === void 0 ? void 0 : _a.user_information.mail_address) === null || _b === void 0 ? void 0 : _b.uf);
        form.append("dfe_period", "4");
        form.append("dfe_tipo", "NFE");
        form.append("dfe_cienciaAutomatica", "1");
        form.append("cnpj_cpf", (_f = (_e = (_d = (_c = user.data()) === null || _c === void 0 ? void 0 : _c.user_information) === null || _d === void 0 ? void 0 : _d.pessoa_juridica) === null || _e === void 0 ? void 0 : _e.cnpj) !== null && _f !== void 0 ? _f : (_j = (_h = (_g = user.data()) === null || _g === void 0 ? void 0 : _g.user_information) === null || _h === void 0 ? void 0 : _h.pessoa_fisica) === null || _j === void 0 ? void 0 : _j.cpf);
        form.append("dfe_notifica", "0");
        const getInvoiceResponse = await axios_1.default.post("https://app.plugstorage.com.br/api/v2/destinadas/configdestined", form, {
            headers: {
                "Content-Type": "multipart/form-data",
                "Authorization": "Basic MjhiN2ZkNDkxMWViZDAwMTg0YTRkMzU5MzZiMDBmMzVmMDM5OTcwYTpQQHNzYXdvcmQx",
            },
        });
        console.log(user.id + " ===> ", getInvoiceResponse.data.message);
        const accountSettings = (_k = user.data()) === null || _k === void 0 ? void 0 : _k.account_settings;
        accountSettings.plugstore_sync_invoice_settings_done = true;
        await userRef.update({ "account_settings": accountSettings });
        await plugStoreSettingsData.ref.update({ "destinadas_plug_store_message": getInvoiceResponse === null || getInvoiceResponse === void 0 ? void 0 : getInvoiceResponse.data });
    }
    catch (erro) {
        console.log("Erro configDestinadas: ", erro);
        await plugStoreSettingsData.ref.update({ "destinadas_plug_store_message": (_l = erro === null || erro === void 0 ? void 0 : erro.response) === null || _l === void 0 ? void 0 : _l.data });
    }
}
exports.configurarDestinadas = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).firestore
    .document("plug_store_settings/{docId}")
    .onUpdate(async (change, context) => {
    console.log("Esperando 5 minutos para configurar destinadas");
    const plugStoreSettingsDataAfter = change.after;
    const plugStoreSettingsDataBefore = change.before;
    if (plugStoreSettingsDataAfter.data().isRegistered) {
        if (plugStoreSettingsDataAfter.data().certificate_pass != "" && plugStoreSettingsDataAfter.data().certificate_pfx != "") {
            if (plugStoreSettingsDataAfter.data().isRegistered != plugStoreSettingsDataBefore.data().isRegistered || plugStoreSettingsDataAfter.data().certificate_pass != plugStoreSettingsDataBefore.data().certificate_pass || plugStoreSettingsDataAfter.data().certificate_pfx != plugStoreSettingsDataBefore.data().certificate_pfx) {
                setTimeout(async () => {
                    var _a;
                    console.log("userId: ", plugStoreSettingsDataAfter.data().user.id, " plug_store_settings: ", plugStoreSettingsDataAfter.id);
                    await configDestinadas((_a = change.after.data()) === null || _a === void 0 ? void 0 : _a.user, plugStoreSettingsDataAfter);
                }, 300000);
            }
        }
    }
});
//# sourceMappingURL=configurarDestinadas.js.map