import { useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, User, Video, VideoOff } from 'lucide-react';
import type { CallStatus, CallType, PeerInfo } from '../hooks/useWebRTC';

type Props = {
  status: CallStatus;
  callType: CallType;
  remotePeer: PeerInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOn: boolean;
  seconds: number;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
};

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const STATUS_LABEL: Record<CallStatus, string> = {
  idle: '',
  outgoing: 'A chamar...',
  incoming: 'Chamada a receber',
  connecting: 'A conectar...',
  active: 'Em chamada',
  ended: 'Chamada terminada',
  declined: 'Chamada recusada',
  missed: 'Chamada perdida',
  cancelled: 'Chamada cancelada',
  failed: 'Falha na chamada',
};

export default function CallModal(props: Props) {
  const {
    status, callType, remotePeer,
    localStream, remoteStream,
    muted, cameraOn, seconds,
    onAccept, onReject, onCancel, onEnd, onToggleMute, onToggleCamera,
  } = props;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (status === 'idle') return null;

  if (status === 'ended' || status === 'declined' || status === 'missed' || status === 'cancelled' || status === 'failed') {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white">
        <div className="w-28 h-28 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center text-4xl font-bold mb-4">
          {remotePeer?.avatar ? <img src={remotePeer.avatar} alt="" className="w-full h-full object-cover" /> : (remotePeer?.name?.[0]?.toUpperCase() ?? <User size={48} />)}
        </div>
        <p className="text-lg font-semibold">{remotePeer?.name ?? '...'}</p>
        <p className="text-gray-400 mt-1">{STATUS_LABEL[status]}</p>
      </div>
    );
  }

  const isVideoCall = callType === 'video';
  const showRemoteVideo = isVideoCall && remoteStream && status === 'active';
  const showLocalVideo = isVideoCall && localStream && (status === 'active' || status === 'connecting');

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center font-bold">
            {remotePeer?.avatar ? <img src={remotePeer.avatar} alt="" className="w-full h-full object-cover" /> : (remotePeer?.name?.[0]?.toUpperCase() ?? <User size={20} />)}
          </div>
          <div>
            <p className="font-semibold text-sm">{remotePeer?.name ?? '...'}</p>
            <p className="text-xs text-gray-400">
              {status === 'active' ? fmtDuration(seconds) : STATUS_LABEL[status]}
            </p>
          </div>
        </div>
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          {isVideoCall ? 'Vídeo' : 'Voz'}
        </span>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {showRemoteVideo && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <audio ref={remoteAudioRef} autoPlay className="hidden" />

        {!showRemoteVideo && (
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center text-5xl font-bold text-white mb-4">
              {remotePeer?.avatar ? <img src={remotePeer.avatar} alt="" className="w-full h-full object-cover" /> : (remotePeer?.name?.[0]?.toUpperCase() ?? <User size={56} />)}
            </div>
            <p className="text-white text-xl font-semibold">{remotePeer?.name ?? '...'}</p>
            <p className="text-gray-400 mt-1">{status === 'active' ? fmtDuration(seconds) : STATUS_LABEL[status]}</p>
          </div>
        )}

        {showLocalVideo && (
          <div className="absolute top-4 right-4 w-32 h-44 sm:w-40 sm:h-52 rounded-2xl overflow-hidden border-2 border-gray-700 bg-gray-900 shadow-lg z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraOn ? '' : 'bg-gray-900'}`}
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-500">
                <VideoOff size={24} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-8 flex items-center justify-center gap-4">
        {status === 'incoming' && (
          <>
            <button
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
              title="Recusar"
            >
              <PhoneOff size={26} />
            </button>
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors animate-pulse"
              title="Atender"
            >
              <Phone size={26} />
            </button>
          </>
        )}

        {status === 'outgoing' && (
          <button
            onClick={onCancel}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors animate-pulse"
            title="Cancelar"
          >
            <PhoneOff size={26} />
          </button>
        )}

        {(status === 'connecting' || status === 'active') && (
          <>
            <button
              onClick={onToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-white text-black' : 'bg-gray-800 text-white'}`}
              title={muted ? 'Ativar microfone' : 'Desativar microfone'}
            >
              {muted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {isVideoCall && (
              <button
                onClick={onToggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${!cameraOn ? 'bg-white text-black' : 'bg-gray-800 text-white'}`}
                title={cameraOn ? 'Desligar câmara' : 'Ligar câmara'}
              >
                {cameraOn ? <Video size={22} /> : <VideoOff size={22} />}
              </button>
            )}

            <button
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
              title="Desligar"
            >
              <PhoneOff size={26} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
