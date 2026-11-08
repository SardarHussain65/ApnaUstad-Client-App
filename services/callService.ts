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
};

