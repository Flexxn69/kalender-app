import { NextRequest, NextResponse } from "next/server";

// Edge-kompatibles Passwort-Hashing (SHA-256)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
    const data = encoder.encode(password);
      const hash = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
        }

        // Dummy-DB-Funktionen – bitte durch echte Data Source ersetzen!
        async function findUserByEmail(email: string) {
          // TODO: Ersetze durch echten DB-Query, z.B. Supabase/Neon
            return null;
            }
            async function createUser({ name, email, password }: { name: string, email: string, password: string }) {
              // TODO: Insert in DB!
                return true;
                }

                export async function POST(req: NextRequest) {
                  const { name, email, password } = await req.json();
                    if (!name || !email || !password) {
                        return NextResponse.json({ error: "Alle Felder ausfüllen." }, { status: 400 });
                          }
                            const exist = await findUserByEmail(email);
                              if (exist) {
                                  return NextResponse.json({ error: "E-Mail existiert bereits." }, { status: 400 });
                                    }
                                      const hashed = await hashPassword(password);
                                        await createUser({ name, email, password: hashed });
                                          return NextResponse.json({ ok: true });
                                          }
