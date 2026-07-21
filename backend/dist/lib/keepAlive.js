"use strict";
/**
 * Keep-Alive & Warmup mechanism for Render free-tier or spin-down platforms.
 *
 * Render spins down free web services after 15 minutes of inactivity.
 * By pinging our own /health endpoint every 14 minutes when RENDER_EXTERNAL_URL (or SELF_PING_URL)
 * is available, we keep the service actively awake and responsive.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startKeepAlive = startKeepAlive;
function startKeepAlive() {
    // Render automatically sets RENDER_EXTERNAL_URL for web services (e.g. https://my-app.onrender.com)
    const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_PING_URL || process.env.KEEP_ALIVE_URL;
    if (!targetUrl) {
        if (process.env.NODE_ENV === 'production') {
            console.log('💡 [KeepAlive] No RENDER_EXTERNAL_URL or SELF_PING_URL set. To self-ping on Render, RENDER_EXTERNAL_URL is automatically used by Render, or set SELF_PING_URL.');
        }
        return;
    }
    const healthUrl = targetUrl.endsWith('/health') ? targetUrl : `${targetUrl.replace(/\/$/, '')}/health`;
    const intervalMs = 14 * 60 * 1000; // 14 minutes (just under Render's 15-minute sleep threshold)
    console.log(`💓 [KeepAlive] Initialized self-ping service targeting: ${healthUrl} (Interval: 14 mins)`);
    // Perform initial self-ping after 30 seconds to confirm readiness
    setTimeout(() => {
        pingServer(healthUrl);
    }, 30 * 1000);
    // Set recurring interval
    setInterval(() => {
        pingServer(healthUrl);
    }, intervalMs);
}
async function pingServer(url) {
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mini-ERP-KeepAlive-Bot/1.0' } });
        if (res.ok) {
            console.log(`💓 [KeepAlive] Self-ping successful at ${new Date().toISOString()} (${res.status})`);
        }
        else {
            console.warn(`⚠️ [KeepAlive] Self-ping returned non-OK status: ${res.status}`);
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`⚠️ [KeepAlive] Self-ping request failed: ${msg}`);
    }
}
//# sourceMappingURL=keepAlive.js.map