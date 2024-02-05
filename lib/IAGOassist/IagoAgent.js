"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const openai_1 = require("openai");
const axios_1 = require("axios");
const firestore = admin.firestore();
const sendMessage_1 = require("../ZAPI/sendMessage");
const initialPrompt = { "role": "system", "content": "Como Iago, assistente da startup “Iagre”, você está conectado ao whatsapp, você é especializado em finanças no agronegócio, responda somente a perguntas sobre gestão e finanças no agronegócio dos usuários do aplicativo Gestão de Despesas da Iagre, de forma mais enxuta o possível. ao finalizar uma conversa, chamar a função close_conversation_session." };
function closeConversation(sessionRef) {
    console.log("chamou função");
    sessionRef.ref.update({ active: false });
    return ("sucess");
}
async function getInvoices(input) {
    console.log("dataInicialdataInicial", input.dataInicial);
    console.log("dataFinaldataFinal", input.dataFinal);
    console.log("cpfCnpjcpfCnpj", input.cpfCnpj);
    const dataIni = Date.parse(input.dataInicial);
    const dataEnd = Date.parse(input.dataFinal);
    console.log("dataIni", dataIni);
    console.log("dataEnd", dataEnd);
    let invoices;
    if (input.dataInicial && input.dataFinal) {
        invoices = await firestore.collection("invoice").where("cnpj_addressee", "==", input.cpfCnpj).where("datetime_emission", ">=", dataIni).where("datetime_emission", "<=", dataEnd).orderBy("datetime_emission", "desc").limit(10).get();
    }
    else {
        invoices = await firestore.collection("invoice").where("cnpj_addressee", "==", input.cpfCnpj).limit(10).orderBy("datetime_emission", "desc").get();
    }
    const result = [];
    for (const invoice of invoices.docs) {
        const invoiceResume = {};
        invoiceResume.emissor = invoice.data().fantasia || invoice.data().razao_social;
        invoiceResume.data_emissao = invoice.data().date_emission;
        invoiceResume.valor = invoice.data().value;
        result.push(invoiceResume);
    }
    console.log("resultresultresultresult", result);
    return JSON.stringify(result);
}
async function getBoletos(input) {
    console.log("dataInicialdataInicial", input.dataInicial);
    console.log("dataFinaldataFinal", input.dataFinal);
    console.log("cpfCnpjcpfCnpj", input.userRef);
    const dataIni = Date.parse(input.dataInicial);
    const dataEnd = Date.parse(input.dataFinal);
    console.log("dataIni", dataIni);
    console.log("dataEnd", dataEnd);
    // a
    let boletos;
    if (input.dataInicial && input.dataFinal) {
        boletos = await firestore.collection("boleto").where("user", "==", input.userRef).where("dueDate_timestamp", ">=", dataIni).where("dueDate_timestamp", "<=", dataEnd).orderBy("dueDate_timestamp", "desc").limit(10).get();
    }
    else {
        boletos = await firestore.collection("boleto").where("user", "==", input.userRef).limit(10).orderBy("dueDate_timestamp", "desc").get();
    }
    const result = [];
    for (const boleto of boletos.docs) {
        const boleotResume = {};
        boleotResume.emissor = boleto.data().issuer.fantasyName || boleto.data().issuer.name;
        boleotResume.data_emissao = boleto.data().issueDate;
        boleotResume.data_vencimento = boleto.data().dueDate;
        boleotResume.valor = boleto.data().cost / 100;
        result.push(boleotResume);
    }
    console.log("resultresultresultresult", result);
    return JSON.stringify(result);
}
async function getUserInformation(phoneNumber) {
    const user = await firestore.collection("user").where("phone_number", "==", phoneNumber).get();
    return user.docs.at(0);
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
            description: "utilizada quando o cliente finalizar o atendimento ou envia alguma mensagem de agradecimento",
        },
    },
    {
        type: "function",
        function: {
            name: "buscar_notas_fiscais",
            description: "consultar as notas fiscais do usuário",
            parameters: {
                type: "object",
                properties: {
                    dataInicial: {
                        type: "string",
                        description: "data inicial desejada no formato YYYY-MM-DD",
                    },
                    dataFinal: {
                        type: "string",
                        description: "data final desejada no formato YYYY-MM-DD",
                    },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "buscar_boletos",
            description: "consultar os boletos de pagamento do usuário",
            parameters: {
                type: "object",
                properties: {
                    dataInicial: {
                        type: "string",
                        description: "data inicial desejada no formato YYYY-MM-DD",
                    },
                    dataFinal: {
                        type: "string",
                        description: "data final desejada no formato YYYY-MM-DD",
                    },
                },
            },
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
exports.IagoAgent = functions.region("southamerica-east1").
    runWith({
    memory: "128MB",
}).firestore.document("user_wpp_interaction/{user_wpp_interaction_id}/message_session/{message_session_id}").onWrite(async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const userWppInteraction = await ((_a = event.after.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.get());
    if (userWppInteraction) {
        const user = await getUserInformation((_b = userWppInteraction.data()) === null || _b === void 0 ? void 0 : _b.phone_number);
        if (((_c = event.after.data()) === null || _c === void 0 ? void 0 : _c.messages.length) > (((_d = event.before.data()) === null || _d === void 0 ? void 0 : _d.messages.length) || 0)) {
            const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
            const newMessage = event.after;
            let totalTokens = ((_e = newMessage.data()) === null || _e === void 0 ? void 0 : _e.total_tokens) || 0;
            let totalRequests = ((_f = newMessage.data()) === null || _f === void 0 ? void 0 : _f.total_requests) || 0;
            const messageSession = (_g = newMessage.data()) === null || _g === void 0 ? void 0 : _g.messages.slice(-4);
            const lastMessage = messageSession[messageSession.length - 1];
            if (lastMessage.role == "user") {
                const message = messageSession;
                console.log(message);
                let gptCompletion = await openai.chat.completions.create({
                    messages: [initialPrompt, ...message],
                    model: "gpt-3.5-turbo",
                    tools: tools,
                    tool_choice: "auto",
                });
                totalTokens += (_h = gptCompletion.usage) === null || _h === void 0 ? void 0 : _h.total_tokens;
                totalRequests++;
                message.push(gptCompletion.choices[0].message);
                console.log("gptCompletion.usage----------------->", gptCompletion.usage);
                while (gptCompletion.choices[0].message.tool_calls) {
                    const toolCalls = gptCompletion.choices[0].message.tool_calls;
                    const availableFunctions = {
                        close_conversation_session: closeConversation,
                        buscar_notas_fiscais: getInvoices,
                        buscar_boletos: getBoletos,
                        get_invoice_detail: getInvoiceDetail,
                    };
                    for (const toolCall of toolCalls) {
                        const functionName = toolCall.function.name;
                        const functionToCall = availableFunctions[functionName];
                        const functionArgs = JSON.parse(toolCall.function.arguments);
                        console.log("functionArgs", functionArgs);
                        let functionResponse;
                        switch (functionName) {
                            case "close_conversation_session":
                                functionResponse = functionToCall(newMessage);
                                break;
                            case "buscar_notas_fiscais":
                                functionResponse = await functionToCall(Object.assign({ cpfCnpj: ((_j = user === null || user === void 0 ? void 0 : user.data().user_information.pessoa_juridica) === null || _j === void 0 ? void 0 : _j.cnpj) || ((_k = user === null || user === void 0 ? void 0 : user.data().user_information.pessoa_fisica) === null || _k === void 0 ? void 0 : _k.cpf) }, functionArgs));
                                break;
                            case "buscar_boletos":
                                functionResponse = await functionToCall(Object.assign({ userRef: user === null || user === void 0 ? void 0 : user.ref }, functionArgs));
                                break;
                            case "get_invoice_detail":
                                functionResponse = await functionToCall(functionArgs);
                        }
                        message.push({
                            tool_call_id: toolCall.id,
                            role: "tool",
                            //  name: functionName,
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
                    totalTokens += (_l = secondResponse.usage) === null || _l === void 0 ? void 0 : _l.total_tokens;
                    totalRequests++;
                    gptCompletion = secondResponse;
                }
                await (0, sendMessage_1.default)((_m = gptCompletion.choices[0].message.content) !== null && _m !== void 0 ? _m : "", (_o = userWppInteraction.data()) === null || _o === void 0 ? void 0 : _o.phone_number);
                const now = Date.now();
                console.log("messagemessage5--->", message);
                await newMessage.ref.update({ messages: message, last_message_time: now, total_tokens: totalTokens, total_requests: totalRequests });
            }
        }
    }
});
//# sourceMappingURL=IagoAgent.js.map