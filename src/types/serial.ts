/**
 * Types and interfaces for Arduino Uno Serial COM Port Communication & Oscilloscope
 */

// Extend window / navigator for Web Serial API
export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

export interface SerialOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

export interface SerialSignals {
  dataTerminalReady?: boolean;
  requestToSend?: boolean;
  break?: boolean;
}

export interface SerialPort {
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo(): SerialPortInfo;
  setSignals(signals: SerialSignals): Promise<void>;
  getSignals?(): Promise<{
    clearToSend: boolean;
    dataCarrierDetect: boolean;
    dataSetReady: boolean;
    ringIndicator: boolean;
  }>;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'simulated' | 'error';

export interface SerialConfig {
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  bufferSize: number;
  flowControl: 'none' | 'hardware';
  lineEndingTx: 'none' | '\n' | '\r' | '\r\n';
  dtr: boolean;
  rts: boolean;
  autoscroll: boolean;
  showTimestamps: boolean;
  displayMode: 'ascii' | 'hex';
}

export interface SerialLogEntry {
  id: string;
  timestamp: string;
  timeMs: number;
  direction: 'rx' | 'tx' | 'sys';
  text: string;
  rawHex: string;
  byteCount: number;
}

export interface ChannelConfig {
  id: number;
  name: string;
  color: string;
  visible: boolean;
  scale: number; // multiplier e.g. 1.0, 2.0
  offset: number; // vertical offset in volts/units
  inverted: boolean;
}

export interface TriggerConfig {
  mode: 'auto' | 'normal' | 'single';
  channel: number; // 0-indexed (CH1=0, CH2=1...)
  level: number; // voltage threshold in Volts
  edge: 'rising' | 'falling';
  coupling: 'DC' | 'AC' | 'HF-Reject';
  holdoff: number; // holdoff delay in ms
  armed?: boolean; // single trigger arm status
}

export type TriggerStatus = 'trig' | 'wait' | 'auto' | 'stop';

export type AdcConversionMode = 'auto' | 'adc1023_to_5V' | 'direct_volts';

export type VoltageScalePreset = '5V' | '3.3V' | '1023' | 'bipolar5V' | 'auto';

export interface ScopeTelemetry {
  vMax: number;
  vMin: number;
  vPp: number;
  vAvg: number;
  vRms: number;
  frequency: number; // in Hz
  period: number; // in ms
}

export interface ScopeSample {
  timestamp: number; // ms
  channels: number[]; // values in current scale (e.g. 0-5V or 0-1023)
}

export interface SerialStats {
  bytesReceived: number;
  bytesSent: number;
  packetsPerSec: number;
  samplesPerSec: number;
  errors: number;
  connectedSince: number | null;
}
