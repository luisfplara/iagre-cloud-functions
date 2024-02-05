import functions = require("firebase-functions");
import getInvoice from "./getInvoices";

const today = new Date();


exports.getHistoryInvoices = functions.region("southamerica-east1").
  runWith({
    memory: "128MB",
  }).firestore
  .document("user/{docId}")
  .onUpdate(async (change, context) => {
    const userBefore = change.before.data()?.account_settings?.plugstore_sync_invoice_settings_done;
    const userAfter = change.after.data()?.account_settings?.plugstore_sync_invoice_settings_done;

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
          await getInvoice(change.after.ref, yesterdayString, thirtydayString);
        }, 300000);
      }
    }
  }
  );
