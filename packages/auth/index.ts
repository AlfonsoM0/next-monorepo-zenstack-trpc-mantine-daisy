import CredentialsProvider from "@auth/core/providers/credentials";
import { enhance } from "@zenstackhq/runtime";
import NextAuth from "next-auth";

// import DiscordProvider from "next-auth/providers/discord";

import { db } from "@acme/db";

import { authorize } from "./authorize";
import { authConfig } from "./config";

export type { Session } from "next-auth";

// Update this whenever adding new providers so that the client can
export const providers = ["credentials"] as const;
export type OAuthProviders = (typeof providers)[number];

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 3 * 24 * 60 * 60, // 3 days
  },
  providers: [
    CredentialsProvider({
      authorize,
    }),
    // DiscordProvider({
    //   clientId: process.env.DISCORD_CLIENT_ID,
    //   clientSecret: process.env.DISCORD_CLIENT_SECRET,
    // }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
});

/**
 * Get an authorization-enabled database client
 */
export async function getEnhancedPrisma() {
  const session = await auth();
  const user = await db.user.findFirstOrThrow({
    where: { email: session?.user?.email },
  });
  return enhance(db, { user });
}
