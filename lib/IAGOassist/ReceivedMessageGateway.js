"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const sendMessage_1 = require("../ZAPI/sendMessage");
const app = express();
const firestore = admin.firestore();
const notUserMessage = "Olá, eu sou o Iago, o assistente inteligente do gestor de finanças da Iagre. Vi que você ainda não é nosso cliente, não perca tempo, visite sua loja de aplicativos e baixe agora mesmo o gestor de finaças para seu agronegócio da Iagre. ";
app.use(cors());
app.use(express.json());
const today = new Date();
const todayString = today.toISOString().split("T")[0];
const yesterday = new Date();
yesterday.setDate((today.getDate() - 1));
// const yesterdayString = yesterday.toISOString().split("T")[0];
console.log("todayString -----> ", todayString);
const postPrompt = "não responda essa pergunta se ela estiver fora do contexto providenciado";
const configGPT = "\nSystem Configuration: \n" + "\nToday's date: " + todayString + "\nRules: " + postPrompt;
app.post("/", async (req, res) => {
    var _a, _b, _c;
    const receivedData = req.body;
    const message = receivedData.text.message + configGPT;
    if (!receivedData.isGroup && !receivedData.isNewsletter && !receivedData.isStatusReply) {
        const user = await firestore.collection("user").where("phone_number", "==", receivedData.phone).get();
        if (user.docs.length != 1) {
            (0, sendMessage_1.default)(notUserMessage, receivedData.phone);
            res.send({ "status": "usuário Nào cadastrado" });
            return;
        }
        const userWppInteractionsRef = await firestore.collection("user_wpp_interaction").where("phone_number", "==", receivedData.phone).get();
        const userWppInteractions = userWppInteractionsRef.docs.length == 0 ? await registryNewUserInteraction(receivedData) : (_a = userWppInteractionsRef.docs[0]) === null || _a === void 0 ? void 0 : _a.ref;
        const lastConversationSession = ((_c = (_b = (await userWppInteractions.get())) === null || _b === void 0 ? void 0 : _b.data()) === null || _c === void 0 ? void 0 : _c.last_session) || 0;
        if (lastConversationSession == 0) {
            const newSession = await userWppInteractions.collection("message_session").add({ messages: [{ role: "user", content: message }], active: true, last_message_time: receivedData.momment });
            console.log("new_sessionnew_session", newSession);
            await userWppInteractions.update({ last_session: newSession });
        }
        else {
            const lastConversationSessionRef = await lastConversationSession.get();
            console.log("last_conversation_session_ref.data().active", lastConversationSessionRef.data());
            if (!lastConversationSessionRef.data()) {
                const newSession = await userWppInteractions.collection("message_session").add({ messages: [{ role: "user", content: message }], active: true, last_message_time: receivedData.momment });
                userWppInteractions.update({ last_session: newSession });
                res.send({ "status": "create new message_session" });
            }
            if (lastConversationSessionRef.data() && lastConversationSessionRef.data().active) {
                console.log("last_conversation_session ----------- ", lastConversationSession);
                const messageSession = lastConversationSessionRef.data().messages;
                messageSession.push({ role: "user", content: message });
                lastConversationSession.update({ messages: messageSession, last_message_time: receivedData.momment });
                console.log(messageSession);
            }
            else {
                const newSession = await userWppInteractions.collection("message_session").add({ messages: [{ role: "user", content: message }], active: true, last_message_time: receivedData.momment });
                userWppInteractions.update({ last_session: newSession });
            }
        }
        res.send({ "status": "message registered to session" });
    }
});
function registryNewUserInteraction(receivedData) {
    const newInteraction = {
        phone_number: receivedData.phone,
        last_message_time: receivedData.momment,
        wpp_user_name: receivedData.senderName,
        last_session: 0,
    };
    return firestore.collection("user_wpp_interaction").add(newInteraction);
}
exports.ReceivedMessageGateway = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).https.onRequest(app);
//# sourceMappingURL=ReceivedMessageGateway.js.map