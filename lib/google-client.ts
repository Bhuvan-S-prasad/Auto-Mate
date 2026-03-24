import { google } from "googleapis";
import { createOAuth2Client, type GoogleProvider } from "./google";
import { encrypt, decrypt } from "./encryption";
import { prisma } from "./prisma";

const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes

export async function getGoogleClient(
  userId: string,
  provider: GoogleProvider,
) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const integration = await prisma.integration.findFirst({
    where: {
      userId,
      provider: provider,
    },
  });

  if (!integration) {
    throw new Error("Integration not found");
  }

  const oauth2Client = createOAuth2Client();

  const accessToken = await decrypt(integration.accessToken);
  const refreshToken = await decrypt(integration.refreshToken);

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: integration.expiresAt.getTime(),
  });

  // refresh if token is within 5 min of expiry
  const now = Date.now();
  const expiresAt = integration.expiresAt.getTime();

  if (expiresAt - now < TOKEN_REFRESH_BUFFER) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await prisma.integration.update({
        where: {
          id: integration.id,
        },
        data: {
          accessToken: await encrypt(credentials.access_token!),
          refreshToken: await encrypt(credentials.refresh_token!),
          expiresAt: new Date(
            credentials.expiry_date ?? Date.now() + 3600 * 1000,
          ),
        },
      });

      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.log(`token refresh failed for ${provider}:`, error);

      // token revoked -- remove integration
      await prisma.integration.delete({
        where: {
          id: integration.id,
        },
      });

      return null;
    }
  }

  return oauth2Client;
}

export async function getGmailClient(userId: string) {
  const auth = await getGoogleClient(userId, "gmail");
  if (!auth) {
    throw new Error("Gmail integration not found");
  }
  return google.gmail({ version: "v1", auth });
}

export async function getCalendarClient(userId: string) {
  const auth = await getGoogleClient(userId, "google_calendar");
  if (!auth) {
    throw new Error("Calendar integration not found");
  }
  return google.calendar({ version: "v3", auth });
}
