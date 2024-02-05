import functions = require("firebase-functions");
// import admin = require("firebase-admin");
// const firestore = admin.firestore();
import Axios, { AxiosResponse } from "axios";
import { DocumentReference, QueryDocumentSnapshot } from "firebase-admin/firestore";
import FormData = require("form-data");

async function configDestinadas(userRef: DocumentReference, plugStoreSettingsData: QueryDocumentSnapshot) {
  try {
    const user = await userRef.get();

    const form = new FormData();
    const file = await Axios.get(plugStoreSettingsData.data().certificate_pfx, { responseType: "stream" });

    form.append("cert_pfx", file.data, "cert_pfx_" + user.id + ".pfx");
    form.append("cert_password", plugStoreSettingsData.data().certificate_pass);
    form.append("dfe_cert_concentrating", "0");
    form.append("uf", user.data()?.user_information.mail_address?.uf);
    form.append("dfe_period", "4");
    form.append("dfe_tipo", "NFE");
    form.append("dfe_cienciaAutomatica", "1");
    form.append("cnpj_cpf", user.data()?.user_information?.pessoa_juridica?.cnpj??user.data()?.user_information?.pessoa_fisica?.cpf);
    form.append("dfe_notifica", "0");


    const getInvoiceResponse: AxiosResponse = await Axios.post("https://app.plugstorage.com.br/api/v2/destinadas/configdestined", form, {
      headers: {
        "Content-Type": "multipart/form-data",
        "Authorization": "Basic MjhiN2ZkNDkxMWViZDAwMTg0YTRkMzU5MzZiMDBmMzVmMDM5OTcwYTpQQHNzYXdvcmQx",
      },
    });
    console.log(user.id + " ===> ", getInvoiceResponse.data.message);
    const accountSettings = user.data()?.account_settings;
    accountSettings.plugstore_sync_invoice_settings_done = true;
    await userRef.update({ "account_settings": accountSettings });
    await plugStoreSettingsData.ref.update({ "destinadas_plug_store_message": getInvoiceResponse?.data });
  } catch (erro: any) {
    console.log("Erro configDestinadas: ", erro);
    await plugStoreSettingsData.ref.update({ "destinadas_plug_store_message": erro?.response?.data });
  }
}


exports.configurarDestinadas = functions.region("southamerica-east1").
  runWith({
    memory: "128MB",
  }).firestore
  .document("plug_store_settings/{docId}")
  .onUpdate(async (change, context) => {
    console.log("Esperando 5 minutos para configurar destinadas");

    const plugStoreSettingsDataAfter = change.after;
    const plugStoreSettingsDataBefore = change.before;

    if (plugStoreSettingsDataAfter.data().isRegistered) {
      if (plugStoreSettingsDataAfter.data().certificate_pass != "" && plugStoreSettingsDataAfter.data().certificate_pfx != "") {
        if (plugStoreSettingsDataAfter.data().isRegistered != plugStoreSettingsDataBefore.data().isRegistered || plugStoreSettingsDataAfter.data().certificate_pass != plugStoreSettingsDataBefore.data().certificate_pass || plugStoreSettingsDataAfter.data().certificate_pfx != plugStoreSettingsDataBefore.data().certificate_pfx) {
          setTimeout(async () => {
            console.log("userId: ", plugStoreSettingsDataAfter.data().user.id, " plug_store_settings: ", plugStoreSettingsDataAfter.id);
            await configDestinadas(change.after.data()?.user, plugStoreSettingsDataAfter);
          }, 300000);
        }
      }
    }
  });
