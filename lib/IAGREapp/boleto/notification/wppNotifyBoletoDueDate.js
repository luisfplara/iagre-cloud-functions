"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
exports.wppNotifyBoletoDueDate = functions.pubsub.schedule(" every 5 minutes").onRun((context) => {
    console.log("This will be run every 5 minutes!");
    return null;
});
//# sourceMappingURL=wppNotifyBoletoDueDate.js.map