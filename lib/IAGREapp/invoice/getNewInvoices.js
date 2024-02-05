"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firestore = admin.firestore();
const getInvoices_1 = require("./getInvoices");
// console.log("yesterday -----> ", yesterdayString);
async function checkNewInvoices() {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    console.log("todayString -----> ", todayString);
    const promiseList = [];
    try {
        const plugStoreSettings = await firestore.collection("plug_store_settings").get();
        for (const psSetting of plugStoreSettings.docs) {
            promiseList.push((0, getInvoices_1.default)(psSetting.data().user, todayString, todayString));
        }
        await Promise.all(promiseList);
    }
    catch (error) {
        console.log(error);
    }
}
exports.getNewInvoices = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).pubsub.schedule("0 18 * * *").timeZone("America/Sao_Paulo").onRun(async (context) => {
    return await checkNewInvoices();
});
//# sourceMappingURL=getNewInvoices.js.map