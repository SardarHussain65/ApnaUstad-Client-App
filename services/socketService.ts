import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../constants/Config';

class SocketService {
  private socket: Socket | null = null;
  private currentToken: string | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private registeredSocketEvents: Set<string> = new Set();

  connect(token: string) {
    if (this.socket && this.socket.connected && this.currentToken === token) {
      return;
    }

    // Clean up old socket if token changed or disconnected instance exists
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (e) {}
      this.socket = null;
    }

    this.currentToken = token;
    this.registeredSocketEvents.clear();

    this.socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback gracefully if websocket blocked
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
      this.notify('socket:connected', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.notify('socket:disconnected', { reason });
    });

    this.socket.io.on('reconnect', (attempt) => {
      console.log('🔌 Socket reconnected after attempt:', attempt);
      this.notify('socket:reconnected', { attempt });
    });

    this.socket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
    });

    // Register all common event forwarders
    const defaultEvents = [
      'job:new', 'job:cancelled', 'job:status', 'job:assigned', 'job:auto_assigned', 'job:created',
      'bid:new', 'bid:submitted', 'bid:withdrawn', 'bid:won', 'bid:lost', 'bid:rejected', 'bid:deleted', 'bid:updated',
      'booking:new', 'booking:status', 'booking:accepted', 
      'booking:ongoing', 'booking:completed', 
      'booking:cancelled', 'booking:paid',
      'booking:price_increase_requested', 'booking:price_increase_approved',
      'booking:price_increase_rejected', 'booking:price_updated',
      'chat:receive', 'worker:location', 'notification:new',
      'worker:verified', 'worker:updated', 'user:updated',
      'wallet:updated', 'wallet:topup_updated', 'wallet:topup_approved', 'wallet:topup_rejected'
    ];

    // Combine default events with any dynamically registered listener keys
    const allEventsToListen = new Set([...defaultEvents, ...this.listeners.keys()]);

    allEventsToListen.forEach(event => {
      this.attachSocketListener(event);
    });
  }

  private attachSocketListener(event: string) {
    if (!this.socket || this.registeredSocketEvents.has(event) || event.startsWith('socket:')) {
      return;
    }
    this.registeredSocketEvents.add(event);
    this.socket.on(event, (data) => {
      console.log(`📩 Socket Event [${event}]:`, data);
      this.notify(event, data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentToken = null;
      this.registeredSocketEvents.clear();
    }
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    // Dynamically attach socket listener if socket is active
    if (this.socket) {
      this.attachSocketListener(event);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  notify(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in listener for event [${event}]:`, err);
      }
    });
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`⚠️ Cannot emit [${event}], socket not connected`);
    }
  }
}

export const socketService = new SocketService();
