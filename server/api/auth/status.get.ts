import { db } from '../../database';
import { twitchTokens } from '../../database/schema';

export default defineEventHandler(async (event) => {
  const tokens = await db.select().from(twitchTokens);
  
  return {
    bot: tokens.find(t => t.accountType === 'bot') ? { userId: tokens.find(t => t.accountType === 'bot')?.userId } : null,
    streamer: tokens.find(t => t.accountType === 'streamer') ? { userId: tokens.find(t => t.accountType === 'streamer')?.userId } : null,
  };
});
