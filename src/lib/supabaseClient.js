
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials missing! Check .env file.')
}

// ─────────────────────────────────────────────────────────────────────────────
// Cookie-based session storage for Supabase auth
//
// Why cookies instead of localStorage?
//   • Cookies with SameSite=Strict prevent CSRF attacks (localStorage doesn't)
//   • Cookies are scoped to the domain (same security model as localStorage
//     for XSS, but better CSRF posture)
//   • Persist across browser close/reopen indefinitely (1 year expiry)
//
// Why not HTTP-only cookies?
//   • In a pure SPA, JavaScript needs to read the access token to add it as
//     a Bearer header on API calls. HTTP-only cookies are invisible to JS,
//     so they only work in SSR setups (Next.js, etc.).
//
// Large-token handling:
//   • Supabase auth tokens (JWT + user object) are typically 2–3 KB of JSON.
//   • Browsers enforce a ~4 KB per-cookie limit.
//   • We split the value into 2800-char chunks and store each as its own
//     cookie (key, key.0, key.1, …) to stay safely under the limit.
//
// localStorage migration:
//   • First getItem checks if the key already exists in cookies.
//   • If not found, it looks in localStorage, migrates it to cookies, and
//     removes the localStorage entry — so existing logged-in users stay
//     logged in after this change ships.
// ─────────────────────────────────────────────────────────────────────────────

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds
const CHUNK_SIZE = 2800;                    // raw chars per chunk (encoded stays <4 KB)

/** Build the cookie attribute string based on the current environment */
const cookieAttrs = () => {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    return `; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict${secure}`;
};

/** Read a single cookie by exact key name (URI-decoded) */
function readCookie(key) {
    const prefix = `${key}=`;
    const entry = document.cookie.split('; ').find(c => c.startsWith(prefix));
    if (!entry) return null;
    try {
        return decodeURIComponent(entry.slice(prefix.length));
    } catch {
        return entry.slice(prefix.length);
    }
}

/** Write a single cookie (value should already be URI-encoded) */
function writeCookie(key, encodedValue) {
    document.cookie = `${key}=${encodedValue}${cookieAttrs()}`;
}

/** Expire (delete) a cookie */
function expireCookie(key) {
    document.cookie = `${key}=; path=/; max-age=0`;
}

/**
 * Custom storage adapter for the Supabase client.
 * Stores auth tokens in cookies instead of localStorage.
 * Each value may span multiple cookies if it exceeds CHUNK_SIZE characters.
 */
const cookieStorage = {
    getItem(key) {
        try {
            // 1. Try a direct single cookie
            const direct = readCookie(key);
            if (direct !== null) return direct;

            // 2. Try reassembled chunks (key.0, key.1, …)
            const chunks = [];
            for (let i = 0; ; i++) {
                const chunk = readCookie(`${key}.${i}`);
                if (chunk === null) break;
                chunks.push(chunk);
            }
            if (chunks.length > 0) return chunks.join('');

            // 3. Migration: if found in localStorage, move it to cookies
            const fromLocal = localStorage.getItem(key);
            if (fromLocal) {
                this.setItem(key, fromLocal);
                localStorage.removeItem(key);
                return fromLocal;
            }

            return null;
        } catch {
            // If cookies are unavailable (e.g. private mode restrictions),
            // fall back to localStorage silently.
            return localStorage.getItem(key);
        }
    },

    setItem(key, value) {
        try {
            // Clean up any previous storage for this key (single + all chunks)
            this.removeItem(key);

            if (value.length <= CHUNK_SIZE) {
                // Fits in a single cookie
                writeCookie(key, encodeURIComponent(value));
            } else {
                // Split into chunks; each chunk is individually encoded so we
                // never cut a multibyte sequence across a cookie boundary.
                for (let i = 0, offset = 0; offset < value.length; i++, offset += CHUNK_SIZE) {
                    writeCookie(`${key}.${i}`, encodeURIComponent(value.slice(offset, offset + CHUNK_SIZE)));
                }
            }
        } catch {
            localStorage.setItem(key, value);
        }
    },

    removeItem(key) {
        try {
            expireCookie(key);
            // Expire up to 20 potential chunks; more than enough for any token size
            for (let i = 0; i < 20; i++) {
                expireCookie(`${key}.${i}`);
            }
            // Also clean up the localStorage copy if it was left behind
            localStorage.removeItem(key);
        } catch { /* ignore */ }
    },
};

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
    auth: {
        storage: cookieStorage,
        persistSession: true,       // Keep session alive across browser restarts
        autoRefreshToken: true,     // Silently renew before expiry
        detectSessionInUrl: true,   // Support OAuth/magic-link callbacks
    },
})
