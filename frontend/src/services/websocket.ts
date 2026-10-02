type EventCallback = (data: any) => void;

function getOrCreateClientId(): string {
  try {
    let id = sessionStorage.getItem('sentinel_client_id');
    if (!id) {
      id = `client-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('sentinel_client_id', id);
    }
    return id;
  } catch {
    return `client-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export class ExerciseWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  public exerciseId: string;
  public role: string;
  public participantId: string;
  public displayName: string;
  public clientId: string;
  private shouldReconnect: boolean = true;
  private reconnectAttempts: number = 0;
  private reconnectTimer: any = null;
  private outgoingQueue: string[] = [];
  public isConnected: boolean = false;

  constructor(
    exerciseId: string,
    role: string,
    participantId: string,
    displayName: string,
    clientId?: string
  ) {
    this.exerciseId = exerciseId;
    this.role = role;
    this.participantId = participantId;
    this.displayName = displayName;
    this.clientId = clientId || getOrCreateClientId();
  }

  connect() {
    this.shouldReconnect = true;
    const wsEnv = import.meta.env.VITE_WS_URL;
    const queryParams = `role=${encodeURIComponent(this.role)}&participant_id=${encodeURIComponent(
      this.participantId
    )}&display_name=${encodeURIComponent(this.displayName)}&client_id=${encodeURIComponent(this.clientId)}`;

    let url: string;
    if (wsEnv && wsEnv.trim()) {
      const cleanWs = wsEnv.trim().replace(/\/+$/, '');
      url = `${cleanWs}/ws/exercises/${encodeURIComponent(this.exerciseId)}?${queryParams}`;
    } else {
      const baseHttp = (
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_BACKEND_URL ||
        'http://localhost:8000'
      ).trim().replace(/\/+$/, '');
      const wsProtocol = baseHttp.startsWith('https') ? 'wss:' : 'ws:';
      const host = baseHttp.replace(/^https?:\/\//, '');
      url = `${wsProtocol}//${host}/ws/exercises/${encodeURIComponent(this.exerciseId)}?${queryParams}`;
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connection_status', { status: 'connected', clientId: this.clientId });

        // Flush queued outgoing messages
        while (this.outgoingQueue.length > 0) {
          const queued = this.outgoingQueue.shift();
          if (queued) {
            this.ws?.send(queued);
          }
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type) {
            this.emit(data.type, data);
          }
          this.emit('*', data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.emit('connection_status', { status: 'disconnected', code: event.code });
        if (this.shouldReconnect) {
          // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          this.reconnectAttempts++;
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error observed:', err);
        this.emit('connection_status', { status: 'error', error: err });
      };
    } catch (err) {
      console.error('WebSocket connection failed to initialize:', err);
    }
  }

  send(type: string, payload: any = {}): boolean {
    const packet = JSON.stringify({ type, payload });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(packet);
      return true;
    } else {
      // Buffer packet to send when reconnected
      this.outgoingQueue.push(packet);
      return false;
    }
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => fn(data));
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.outgoingQueue = [];
  }
}
