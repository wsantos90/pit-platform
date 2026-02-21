import { createBrowserClient } from "@supabase/ssr";

type SameSite = boolean | "lax" | "strict" | "none";

type CookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: SameSite;
  secure?: boolean;
};

type CreateClientOptions = {
  sessionOnly?: boolean;
};

function readAllCookies() {
  if (typeof document === "undefined" || !document.cookie) {
    return [];
  }

  return document.cookie.split(";").map((entry) => {
    const separatorIndex = entry.indexOf("=");
    const rawName = separatorIndex >= 0 ? entry.slice(0, separatorIndex) : entry;
    const rawValue = separatorIndex >= 0 ? entry.slice(separatorIndex + 1) : "";

    return {
      name: decodeURIComponent(rawName.trim()),
      value: decodeURIComponent(rawValue.trim()),
    };
  });
}

function normalizeSameSite(value: SameSite) {
  if (typeof value === "boolean") {
    return value ? "Strict" : "Lax";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function serializeCookie(name: string, value: string, options: CookieOptions) {
  const segments = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }
  if (options.path) {
    segments.push(`Path=${options.path}`);
  }
  if (options.expires) {
    segments.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.httpOnly) {
    segments.push("HttpOnly");
  }
  if (options.secure) {
    segments.push("Secure");
  }
  if (options.sameSite) {
    segments.push(`SameSite=${normalizeSameSite(options.sameSite)}`);
  }

  return segments.join("; ");
}

function createSessionOnlyCookiesAdapter() {
  return {
    getAll: () => readAllCookies(),
    setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
      cookies.forEach(({ name, value, options }) => {
        const isRemovalCookie = options.maxAge === 0 || value === "";
        const normalizedOptions = isRemovalCookie
          ? options
          : {
              ...options,
              maxAge: undefined,
              expires: undefined,
            };

        document.cookie = serializeCookie(name, value, normalizedOptions);
      });
    },
  };
}

/**
 * Cliente Supabase para uso no browser.
 * Quando `sessionOnly` é true, a sessão expira ao fechar o navegador.
 */
export function createClient(options?: CreateClientOptions) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options?.sessionOnly
      ? {
          isSingleton: false,
          cookies: createSessionOnlyCookiesAdapter(),
        }
      : undefined
  );
}
