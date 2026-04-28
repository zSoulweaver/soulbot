import { initTwurple } from '../utils/twurple';

export default defineNitroPlugin(async (nitroApp) => {
  console.log('[Bot Plugin] Initializing...');

  try {
    // 1. Load tokens from DB into AuthProvider
    await initTwurple();

    // 2. Try to start the bot
    const success = await startBot();
    if (success) {
      console.log('[Bot Plugin] Bot started successfully.');
    } else {
      console.log('[Bot Plugin] Tokens missing or bot already running, waiting for onboarding...');
    }
  } catch (err) {
    console.error('[Bot Plugin] Initialization failed:', err);
  }
});
