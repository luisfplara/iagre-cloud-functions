"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const getInvoices_1 = require("./getInvoices");
const today = new Date();
exports.getHistoryInvoices = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).firestore
    .document("user/{docId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d;
    const userBefore = (_b = (_a = change.before.data()) === null || _a === void 0 ? void 0 : _a.account_settings) === null || _b === void 0 ? void 0 : _b.plugstore_sync_invoice_settings_done;
    const userAfter = (_d = (_c = change.after.data()) === null || _c === void 0 ? void 0 : _c.account_settings) === null || _d === void 0 ? void 0 : _d.plugstore_sync_invoice_settings_done;
    const yesterday = new Date();
    yesterday.setDate((today.getDate() - 1));
    const yesterdayString = yesterday.toISOString().split("T")[0];
    const thirtyday = new Date();
    thirtyday.setDate((today.getDate() - 30));
    const thirtydayString = thirtyday.toISOString().split("T")[0];
    console.log("yesterdayString -----> ", yesterdayString);
    console.log("thirtydayString -----> ", thirtydayString);
    console.log("before", userBefore);
    console.log("after", userAfter);
    if (userBefore != userAfter) {
        if (userAfter) {
            console.log("  Waiting 5 minutes to execute getHistoryInvoices ");
            setTimeout(async () => {
                await (0, getInvoices_1.default)(change.after.ref, yesterdayString, thirtydayString);
            }, 300000);
        }
    }
});
//# sourceMappingURL=getHistoryInvoices.js.map