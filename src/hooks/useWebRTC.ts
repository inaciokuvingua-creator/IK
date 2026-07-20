import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type CallType = 'voice' | 'video';
export type CallStatus =
  | 'idle'
  | 'outgoing'        // estou a chamar
  | 'incoming'        // a receber chamada
  | 'connecting'      // resposta aceite, a negociar WebRTC
  | 'active'          // chamada em curso
  | 'ended'           // terminada normalmente
  | 'declined'        // recusada
  | 'missed'          // não atendida
  | 'failed'          // erro técnico
  | 'cancelled';      // quem chamou desligou antes de atender

export type PeerInfo = {
  id: string;
  name: string;
  avatar: string | null;
};

type SignalingMessage =
  | { type: 'invite'; callType: CallType; callId: string; caller: PeerInfo }
  | { type: 'accept'; callId: string }
  | { type: 'reject'; callId: string }
  | { type: 'cancel'; callId: string }
  | { type: 'end'; callId: string }
  | { type: 'offer'; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; callId: string; candidate: RTCIceCandidateInit };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

const CALL_TIMEOUT_MS = 35_000; // se ninguém atender em 35s, marca como perdida

export type WebRTCHookArgs = {
  conversationId: string | null;
  userId: string | null;
  otherUserId: string | null;
  onLogCall?: (entry: { callType: CallType; status: 'answered' | 'missed' | 'declined' | 'ended'; durationSec: number }) => void;
};

export function useWebRTC({ conversationId, userId, otherUserId, onLogCall }: WebRTCHookArgs) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType>('voice');
  const [callId, setCallId] = useState<string | null>(null);
  const [remotePeer, setRemotePeer] = useState<PeerInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [seconds, setSeconds] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const isCallerRef = useRef(false);
  const statusRef = useRef<CallStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const conversationIdRef = useRef<string | null>(conversationId);
  const userIdRef = useRef<string | null>(userId);
  const otherUserIdRef = useRef<string | null>(otherUserId);
  const onLogCallRef = useRef(onLogCall);

  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { otherUserIdRef.current = otherUserId; }, [otherUserId]);
  useEffect(() => { onLogCallRef.current = onLogCall; }, [onLogCall]);

  const setStatusBoth = (s: CallStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  // Subscribe ao canal de sinalização da conversa (broadcast)
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`call-signal:${conversationId}`, {
      config: { broadcast: { self: false }, presence: { key: userId ?? 'anon' } },
    });

    channel.on('broadcast', { event: 'signal' }, (msg: any) => {
      const data = msg.payload as SignalingMessage;
      if (!data || data.callId !== callIdRef.current) return;
      handleSignal(data);
    });

    channel.subscribe(async (state: string) => {
      if (state === 'SUBSCRIBED') {
        await channel.track({ user_id: userId });
      }
    });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, userId]);

  const sendSignal = (msg: SignalingMessage) => {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: msg });
  };

  const handleSignal = async (msg: SignalingMessage) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (msg.type === 'accept') {
        clearTimeout(timeoutRef.current!);
        setStatusBoth('connecting');
      } else if (msg.type === 'reject') {
        finalizeCall('declined');
      } else if (msg.type === 'cancel') {
        finalizeCall('cancelled');
      } else if (msg.type === 'end') {
        finalizeCall('ended');
      } else if (msg.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: 'answer', callId: msg.callId, sdp: answer });
      } else if (msg.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        setStatusBoth('active');
        startDurationTimer();
      } else if (msg.type === 'ice') {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch (e) { /* race */ }
      }
    } catch (e) {
      console.error('signal handle error', e);
    }
  };

  const startDurationTimer = () => {
    startedAtRef.current = Date.now();
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  };

  const stopTimers = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const closePeer = () => {
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    remoteStreamRef.current = null;
    setRemoteStream(null);
  };

  const finalizeCall = useCallback((finalStatus: CallStatus) => {
    stopTimers();
    closePeer();
    const duration = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0;
    const logStatus = finalStatus === 'ended' ? 'ended' : finalStatus === 'declined' ? 'declined' : finalStatus === 'missed' ? 'missed' : finalStatus === 'cancelled' ? 'missed' : 'ended';
    try { onLogCallRef.current?.({ callType: callType, status: logStatus as any, durationSec: duration }); } catch {}
    setCallId(null);
    callIdRef.current = null;
    isCallerRef.current = false;
    startedAtRef.current = null;
    setMuted(false);
    setCameraOn(true);
    setRemotePeer(null);
    setStatusBoth(finalStatus);
    // Limpa para idle depois de 2s para mostrar o estado final
    setTimeout(() => {
      if (statusRef.current === finalStatus) setStatusBoth('idle');
    }, 2200);
  }, [callType]);

  // Cria a RTCPeerConnection e os streams locais
  const createPeer = async (type: CallType, asCaller: boolean): Promise<RTCPeerConnection> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setMuted(false);
    setCameraOn(type === 'video');

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Local tracks
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // Remote stream
    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
      setRemoteStream(remote);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: 'ice', callId: callIdRef.current!, candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        if (statusRef.current !== 'active') {
          setStatusBoth('active');
          startDurationTimer();
        }
      } else if (st === 'failed' || st === 'disconnected') {
        if (statusRef.current === 'active' || statusRef.current === 'connecting') {
          // Tenta manter; se falhar mesmo, termina
          if (st === 'failed') finalizeCall('failed');
        }
      }
    };

    return pc;
  };

  // ── Ações públicas ────────────────────────────────────────────

  // Iniciar chamada (caller)
  const startCall = useCallback(async (type: CallType, peer: PeerInfo) => {
    if (!userIdRef.current || !conversationIdRef.current || statusRef.current !== 'idle') return;
    const id = crypto.randomUUID();
    callIdRef.current = id;
    setCallId(id);
    setCallType(type);
    setRemotePeer(peer);
    isCallerRef.current = true;
    setStatusBoth('outgoing');

    try {
      const pc = await createPeer(type, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ type: 'invite', callType: type, callId: id, caller: { id: userIdRef.current, name: peer.name, avatar: peer.avatar } });
      sendSignal({ type: 'offer', callId: id, sdp: offer });

      // Timeout: se não atenderem, desliga
      timeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'outgoing') {
          sendSignal({ type: 'end', callId: id });
          finalizeCall('missed');
        }
      }, CALL_TIMEOUT_MS);
    } catch (e) {
      console.error('start call error', e);
      alert('Não foi possível iniciar a chamada. Verifique as permissões de microfone/câmara.');
      finalizeCall('failed');
    }
  }, [finalizeCall]);

  // Receber convite (callee side) — chamado pelo listener quando chega 'invite'
  // Exposto para o componente poder mostrar o modal; a negociação acontece no accept.
  const receiveInvite = useCallback((invite: { callId: string; callType: CallType; caller: PeerInfo }) => {
    if (statusRef.current !== 'idle') {
      // Já está ocupado — recusa automaticamente
      sendSignal({ type: 'reject', callId: invite.callId });
      return;
    }
    callIdRef.current = invite.callId;
    setCallId(invite.callId);
    setCallType(invite.callType);
    setRemotePeer(invite.caller);
    isCallerRef.current = false;
    setStatusBoth('incoming');

    // Timeout de incoming: se não atender em 35s, marca perdida
    timeoutRef.current = setTimeout(() => {
      if (statusRef.current === 'incoming') {
        sendSignal({ type: 'end', callId: invite.callId });
        finalizeCall('missed');
      }
    }, CALL_TIMEOUT_MS);
  }, [finalizeCall]);

  // Aceitar chamada (callee)
  const acceptCall = useCallback(async () => {
    if (statusRef.current !== 'incoming') return;
    clearTimeout(timeoutRef.current!);
    setStatusBoth('connecting');
    sendSignal({ type: 'accept', callId: callIdRef.current! });

    try {
      const pc = await createPeer(callType, false);
      // A offer já chegou (ou vai chegar) via 'offer'; handleSignal trata setRemoteDescription
      // e gera answer. Se ainda não chegou, a answer é enviada quando chegar.
    } catch (e) {
      console.error('accept call error', e);
      alert('Não foi possível atender. Verifique as permissões de microfone/câmara.');
      finalizeCall('failed');
    }
  }, [callType, finalizeCall]);

  // Recusar chamada (callee)
  const rejectCall = useCallback(() => {
    if (statusRef.current !== 'incoming') return;
    sendSignal({ type: 'reject', callId: callIdRef.current! });
    finalizeCall('declined');
  }, [finalizeCall]);

  // Cancelar chamada (caller, antes de atenderem)
  const cancelCall = useCallback(() => {
    if (statusRef.current !== 'outgoing') return;
    sendSignal({ type: 'cancel', callId: callIdRef.current! });
    finalizeCall('cancelled');
  }, [finalizeCall]);

  // Terminar chamada em curso
  const endCall = useCallback(() => {
    if (statusRef.current === 'idle' || statusRef.current === 'ended') return;
    sendSignal({ type: 'end', callId: callIdRef.current! });
    finalizeCall('ended');
  }, [finalizeCall]);

  // Toggle microfone
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audio = stream.getAudioTracks()[0];
    if (!audio) return;
    audio.enabled = !audio.enabled;
    setMuted(!audio.enabled);
  }, []);

  // Toggle câmara
  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const video = stream.getVideoTracks()[0];
    if (!video) return;
    video.enabled = !video.enabled;
    setCameraOn(video.enabled);
  }, []);

  // Listener de convites (broadcast) — liga ao canal e mostra incoming
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;
    // Re-subscribe com handler que detecta 'invite' para o otherUserId→eu
    const handler = (msg: any) => {
      const data = msg.payload as SignalingMessage;
      if (!data) return;
      if (data.type === 'invite') {
        // só atende se for dirigido a mim (qualquer chamada na conversa chega a ambos)
        if (data.caller.id === userIdRef.current) return; // sou eu o chamador, ignoro o eco
        receiveInvite({ callId: data.callId, callType: data.callType, caller: data.caller });
      }
    };
    channel.on('broadcast', { event: 'invite' }, handler);
    return () => { channel.off('broadcast', { event: 'invite' }, handler as any); };
  }, [receiveInvite]);

  // Cleanup ao desmontar
  useEffect(() => () => {
    stopTimers();
    closePeer();
  }, []);

  return {
    status, callType, callId, remotePeer,
    localStream, remoteStream,
    muted, cameraOn, seconds,
    startCall, acceptCall, rejectCall, cancelCall, endCall,
    toggleMute, toggleCamera,
  };
}
