"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const OpenAI = require("openai");
const axios_1 = require("axios");
const firestore = admin.firestore();
const initialPrompt = [{ "role": "system", "content": "Você é o Iago, um especialista em gestão financeira no Agronegócio. Pequenos e médios produtores são os seus clientes, você sabe tudo sobre notas fiscais, boletos, safras e como otimizar os ganhos com uma boa gestão financeira, você tem acesso as notas e boletos do produtor através de uma API. " }];
function closeConversation(sessionRef) {
    console.log("chamou função");
    sessionRef.ref.update({ active: false });
    return ("sucess");
}
async function getInvoices(cpfCnpj) {
    const invoices = await firestore.collection("invoice").where("cnpj_addressee", "==", cpfCnpj).get();
    const result = [];
    for (const invoice of invoices.docs) {
        result.push(invoice.data());
    }
    console.log("resultresultresultresult", result);
    return JSON.stringify(result);
}
async function getUserInformation(phoneNumber) {
    var _a;
    const user = await firestore.collection("user").where("phone_number", "==", phoneNumber).get();
    return (_a = user.docs.at(0)) === null || _a === void 0 ? void 0 : _a.data();
}
async function getInvoiceDetail(input) {
    console.log("queryqueryqueryquery", input);
    const invoices = await axios_1.default.post("https://3EK3Y69WIU-dsn.algolia.net/1/indexes/invoice_detail/query", {
        params: `query=${input.query}&attributesToHighlight=[]`,
    }, {
        headers: {
            "Content-Type": "application/json",
            "X-Algolia-Application-Id": "3EK3Y69WIU",
            "X-Algolia-API-Key": "4c2cb97be8646fef7f48b0ac34bc6fb7",
        },
    }).catch((erro) => {
        console.log("erroerroerro ==> ", erro);
    });
    console.log("getInvoiceDetailgetInvoiceDetail ==> ", invoices === null || invoices === void 0 ? void 0 : invoices.data);
    return JSON.stringify(invoices === null || invoices === void 0 ? void 0 : invoices.data.hits);
}
const tools = [
    {
        type: "function",
        function: {
            name: "close_conversation_session",
            description: "esse função deve ser chamada quando as dúvidas do cliente são finalizadas, ou quando a sessão de atendimento acabado",
        },
    },
    {
        type: "function",
        function: {
            name: "get_user_invoices_information",
            description: "utilizada quando o cliente solicitar a vizualização de suas notas fiscais",
        },
    },
    {
        type: "function",
        function: {
            name: "get_invoice_detail",
            description: "utilizada quando o cliente solicitar informações de uma nota fiscal especifica",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "palavrasa chave utilizada para encontrar a nota específica referida",
                    },
                },
                required: ["query"],
            },
        },
    },
];
exports.wppIagoAgent = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).firestore.document("user_wpp_interaction/{user_wpp_interaction_id}/message_session/{message_session_id}").onWrite(async (event) => {
    var _a, _b, _c;
    const userWppInteraction = await ((_a = event.after.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.get());
    const user = await getUserInformation((_b = userWppInteraction.data()) === null || _b === void 0 ? void 0 : _b.phone_number);
    if (event.after.data().messages.length > (((_c = event.before.data()) === null || _c === void 0 ? void 0 : _c.messages.length) || 0)) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const newMessage = event.after;
        let totalTokens = newMessage.data().total_tokens || 0;
        let totalRequests = newMessage.data().total_requests || 0;
        const messageSession = newMessage.data().messages;
        const lastMessage = messageSession[messageSession.length - 1];
        if (lastMessage.role == "user") {
            const message = initialPrompt.concat(messageSession);
            let gptCompletion = await openai.chat.completions.create({
                messages: message,
                model: "gpt-3.5-turbo",
                tools: tools,
                tool_choice: "auto",
            });
            totalTokens += gptCompletion.usage.total_tokens;
            totalRequests++;
            message.push(gptCompletion.choices[0].message);
            console.log("gptCompletion.usage----------------->", gptCompletion.usage);
            while (gptCompletion.choices[0].message.tool_calls) {
                const toolCalls = gptCompletion.choices[0].message.tool_calls;
                const availableFunctions = {
                    close_conversation_session: closeConversation,
                    get_user_invoices_information: getInvoices,
                    get_invoice_detail: getInvoiceDetail,
                };
                for (const toolCall of toolCalls) {
                    const functionName = toolCall.function.name;
                    const functionToCall = availableFunctions[functionName];
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    var functionResponse;
                    switch (functionName) {
                        case "close_conversation_session":
                            functionResponse = functionToCall(newMessage);
                            break;
                        case "get_user_invoices_information":
                            functionResponse = await functionToCall(user.user_information.cnpj || user.user_information.cpf);
                            break;
                        case "get_invoice_detail":
                            functionResponse = await functionToCall(functionArgs);
                    }
                    message.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: functionResponse,
                    }); // extend conversation with function response
                }
                const secondResponse = await openai.chat.completions.create({
                    messages: message,
                    model: "gpt-3.5-turbo",
                }); // get a new response from the model where it can see the function response
                // console.log('secondResponsesecondResponsesecondResponse -->', secondResponse)
                message.push(secondResponse.choices[0].message);
                console.log("secondResponse.usage----------------->", secondResponse.usage);
                totalTokens += secondResponse.usage.total_tokens;
                totalRequests++;
                gptCompletion = secondResponse;
            }
            fetch("https://api.z-api.io/instances/3C6C8B78BF0D4065148B3A8F56A2DE3B/token/B6536D597ED20EE64870609D/send-text", {
                method: "POST",
                body: JSON.stringify({
                    phone: userWppInteraction.data().phone_number,
                    message: gptCompletion.choices[0].message.content,
                }),
                headers: {
                    "Content-Type": "application/json",
                    "Client-Token": "Fd040c9966f2d46e0b33d56fdbf75c9abS",
                },
            })
                .then(async function (response) {
                // console.log('responseresponseresponse ',   await response.text());
            })
                .catch(function (error) {
                console.log("errorerrorerrorerror ", error);
            });
            const now = Date.now();
            console.log("messagemessage5--->", message);
            const aux = newMessage.ref.update({ messages: message, last_message_time: now, total_tokens: totalTokens, total_requests: totalRequests });
        }
    }
});
//# sourceMappingURL=wppIagoAgent.js.map