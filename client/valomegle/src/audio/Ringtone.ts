const RING_LOW_HZ = 440;
const RING_HIGH_HZ = 480;
const RING_ON_SECONDS = 1;
const RING_OFF_SECONDS = 3;
const RING_PEAK_GAIN = 0.15;
const RING_FADE_SECONDS = 0.05;

/**
 * Synthesizes a classic dual-tone phone ring cadence with the Web Audio API so
 * no binary asset is needed. One instance serves both the caller's ringback and
 * the callee's ringtone; the two never sound at the same time on one client.
 */
export class Ringtone {
    private audioContext: AudioContext | null = null;
    private gainNode: GainNode | null = null;
    private oscillators: OscillatorNode[] = [];
    private loopTimerId: number | null = null;
    private playing = false;

    start(): void {
        if (this.playing) return;
        this.playing = true;

        if (!this.audioContext) {
            this.audioContext = new AudioContext();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 0;
            this.gainNode.connect(this.audioContext.destination);
        }

        // Autoplay policy can suspend the context until the page sees a user
        // gesture; ringing is best-effort, so a rejected resume() is ignored.
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => undefined);
        }

        this.ringBurst();
        this.loopTimerId = window.setInterval(
            () => this.ringBurst(),
            (RING_ON_SECONDS + RING_OFF_SECONDS) * 1000,
        );
    }

    stop(): void {
        this.playing = false;

        if (this.loopTimerId !== null) {
            clearInterval(this.loopTimerId);
            this.loopTimerId = null;
        }

        this.stopOscillators();

        if (this.gainNode && this.audioContext) {
            this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
            this.gainNode.gain.value = 0;
        }
    }

    private ringBurst(): void {
        const audioContext = this.audioContext;
        const gainNode = this.gainNode;
        if (!audioContext || !gainNode) return;

        const startTime = audioContext.currentTime;
        const endTime = startTime + RING_ON_SECONDS;

        gainNode.gain.cancelScheduledValues(startTime);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(RING_PEAK_GAIN, startTime + RING_FADE_SECONDS);
        gainNode.gain.setValueAtTime(RING_PEAK_GAIN, endTime - RING_FADE_SECONDS);
        gainNode.gain.linearRampToValueAtTime(0, endTime);

        this.stopOscillators();
        this.oscillators = [RING_LOW_HZ, RING_HIGH_HZ].map((frequency) => {
            const oscillator = audioContext.createOscillator();
            oscillator.frequency.value = frequency;
            oscillator.connect(gainNode);
            oscillator.start(startTime);
            oscillator.stop(endTime);
            return oscillator;
        });
    }

    private stopOscillators(): void {
        for (const oscillator of this.oscillators) {
            // stop() throws if the oscillator was never started; it is always
            // started here, but a burst may have already ended on its own.
            try {
                oscillator.stop();
            } catch {
                // Already finished — nothing to stop.
            }
            oscillator.disconnect();
        }
        this.oscillators = [];
    }
}
