import { exchangeCode, getTokenInfo } from '@twurple/auth';
import { db } from '../../../database';
import { twitchTokens } from '../../../database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const { code, state: type } = getQuery(event);
  const config = useRuntimeConfig();

  if (!code || !type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing code or state.',
    });
  }

  try {
    const tokenData = await exchangeCode(
      config.twitchClientId,
      config.twitchClientSecret,
      code as string,
      config.twitchRedirectUri
    );

    // Get user ID using the fresh token
    const tokenInfo = await getTokenInfo(tokenData.accessToken);
    const userId = tokenInfo.userId;

    if (!userId) {
      throw new Error('Could not retrieve user ID from token');
    }

    // Upsert token in DB
    const existing = await db.select().from(twitchTokens).where(eq(twitchTokens.accountType, type as any));

    if (existing.length > 0) {
      await db.update(twitchTokens)
        .set({
          userId: userId,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken!,
          expiresIn: tokenData.expiresIn,
          obtainmentTimestamp: tokenData.obtainmentTimestamp,
          scope: JSON.stringify(tokenData.scope),
        })
        .where(eq(twitchTokens.accountType, type as any));
    } else {
      await db.insert(twitchTokens).values({
        accountType: type as any,
        userId: userId,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken!,
        expiresIn: tokenData.expiresIn,
        obtainmentTimestamp: tokenData.obtainmentTimestamp,
        scope: JSON.stringify(tokenData.scope),
      });
    }

    // After adding tokens, we might want to re-init Twurple if the bot is already running
    // but for now, we'll just redirect to setup page
    return sendRedirect(event, '/setup');
  } catch (err: any) {
    console.error('[Twitch Auth] Error:', err);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to exchange code for tokens: ${err.message}`,
    });
  }
});
