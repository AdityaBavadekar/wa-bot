import Groq from "groq-sdk";
import PROMPTS from "./prompts.js";
import { configDotenv } from "dotenv";
configDotenv();

if (!process.env.GROQ_API_KEY) {
    console.warn("[Warning] --------------- GROQ_API_KEY is not set");
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "NOT_SET",
});
const GROQ_MODEL = process.env.GROQ_MODEL;

// Open ./prompts_sample.js to learn more
const SYSTEM_PROMPT_KEY = "PROMPT_EINSTEIN";

console.log("GROQ_MODEL: ", GROQ_MODEL);
console.log("SYSTEM_PROMPT_KEY: ", SYSTEM_PROMPT_KEY);

async function groq_respond(msg, conversationHistory) {
    const prompt =
        PROMPTS[SYSTEM_PROMPT_KEY] +
        (conversationHistory.length > 0
            ? `Here is the previous conversation: \n\n` +
              conversationHistory
                  .map((item) => {
                      return item.sender == "me"
                          ? `You: ${item.content}`
                          : `Other person: ${item.content}`;
                  })
                  .join("\n") +
              "\n\n"
            : "") +
        ("\nOther person: " + msg) +
        "\n\n" +
        "Please respond to the above message not sent by you";

    // console.log("Prompt:\n\n ", prompt, "\n\n");
    try {        
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: prompt,
                },
            ],
            model: GROQ_MODEL,
            temperature: 0.3,
            max_completion_tokens: 1020,
            top_p: 1,
            stream: false,
            stop: null,
        });
        console.log(chatCompletion.choices[0].message.content);
        return chatCompletion.choices[0].message.content;
    
    } catch (error) {
        console.error("Error: ", error.error);
        return `Sorry, I am not able to respond to this message due to error on the server. Please try again.`;
    }
}

export { groq_respond };