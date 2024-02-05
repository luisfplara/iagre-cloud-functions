import functions = require("firebase-functions")
import admin = require("firebase-admin")
import { DocumentReference, DocumentSnapshot } from "firebase-admin/firestore";
import axios from "axios";

const limit = 60;
const firestore = admin.firestore();

const today = new Date();
const todayString = today.toISOString().split("T")[0];

const yesterday = new Date();
yesterday.setDate((today.getDate() - 1));
const yesterdayString = yesterday.toISOString().split("T")[0];


async function notifyNewBoletos(qtdBoleto: number, user: DocumentSnapshot) {
  if (qtdBoleto > 0) {
    const message = `Na data de hoje, ${todayString}, foram adicionados ${qtdBoleto} novos *Boletos* a sua conta, acesse o aplicativo da Iagre para mais informações`;
    const userPhone = user.data()?.phone_number;
    try {
      await axios.post("https://api.z-api.io/instances/3C6C8B78BF0D4065148B3A8F56A2DE3B/token/B6536D597ED20EE64870609D/send-text",
        {
          phone: userPhone,
          message: message,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Client-Token": "Fd040c9966f2d46e0b33d56fdbf75c9abS",
          },
        }
      );
    } catch (erro: any) {
      console.log("Erro notifyNewBoletos: ", erro.response.data);
    }
  }
}

async function iupayGetBoletos(token: string, user: DocumentReference, page: number): Promise<any> {
  try {
    const boletosData = await axios.get("https://api.iupay.com.br/api/v1/boletos?" + new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      min_created_at: yesterdayString,
      max_created_at: todayString,
      // min_created_at: "2024-01-19",
      // max_created_at: "2024-01-19",
    }), {
      headers: {
        "X-Source-Id": "6578634bb012ad5ad6bd33eb",
        "X-Source-Secret": "wp49f7nIrd8QWTPLHcMmsxDNBj2zCU",
        "Authorization": `Bearer ${token}`,
      },
    });

    const listBoletos = boletosData.data;
    console.log(`user: ${user.id} page: ${page} boletos na pagina: ${listBoletos.length} total de boleto: ${(page * limit) + (listBoletos.length)}`);
    for (const boleto of listBoletos) {
      boleto.user = user;
      boleto.isNew = true;
      boleto.paid_out = false;
      boleto.dueDate_timestamp = Date.parse(boleto.dueDate);
      boleto.issueDate_timestamp = Date.parse(boleto.issueDate);
      await firestore.collection("boleto").add(boleto);
    }

    if (listBoletos.length >= limit) {
      return await iupayGetBoletos(token, user, page + 1);
    }
    return (page * limit) + (listBoletos.length);
  } catch (erro: any) {
    console.log("erro iupayGetBoletos: ", erro.response.data);
  }
}

async function iupayAuth(externalId: string, user: DocumentReference) {
  try {
    const auth = await axios.post("https://api.iupay.com.br/api/v1/users/authenticate?" + new URLSearchParams({
      externalId: externalId,
    }), {}, {
      headers: {
        "X-Source-Id": "6578634bb012ad5ad6bd33eb",
        "X-Source-Secret": "wp49f7nIrd8QWTPLHcMmsxDNBj2zCU",
      },
    });
    const token: string = auth.data.token;
    const qtdBoletos = await iupayGetBoletos(token, user, 0);
    const userDoc: DocumentSnapshot = await user.get();
    if (userDoc.data()?.account_settings?.boleto_notify_new) await notifyNewBoletos(qtdBoletos, userDoc);
  } catch (erro: any) {
    console.log("Erro iupayAuth: ", erro.response.data);
  }
}

exports.getNewBoletos = functions.region("southamerica-east1").
  runWith({
    memory: "128MB",
  }).pubsub.schedule("0 18  * * *").timeZone("America/Sao_Paulo").onRun(
    async (context) => {
      const iupaySettingsDoc = await firestore.collection("iupay_settings").get();
      console.log("todayString -----> ", todayString);
      console.log("yesterday -----> ", yesterdayString);
      console.log("iupaySetting: ", iupaySettingsDoc.docs.length);
      const promises: (Promise<any>)[] = [];
      try {
        for (const iupaySetting of iupaySettingsDoc.docs) {
          const externalId: string = <string>iupaySetting.data().externalId;
          const user = iupaySetting.data().user;
          promises.push(iupayAuth(externalId, user));
        }

        await Promise.all(promises);
      } catch (erro: any) {
        console.log("erro getNewBoletos", erro.response.data);
      }
    });
