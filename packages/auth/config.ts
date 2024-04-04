// This file cannot be exported from the package index due to build dependencies
// and Edge runtime compatibility (used in Next.js middleware)

import type { JWT } from "@auth/core/jwt";
import type { DefaultSession } from "@auth/core/types";
import type { NextAuthConfig, Session } from "next-auth";

const PUBLIC_PATHS = ["/login", "/signup"];

/**
 * Module augmentation for `next-auth` types
 * Allows us to add custom properties to the `session` object
 * and keep type safety
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 **/
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      // ...other properties
    };
  }
}

//|> https://sometechblog.com/posts/enable-nextauth-to-work-across-subdomains/#:~:text=By%20default%20NextAuth%20authenticates%20the,.subdomain.example.org%20.
const { hostname } = new URL(process.env.NEXTAUTH_URL!);
// This doesn't work for *.co.uk domains and it might be easier to simply write the root domain: sqlai.ai
const ROOT_DOMAIN = hostname
  .split(".")
  .reverse()
  .splice(0, 2)
  .reverse()
  .join(".");
const isSecure = process.env.NODE_ENV !== "development";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/signup",
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    session: ({ session, token }: { session: Session; token?: JWT }) => {
      //   if (session.user) {
      //     const user = await db.user.findUniqueOrThrow({
      //       where: { id: token.sub },
      //       select: { role: true },
      //     });

      //     session.user.role = user.role; // <-- put other properties on the session here
      //   }
      session.user.id = token!.sub!;
      return session;
    },

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnPublicRoute = PUBLIC_PATHS.includes(nextUrl.pathname);
      const isOnLoginPage = nextUrl.pathname.startsWith("/login");
      if (isOnLoginPage && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
      }
      if (isOnPublicRoute) {
        return true;
      }
      return isLoggedIn; // Redirect unauthenticated users to login page if false
    },
  },

  // Subdomains config
  cookies: {
    sessionToken: {
      name: isSecure
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain: `.${ROOT_DOMAIN}`, // Note the dot
        secure: isSecure,
      },
    },
  },
} satisfies NextAuthConfig;
