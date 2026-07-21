/**
 * Keep-Alive & Warmup mechanism for Render free-tier or spin-down platforms.
 *
 * Render spins down free web services after 15 minutes of inactivity.
 * By pinging our own /health endpoint every 14 minutes when RENDER_EXTERNAL_URL (or SELF_PING_URL)
 * is available, we keep the service actively awake and responsive.
 */
export declare function startKeepAlive(): void;
//# sourceMappingURL=keepAlive.d.ts.map