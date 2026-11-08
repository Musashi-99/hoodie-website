type Cart = { id: string; lines: string; updated_at: number };
type Session = { id: string; cart_id: string; status: string; created_at: number };
type Store = {
  carts: Map<string, Cart>;
  messages: { id: string; name: string; email: string; message: string; created_at: number }[];
  subscribers: Map<string, number>;
  sessions: Map<string, Session>;
};

const host = globalThis as typeof globalThis & { __vyrnStore?: Store };
const store: Store = (host.__vyrnStore ??= {
  carts: new Map(),
  messages: [],
  subscribers: new Map(),
  sessions: new Map(),
});

function prepare(sql: string) {
  const text = sql.replace(/\s+/g, " ").trim();
  return {
    bind(...args: unknown[]) {
      return {
        async first<T>(): Promise<T | null> {
          if (text.startsWith("SELECT lines FROM carts")) {
            const row = store.carts.get(String(args[0]));
            return (row ? { lines: row.lines } : null) as T | null;
          }
          if (text.startsWith("SELECT id FROM checkout_sessions")) {
            const row = store.sessions.get(String(args[0]));
            if (!row || row.cart_id !== args[1]) return null;
            return { id: row.id } as T;
          }
          return null;
        },
        async run() {
          if (text.startsWith("INSERT INTO carts")) {
            const id = String(args[0]);
            if (text.includes("ON CONFLICT") || !store.carts.has(id)) {
              store.carts.set(id, { id, lines: String(args[1]), updated_at: Number(args[2]) });
            }
          } else if (text.startsWith("INSERT INTO messages")) {
            store.messages.push({
              id: String(args[0]),
              name: String(args[1]),
              email: String(args[2]),
              message: String(args[3]),
              created_at: Number(args[4]),
            });
          } else if (text.startsWith("INSERT OR IGNORE INTO subscribers")) {
            const email = String(args[0]);
            if (!store.subscribers.has(email)) store.subscribers.set(email, Number(args[1]));
          } else if (text.startsWith("INSERT INTO checkout_sessions")) {
            store.sessions.set(String(args[0]), {
              id: String(args[0]),
              cart_id: String(args[1]),
              status: String(args[2]),
              created_at: Number(args[3]),
            });
          } else if (text.startsWith("UPDATE checkout_sessions")) {
            const row = store.sessions.get(String(args[1]));
            if (row) row.status = String(args[0]);
          }
          return { success: true };
        },
      };
    },
  };
}

export const env = {
  DB: { prepare },
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  COMMERCE_ENABLED: process.env.COMMERCE_ENABLED,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  ORDER_EMAIL_FROM: process.env.ORDER_EMAIL_FROM,
};
