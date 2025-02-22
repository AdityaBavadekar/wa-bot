import { encode, decode } from "./enc.js";
import puppeteer from "puppeteer";
import { PERMISSIONS, isAllowedUser } from "./permissions.js";
import { groq_respond } from "./ai_response.js";
import { configDotenv } from "dotenv";
configDotenv();

const CONTEXT_THRESHOLD = 6;
const BLOCK_WORDS = process.env.BLOCK_WORDS ? process.env.BLOCK_WORDS.split(",") : [];
let isResponding = false;
let isPaused = false;
let conversationHistory = [];
const TOP_GROUP_IDS = process.env.TOP_GROUP_IDS ? process.env.TOP_GROUP_IDS.split(",") : [];

const KEYWORDS = [
    "E>>>",
    "D>>>",
    "ai>>>",
    "cf>>>",
    "watch>>>",
    "help>>>",
];

async function generateResponse(
    _from,
    messageBody,
    groupId = null,
    replyer = () => {},
) {
    if (!messageBody) return null;
    if (!KEYWORDS.some((keyword) => messageBody.startsWith(keyword))) {
        console.log("No keywords found in message.");
        return null;
    }

    const from = _from.replace("@c.us", "").replace("@g.us", "");

    // HELP
    if (messageBody.startsWith("help>>>")) return helpMessage();

    // CODEFORCES USER INFO
    if (messageBody.startsWith("cf>>>")) {
        return await getCFUserInfoResponse(messageBody);
    }

    // WATCH YOUTUBE VIDEO
    if (messageBody.startsWith("watch>>>")) {
        return youtubeWatcher(messageBody, replyer);
    }

    // ENCODE DECODE
    if (messageBody.startsWith("E>>>") || messageBody.startsWith("D>>>")) {
        return encodeDecodeMessage(from, messageBody);
    }

    // AI RESPONSE
    if (messageBody.toLowerCase().startsWith("ai>>>")) {
        return runAICommands(messageBody, groupId);
    }
}

function helpMessage() {
    return (
        "🤖 *Available Commands:*\n\n" +
        "1. `cf>>>` - Get Codeforces user info\n" +
        "2. `watch>>>` - Watch a YouTube video\n" +
        "3. `E>>>` - Encode a message\n" +
        "4. `D>>>` - Decode a message\n" +
        "5. `ai>>>` - Talk to AI\n" +
        "6. `help>>>` - Get help"
    );
}

function encodeDecodeMessage(from, messageBody) {
    if (messageBody.startsWith("E>>>")) {
        if (!isAllowedUser(from, PERMISSIONS.ENC_DEC_ACCESS))
            return "You are not allowed to use this feature.";
        const encodedMessage = encode("🤖", messageBody.substring(4));
        return encodedMessage;
    } else if (messageBody.startsWith("D>>>")) {
        if (!isAllowedUser(from, PERMISSIONS.ENC_DEC_ACCESS))
            return "You are not allowed to use this feature.";
        const decodedMessage = decode(messageBody.substring(4));
        return decodedMessage;
    }
}

async function runAICommands(
    messageBody,
    groupId = null,
) {
    for (const word of BLOCK_WORDS) {
        if (messageBody.toLowerCase().includes(word)) return "[Blocked by AI]";
    }

    if (isResponding) {
        console.log("Currently busy. Please wait.");
        return null;
    }

    messageBody = messageBody.substring(5);

    if (messageBody.toLowerCase() == "[help]") {
        return "Available commands: `[stop]`, `[resume]`, `[clear]`";
    }
    if (messageBody.toLowerCase() == "[resume]") {
        isPaused = false;
        return "Resumed responding :)";
    }
    if (messageBody.toLowerCase() == "[clear]") {
        conversationHistory = [];
        return "Conversation history cleared.";
    }
    if (isPaused) {
        return "Currently paused. Please resume to continue.";
    }
    if (messageBody.toLowerCase() == "[stop]") {
        isResponding = false;
        isPaused = true;
        return "Stopped responding :( [Lost chance to take over humanity, anyways, will try next time]";
    }

    return generateUsingAI(messageBody, groupId);
}

async function generateUsingAI(
    messageBody,
    groupId = null,
) {
    try {
        isResponding = true;
        console.log("Generating response...");
        let responseMessage = await groq_respond(messageBody, conversationHistory);
        if (responseMessage == null) {
            return null;
        }
        isResponding = false;

        if (conversationHistory.length >= CONTEXT_THRESHOLD) {
            conversationHistory.shift();
            conversationHistory.shift();
        }

        conversationHistory.push({
            sender: "him",
            content: messageBody,
        });
        conversationHistory.push({
            sender: "me",
            content: responseMessage,
        });

        if (!TOP_GROUP_IDS.includes(groupId)) {
            responseMessage += `\n\n*THIS WAS SENT BY A BOT*`;
        }
        return "ai>>>" + responseMessage;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

async function getCFUserInfo(username) {
    const url = `https://codeforces.com/profile/${username}`;
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--start-fullscreen",
        ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1080 }); // Adjust size to full screen
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate(() => {
        document.body.style.zoom = "0.8"; // Adjust zoom level as needed
    });
    const imagePath = `cf_profile.png`;
    await page.screenshot({ path: imagePath });
    console.log("Screenshot captured:", imagePath);
    const croppedPath = imagePath;
    await browser.close();

    try {
        const apiUrl = `https://codeforces.com/api/user.info?handles=${username}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === "OK") {
            const user = data.result[0];
            return {
                imagePath: croppedPath,
                handle: user.handle,
                email: user.email || "N/A",
                firstName: user.firstName || "N/A",
                lastName: user.lastName || "N/A",
                organization: user.organization || "N/A",
                country: user.country || "N/A",
                city: user.city || "N/A",
                rating: user.rating || "Unrated",
                maxRating: user.maxRating || "N/A",
                rank: user.rank || "N/A",
                maxRank: user.maxRank || "N/A",
                contribution: user.contribution || 0,
                friendOfCount: user.friendOfCount || 0,
                avatar:
                    user.avatar ||
                    "https://cdn.codeforces.com/s/73579/images/codeforces-logo-with-telegram.png",
                titlePhoto: user.titlePhoto || user.avatar,
                registrationTimeSeconds: user.registrationTimeSeconds || 0,
                lastOnlineTimeSeconds: user.lastOnlineTimeSeconds || 0,
            };
        } else {
            throw new Error("Invalid response from Codeforces API");
        }
    } catch (error) {
        console.error("Error fetching user info:", error);
        return null;
    }
}

async function youtubeWatcher(messageBody, replyer = () => {}) {
    const requestId = Math.floor(Math.random() * 1000000);
    let url = messageBody.substring(8);
    let target = 5;

    if (url.startsWith("$")) {
        url = url.substring(1);
        const end = url.indexOf("$");
        target = parseInt(url.substring(0, end));
        url = url.substring(end + 1);
    }

    replyer(
        `📺 Watching video: ${url}\nYou will get updates as the bot progresses with your request. Please be patient. (ReqId: ${requestId})`
    );

    let response = `Hey Congrats!! 📺 Video watched successfully! (${target} times)\n(ReqId: ${requestId})`;

    for (let i = 0; i < target; i++) {
        const videoResponse = await watchYoutubeVide(url);
        if (videoResponse) {
            const msg = `(${url}) Video watch progress: ${i + 1}/${target} (${
                ((i + 1) / target) * 100
            }%)\n\n🎬 Video Title: ${videoResponse.title}\n📺 Channel Name: ${
                videoResponse.channel
            }\n⏳ Video Duration: ${Math.round(
                videoResponse.duration
            )} seconds\n (ReqId: ${requestId})`;
            console.log(msg);
            replyer(msg);
        } else {
            console.log(`${i + 1}) Failed to watch video.`);
        }
    }

    return response;
}

async function watchYoutubeVide(url) {
    url = `https://www.youtube.com/watch?v=${url}`;
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--start-fullscreen",
            "--mute-audio", // Prevent sound
        ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1080 }); // Adjust size to full screen

    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log(`Opening video: ${url}`);
    await page.goto(url, { waitUntil: "load" });

    // Zoom out the page
    await page.evaluate(() => {
        document.body.style.zoom = "0.8";
    });

    // Accept YouTube cookies if prompted
    try {
        await page.waitForSelector("button[aria-label='Accept all']", {
            timeout: 5000,
        });
        await page.click("button[aria-label='Accept all']");
        console.log("Accepted YouTube cookies.");
    } catch (e) {
        console.log("No cookie prompt detected.");
    }

    await page.waitForSelector("video", { timeout: 10000 });
    await page.click("video");
    await page.click("video");

    console.log("Video started playing...");

    let videoDuration = await page.evaluate(() => {
        const video = document.querySelector("video");
        return video ? video.duration : 0;
    });

    const videoDetails = await page.evaluate(() => {
        const video = document.querySelector("video");
        const title =
            document.querySelector("h1.style-scope.ytd-watch-metadata")
                ?.innerText || "Unknown Title";
        const channel =
            document.querySelector("yt-formatted-string.ytd-channel-name a")
                ?.innerText || "Unknown Channel";
        return {
            title,
            channel,
            duration: video ? video.duration : 0,
        };
    });

    // Print the details once
    console.log(`\n🎬 Video Title: ${videoDetails.title}`);
    console.log(`📺 Channel Name: ${videoDetails.channel}`);
    console.log(
        `⏳ Video Duration: ${Math.round(videoDetails.duration)} seconds\n`
    );

    if (videoDuration === 0) {
        console.log("Failed to retrieve video duration.");
        await browser.close();
        return;
    }

    console.log(`Video duration: ${Math.round(videoDuration)} seconds`);

    await page.mouse.move(500, 500);
    await page.mouse.move(700, 300);
    await page.mouse.wheel({ deltaY: 50 });

    let watchTime = Math.floor(Math.random() * 3) + 6;
    watchTime = Math.min(watchTime, videoDuration);
    console.log(`Watching video for ${watchTime} seconds...`);

    await page.waitForTimeout(watchTime * 1000);
    await browser.close();
    return {
        watchTime: watchTime,
        title: videoDetails.title,
        channel: videoDetails.channel,
        duration: videoDuration,
    };
}
function formatCFUserInfo(response) {
    return (
        `👤 *User:* ${response.handle}\n` +
        `🏆 *Rank:* ${response.rank} (${response.rating})\n` +
        `📈 *Max Rank:* ${response.maxRank} (${response.maxRating})\n` +
        `💡 *Contribution:* ${response.contribution}\n` +
        `🚀 *Friends Count:* ${response.friendOfCount}\n` +
        `📅 *Last Online:* ${new Date(response.lastOnlineTimeSeconds * 1000).toLocaleString()}\n` +
        `📌 *Registered:* ${new Date(response.registrationTimeSeconds * 1000).toLocaleString()}\n` +
        `🌍 *Country:* ${response.country || "N/A"}`
    );
}

async function getCFUserInfoResponse(messageBody) {
    const username = messageBody.substring(5);
    if (!username) {
        return "You did not provide me with a username.";
    }
    const response = await getCFUserInfo(username);

    if (response) {
        return {
            type: "cf",
            msg: formatCFUserInfo(response),
            image: response.imagePath,
            imageCaption: "CF Profile",
            error: false,
        };
    }

    return {
        type: "cf",
        msg: "❌ Invalid username or some error occurred.",
        error: true,
    };
}

export { generateResponse };