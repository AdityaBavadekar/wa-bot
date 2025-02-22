# WhatsApp Bot using Venom-Bot

## 🤖 Features

1. **cf>>>`<username>`** - Get Codeforces user info
2. **watch>>>`<video id>`** - Watch a YouTube video
3. **E>>>`<message>`** - Encode a message to emoji
4. **D>>>`<encoded message>`** - Decode a message
5. **ai>>>`<message>`** - Talk to AI
6. **help>>>** - Get help with commands

---

## 📌 Setup & Installation

### Prerequisites
- Node.js (v14 or later)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/AdityaBavadekar/wa-bot
   cd whatsapp-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file and configure it:
   ```bash
   # Linux & macOS
   cp .env.example .env
   
   # Windows
   copy .env.example .env
   ```

4. Update the `.env` file with your credentials:

5. Start the bot:
   ```bash
   npm run dev
   ```

6. Scan the QR code generated in the terminal using your WhatsApp mobile app.

---

## 📜 Usage Example
- Send any of the supported commands in a WhatsApp chat to interact with the bot.
- Example:
  ```
  cf>>> tourist
  ```
  This will fetch Codeforces user info for `tourist`.
- Example in WhatsApp:
  ![](/screenshots/image_cf.png)


## 📜 License
This project is licensed under the Apache License, Version 2.0

```

   Copyright 2025 Aditya Bavadekar

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

```