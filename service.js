const OracleBot = require("@oracle/bots-node-sdk");
const Numbers = require("number-to-emoji");
// const fetch = require("node-fetch");
require("dotenv").config();
// Imports dependencies and set up http server
const request = require("request"),
  express = require("express"),
  { urlencoded, json } = require("body-parser"),
  appEx = express();

// Parse application/x-www-form-urlencoded
appEx.use(urlencoded({ extended: true }));

// Parse application/json
appEx.use(json());

const { WebhookClient, WebhookEvent } = OracleBot.Middleware;
// require("../assets/image")
module.exports = (app) => {
  const logger = console;
  // initialize the application with OracleBot
  OracleBot.init(app, {
    logger,
  });

  // add webhook integration
  const webhook = new WebhookClient({
    channel: {
      url: "https://oda-ea7ee6ca09024e5fa0656e7ca7c8dee3-da2.data.digitalassistant.oci.oraclecloud.com/connectors/v2/listeners/webhook/channels/93b55c17-b503-4e8b-8b79-2f90a778d2ff",
      secret: "J7Kq007FMLNvOvjC2WSByU8VqFXM3bFI",
    },
  });

  let clientNumber = "";
  // Add webhook event handlers (optional)
  webhook
    .on(WebhookEvent.ERROR, (err) => logger.error("Error:", err.message))

    .on(WebhookEvent.MESSAGE_SENT, (message) =>
      // logger.info("Message to bot:", message)
      console.log("Message to bot:", message)
    ) // from user to bot
    .on(WebhookEvent.MESSAGE_RECEIVED, (message) => {
      let { messagePayload } = message;
      console.log("Message from bot:", JSON.stringify(message));
      sendToFacebook(message);
      // fetch("https://windtempfacebook.herokuapp.com/toFacebook", {
      //   method: "post",
      //   body: JSON.stringify(message),
      //   headers: { "Content-Type": "application/json" },
      // }).then((res) => {
      //   console.log("Message sent to facebook wehook");
      // });
    });

  app.get("/", (req, res) => {
    res.send("running");
  });
  app.post("/webhook", (req, res) => {
    let body = req.body;
    //  let challenge = req.query["hub.challenge"];
    // console.log(body);
    console.log("fromFacebook endpoint is running");
    // Checks if this is an event from a page subscription
    if (body.object === "page") {
      // Iterates over each entry - there may be multiple if batched
      console.log("the request body is : " + JSON.stringify(body));
      body.entry.forEach(function (entry) {
        // Gets the body of the webhook event
        let webhookEvent = entry.messaging[0];
        // console.log(webhookEvent);

        // Get the sender PSID
        let senderPsid = "";
        senderPsid = webhookEvent.sender.id;
        console.log("Sender PSID: " + senderPsid);

        // Check if the event is a message or postback and
        // pass the event to the appropriate handler function
        if (webhookEvent.message) {
          console.log("the message is of text type");
          handleMessage(senderPsid, webhookEvent.message);
        } else if (webhookEvent.postback) {
          handlePostback(senderPsid, webhookEvent.postback);
        }
      });

      // Returns a '200 OK' response to all requests
      console.log("succeded");
      res.status(200).send("EVENT_RECEIVED");
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      console.log("faild");
      res.sendStatus(404);
    }
  });

  // // Adds support for GET requests to our webhook
  app.get("/webhook", (req, res) => {
    // Your verify token. Should be a random string.
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN
      ? process.env.VERIFY_TOKEN
      : "tuxedo_cat";
    console.log("get is running");
    // Parse the query params
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
      // Checks the mode and token sent is correct
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        // Responds with the challenge token from the request
        console.log("WEBHOOK_VERIFIED");

        res.status(200).send(challenge);
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);
      }
    }
  });
  app.post("/bot/message", webhook.receiver());

  function sendMessageToODA(senderPsid, message) {
    // let { response } = message;
    message = message.text;
    let recipient = senderPsid;
    clientNumber = recipient;
    // construct message to bot from the client message format
    // console.log("the message is " + message);
    if (!message) {
      console.log("there is no body in the payload");
      // res.send("there is no body in the payload");
    }
    let msgText = message.text ? message.text : message;
    //if (msgText) {

    // msgText = convertArabicNumbersToEnglish(msgText); // if existed
    const MessageModel = webhook.MessageModel();
    const message_ = {
      userId: recipient ? recipient : "NO USER ID",
      messagePayload: MessageModel.textConversationMessage(msgText),
    };
    // console.log(message);
    webhook.send(message_).then(
      () => {
        // console.log("the response is " + response);
        //res.send("ok");
      },
      (e) => res.status(400).end(e.message)
    );
  }

  function checkIfCreditCardNumberIsExisted(st) {
    // st = convertArabicNumbersToEnglish(st);
    const r = /\b(?:\d{4}[ -]?){3}(?=\d{4}\b)/gm;
    if (st.match(r)) {
      const subst = `**** **** **** `;
      const warningMSG =
        "your message \n" +
        st.replace(r, subst) +
        " contains a sensetive data ";
      console.log(warningMSG);
      return warningMSG;
    }
  }
  function convertArabicNumbersToEnglish(arabicText) {
    let arabic_numbers = "٠١٢٣٤٥٦٧٨٩".split("");
    // console.log(arabic_text.match(/[٠١٢٣٤٥٦٧٨٩]/g));
    let n = "";
    for (let i = 0; i < arabicText.length; i++) {
      let state = arabic_numbers.indexOf(arabicText[i]);
      if (state >= 0) {
        n += state;
      } else {
        n += arabicText[i];
      }
    }
    return n;
  }

  function handleAttachmentMessage(message) {
    console.log(
      "______________________________________________________________________________________________ \n from handleAttachmentMessage functions"
    );
    let { messagePayload } = message;
    // console.log("the payload is " + JSON.stringify(messagePayload.text));
    let { actions, cards } = messagePayload;
    // let actions
    if (!messagePayload.actions) {
      let singleMSG = { text: messagePayload.text };
      // console.log("the single message is " + messagePayload.text);
      return singleMSG;
    }
    // console.log(JSON.stringify(messagePayload));
    let Button = { type: "", title: "", payload: "" };
    let Element = { title: "", subtitle: "", image_url: "", buttons: [] };
    let NoCardsElement = { title: "", subtitle: "", buttons: [] };
    let Payload = { template_type: "generic", elements: [] };
    let AttachmentBody = { type: "template", payload: {} };
    let Attachment = { attachment: {} };
    let Default_Action = { type: "web_url", url: "", webview_height_ratio: "" };
    if (!cards) {
      console.log(
        "********************************************* NO CARDS JUST ACTIONS ******************************************",
        "the actions are " + JSON.stringify(actions)
      );
      NoCardsElement.title = messagePayload.text;
      actions.forEach((action) => {
        // console.log("the action is " + JSON.stringify(action));
        NoCardsElement.buttons.push(
          prepairActionToFacebookButtonFormat(action)
        );
      });
      Payload.elements = [NoCardsElement];
    } else {
      console.log(
        "********************************************* cards ******************************************"
      );
      // console.log("there is some cards need to prepaired");
      let globalAction = [];
      if (actions) {
        actions.forEach((action) => {
          globalAction.push(prepairActionToFacebookButtonFormat(action));
        });
      }
      // console.log(
      //   "********************************************* GLOBAL ACTIONS ******************************************"
      // );
      // console.log(JSON.stringify(globalAction));
      Payload.elements = [];
      cards.forEach((card) => {
        Element = {};
        Element.title = card.title;
        Element.image_url = card.imageUrl;
        Element.subtitle = card.description;
        Element.buttons = [];
        card.actions.forEach((action) => {
          Element.buttons.push(prepairActionToFacebookButtonFormat(action));
          // console.log;
        });
        globalAction.forEach((element) => {
          Element.buttons.push(element);
        });
        Payload.elements.push(Element);
      });
      console.log(
        "********************************************* CARD'S ACTIONS AND  GLOBAL ACTIONS ******************************************"
      );
      // console.log(JSON.stringify(Element.buttons));
    }

    AttachmentBody.payload = Payload;
    Attachment.attachment = AttachmentBody;
    // console.log(
    //   "********************************************* ATTACHMENTS ******************************************"
    // );
    // console.log(
    //   "the attachment to the facebook is : " + JSON.stringify(Attachment)
    // );
    return Attachment;
  }

  // Sends response messages via the Send API
  async function callSendAPI(response, senderPsid, isWarningMessage) {
    // The page access token we have generated in your app settings
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN
      ? process.env.PAGE_ACCESS_TOKEN
      : "EAAZA6M47OFxwBAECZCZBb7hH6m12zZCcd95qAGVBQNImWRLuZCMZClAJQGZCkCUpB7wREiXv03pJonl4fMknXZCR6R10D6DUNHHaTCfD2bKsnPhOSMvNgiBI1lfKwzSYdkjkwJZC531iJqXggTEk20TuWub97MG9iXAaq3Dx8uOYtTxQBclg1QCp2clVcSrc0mpcEgVeKyAiPewZDZD";
    // let ODARespose = sendDataToODAWebHookLayer(response);
    // Construct the message body

    // response = handleAttachmentMessage(response);
    console.log("from callSendAPI functions");
    let requestBody = {};
    if (isWarningMessage) {
      requestBody = {
        recipient: {
          id: senderPsid,
        },
        message: { text: response },
      };
    } else {
      requestBody = {
        recipient: {
          id: senderPsid,
        },
        message: response,
      };
    }
    // console.log("the request is : " + JSON.stringify(requestBody));
    // Send the HTTP request to the Messenger Platform
    request(
      {
        uri: "https://graph.facebook.com/v11.0/me/messages",
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: "POST",
        json: requestBody,
      },
      (err, _res, _body) => {
        if (!err) {
          console.log("Message sent to facebook user !", _body);
        } else {
          console.error("Unable to send message to facebook user:" + err);
        }
      }
    );
  }

  // Handles messages events
  function handleMessage(senderPsid, receivedMessage) {
    let response;
    // Checks if the message contains text
    if (receivedMessage.text) {
      // Create the payload for a basic text message, which
      // will be added to the body of your request to the Send API
      receivedMessage.text = convertArabicNumbersToEnglish(
        receivedMessage.text
      );
      const warningMSG = checkIfCreditCardNumberIsExisted(receivedMessage.text);
      if (warningMSG) {
        callSendAPI(warningMSG, senderPsid, true);
        return;
      }
      response = {
        text: ` '${receivedMessage.text}'`,
      };
      // console.log("the response  is " + JSON.stringify(response));

      // sendDataToODAWebHookLayer(senderPsid, response);
    } else if (receivedMessage.attachments) {
      // Get the URL of the message attachment
      // let attachmentUrl = receivedMessage.attachments[0].payload.url;
      // response = {
      //   attachment: {
      //     type: "template",
      //     payload: {
      //       template_type: "generic",
      //       elements: [
      //         {
      //           title: "Are you a retail or a corporate customer?",
      //           subtitle: null,
      //           image_url: null,
      //           buttons: [
      //             { type: "postback", title: "1 Retail", payload: "Retail" },
      //             {
      //               type: "postback",
      //               title: "2 Corporate",
      //               payload: "Corporate",
      //             },
      //           ],
      //         },
      //       ],
      //     },
      //   },
      // };
    }

    // Send the response message
    sendMessageToODA(senderPsid, response);
  }

  function sendToFacebook(message) {
    let { userId } = message;
    // let meg = handleAttachmentMessage(message);
    // console.log("the modified message is " + JSON.stringify(meg));
    callSendAPI(handleAttachmentMessage(message), userId);
  }
  function prepairActionToFacebookButtonFormat(action) {
    let Button = {};
    Button.type = action.type;
    Button.title = action.label;
    Button.payload = action.label.substring(2, action.label.length);
    // console.log("the button is " + JSON.stringify(Button));
    return Button;
  }
};
