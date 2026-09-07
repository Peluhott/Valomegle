export type CallConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

// Callbacks that the WebRTCSession will invoke to communicate with the rest of the application.
interface WebRTCSessionCallbacks {
  onSendSignal(type: string, payload: unknown): void;
  onConnectionStateChange(state: CallConnectionState): void;
  onRemoteStream(stream: MediaStream): void;
  onError(error: Error): void;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

function isRTCSessionDescriptionInit(
  value: unknown,
): value is RTCSessionDescriptionInit {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === "string" && typeof candidate.sdp === "string"
  );
}

export class WebRTCSession {
  // peer connection which is basically the phone of rtc
  private pc: RTCPeerConnection | null = null;
  // your microphone stream
  private localStream: MediaStream | null = null;
  //array holding ice candidates that are received before the remote description is set
  // these are options for the connection to be established
  private pendingCandidates: RTCIceCandidateInit[] = [];

  //flag to indicate if the remote description has been set, which is important for adding ice candidates
  private remoteDescriptionSet = false;

  //tracks who you're in the call with
  private currentPeerUserId: string | null = null;

  //holds the objects of functions
  private callbacks: WebRTCSessionCallbacks;

  /**
   * Bumped by teardown() every time call state is torn down or superseded. startCall/answerCall
   * snapshot this before awaiting getUserMedia; if a hangUp/resetState races in while the
   * permission prompt is still open, the resumed continuation can tell it was superseded and
   * stop the now-orphaned stream instead of wiring it into a pc that's no longer current.
   */
  private generation = 0;

  constructor(callbacks: WebRTCSessionCallbacks) {
    this.callbacks = callbacks;
  }

  async startCall(targetUserId: string): Promise<void> {
    this.resetState(targetUserId);
    const myGeneration = this.generation;

    let acquiredStream: MediaStream | null = null;
    try {
      const stream = await this.acquireLocalStream();
      acquiredStream = stream;

      if (this.generation !== myGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        if (this.localStream === stream) this.localStream = null;
        return;
      }

      const pc = this.pc;
      if (!pc) return;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.callbacks.onSendSignal("webrtc-offer", offer);
    } catch (error) {
      this.handleNegotiationFailure(error, acquiredStream);
    }
  }

  async answerCall(
    fromUserId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    this.resetState(fromUserId);
    const myGeneration = this.generation;

    let acquiredStream: MediaStream | null = null;
    try {
      const stream = await this.acquireLocalStream();
      acquiredStream = stream;

      if (this.generation !== myGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        if (this.localStream === stream) this.localStream = null;
        return;
      }

      const pc = this.pc;
      if (!pc) return;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(offer);
      this.remoteDescriptionSet = true;
      await this.flushPendingCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.callbacks.onSendSignal("webrtc-answer", answer);
    } catch (error) {
      this.handleNegotiationFailure(error, acquiredStream);
    }
  }

  async handleAnswer(
    fromUserId: string,
    answer: RTCSessionDescriptionInit,
  ): Promise<void> {
    if (fromUserId !== this.currentPeerUserId) return;
    if (!isRTCSessionDescriptionInit(answer)) return;
    if (!this.pc) return;

    try {
      await this.pc.setRemoteDescription(answer);
      this.remoteDescriptionSet = true;
      await this.flushPendingCandidates();
    } catch (error) {
      this.callbacks.onError(
        error instanceof Error
          ? error
          : new Error("Failed to apply remote answer"),
      );
    }
  }

  async handleIceCandidate(
    fromUserId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    if (fromUserId !== this.currentPeerUserId) return;
    if (!this.pc) return;

    if (this.remoteDescriptionSet) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch (error) {
        this.callbacks.onError(
          error instanceof Error
            ? error
            : new Error("Failed to add ICE candidate"),
        );
      }
    } else {
      this.pendingCandidates.push(candidate);
    }
  }

  setMicMuted(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => (track.enabled = !muted));
  }

  hangUp(): void {
    if (this.pc === null) return;

    this.teardown();

    this.callbacks.onConnectionStateChange("disconnected");
  }

  private resetState(peerUserId: string): void {
    this.teardown();
    this.currentPeerUserId = peerUserId;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (this.pc !== pc) return;
      if (event.candidate && this.currentPeerUserId) {
        this.callbacks.onSendSignal("webrtc-ice-candidate", event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.pc !== pc) return;
      switch (pc.connectionState) {
        case "new":
          this.callbacks.onConnectionStateChange("connecting");
          break;
        case "connecting":
          this.callbacks.onConnectionStateChange("connecting");
          break;
        case "connected":
          this.callbacks.onConnectionStateChange("connected");
          break;
        case "disconnected":
          this.callbacks.onConnectionStateChange("disconnected");
          break;
        case "failed":
          this.callbacks.onConnectionStateChange("failed");
          break;
        case "closed":
          this.callbacks.onConnectionStateChange("disconnected");
          break;
      }
    };

    pc.ontrack = (event) => {
      if (this.pc !== pc) return;
      this.callbacks.onRemoteStream(event.streams[0]);
    };

    this.pc = pc;
  }

  private async acquireLocalStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.localStream = stream;
      return stream;
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") {
        throw new Error("Microphone permission was denied", { cause: error });
      }
      throw new Error(
        `Could not access microphone: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  private async flushPendingCandidates(): Promise<void> {
    if (!this.pc) return;
    const candidates = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of candidates) {
      await this.pc.addIceCandidate(candidate);
    }
  }

  private handleNegotiationFailure(
    error: unknown,
    acquiredStream: MediaStream | null,
  ): void {
    const peerUserId = this.currentPeerUserId;

    acquiredStream?.getTracks().forEach((track) => track.stop());
    this.teardown();

    if (peerUserId) {
      this.callbacks.onSendSignal("webrtc-hangup", {});
    }

    this.callbacks.onError(
      error instanceof Error ? error : new Error("WebRTC negotiation failed"),
    );
    this.callbacks.onConnectionStateChange("failed");
  }

  /** Full, consistent teardown of call state. Does not fire any callbacks. */
  private teardown(): void {
    this.pc?.close();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.pendingCandidates = [];
    this.remoteDescriptionSet = false;
    this.currentPeerUserId = null;
    this.pc = null;
    this.localStream = null;
    this.generation++;
  }
}
