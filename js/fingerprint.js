/**
 * Browser fingerprint generator for vote deduplication.
 * Generates a hash from browser characteristics — not personally identifiable,
 * but consistent enough to detect duplicate votes from the same browser.
 */
const Fingerprint = (() => {
    async function generate() {
        const components = [
            screen.width,
            screen.height,
            screen.colorDepth,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            navigator.platform,
            navigator.language,
            navigator.hardwareConcurrency || 'unknown',
            getCanvasFingerprint()
        ];
        const raw = components.join('|');
        return await sha256(raw);
    }

    function getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('REAP fingerprint', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('REAP fingerprint', 4, 17);
            return canvas.toDataURL().slice(-50);
        } catch {
            return 'canvas-unavailable';
        }
    }

    async function sha256(message) {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    return { generate };
})();
