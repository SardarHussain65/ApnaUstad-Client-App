import api from './api';

export interface InitiateCallResponse {
  channelName: string;
  token: string;
  appId: string;
  uid: number;
  bookingId: string;
  caller: {
    id: string;
    type: 'user' | 'worker';
    name: string;
    avatar: string;
  };
  recipient: {
    id: string;
    type: 'user' | 'worker';
    name: string;
    avatar: string;
  };
}

export interface CallTokenResponse {
  channelName: string;
  token: string;
  appId: string;
  uid: number;
}

export interface ActiveCallSession {
  bookingId: string;
  channelName: string;
  callerId: string;
  callerType: 'user' | 'worker';
  callerName: string;
  callerAvatar?: string;
  recipientId: string;
  recipientType: 'user' | 'worker';
  status: 'ringing' | 'connected' | 'ended';
  isCaller: boolean;
  createdAt: number;
}

export const callService = {
  /**
   * Request Agora token and session information to start an in-app voice call
   */
  async initiateCall(bookingId: string): Promise<InitiateCallResponse> {
    try {
      console.log(`[CallService] Calling POST ${api.defaults.baseURL}/calls/initiate with bookingId:`, bookingId);
      const response = await api.post('/calls/initiate', { bookingId });
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to initiate call');
      }
      return response.data.data;
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message;
      const status = err?.response?.status;
      console.warn(`[CallService] initiateCall error: status=${status}, message=${backendMessage || err.message}`);
      throw new Error(backendMessage || err?.message || 'Failed to initiate call');
    }
  },

  /**
   * Fetch Agora token to join an ongoing booking call (for the recipient)
   */
  async getCallToken(bookingId: string): Promise<CallTokenResponse> {
    try {
      const response = await api.get(`/calls/token/${bookingId}`);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch call token');
      }
      return response.data.data;
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message;
      const status = err?.response?.status;
      console.warn(`[CallService] getCallToken error: status=${status}, message=${backendMessage || err.message}`);
      throw new Error(backendMessage || err?.message || 'Failed to fetch call token');
    }
  },

  /**
   * Check if there is an active ongoing or ringing call session on the server
   */
  async getActiveCallSession(): Promise<ActiveCallSession | null> {
    try {
      const response = await api.get('/calls/active-session');
      if (response.data?.success && response.data?.hasActiveCall) {
        return response.data.call;
      }
      return null;
    } catch (err: any) {
      console.warn('[CallService] getActiveCallSession error:', err?.response?.data?.message || err?.message);
      return null;
    }
  },

  /**
   * End or cancel an active call session via REST API fallback
   */
  async endCallSession(bookingId: string): Promise<void> {
    try {
      await api.post('/calls/end', { bookingId });
    } catch (err: any) {
      console.warn('[CallService] endCallSession error:', err?.response?.data?.message || err?.message);
    }
  },
};


