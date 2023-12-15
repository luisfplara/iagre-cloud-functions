const axios = require('axios').default;
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const serviceAccount = require('../iagreapp-f8c3fd4f5a8c.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

exports.notifyNewInvoice = functions.region('southamerica-east1').
  runWith({
    memory: '128MB'
  }).firestore.document("invoices/{invoiceId}").onCreate((event) => {
    console.log("event  ", event)
    const data = event.data();
    console.log("data ", data)
    if (!data) {
      console.log("No data associated with the event");
      return;
    }

    const message = `Uma nova nota foi registrada em seu nome!!! \nEmitente: ${data.razao_social} \nValor: ${data.value} `
    axios.post('https://api.z-api.io/instances/3C6C8B78BF0D4065148B3A8F56A2DE3B/token/B6536D597ED20EE64870609D/send-text', {
      phone: '5548998531406',
      message: message
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': 'Fd040c9966f2d46e0b33d56ffirestoref75c9abS'
      }
    })
      .then(function (response) {
        console.log(response);
      })
      .catch(function (error) {
        console.log(error);
      });


  });

exports.teste = functions.region('southamerica-east1').
  runWith({
    memory: '128MB'
  }).https.onRequest(
    async (req, res) => {

      const users = await firestore.collection('user').get();

      for (const user of users.docs) {
        if (user.data().user_information) {
          const user_information = user.data().user_information
          const cpf_cnpj = user_information.cnpj || user_information.cpf
          const last_id = user_information.invoice_last_id

          console.log(user.id, '=>', user.data());
          //console.log(user.id, '=>', last_id);

          const getInvoices = await fetch('https://app.plugstorage.com.br/api/v2/invoices/keys?' + new URLSearchParams({
            softwarehouse_token: '28b7fd4911ebd00184a4d35936b00f35f039970a',
            date_ini: '2023-10-22',
            date_end: '2023-10-23',
            mod: 'NFE',
            transaction: 'received',
            cpf_cnpj: cpf_cnpj,
            environment: 1,
            last_id: last_id

          }))


          const newInvoices = await getInvoices.json()
          const newInvoicesData = newInvoices.data
          console.log(`newInvoicesData ======= > ${newInvoicesData} new invoices`)
          console.log(`there is ${newInvoicesData.count} new invoices`)

          if (newInvoicesData.count > 0) {
            for (const invoice of newInvoicesData.invoices) {
              console.log(`newInvoicesData ======= > ${invoice} \n`)
              console.log(`adding invoice ${invoice.id} ..`)

              invoice.isNew = true;

              const getInvoicesJSON = await fetch('https://app.plugstorage.com.br/api/v2/invoices/export?' + new URLSearchParams({
                softwarehouse_token: '28b7fd4911ebd00184a4d35936b00f35f039970a',
                invoice_key: invoice.key,
                mode: 'JSON',
                return_type: 'ENCODE',
                cpf_cnpj: cpf_cnpj,
                resume: false,
                downloaded: true

              }))

              const invoiceJSON = await getInvoicesJSON.json()
              console.log("invoiceJSON____________________________\n", invoiceJSON)
              invoice.invoice_JSON = JSON.stringify(invoiceJSON.data)

              const newInvoice = await firestore.collection('invoice').add(invoice)
            }
            user_information.invoice_last_id = newInvoicesData.last_id
            user.ref.update({ user_information: user_information })

          }


        }


      };

      res.status(200).send({ "message": "done" });

    });



const express = require('express');
const cors = require('cors')
const app = express();

app.use(cors())
app.use(express.json());

app.post('/', async (req, res) => {

  const receivedMessage = req.body
  const user_wpp_interactions_collection = firestore.collection('user_wpp_interaction')
  const user_wpp_interactions_ref = await user_wpp_interactions_collection.where('phone_number', '==', receivedMessage.phone).get();
  const user_wpp_interactions = user_wpp_interactions_ref.empty ? await registryUserInteraction(receivedMessage) : user_wpp_interactions_ref.docs.at(0).ref

  user_wpp_interactions.update({ last_message_time: receivedMessage.momment })

  const last_conversation_session = (await user_wpp_interactions.get()).data().last_conversation_session || 0
  console.log('user_wpp_interactions ====> ', last_conversation_session)

  user_wpp_interactions.collection('message_history').add({ received: req.body, time: receivedMessage.momment, session: last_conversation_session });

  res.send({ 'status': 'ok' })

});

app.post('/new', async (req, res) => {

  const receivedData = req.body
  const message = receivedData.text.message
  const user_wpp_interactions_collection = firestore.collection('user_wpp_interaction')
  const user_wpp_interactions_ref = await user_wpp_interactions_collection.where('phone_number', '==', receivedData.phone).get();
  const user_wpp_interactions = user_wpp_interactions_ref.empty ? await registryUserInteraction(receivedData) : user_wpp_interactions_ref.docs.at(0).ref

  user_wpp_interactions.update({ last_message_time: receivedData.momment })

  const last_conversation_session = (await user_wpp_interactions.get()).data().last_session || 0


  //console.log('user_wpp_interactions ====> ', last_conversation_session)
  if (last_conversation_session == 0) {
    const new_session = await user_wpp_interactions.collection('message_session').add({ messages: [{ role: 'user', content: message }], active: true, last_message_time: receivedData.momment });
    console.log('new_sessionnew_session', new_session)
    user_wpp_interactions.update({ last_session: new_session })
  } else {
    var last_conversation_session_ref = await last_conversation_session.get()
    console.log('last_conversation_session_ref.data().active', last_conversation_session_ref.data())

    if (!last_conversation_session_ref.data()) {
      const new_session = await user_wpp_interactions.collection('message_session').add({ messages: [{ role: 'user', content: message }], active: true, last_message_time: receivedData.momment });
      user_wpp_interactions.update({ last_session: new_session })
      res.send({ 'status': 'create new message_session' })
      return
    }

    if (last_conversation_session_ref.data() && last_conversation_session_ref.data().active) {
      console.log('last_conversation_session ----------- ', last_conversation_session)
      var message_session = last_conversation_session_ref.data().messages


      message_session.push({ role: 'user', content: message })
      last_conversation_session.update({ messages: message_session, last_message_time: receivedData.momment })


      console.log(message_session)
    } else {
      const new_session = await user_wpp_interactions.collection('message_session').add({ messages: [{ role: 'user', content: message }], active: true, last_message_time: receivedData.momment });

      user_wpp_interactions.update({ last_session: new_session })
    }

  }


  res.send({ 'status': 'message registered to session' })

});


function registryUserInteraction(receivedData) {
  const new_interaction = {
    phone_number: receivedData.phone,
    last_message_time: receivedData.momment,
    last_session: 0
  }
  return firestore.collection('user_wpp_interaction').add(new_interaction)
}

exports.wppReceivedMessageGateway = functions.region('southamerica-east1').
  runWith({
    memory: '128MB'
  }).https.onRequest(app);




const OpenAI = require("openai");


var initial_prompt = [{ "role": "system", "content": "Você é o Iago, um especialista em gestão financeira no Agronegócio. Pequenos e médios produtores são os seus clientes, você sabe tudo sobre notas fiscais, boletos, safras e como otimizar os ganhos com uma boa gestão financeira, você tem acesso as notas e boletos do produtor através de uma API. " }]


exports.wppIagoAgent = functions.region('southamerica-east1').
  runWith({
    memory: '128MB'
  }).firestore.document("user_wpp_interaction/{user_wpp_interaction_id}/message_session/{message_session_id}").onWrite(async (event) => {


    console.log('event.after.data().messages ', event.after.data().messages.length, ' \n event.before.data().messages ', ( event.before.data()?.messages.length||0))
    //check if the message[] changed
    if (event.after.data().messages.length >( event.before.data()?.messages.length||0)) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      console.log("event ", event, '\n')
      const new_message = event.after
      console.log("data ", new_message.data(), '\n')

      const message_session = new_message.data().messages
      const last_message = message_session[message_session.length - 1]
      console.log('message_session ', message_session, '\n')
      console.log('last_message ', last_message, '\n')

      if (last_message.role == "user") {
        const message = initial_prompt.concat(message_session)

        console.log("message ", message, '\n')
        console.log("message len", message.length, '\n')
        
              const completion = await openai.chat.completions.create({
                messages: message,
                model: "gpt-4-0613",
              });
              //console.log(completion.choices[0])adasd
              const now = Date.now()
              const aux = new_message.ref.update({ messages:  message_session.concat(completion.choices[0].message), last_message_time: now})
      }
    }
  });