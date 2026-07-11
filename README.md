<div align="center">
  <img src="https://raw.githubusercontent.com/github/explore/80688e429a7d4ef2fca1e82350fe8e3517d3494d/topics/javascript/javascript.png" width="100" height="100" alt="JavaScript Logo" />
  
  # 🚀 SAVVY Finance Dashboard

  **Your ultimate personal finance command center, built with modern web technologies.**
  
  Track your expenses, analyze your budget health, and log transactions effortlessly via Telegram! 💸✨

  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)]()
  [![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)]()
  [![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)]()
  [![Telegram API](https://img.shields.io/badge/Telegram_Bot-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)]()
  [![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)]()
  [![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)]()
</div>

<br />

## 🌟 Features

- 🔐 **Secure Authentication:** JWT-based stateless sessions with OTP email verification for maximum security.
- 📊 **Dynamic Analytics:** Real-time, interactive Doughnut, Bar, and Line charts powered by Chart.js.
- 💡 **Budget Health Calculator:** Instantly grade your financial health (A to D) based on your income, savings goals, and fixed needs using the 50/30/20 rule logic.
- 🤖 **Telegram Bot Integration:** Link your account to our Telegram Bot! Add transactions on the go just by texting `50 chai` or `add 1000 salary`.
- 🎨 **Stunning Glassmorphism UI:** A gorgeous, responsive interface featuring dynamic glowing elements and deep-dark mode aesthetics.
- 🛡️ **Robust Security:** Built-in protection against SQL Injections (parameterized queries), XSS (robust escaping), ReDoS, and brute-force attacks (Rate Limiting).

---

## 🛠️ Technology Stack

| Category | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+), Chart.js |
| **Backend API** | Node.js, Express.js |
| **Database** | MySQL (via `mysql2/promise`) |
| **Authentication** | `bcrypt`, `jsonwebtoken`, `nodemailer` (OTP) |
| **Security** | `helmet`, `express-rate-limit` |
| **Integrations** | `node-telegram-bot-api` |

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v14 or higher)
- [MySQL](https://www.mysql.com/) Server
- A Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- A Gmail account with an App Password (for OTPs)

### 1️⃣ Installation

Clone the repository and install the required dependencies:

```bash
git clone https://github.com/your-username/savvy-dashboard.git
cd savvy-dashboard
npm install
```

### 2️⃣ Database Setup

Log into your local MySQL server and run the included SQL script to generate the database and tables:

```bash
mysql -u root -p < init.sql
```

### 4️⃣ Run the App

Fire up the server! 🚀

```bash
npm start
# OR for development with hot-reloading:
npm run dev
```

Open your browser and navigate to `http://localhost:3000` to see your dashboard!

---

## 📱 Telegram Bot Setup

Savvy allows you to log transactions without opening the app!

1. Open your Savvy Dashboard and go to the **Account** tab.
2. Click **Generate Linking Token**.
3. Open Telegram and message your bot: `/link <YOUR_TOKEN>`.
4. Start logging! Try messaging:
   - `150 pizza` (Logs a ₹150 expense under Food & Dining)
   - `add 5000 freelance` (Logs ₹5000 as Income)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/savvy-dashboard/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
<div align="center">
  <i>Built with ❤️ for better personal finance.</i>
</div>
