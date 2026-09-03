import type { DefaultSession } from "next-auth";

// Augment Auth.js types with our custom fields.
declare module "next-auth" {
  interface User {
    role?: string;
    technicianId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      technicianId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    technicianId?: string | null;
  }
}
