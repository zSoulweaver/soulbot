import { exchangeCode, getTokenInfo } from '@twurple/auth';
import { db } from '../../../database';
import { twitchTokens } from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { getAuthProvider, getApiClient } from '../../../utils/twurple';

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

    // Add user to the provider so we can use the ApiClient
    const provider = getAuthProvider();
    await provider.addUserForToken(tokenData);
    
    const apiClient = getApiClient();
    const twitchUser = await apiClient.users.getUserById(userId);

    if (!twitchUser) {
      throw new Error('Could not retrieve Twitch user details');
    }

    // Upsert token in DB
    const existing = await db.select().from(twitchTokens).where(eq(twitchTokens.accountType, type as any));

    const tokenPayload = {
      userId: userId,
      userName: twitchUser.name,
      displayName: twitchUser.displayName,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken!,
      expiresIn: tokenData.expiresIn,
      obtainmentTimestamp: tokenData.obtainmentTimestamp,
      scope: JSON.stringify(tokenData.scope),
    };

    if (existing.length > 0) {
      await db.update(twitchTokens)
        .set(tokenPayload)
        .where(eq(twitchTokens.accountType, type as any));
    } else {
      await db.insert(twitchTokens).values({
        accountType: type as any,
        ...tokenPayload,
      });
    }

    return sendRedirect(event, '/setup');
  } catch (err: any) {
    console.error('[Twitch Auth] Error:', err);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to exchange code for tokens: ${err.message}`,
    });
  }
});
