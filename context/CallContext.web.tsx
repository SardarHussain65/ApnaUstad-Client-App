import React, { createContext, useContext, useState } from 'react';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'reconnecting' | 'ended';

export interface StartCallOptions {
  bookingId: string;
  recipientName?: string;
  recipientAvatar?: string;
  recipientRole?: string;
}

export interface CallContextType {
  status: CallStatus;
  startCall: (options: StartCallOptions) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  isMuted: boolean;
  isSpeakerOn: boolean;
  callDurationSeconds: number;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status] = useState<CallStatus>('idle');

  return (
    <CallContext.Provider
      value={{
        status,
        startCall: async () => {},
        acceptCall: async () => {},
        rejectCall: () => {},
        endCall: () => {},
        toggleMute: () => {},
        toggleSpeaker: () => {},
        isMuted: false,
        isSpeakerOn: false,
        callDurationSeconds: 0,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useVoiceCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useVoiceCall must be used within a CallProvider');
  }
  return context;
};
