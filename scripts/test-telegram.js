const Database = require('better-sqlite3');
const path = require('path');

async function sendTelegramMessage(botToken, chatId, text) {
  const token = (botToken || '').trim()
  const chat = (chatId || '').trim()
  if (!token || !chat) {
    return { ok: false, error: 'Telegram bot token veya chat id eksik' }
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!data.ok) {
      return { ok: false, error: data.description || res.statusText || 'Telegram API hatası' }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

async function main() {
  const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
  console.log("Using database at:", dbPath);
  
  let db;
  try {
    db = new Database(dbPath);
  } catch (e) {
    console.error("Failed to open database:", e.message);
    return;
  }
  
  let tokenRow, chatIdRow;
  try {
    tokenRow = db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'telegram_bot_token'").get();
    chatIdRow = db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'telegram_chat_id'").get();
  } catch (e) {
    console.error("Failed to query app_settings:", e.message);
    return;
  }

  const token = tokenRow?.setting_value;
  const chatId = chatIdRow?.setting_value;

  console.log("Token:", token ? token.substring(0, 10) + "..." : "Not Found");
  console.log("Chat ID:", chatId ? chatId : "Not Found");

  if (!token || !chatId) {
    console.error("Missing Telegram settings in database. Please configure them in the application settings first.");
    return;
  }

  console.log("Sending test message...");
  const result = await sendTelegramMessage(token, chatId, "<b>Test Mesajı</b>\nBu mesaj Super ERP sisteminden test amacıyla gönderilmiştir.");
  console.log("Result:", result);
}

main().catch(console.error);
