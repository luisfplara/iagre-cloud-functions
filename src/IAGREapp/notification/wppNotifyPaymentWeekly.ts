
import functions = require("firebase-functions")

import admin = require("firebase-admin")
import axios from "axios";

const firestore = admin.firestore();

function currencyConver(numero: number): string {
  const formatoMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

  return formatoMoeda.format(numero);
}
exports.wppNotifyPaymentWeekly = functions.region("southamerica-east1").
  runWith({
    memory: "128MB",
  }).pubsub.schedule("0 6 * * 1").timeZone("America/Sao_Paulo").onRun(async (context) => {
    const currentDate = new Date();
    const dayFirstHour = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dayLastHour = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()+7, 23);

    console.log("dayFirstHour -> ", dayFirstHour.getTime());
    console.log("dayLastHour -> ", dayLastHour.getTime());


    const boletosData = await firestore.collection("boleto").where("dueDate_timestamp", ">", dayFirstHour.getTime()).where("dueDate_timestamp", "<=", dayLastHour.getTime()).orderBy("dueDate_timestamp").get();

    console.log("boletosData.docs.length", boletosData.docs.length);

    const listUserBoleto = new Map<string, [string]>();

    for (const boleto of boletosData.docs) {
      const userId = boleto.data().user.id;
      if (listUserBoleto.get(userId) == undefined) {
        listUserBoleto.set(userId, [`\n\n1. ${boleto.data().issuer.name} _${boleto.data().issuer.name}_ \n* *vencimento:* ${boleto.data().dueDate}\n* *valor:* ${currencyConver(boleto.data().cost / 100)}`]);
      } else {
        const qtdBoletos = listUserBoleto.get(userId)?.length;
        listUserBoleto.get(userId)?.push(`\n\n${qtdBoletos! + 1}. _${boleto.data().issuer.name}_ \n* *vencimento:* ${boleto.data().dueDate} \n* *valor:* ${currencyConver(boleto.data().cost / 100)}`);
      }
    }

    console.log(listUserBoleto);
    for (const user of listUserBoleto.keys()) {
      const userData = await firestore.doc("user/" + user).get();
      const userName = userData.data()?.display_name;
      const userPhoneNumber = userData.data()?.phone_number;
      const boletosMessage = listUserBoleto.get(user);
      if (userData.data()?.account_settings?.weekly_payment_notify) {
        const message = `Bom dia ${userName}, essa semana, você tem os seguintes pagamentos para realizar: \n\n*Boletos*\n` + boletosMessage + "\n*Notas Fiscais*\nnotassssss\n\nAcesse o aplicativo da Iagre para mais infomações.";
        axios.post("https://api.z-api.io/instances/3C6C8B78BF0D4065148B3A8F56A2DE3B/token/B6536D597ED20EE64870609D/send-text",
          {
            phone: userPhoneNumber,
            message: message,
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Client-Token": "Fd040c9966f2d46e0b33d56fdbf75c9abS",
            },
          }
        );

        console.log(message);
      }
    }
  });

