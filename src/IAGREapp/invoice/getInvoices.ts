import admin = require("firebase-admin");
const firestore = admin.firestore();

import Axios, { AxiosResponse } from "axios";
import { DocumentReference, DocumentSnapshot } from "firebase-admin/firestore";
import axios from "axios";


const today = new Date();
const todayString = today.toISOString().split("T")[0];

const yesterday = new Date();
yesterday.setDate((today.getDate() - 1));
// const yesterdayString = yesterday.toISOString().split("T")[0];

console.log("todayString -----> ", todayString);
// console.log("yesterday -----> ", yesterdayString);


const ncmCategories= {
  "27": "Combustível",
  "36": "Combustível",
  "01": "Compra de Animais",
  "03": "Compra de Animais",
  "82": "Compra de máquinas e equipamentos",
  "84": "Compra de máquinas e equipamentos",
  "86": "Compra de máquinas e equipamentos",
  "87": "Compra de máquinas e equipamentos",
  "88": "Compra de máquinas e equipamentos",
  "89": "Compra de máquinas e equipamentos",
  "90": "Compra de máquinas e equipamentos",
  "29": "Defensivos e Químicos",
  "33": "Defensivos e Químicos",
  "38": "Defensivos e Químicos",
  "48": "Despesas Administrativas",
  "49": "Despesas Administrativas",
  "83": "Despesas Administrativas",
  "25": "Fertilizantes e Adubos",
  "26": "Fertilizantes e Adubos",
  "28": "Fertilizantes e Adubos",
  "31": "Fertilizantes e Adubos",
  // ... Continuação dos códigos para 'Infraestrutura'
  "69": "Infraestrutura",
  "70": "Infraestrutura",
  "72": "Infraestrutura",
  "73": "Infraestrutura",
  "74": "Infraestrutura",
  "75": "Infraestrutura",
  "76": "Infraestrutura",
  "78": "Infraestrutura",
  "79": "Infraestrutura",
  "80": "Infraestrutura",
  "81": "Infraestrutura",
  "94": "Infraestrutura",

  "40": "Manutenção de máquinas e equipamentos",
  "85": "Manutenção de máquinas e equipamentos",

  "14": "Materiais Diversos",
  "32": "Materiais Diversos",
  "34": "Materiais Diversos",
  "35": "Materiais Diversos",
  "39": "Materiais Diversos",
  "41": "Materiais Diversos",
  "42": "Materiais Diversos",
  "43": "Materiais Diversos",
  "44": "Materiais Diversos",
  "45": "Materiais Diversos",
  "46": "Materiais Diversos",
  "47": "Materiais Diversos",
  "50": "Materiais Diversos",
  "51": "Materiais Diversos",
  "52": "Materiais Diversos",
  "53": "Materiais Diversos",
  "54": "Materiais Diversos",
  "55": "Materiais Diversos",
  "56": "Materiais Diversos",

  "11": "Nutrição Animal",
  "23": "Nutrição Animal",
  // ... Continuação dos códigos para 'Outros Itens'

  "30": "Produtos Veterinários",
  "05": "Produtos Veterinários",
  "06": "Sementes e Mudas",
  "07": "Sementes e Mudas",
  "10": "Sementes e Mudas",
  "12": "Sementes e Mudas",

  "-10": "Armazenagem e Estoques",
  "-11": "Investimentos",
  "-12": "Irrigação",
  "-13": "Logística e Transporte",
  "-14": "Mão de obra",
  "-15": "Serviços terceirizados",
};

async function notifyNewInvoices(qtdBoleto: number, user: DocumentSnapshot) {
  if (qtdBoleto > 0) {
    const message = `Na data de hoje, ${todayString}, foram adicionadas ${qtdBoleto} novas *Notas* a sua conta, acesso o aplicativo da Iagre para mais informações`;
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

async function saveInvoiceDetailParcelas(pag: object, invoiceDetail: DocumentReference, user: DocumentReference, duplicata: [any], fatura: object) {
  const promiseList: (Promise<any>)[] = [];
  if (duplicata != null) {
    for (const dup of duplicata) {
      dup.invoice_detail = invoiceDetail;
      dup.dVenc_timestamp = Date.parse(dup.dVenc);
      dup.qtd_duplicatas = duplicata.length;
      dup.fat = fatura;
      dup.pag = pag;
      dup.paid_out = false;
      dup.user = user;
      console.log(`Nota ${invoiceDetail.id} adicionando parcela ${dup.vDup}`);
      promiseList.push(firestore.collection("invoice_parcelas").add(dup));
    }
  } else {
    const dup: any = {};
    dup.invoice_detail = invoiceDetail;
    dup.pag = pag;
    dup.paid_out = false;
    dup.user = user;
    console.log(`Nota ${invoiceDetail.id} adicionando pagamento`);
    promiseList.push(firestore.collection("invoice_parcelas").add(dup));
  }
  await Promise.all(promiseList);
}

async function saveInvoiceDetailProducts(invoiceDetailProductList: [any], invoiceDetail: DocumentReference, user: DocumentReference) {
  const promiseList: (Promise<any>)[] = [];
  for (const product of invoiceDetailProductList) {
    product.invoice_detail = invoiceDetail;
    product.safra_name = "sem safra";
    product.user = user;
    product.category = ncmCategories[product.prod?.NCM.slice(-2) as keyof typeof ncmCategories]?? "Outros Itens";
    console.log(`Nota ${invoiceDetail.id} adicionando produto ${product?.prod?.xProd} `);
    promiseList.push(firestore.collection("invoice_product").add(product));
  }
  await Promise.all(promiseList);
}

async function getInvoiceDetail(cpfCnpj: string, invoice: any, user: DocumentSnapshot) {
  const promiseList: (Promise<any>)[] = [];
  try {
    const invoiceDetailResponse = await Axios.get("https://app.plugstorage.com.br/api/v2/invoices/export?" + new URLSearchParams({
      softwarehouse_token: "28b7fd4911ebd00184a4d35936b00f35f039970a",
      invoice_key: invoice.key,
      mode: "JSON",
      return_type: "ENCODE",
      cpf_cnpj: cpfCnpj,
      resume: "false",
      downloaded: "true",

    }));

    const invoiceDatailData: any = {};
    invoiceDatailData.emit = invoiceDetailResponse.data.data.xml.NFe.infNFe.emit;
    invoiceDatailData.dest = invoiceDetailResponse.data.data.xml.NFe.infNFe.dest;
    invoiceDatailData.ide = invoiceDetailResponse.data.data.xml.NFe.infNFe.ide;
    invoiceDatailData.transp = invoiceDetailResponse.data.data.xml.NFe.infNFe.transp;
    invoiceDatailData.pag = invoiceDetailResponse.data.data.xml.NFe.infNFe.pag;
    invoiceDatailData.total = invoiceDetailResponse.data.data.xml.NFe.infNFe.total.ICMSTot;
    invoiceDatailData.key = invoice.key;
    invoiceDatailData.user = user.ref;


    const invoiceDetailDoc = await firestore.collection("invoice_detail").add(invoiceDatailData);

    invoice.user = user.ref;
    invoice.isNew = true;
    invoice.invoice_detail = invoiceDetailDoc;
    invoice.datetime_emission = Date.parse(invoice.date_emission);
    await firestore.collection("invoice").add(invoice);

    console.log(`Nota ${invoiceDetailDoc.id} possui ${invoiceDetailResponse.data.data.xml.NFe.infNFe.det.length} produtos`);
    const productList = invoiceDetailResponse.data.data.xml.NFe.infNFe.det;
    const pag = invoiceDetailResponse.data.data.xml.NFe.infNFe.pag;
    const cobr = invoiceDetailResponse.data.data.xml.NFe.infNFe.cobr;

    promiseList.push(saveInvoiceDetailProducts(productList, invoiceDetailDoc, user.ref));
    promiseList.push(saveInvoiceDetailParcelas(pag.detPag, invoiceDetailDoc, user.ref, cobr?.dup, cobr?.fat));


    await Promise.all(promiseList);
  } catch (erro) {
    console.log("erro get_invoice_detail_products or get_invoice_detail_payment: ", erro);
  }
}

export default async function getInvoice(userRef: DocumentReference, dataIni:string, dataEnd: string) {
  const promiseList: (Promise<any>)[] = [];
  try {
    const user = await userRef.get();

    const userInformation = user.data()?.user_information;
    const cpfCnpj = userInformation.pessoa_juridica?.cnpj || userInformation.pessoa_fisica?.cpf;
    // const lastId = userInformation.invoice_last_id;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate((today.getDate() - 1));


    const getInvoiceResponse: AxiosResponse = await Axios.get("https://app.plugstorage.com.br/api/v2/invoices/keys?" + new URLSearchParams({
      softwarehouse_token: "28b7fd4911ebd00184a4d35936b00f35f039970a",
      date_ini: dataIni,
      date_end: dataEnd,
      mod: "NFE",
      transaction: "received",
      cpf_cnpj: cpfCnpj,
      environment: "1",
    }));

    if (getInvoiceResponse.data.data.count > 0) {
      if (user.data()?.account_settings?.boleto_notify_new) await notifyNewInvoices(getInvoiceResponse.data.data.count, user);

      for (const invoice of getInvoiceResponse.data.data.invoices) {
        promiseList.push(getInvoiceDetail(cpfCnpj, invoice, user));
      }
      userInformation.invoice_last_id = getInvoiceResponse.data.data.last_id;
      await user.ref.update({ user_information: userInformation });
    } else {
      console.log(`Not new invoices for user ${user.id}`);
    }
    await Promise.all(promiseList);
  } catch (erro: any) {
    console.log("Erro getInvoice: ", erro);
  }
}
