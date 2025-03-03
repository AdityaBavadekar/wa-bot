import { configDotenv } from "dotenv";
configDotenv();
import venom from "venom-bot";
import QRCode from "qrcode";
import { generateResponse } from "./functions.js";
import { isAllowedUser, PERMISSIONS } from "./permissions.js";

// https://stackoverflow.com/questions/26667820/upload-a-base64-encoded-image-using-formdata
// 
function DataURIToBlob(dataURI) {
    const splitDataURI = dataURI.split(",");
    const byteString =
        splitDataURI[0].indexOf("base64") >= 0
            ? atob(splitDataURI[1])
            : decodeURI(splitDataURI[1]);
    const mimeString = splitDataURI[0].split(":")[1].split(";")[0];

    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++)
        ia[i] = byteString.charCodeAt(i);

    return new Blob([ia], { type: mimeString });
}

async function generateQRWithPadding(data) {
    return await QRCode.toDataURL(data, {
        margin: 4,
    });
}

let messagesHistory = [];
let deletedMessageIds = [];
let editedMessageIds = [];
const MAIL_SEND_URL = process.env.MAIL_SEND_URL;

async function onMessageEditOrDelete(client, message, isDelete) {
    let sender =
        (message.isGroupMsg ? message.author : message.from) || message.from;
    sender = sender.replace("@c.us", "");
    sender = sender.replace("@g.us", "");

    if (isDelete && deletedMessageIds.includes(message.id)) return;

    if (!isAllowedUser(sender, PERMISSIONS.ALL)) {
        console.log("Not to notify about " + (isDelete ? "delete" : "edit"));
        return;
    }
    const lastMessageId = isDelete
        ? message.protocolMessageKey._serialized
        : message.id;

    let replyMessage = "";
    let changedMessage = messagesHistory.find((v) => v.id == lastMessageId);

    if (!isDelete && editedMessageIds.includes(message.id) && changedMessage) {
        if (changedMessage.content == message.body) {
            console.log("No change in message. Ignoring.");
            return;
        }
    }

    if (isDelete) {
        deletedMessageIds.push(message.id);
        console.log("Message deleted: ", message);
        replyMessage = `Hey, it would be nice if you hadn't *deleted* the message. (^..^)`;
    } else {
        editedMessageIds.push(message.id);
        console.log("Message edited: ", message);
        replyMessage = `Hey, it would be nice if you hadn't *edited* the message. (^..^)`;
    }

    if (changedMessage) {
        replyMessage += `\nBTW it was:\n\n${changedMessage.content}\n\nwasn't it? :)`;
        messagesHistory = messagesHistory.filter(
            (v) => v.id != changedMessage.id
        );
    }

    messagesHistory.push({
        id: message.id,
        content: message.content,
    });

    await client.reply(message.from, replyMessage, message.id);
}

async function sendQRToMail(urlCode) {
    if (!MAIL_SEND_URL) {
        console.log("[x] Mail send URL not found. Skipping...");
        return;
    }

    const formData = new FormData();
    formData.append(
        "message",
        `Hi, sending QR Code. Please scan this using WhatsApp.`
    );
    const qrBlob = DataURIToBlob(await generateQRWithPadding(urlCode));
    formData.append("file", qrBlob, "qr_code.png");
    fetch(MAIL_SEND_URL, {
        body: formData,
        method: "POST",
    })
        .then((response) => response.json())
        .then(() => console.log("[x]", "QR Code sent to Mail"))
        .catch((error) => console.log("[x] Error sending QR code", error));
}

venom
    .create(
        "session-001-test",
        async (base64Qr, asciiQR, attempts, urlCode) => {
            console.log("[x] QR Code received. Sending to Mail...");
            try {
                await sendQRToMail(urlCode);
            } catch (e) {
                console.log("Error", e);
            }
        },
        (statusSession, session) => {
            console.log("Status Session: ", statusSession);
            console.log("Session name: ", session);
        },
        {
            headless: "new",
            browserArgs: ["--start-maximized"],
        }
    )
    .then((client) => start(client))
    .catch((erro) => {
        console.log("Error", erro);
    });

function start(client) {
    client.onStateChange((state) => {
        console.log("State changed: ", state);
    });
    client.onMessageDelete(async (message) => {
        await onMessageEditOrDelete(client, message, true);
    });
    client.onMessageEdit(async (message) => {
        await onMessageEditOrDelete(client, message, false);
    });
    client.onMessage(async (message) => {
        if (!message.body) return;

        messagesHistory.push({
            id: message.id,
            content: message.body,
        });

        function reply(msg) {
            client
                .reply(message.from, msg, message.id)
                .then((result) => {
                    console.log("Message sent.");
                })
                .catch((erro) => {
                    console.error("Error when sending: ", erro);
                });
        }

        const response = await generateResponse(
            message.isGroupMsg ? message.author : message.from,
            message.body,
            message.isGroupMsg ? message.from : null,
            reply
        );

        let responseMessage = null;
        let image = "";
        let imgCaption = "";

        if (response instanceof Object) {
            responseMessage = response.msg;
            image = response.image;
            imgCaption = response.imageCaption || "";
        } else {
            responseMessage = response;
        }

        if (responseMessage == null) {
            console.log("Response message is null. Not sending.");
            return;
        }

        console.log("Sending message: ", responseMessage);
        if (image) {
            await client
                .sendImage(message.from, image, imgCaption, responseMessage)
                .then((result) => {
                    console.log("Image sent.");
                })
                .catch((erro) => {
                    console.error("Error when sending image: ", erro);
                });
        } else {
            client
                .reply(message.from, `${responseMessage}`, message.id)
                .then((result) => {
                    console.log("Message sent.");
                })
                .catch((erro) => {
                    console.error("Error when sending: ", erro);
                });
        }
    });
}
