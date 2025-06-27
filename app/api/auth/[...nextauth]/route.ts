import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Edge-kompatibles Passwort-Hashing (SHA-256)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Dummy-User-Liste für Entwicklung
const DUMMY_USERS = [
  {
    id: "user-1",
    name: "Max Mustermann",
    email: "max@example.com",
    password: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f", // test123 (SHA-256)
    image: ""
  },
  {
    id: "user-2",
    name: "Erika Musterfrau",
    email: "erika@example.com",
    password: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f", // test123
    image: ""
  }
];

// Dummy-DB-Funktion – sucht in Dummy-User-Liste
async function findUserByEmail(email: string) {
  return DUMMY_USERS.find(u => u.email === email) || null;
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "E-Mail/Passwort",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await findUserByEmail(credentials.email);
        if (!user) return null;
        const valid = (await hashPassword(credentials.password)) === user.password;
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.sub) (session.user as any).id = token.sub;
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
