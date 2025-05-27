declare module 'smtp-server' {
  import { EventEmitter } from 'events';
  import { TLSSocket } from 'tls';

  export interface SMTPServerAddress {
    address: string;
    args?: any;
  }

  export interface SMTPServerSession {
    id: string;
    remoteAddress: string;
    clientHostname?: string;
    openingCommand?: string;
    hostNameAppearsAs?: string;
    envelope?: {
      mailFrom?: SMTPServerAddress;
      rcptTo?: SMTPServerAddress[];
    };
    secure?: boolean;
    socket?: TLSSocket;
  }

  export interface SMTPServerOptions {
    secure?: boolean;
    authOptional?: boolean;
    hideSTARTTLS?: boolean;
    banner?: string;
    tls?: {
      key: Buffer;
      cert: Buffer;
    };
    onConnect?: (session: SMTPServerSession, callback: (err?: Error) => void) => void;
    onMailFrom?: (address: SMTPServerAddress, session: SMTPServerSession, callback: (err?: Error) => void) => void;
    onRcptTo?: (address: SMTPServerAddress, session: SMTPServerSession, callback: (err?: Error) => void) => void;
    onData?: (stream: NodeJS.ReadableStream, session: SMTPServerSession, callback: (err?: Error) => void) => void;
  }

  export class SMTPServer extends EventEmitter {
    constructor(options?: SMTPServerOptions);
    listen(port: number, hostname?: string, callback?: () => void): void;
    close(callback?: (err?: Error) => void): void;
  }
} 