"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
async function sendMessage(message, phoneNumber) {
    try {
        console.log("___Z-API sending message_____\n");
        console.log("message: ", message, "\n");
        console.log("phoneNumber: ", phoneNumber, "\n");
        await axios_1.default.post("https://api.z-api.io/instances/3C6C8B78BF0D4065148B3A8F56A2DE3B/token/B6536D597ED20EE64870609D/send-text", {
            phone: phoneNumber,
            message: message,
        }, {
            headers: {
                "Content-Type": "application/json",
                "Client-Token": "Fd040c9966f2d46e0b33d56fdbf75c9abS",
            },
        });
    }
    catch (erro) {
        return console.log("Erro ZAPI - sendMessage: ", erro.response.data);
    }
}
exports.default = sendMessage;
//# sourceMappingURL=sendMessage.js.map