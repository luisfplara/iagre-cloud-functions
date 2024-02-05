"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firestore = admin.firestore();
const axios_1 = require("axios");
const getInvoiceDetailParcelas = (duplicata, fatura, pag, invoiceDetail, user) => {
    for (const dup of duplicata) {
        dup.invoice_detail = invoiceDetail;
        dup.dVenc_timestamp = Date.parse(dup.dVenc);
        dup.qtd_duplicatas = duplicata.length;
        dup.fat = fatura;
        dup.pag = pag;
        dup.paid_out = false;
        dup.user = user;
        console.log(`Nota ${invoiceDetail.id} adicionando parcela ${dup.vDup}`);
        firestore.collection("invoice_parcelas").add(dup);
    }
};
const getInvoiceDetailProducts = (invoiceDetailProductList, invoiceDetail, user) => {
    var _a;
    for (const product of invoiceDetailProductList) {
        product.invoice_detail = invoiceDetail;
        product.safra_name = "sem safra";
        product.user = user;
        console.log(`Nota ${invoiceDetail.id} adicionando produto ${(_a = product === null || product === void 0 ? void 0 : product.prod) === null || _a === void 0 ? void 0 : _a.xProd} `);
        firestore.collection("invoice_product").add(product);
    }
};
const getInvoiceDetail = (cpfCnpj, invoiceKey, user) => {
    return new Promise((resolve, reject) => {
        axios_1.default.get("https://app.plugstorage.com.br/api/v2/invoices/export?" + new URLSearchParams({
            softwarehouse_token: "28b7fd4911ebd00184a4d35936b00f35f039970a",
            invoice_key: invoiceKey,
            mode: "JSON",
            return_type: "ENCODE",
            cpf_cnpj: cpfCnpj,
            resume: "false",
            downloaded: "true",
        })).then(function (invoiceDetailResponse) {
            // const invoiceDatailData = {emit: "", dest: "", ide: "", transp: "", pag: "", total: "", key: "", user: user.ref};
            const invoiceDatailData = {};
            invoiceDatailData.emit = invoiceDetailResponse.data.data.xml.NFe.infNFe.emit;
            invoiceDatailData.dest = invoiceDetailResponse.data.data.xml.NFe.infNFe.dest;
            invoiceDatailData.ide = invoiceDetailResponse.data.data.xml.NFe.infNFe.ide;
            invoiceDatailData.transp = invoiceDetailResponse.data.data.xml.NFe.infNFe.transp;
            invoiceDatailData.pag = invoiceDetailResponse.data.data.xml.NFe.infNFe.pag;
            invoiceDatailData.total = invoiceDetailResponse.data.data.xml.NFe.infNFe.total.ICMSTot;
            invoiceDatailData.key = invoiceKey;
            invoiceDatailData.user = user.ref;
            firestore.collection("invoice_detail").add(invoiceDatailData).then((invoiceDetailDoc) => {
                console.log(`Nota ${invoiceDetailDoc.id} possui ${invoiceDetailResponse.data.data.xml.NFe.infNFe.det.length} produtos`);
                const productList = invoiceDetailResponse.data.data.xml.NFe.infNFe.det;
                const pag = invoiceDetailResponse.data.data.xml.NFe.infNFe.pag;
                const cobr = invoiceDetailResponse.data.data.xml.NFe.infNFe.cobr;
                const tpNF = invoiceDetailResponse.data.data.xml.NFe.infNFe.ide.tpNF;
                const finNFe = invoiceDetailResponse.data.data.xml.NFe.infNFe.ide.finNFe;
                try {
                    getInvoiceDetailProducts(productList, invoiceDetailDoc, user.ref);
                    if (tpNF == 1 && finNFe == 1) {
                        getInvoiceDetailParcelas(cobr.dup, cobr.fat, pag.detPag, invoiceDetailDoc, user.ref);
                    }
                }
                catch (erro) {
                    console.log("erro get_invoice_detail_products or get_invoice_detail_payment: ", erro);
                }
                resolve(invoiceDetailDoc);
            });
        }).catch((erro) => {
            reject(console.log("erro ao buscar invoice_detail: ", erro));
        });
    });
};
const getInvoice = (user) => {
    var _a, _b, _c;
    const userInformation = (_a = user.data()) === null || _a === void 0 ? void 0 : _a.user_information;
    const cpfCnpj = ((_b = userInformation.pessoa_juridica) === null || _b === void 0 ? void 0 : _b.cnpj) || ((_c = userInformation.pessoa_fisica) === null || _c === void 0 ? void 0 : _c.cpf);
    const lastId = userInformation.invoice_last_id;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate((today.getDate() - 1));
    console.log("today -----> ", `${today.getFullYear()}-${("0" + today.getMonth() + 1).slice(-2)}-${today.getDate()}`);
    console.log("yesterday -----> ", `${yesterday.getFullYear()}-${("0" + yesterday.getMonth() + 1).slice(-2)}-${yesterday.getDate()}`);
    console.log("cpf_cnpj -----> ", cpfCnpj);
    console.log("lastId -----> ", lastId);
    axios_1.default.get("https://app.plugstorage.com.br/api/v2/invoices/keys?" + new URLSearchParams({
        softwarehouse_token: "28b7fd4911ebd00184a4d35936b00f35f039970a",
        // date_ini: "2023-07-06",
        // date_end: "2023-07-07",
        date_ini: `${today.getFullYear()}-${("0" + today.getMonth() + 1).slice(-2)}-${today.getDate()}`,
        date_end: `${yesterday.getFullYear()}-${("0" + today.getMonth() + 1).slice(-2)}-${today.getDate()}`,
        mod: "NFE",
        transaction: "received",
        cpf_cnpj: cpfCnpj,
        environment: "1",
        last_id: lastId,
    })).then((getInvoiceResponse) => {
        if (getInvoiceResponse.data.data.count > 0) {
            for (const invoice of getInvoiceResponse.data.data.invoices) {
                getInvoiceDetail(cpfCnpj, invoice.key, user).then((invoiceDetail) => {
                    invoice.user = user.ref;
                    invoice.isNew = true;
                    invoice.invoice_detail = invoiceDetail;
                    invoice.datetime_emission = Date.parse(invoice.date_emission);
                    firestore.collection("invoice").add(invoice);
                });
            }
            userInformation.invoice_last_id = getInvoiceResponse.data.data.last_id;
            user.ref.update({ user_information: userInformation });
        }
        else {
            console.log(`Not new invoices for user ${user.id}`);
        }
    }).catch((erro) => {
        console.log("erro ao buscar invoice:", erro);
    });
};
async function checkNewInvoices() {
    try {
        const plugStoreSettings = await firestore.collection("plug_store_settings").get();
        for (const psSetting of plugStoreSettings.docs) {
            psSetting.data().user.get()
                .then((user) => {
                getInvoice(user);
            })
                .catch((erro) => {
                console.log(`plug_store_settings ${psSetting.id}:`, erro);
            });
        }
    }
    catch (error) {
        console.log(error);
    }
}
exports.default = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).pubsub.schedule("0 0/1 * * *").onRun(async (context) => {
    await checkNewInvoices();
});
//# sourceMappingURL=getInvoiceHistory.js.map