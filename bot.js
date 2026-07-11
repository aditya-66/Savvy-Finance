const TelegramBot = require('node-telegram-bot-api').default || require('node-telegram-bot-api');
const db = require('./config/db');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;

// Initialize bot if token exists, otherwise export a dummy/null
let bot;
if (token) {
    bot = new TelegramBot(token, { polling: true });

    console.log('Telegram Bot is running...');

    const categoryKeywords = {
        'Food & Dining': [
            'tea', 'chai', 'coffee', 'food', 'lunch', 'dinner', 'breakfast', 'snack', 'snacks',
            'pizza', 'burger', 'sandwich', 'noodles', 'noodle', 'maggi', 'momos', 'momo',
            'samosa', 'pani puri', 'golgappa', 'chaat', 'biryani', 'rice', 'roti', 'dal',
            'paratha', 'dosa', 'idli', 'vada', 'pav bhaji', 'chole', 'paneer',
            'chicken', 'mutton', 'fish', 'egg', 'omelette', 'thali',
            'cake', 'pastry', 'chocolate', 'ice cream', 'icecream', 'kulfi', 'sweet', 'mithai',
            'biscuit', 'cookies', 'chips', 'namkeen', 'bhujia',
            'juice', 'lassi', 'milkshake', 'shake', 'smoothie', 'cold drink', 'soda', 'pepsi', 'coke', 'sprite',
            'water', 'milk', 'curd', 'butter', 'ghee', 'oil', 'sugar', 'salt', 'flour', 'atta',
            'fruit', 'fruits', 'apple', 'banana', 'mango', 'grapes', 'orange', 'papaya',
            'vegetable', 'vegetables', 'sabzi', 'onion', 'potato', 'tomato',
            'swiggy', 'zomato', 'restaurant', 'cafe', 'dhaba', 'canteen', 'mess', 'tiffin',
            'grocery', 'groceries', 'kirana', 'provision', 'ration',
            'bread', 'jam', 'sauce', 'ketchup', 'mayo', 'cheese', 'paneer',
            'toffee', 'candy', 'gum', 'mints', 'lollipop',
            'wine', 'beer', 'alcohol', 'liquor', 'drink', 'drinks',
            'popcorn', 'peanut', 'peanuts', 'dry fruits', 'cashew', 'almond', 'raisin'
        ],
        'Transportation': [
            'uber', 'ola', 'auto', 'rickshaw', 'taxi', 'cab', 'bus', 'metro', 'train', 'railway',
            'flight', 'airplane', 'airport', 'petrol', 'diesel', 'fuel', 'gas', 'cng',
            'parking', 'toll', 'fastag', 'car wash', 'servicing', 'repair',
            'bike', 'scooter', 'cycle', 'vehicle', 'car', 'travel', 'trip', 'commute',
            'rapido', 'indriver', 'fare', 'ticket', 'pass'
        ],
        'Housing': [
            'rent', 'emi', 'mortgage', 'home loan', 'house', 'flat', 'apartment',
            'maintenance', 'society', 'property', 'broker', 'brokerage',
            'plumber', 'electrician', 'carpenter', 'painter', 'pest control',
            'furniture', 'sofa', 'bed', 'table', 'chair', 'mattress', 'pillow', 'curtain',
            'ac repair', 'fridge', 'washing machine', 'geyser', 'cooler'
        ],
        'Entertainment': [
            'movie', 'movies', 'cinema', 'pvr', 'inox', 'theatre', 'theater',
            'netflix', 'hotstar', 'prime', 'spotify', 'youtube', 'subscription',
            'game', 'games', 'gaming', 'ps5', 'xbox', 'steam', 'pubg',
            'concert', 'show', 'event', 'party', 'club', 'bar', 'pub',
            'outing', 'picnic', 'trip', 'vacation', 'holiday', 'park', 'museum', 'zoo'
        ],
        'Shopping': [
            'amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'nykaa',
            'clothes', 'clothing', 'shirt', 'tshirt', 't-shirt', 'jeans', 'pant', 'shorts',
            'shoes', 'sneakers', 'sandals', 'chappal', 'slipper',
            'watch', 'bag', 'backpack', 'wallet', 'purse', 'belt',
            'phone', 'mobile', 'laptop', 'tablet', 'earphones', 'headphones', 'charger', 'cable',
            'accessories', 'jewellery', 'jewelry', 'ring', 'chain', 'bracelet',
            'cosmetics', 'makeup', 'perfume', 'deodorant', 'sunscreen', 'cream',
            'gift', 'present', 'shopping'
        ],
        'Bills & Utilities': [
            'electricity', 'electric', 'bijli', 'power', 'light bill',
            'water bill', 'gas bill', 'internet', 'wifi', 'broadband', 'airtel', 'jio', 'vi', 'bsnl',
            'recharge', 'mobile bill', 'phone bill', 'postpaid', 'prepaid',
            'dth', 'tata sky', 'dish tv', 'cable', 'insurance', 'premium',
            'tax', 'gst', 'income tax', 'laundry', 'dry clean', 'ironing'
        ],
        'Needs': [
            'medicine', 'medical', 'doctor', 'hospital', 'clinic', 'pharmacy', 'chemist',
            'health', 'checkup', 'test', 'lab', 'blood test', 'xray',
            'soap', 'shampoo', 'toothpaste', 'brush', 'razor', 'sanitary',
            'tissue', 'detergent', 'surf', 'cleaner', 'mop', 'broom',
            'school', 'college', 'tuition', 'fees', 'book', 'books', 'stationery', 'pen', 'notebook',
            'gym', 'fitness', 'yoga', 'protein', 'supplement'
        ],
        'Wants': [
            'luxury', 'premium', 'designer', 'branded',
            'spa', 'salon', 'haircut', 'facial', 'massage', 'parlour', 'parlor',
            'tattoo', 'piercing', 'hobby', 'art', 'craft', 'music', 'instrument',
            'gadget', 'drone', 'camera', 'gopro', 'smartwatch'
        ],
        'Add Money': [
            'add money', 'salary', 'income', 'refund', 'cashback', 'received', 'credited',
            'bonus', 'freelance', 'payment received', 'pocket money', 'allowance', 'stipend'
        ]
    };

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, "Welcome to SAVVY! Send `/link <TOKEN>` to connect your account. You can generate a token from your SAVVY dashboard.");
    });

    bot.onText(/\/link (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const linkingToken = match[1].trim().substring(0, 50);

        try {
            const [users] = await db.query('SELECT id, name FROM users WHERE linking_token = ?', [linkingToken]);
            
            if (users.length === 0) {
                bot.sendMessage(chatId, "Invalid or expired linking token.");
                return;
            }

            const userId = users[0].id;
            
            // Securely save chat_id and clear the linking_token
            await db.query('UPDATE users SET telegram_chat_id = ?, linking_token = NULL WHERE id = ?', [chatId.toString(), userId]);
            
            bot.sendMessage(chatId, `✅ Account successfully linked to ${users[0].name}! You can now add expenses by texting me (e.g. "50 chai").`);
        } catch (err) {
            console.error(err);
            bot.sendMessage(chatId, "An error occurred while linking your account.");
        }
    });

    bot.onText(/\/unlink/, async (msg) => {
        const chatId = msg.chat.id.toString();
        try {
            const [result] = await db.query('UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = ?', [chatId]);
            if (result.affectedRows > 0) {
                bot.sendMessage(chatId, "✅ Your account has been successfully unlinked from SAVVY.");
            } else {
                bot.sendMessage(chatId, "Your account is not linked to any SAVVY profile.");
            }
        } catch (err) {
            console.error(err);
            bot.sendMessage(chatId, "An error occurred while unlinking your account.");
        }
    });

    // Handle generic text messages for expense parsing
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id.toString();
        const text = msg.text;

        if (!text || text.startsWith('/')) return;

        try {
            // Verify if chat_id exists in users table
            const [users] = await db.query('SELECT id FROM users WHERE telegram_chat_id = ?', [chatId]);
            
            if (users.length === 0) {
                bot.sendMessage(msg.chat.id, "Unauthorized. Please link your account via the SAVVY dashboard using /link <TOKEN>.");
                return;
            }

            const userId = users[0].id;

            // Regex to parse amount and keyword
            // Matches "50 chai", "+100 salary", "add 50 bonus"
            const match = text.match(/^(\+|\badd\s+)?(?:₹|rs\s*)?(\d+(?:\.\d+)?)\s+(.+)$/i);
            
            if (!match) {
                bot.sendMessage(msg.chat.id, "Sorry, I couldn't understand that. Please use the format: `[Amount] [Keyword]` (e.g. 50 chai) or `add [Amount] [Keyword]` to add income.");
                return;
            }

            const isIncome = !!match[1];
            let amount = parseFloat(match[2]);
            const keyword = match[3].trim().substring(0, 100).toLowerCase();
            
            if (!isFinite(amount) || amount <= 0 || amount > 99999999) {
                bot.sendMessage(msg.chat.id, "Amount must be a positive, finite number and less than 100,000,000.");
                return;
            }

            // Map keyword to category, default to 'Miscellaneous'
            let category = 'Miscellaneous';
            
            if (isIncome) {
                amount = -amount; // Negative amount signifies Income in this database schema
                category = 'Add Money';
            } else {
                for (const [cat, keywords] of Object.entries(categoryKeywords)) {
                    for (const kw of keywords) {
                        const regex = new RegExp(`\\b${kw}\\b`, 'i');
                        if (regex.test(keyword)) {
                            category = cat;
                            break;
                        }
                    }
                    if (category !== 'Miscellaneous') break;
                }
            }
            
            // Prevent duplicate entries (e.g., from multiple instances/zombie processes)
            const [recent] = await db.query(
                'SELECT id FROM transactions WHERE user_id = ? AND title = ? AND amount = ? AND date > DATE_SUB(NOW(), INTERVAL 10 SECOND)',
                [userId, keyword, amount]
            );

            if (recent.length > 0) {
                console.log('Duplicate transaction from Telegram ignored.');
                return;
            }

            await db.query(
                'INSERT INTO transactions (user_id, title, amount, category) VALUES (?, ?, ?, ?)',
                [userId, keyword, amount, category]
            );

            if (isIncome) {
                bot.sendMessage(msg.chat.id, `✅ Added ₹${Math.abs(amount)} as Income (${keyword}).`);
            } else {
                bot.sendMessage(msg.chat.id, `✅ ₹${amount} spent under ${category}.`);
            }

        } catch (err) {
            console.error(err);
            bot.sendMessage(msg.chat.id, "An error occurred while saving your expense.");
        }
    });
}

module.exports = bot;
