type MicAccess = { ok: true } | { ok: false; message: string };

/**
 * Verifies the browser will give us the microphone, prompting for permission if
 * needed. Call this while the tab is focused (e.g. on a "Join queue" click) so
 * the permission prompt can actually appear — once granted it persists for the
 * origin, so the later getUserMedia in WebRTCSession succeeds without a prompt.
 */
export async function ensureMicAccess(): Promise<MicAccess> {
    if (!navigator.mediaDevices?.getUserMedia) {
        return {
            ok: false,
            message:
                'Microphone needs a secure context — open the app at http://localhost, not an IP address.',
        };
    }

    // Fast path: if already granted, don't turn the mic on just to check.
    // permissions.query for 'microphone' isn't supported everywhere, hence the guard.
    try {
        const status = await navigator.permissions?.query({
            name: 'microphone' as PermissionName,
        });
        if (status?.state === 'granted') return { ok: true };
        if (status?.state === 'denied') {
            return {
                ok: false,
                message:
                    "Microphone access is blocked. Enable it in your browser's site settings, then try again.",
            };
        }
    } catch {
        // Permissions API doesn't cover 'microphone' here — fall through to the prompt.
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        return { ok: true };
    } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            return { ok: false, message: 'No microphone found. Connect one and try again.' };
        }
        return {
            ok: false,
            message: 'Microphone access is required to join. Allow it and try again.',
        };
    }
}
