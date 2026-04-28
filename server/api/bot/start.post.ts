import { initTwurple, startBot } from '../../utils/twurple';

export default defineEventHandler(async (event) => {
  await initTwurple();
  const success = await startBot();
  
  if (!success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to start bot. Ensure both accounts are authenticated.',
    });
  }

  return { status: 'ok' };
});
