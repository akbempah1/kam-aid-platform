import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// Define your users here (in production, use a database)
const users = [
  {
    id: "1",
    name: "Admin",
    email: "admin@kamaid.com",
    password: bcrypt.hashSync("KamAid@2025", 10),
    role: "admin"
  },
  {
    id: "2",
    name: "Manager",
    email: "manager@kamaid.com",
    password: bcrypt.hashSync("Manager@2025", 10),
    role: "manager"
  },
  {
    id: "3",
    name: "Damien",
    email: "damien@kamaid.com",
    password: bcrypt.hashSync("Damien@2025", 10),
    role: "admin"
  }
];

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = users.find(u => u.email === credentials.email);
        
        if (!user) {
          return null;
        }

        const isValid = bcrypt.compareSync(credentials.password, user.password);
        
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };