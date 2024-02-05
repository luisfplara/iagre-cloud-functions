import functions = require("firebase-functions");
import admin = require("firebase-admin");
const firestore = admin.firestore();
import getInvoice from "./getInvoices";


// console.log("yesterday -----> ", yesterdayString);

async function checkNewInvoices() {
  const today = new Date();
  const todayString = today.toISOString().split("T")[0];
  console.log("todayString -----> ", todayString);
  const promiseList: (Promise<any>)[] = [];
  try {
    const plugStoreSettings = await firestore.collection("plug_store_settings").get();
    for (const psSetting of plugStoreSettings.docs) {
      promiseList.push(getInvoice(psSetting.data().user, todayString, todayString));
    }
    await Promise.all(promiseList);
  } catch (error) {
    console.log(error);
  }
}

exports.getNewInvoices = functions.region("southamerica-east1").
  runWith({
    memory: "128MB",
  }).pubsub.schedule("0 18 * * *").timeZone("America/Sao_Paulo").onRun(
    async (context) => {
      return await checkNewInvoices();
    });
