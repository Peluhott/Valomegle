import { useEffect, useRef, useState } from 'react';

export type MicLevelStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export function useMicLevel(enabled: boolean) {
    const [level, setLevel] = useState(0);
    const [status, setStatus] = useState<MicLevelStatus>('requesting');
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        // When disabled, run no capture; the cleanup from the previous enabled run
        // has already released the mic. The returned values are derived below.
        if (!enabled) return;

        let cancelled = false;
        let stream: MediaStream | null = null;
        let audioContext: AudioContext | null = null;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((mediaStream) => {
                if (cancelled) {
                    mediaStream.getTracks().forEach((track) => track.stop());
                    return;
                }
                stream = mediaStream;
                audioContext = new AudioContext();
                const source = audioContext.createMediaStreamSource(mediaStream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);

                const data = new Uint8Array(analyser.frequencyBinCount);
                const tick = () => {
                    analyser.getByteTimeDomainData(data);
                    let sumSquares = 0;
                    for (let i = 0; i < data.length; i++) {
                        const normalized = (data[i] - 128) / 128;
                        sumSquares += normalized * normalized;
                    }
                    const rms = Math.sqrt(sumSquares / data.length);
                    const quantized = Math.round(Math.min(1, rms * 4) * 20) / 20;
                    setLevel((prev) => (prev === quantized ? prev : quantized));
                    frameRef.current = requestAnimationFrame(tick);
                };
                frameRef.current = requestAnimationFrame(tick);
                setStatus('granted');
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                setStatus(error instanceof Error && error.name === 'NotAllowedError' ? 'denied' : 'error');
            });

        return () => {
            cancelled = true;
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            stream?.getTracks().forEach((track) => track.stop());
            audioContext?.close();
        };
    }, [enabled]);

    if (!enabled) return { level: 0, status: 'idle' as MicLevelStatus };
    return { level, status };
}
