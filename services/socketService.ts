import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../constants/Config';
import { UserRole } from '../context/AuthContext';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'], // Ensure websocket for better mobile stability
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
    });

    // Register all common event forwarders
    const events = [
      'job:new', 'bid:new', 'job:assigned', 
      'bid:won', 'bid:lost', 'booking:new', 
      'booking:status', 'booking:accepted', 
      'booking:ongoing', 'booking:completed', 
      'booking:cancelled', 'chat:receive'
    ];

    events.forEach(event => {
      this.socket?.on(event, (data) => {
        console.log(`📩 Socket Event [${event}]:`, data);
        this.notify(event, data);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private notify(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
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
