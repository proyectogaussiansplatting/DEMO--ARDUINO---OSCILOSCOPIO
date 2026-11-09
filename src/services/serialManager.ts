/**
 * Serial Port Communication Manager for Arduino Uno (Windows COM Ports)
 * Supports native Web Serial API + Realistic Arduino Uno Simulator engine
 */

import {
  AdcConversionMode,
  ConnectionState,
  ScopeSample,
  SerialConfig,
  SerialLogEntry,
  SerialPort,
  SerialStats,
} from '../types/serial';

export type LogCallback = (entry: SerialLogEntry) => void;
export type SampleCallback = (sample: ScopeSample) => void;
export type StateCallback = (state: ConnectionState, message?: string) => void;
export type StatsCallback = (stats: SerialStats) => void;

export type SimulatorWaveform = 'sine' | 'square' | 'triangle' | 'potentiometer' | 'ecg' | 'multichannel';

export class SerialManager {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private isReading = false;
  private state: ConnectionState = 'disconnected';

  // Stats
  private stats: SerialStats = {
    bytesReceived: 0,
    bytesSent: 0,
    packetsPerSec: 0,
    samplesPerSec: 0,
    errors: 0,
    connectedSince: null,
  };
  private packetCountLastSec = 0;
  private sampleCountLastSec = 0;
  private statsInterval: number | null = null;

  // Simulator state
  private isSimulating = false;
  private simTimer: number | null = null;
  private simWaveform: SimulatorWaveform = 'multichannel';
  private simFrequency = 2.0; // Hz
  private simPhase = 0;
  private simPotValue = 512;
  private simLedState = false;
  private adcConversionMode: AdcConversionMode = 'auto';

  // Incoming text buffer for line splitting
  private rxBuffer = '';

  // Callbacks
  private onLog: LogCallback = () => {};
  private onSample: SampleCallback = () => {};
  private onStateChange: StateCallback = () => {};
  private onStats: StatsCallback = () => {};

  constructor() {
    this.startStatsTimer();
  }

  public setCallbacks(
    onLog: LogCallback,
    onSample: SampleCallback,
    onStateChange: StateCallback,
    onStats: StatsCallback
  ) {
    this.onLog = onLog;
    this.onSample = onSample;
    this.onStateChange = onStateChange;
    this.onStats = onStats;
  }

  public setAdcConversionMode(mode: AdcConversionMode) {
    this.adcConversionMode = mode;
  }

  public getAdcConversionMode(): AdcConversionMode {
    return this.adcConversionMode;
  }

  public isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public getStats(): SerialStats {
    return { ...this.stats };
  }

  public setSimWaveform(waveform: SimulatorWaveform, frequency = 2.0) {
    this.simWaveform = waveform;
    this.simFrequency = frequency;
  }

  public getSimWaveform(): SimulatorWaveform {
    return this.simWaveform;
  }

  private setState(state: ConnectionState, message?: string) {
    this.state = state;
    this.onStateChange(state, message);
  }

  private startStatsTimer() {
    if (typeof window === 'undefined') return;
    this.statsInterval = window.setInterval(() => {
      this.stats.packetsPerSec = this.packetCountLastSec;
      this.stats.samplesPerSec = this.sampleCountLastSec;
      this.packetCountLastSec = 0;
      this.sampleCountLastSec = 0;
      this.onStats({ ...this.stats });
    }, 1000);
  }

  public isInIframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }

  /**
   * Get previously paired/authorized COM ports
   */
  public async getAuthorizedPorts(): Promise<SerialPort[]> {
    if (!this.isWebSerialSupported()) return [];
    try {
      const serialNav = (navigator as unknown as { serial: { getPorts: () => Promise<SerialPort[]> } }).serial;
      return await serialNav.getPorts();
    } catch (err) {
      console.warn('Error reading authorized ports:', err);
      return [];
    }
  }

  /**
   * Connect to an already authorized SerialPort
   */
  public async connectToPort(targetPort: SerialPort, config: SerialConfig): Promise<{ success: boolean; message: string }> {
    try {
      this.disconnect();
      this.port = targetPort;
      await this.port.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity,
        bufferSize: config.bufferSize,
        flowControl: config.flowControl,
      });

      try {
        await this.port.setSignals({
          dataTerminalReady: config.dtr,
          requestToSend: config.rts,
        });
      } catch {
        // signals not supported by some drivers
      }

      this.stats.connectedSince = Date.now();
      this.stats.bytesReceived = 0;
      this.stats.bytesSent = 0;
      this.stats.errors = 0;
      this.setState('connected', `Conectado al puerto COM @ ${config.baudRate} baud`);

      this.logSystem(`[SISTEMA] Conexión abierta en puerto COM`);
      this.logSystem(`[PARÁMETROS] ${config.baudRate} baud, ${config.dataBits} bits, paridad ${config.parity}, ${config.stopBits} stop bit(s)`);

      this.startReading();
      return { success: true, message: 'Conectado exitosamente' };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.setState('error', `Error al abrir puerto COM: ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Request COM Port from Windows and connect
   */
  public async connectSerial(config: SerialConfig): Promise<{
    success: boolean;
    reason?: 'iframe_blocked' | 'access_denied' | 'unsupported_browser' | 'cancelled' | 'unknown';
    message: string;
    rawError?: string;
  }> {
    if (!this.isWebSerialSupported()) {
      const msg = 'Tu navegador no soporta Web Serial API. Usa Google Chrome, Microsoft Edge u Opera en Windows.';
      this.setState('error', msg);
      return { success: false, reason: 'unsupported_browser', message: msg };
    }

    try {
      this.setState('connecting', 'Selecciona el puerto COM de tu Arduino Uno en la ventana emergente de Windows...');
      
      // Prompt user to pick COM port (Windows COM port picker)
      const serialNav = (navigator as unknown as { serial: { requestPort: (options?: unknown) => Promise<SerialPort> } }).serial;
      this.port = await serialNav.requestPort();

      await this.port.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity,
        bufferSize: config.bufferSize,
        flowControl: config.flowControl,
      });

      // Apply DTR / RTS signals if supported
      try {
        await this.port.setSignals({
          dataTerminalReady: config.dtr,
          requestToSend: config.rts,
        });
      } catch {
        // Signals might not be supported on all drivers, continue
      }

      this.stats.connectedSince = Date.now();
      this.stats.bytesReceived = 0;
      this.stats.bytesSent = 0;
      this.stats.errors = 0;
      this.setState('connected', `Conectado al puerto COM @ ${config.baudRate} baud`);

      this.logSystem(`[SISTEMA] Conexión abierta exitosamente en puerto COM`);
      this.logSystem(`[PARÁMETROS] ${config.baudRate} baud, ${config.dataBits} bits, paridad ${config.parity}, ${config.stopBits} stop bit(s)`);

      this.startReading();
      return { success: true, message: 'Conectado al puerto COM' };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isIframe = this.isInIframe();

      if (
        errorMsg.includes('Permissions policy') ||
        errorMsg.includes('disallowed by permissions policy') ||
        errorMsg.includes('SecurityError') ||
        errorMsg.includes('sandboxed') ||
        (isIframe && errorMsg.includes('Failed to execute'))
      ) {
        const msg = 'El navegador bloquea el acceso a puertos COM dentro del marco embebido (iframe). Abre la aplicación en una pestaña independiente.';
        this.setState('error', msg);
        this.logSystem(`[ERROR DE SEGURIDAD] Acceso a puerto COM bloqueado por política de iframe.`);
        return { success: false, reason: 'iframe_blocked', message: msg, rawError: errorMsg };
      }

      if (errorMsg.includes('No port selected') || errorMsg.includes('canceled') || errorMsg.includes('cancelled')) {
        this.setState('disconnected', 'Selección de puerto COM cancelada');
        return { success: false, reason: 'cancelled', message: 'Selección de puerto COM cancelada', rawError: errorMsg };
      }

      if (errorMsg.includes('Failed to open') || errorMsg.includes('Access denied') || errorMsg.includes('busy')) {
        const msg = 'Acceso denegado al puerto COM en Windows. Asegúrate de cerrar el Monitor Serie del Arduino IDE o cualquier otro programa que esté usando el puerto COM.';
        this.setState('error', msg);
        this.logSystem(`[ERROR PUERTO COM] ${msg}`);
        return { success: false, reason: 'access_denied', message: msg, rawError: errorMsg };
      }

      const genericMsg = `Error al conectar puerto COM: ${errorMsg}`;
      this.setState('error', genericMsg);
      this.logSystem(`[ERROR COM] ${genericMsg}`);
      return { success: false, reason: 'unknown', message: genericMsg, rawError: errorMsg };
    }
  }

  /**
   * Start read loop for incoming serial stream
   */
  private async startReading() {
    if (!this.port || !this.port.readable) return;
    this.isReading = true;

    try {
      this.reader = this.port.readable.getReader();
      const decoder = new TextDecoder('utf-8');

      while (this.isReading && this.port) {
        const { value, done } = await this.reader.read();
        if (done) break;

        if (value && value.length > 0) {
          this.stats.bytesReceived += value.length;
          const textChunk = decoder.decode(value, { stream: true });
          this.processIncomingChunk(textChunk, value);
        }
      }
    } catch (err: unknown) {
      if (this.isReading) {
        this.stats.errors++;
        this.logSystem(`[ERROR DE LECTURA] ${err instanceof Error ? err.message : String(err)}`);
        this.setState('error', 'Error en el flujo de recepción serie');
      }
    } finally {
      if (this.reader) {
        try {
          this.reader.releaseLock();
        } catch {
          // ignore
        }
        this.reader = null;
      }
    }
  }

  /**
   * Process raw bytes and text lines
   */
  private processIncomingChunk(textChunk: string, rawBytes?: Uint8Array) {
    this.rxBuffer += textChunk;

    // Check if buffer contains line endings
    const lines = this.rxBuffer.split(/\r?\n/);
    // Keep whatever is incomplete after the last newline in the buffer
    this.rxBuffer = lines.pop() || '';

    const now = Date.now();
    const timeStr = this.formatTimestamp(now);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      this.packetCountLastSec++;

      // Compute HEX representation for hex mode
      const lineBytes = new TextEncoder().encode(trimmed);
      const rawHex = Array.from(lineBytes)
        .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
        .join(' ');

      // Emit log entry
      this.onLog({
        id: `rx-${now}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: timeStr,
        timeMs: now,
        direction: 'rx',
        text: trimmed,
        rawHex,
        byteCount: lineBytes.length,
      });

      // Parse numerical values for Oscilloscope
      this.parseOscilloscopeValues(trimmed, now);
    }

    // Safety guard against buffer memory leak if Arduino outputs stream without newlines
    if (this.rxBuffer.length > 4096) {
      const flushed = this.rxBuffer.substring(0, 2048);
      this.rxBuffer = this.rxBuffer.substring(2048);
      this.onLog({
        id: `rx-${now}-raw`,
        timestamp: timeStr,
        timeMs: now,
        direction: 'rx',
        text: flushed,
        rawHex: '',
        byteCount: flushed.length,
      });
    }
  }

  /**
   * Parse numerical values from incoming Arduino serial lines
   * Supports:
   *  - Single value: "512" or "3.45"
   *  - CSV format: "512, 1023, 300"
   *  - Tab or space separated: "512\t1023\t300"
   *  - Keyed format: "CH1: 2.5, CH2: 4.1" or "A0:512 A1:1023"
   */
  private parseOscilloscopeValues(line: string, timestamp: number) {
    const values: number[] = [];

    // Check for "key: value" pattern e.g. "CH1: 512, CH2: 1023" or "v1:2.4 v2:3.8"
    const keyValMatches = Array.from(line.matchAll(/[a-zA-Z0-9_-]+[:=]\s*([+-]?\d+(?:\.\d+)?)/g));
    if (keyValMatches.length > 0) {
      for (const m of keyValMatches) {
        const val = parseFloat(m[1]);
        if (!isNaN(val)) values.push(val);
      }
    } else {
      // Split by comma, semicolon, tab, or space
      const parts = line.split(/[,;\t\s]+/);
      for (const p of parts) {
        const cleaned = p.replace(/[^\d.+-]/g, '');
        if (cleaned) {
          const val = parseFloat(cleaned);
          if (!isNaN(val)) values.push(val);
        }
      }
    }

    if (values.length > 0) {
      this.sampleCountLastSec++;

      // Convert values according to ADC conversion mode
      const convertedChannels = values.slice(0, 4).map((val) => {
        if (this.adcConversionMode === 'adc1023_to_5V') {
          // Explicit conversion: 0..1023 -> 0.0V..5.0V
          return Number(((val * 5.0) / 1023.0).toFixed(4));
        }
        if (this.adcConversionMode === 'auto') {
          // If integer > 5.0 and <= 1024, it's an Arduino 10-bit ADC reading!
          if (val > 5.0 && val <= 1024) {
            return Number(((val * 5.0) / 1023.0).toFixed(4));
          }
        }
        return val;
      });

      this.onSample({
        timestamp,
        channels: convertedChannels,
      });
    }
  }

  /**
   * Transmit text to Arduino Uno
   */
  public async sendData(text: string, lineEnding: 'none' | '\n' | '\r' | '\r\n' = '\r\n'): Promise<boolean> {
    const endingMap = {
      none: '',
      '\n': '\n',
      '\r': '\r',
      '\r\n': '\r\n',
    };
    const fullText = text + (endingMap[lineEnding] ?? '\r\n');
    const bytes = new TextEncoder().encode(fullText);

    const now = Date.now();
    const timeStr = this.formatTimestamp(now);
    const rawHex = Array.from(bytes)
      .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');

    this.onLog({
      id: `tx-${now}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: timeStr,
      timeMs: now,
      direction: 'tx',
      text: text,
      rawHex,
      byteCount: bytes.length,
    });

    this.stats.bytesSent += bytes.length;

    // If connected to physical serial port
    if (this.port && this.port.writable) {
      try {
        this.writer = this.port.writable.getWriter();
        await this.writer.write(bytes);
        this.writer.releaseLock();
        this.writer = null;
        return true;
      } catch (err: unknown) {
        if (this.writer) {
          try {
            this.writer.releaseLock();
          } catch {
            // ignore
          }
          this.writer = null;
        }
        this.logSystem(`[ERROR DE ENVÍO] ${err instanceof Error ? err.message : String(err)}`);
        return false;
      }
    }

    // If in Simulator Mode, respond interactively!
    if (this.isSimulating) {
      this.handleSimulatorCommand(text.trim());
      return true;
    }

    this.logSystem(`[AVISO] No hay ningún puerto COM o simulador conectado para enviar datos.`);
    return false;
  }

  /**
   * Trigger hardware DTR pulse (Resets Arduino Uno Atmega328P)
   */
  public async pulseDtrReset(): Promise<boolean> {
    if (!this.port) {
      if (this.isSimulating) {
        this.logSystem(`[SIMULADOR] Pulso DTR recibido. Reiniciando microcontrolador virtual ATmega328P...`);
        this.simPhase = 0;
        this.logSystem(`[SIMULADOR] Arduino Uno R3 reiniciado listo (Bootloader ejecutado).`);
        return true;
      }
      return false;
    }

    try {
      this.logSystem(`[DTR] Generando pulso de Reset de 100ms en pin DTR de Arduino Uno...`);
      await this.port.setSignals({ dataTerminalReady: false });
      await new Promise((res) => setTimeout(res, 120));
      await this.port.setSignals({ dataTerminalReady: true });
      this.logSystem(`[DTR] Pulso completado. Placa Arduino Uno reseteada.`);
      return true;
    } catch (err: unknown) {
      this.logSystem(`[DTR ERROR] No se pudo conmutar la señal DTR: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /**
   * Set DTR and RTS signals manually
   */
  public async setSignals(dtr: boolean, rts: boolean): Promise<boolean> {
    if (!this.port) return false;
    try {
      await this.port.setSignals({ dataTerminalReady: dtr, requestToSend: rts });
      this.logSystem(`[SEÑALES COM] DTR=${dtr ? 'HIGH' : 'LOW'}, RTS=${rts ? 'HIGH' : 'LOW'}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect physical port or stop simulator
   */
  public async disconnect(): Promise<void> {
    this.stopSimulator();

    this.isReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // ignore
      }
      try {
        this.reader.releaseLock();
      } catch {
        // ignore
      }
      this.reader = null;
    }

    if (this.writer) {
      try {
        this.writer.releaseLock();
      } catch {
        // ignore
      }
      this.writer = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // ignore
      }
      this.port = null;
    }

    this.setState('disconnected', 'Desconectado del puerto COM');
    this.logSystem(`[SISTEMA] Conexión cerrada.`);
  }

  // ==========================================
  // ARDUINO UNO VIRTUAL SIMULATOR ENGINE
  // ==========================================

  /**
   * Start Arduino Uno signal generator simulator
   */
  public startSimulator(waveform: SimulatorWaveform = 'multichannel', baud = 115200) {
    this.disconnect(); // close any existing port first
    this.simWaveform = waveform;
    this.isSimulating = true;
    this.simPhase = 0;
    this.stats.connectedSince = Date.now();
    this.stats.bytesReceived = 0;
    this.stats.bytesSent = 0;
    this.stats.errors = 0;

    this.setState('simulated', `Simulador Arduino Uno Activo (${baud} baudios virtuales)`);
    this.logSystem(`[SIMULADOR ARDUINO UNO] Placa virtual ATmega328P iniciada.`);
    this.logSystem(`[SIMULADOR] Modo de señal: ${waveform.toUpperCase()} @ ${this.simFrequency} Hz`);
    this.logSystem(`[SIMULADOR] Escribe comandos en la consola: "PING", "LED_ON", "LED_OFF", "STATUS", "HELP"`);

    const intervalMs = 25; // 40 Hz packet update rate for smooth oscilloscope display
    let step = 0;

    this.simTimer = window.setInterval(() => {
      if (!this.isSimulating) return;

      step++;
      this.simPhase += (2 * Math.PI * this.simFrequency) * (intervalMs / 1000);
      if (this.simPhase > 2 * Math.PI * 1000) this.simPhase = 0;

      let line = '';
      const t = this.simPhase;

      switch (this.simWaveform) {
        case 'sine': {
          // 0 to 5V sine wave with slight ADC noise
          const v = 2.5 + 2.3 * Math.sin(t) + (Math.random() - 0.5) * 0.04;
          line = v.toFixed(3);
          break;
        }
        case 'square': {
          // PWM square wave 0 to 5V
          const v = Math.sin(t) >= 0 ? 5.0 : 0.0;
          line = v.toFixed(2);
          break;
        }
        case 'triangle': {
          // Triangle wave between 0V and 5V
          const norm = (t % (2 * Math.PI)) / (2 * Math.PI);
          const v = norm < 0.5 ? norm * 2 * 5.0 : (1 - norm) * 2 * 5.0;
          line = v.toFixed(3);
          break;
        }
        case 'potentiometer': {
          // Send raw ADC reading (0 - 1023) just like analogRead(A0)
          line = `${Math.round(this.simPotValue)}`;
          break;
        }
        case 'ecg': {
          // Simulated Biopotential QRS complex pulse
          const cycle = (t % (2 * Math.PI)) / (2 * Math.PI);
          let ecg = 0.5;
          if (cycle > 0.15 && cycle < 0.22) {
            // P wave
            ecg += 0.25 * Math.sin(((cycle - 0.15) / 0.07) * Math.PI);
          } else if (cycle >= 0.28 && cycle < 0.30) {
            // Q wave
            ecg -= 0.35;
          } else if (cycle >= 0.30 && cycle < 0.34) {
            // R spike
            ecg += 3.8;
          } else if (cycle >= 0.34 && cycle < 0.37) {
            // S wave
            ecg -= 0.7;
          } else if (cycle >= 0.45 && cycle < 0.58) {
            // T wave
            ecg += 0.6 * Math.sin(((cycle - 0.45) / 0.13) * Math.PI);
          }
          ecg += (Math.random() - 0.5) * 0.08; // baseline noise
          line = ecg.toFixed(3);
          break;
        }
        case 'multichannel':
        default: {
          // 3 channels: CH1 (A0: 0-5V Sine), CH2 (A1: PWM Square), CH3 (A2: Triangle), CH4 (Noise)
          const ch1 = 2.5 + 2.2 * Math.sin(t);
          const ch2 = Math.sin(t * 2) >= 0 ? 4.8 : 0.2;
          const norm = ((t * 0.5) % (2 * Math.PI)) / (2 * Math.PI);
          const ch3 = norm * 4.5;
          const ch4 = 1.5 + (Math.random() - 0.5) * 0.8;
          line = `${ch1.toFixed(2)}, ${ch2.toFixed(2)}, ${ch3.toFixed(2)}, ${ch4.toFixed(2)}`;
          break;
        }
      }

      const rawBytes = new TextEncoder().encode(line + '\r\n');
      this.stats.bytesReceived += rawBytes.length;
      this.processIncomingChunk(line + '\r\n', rawBytes);
    }, intervalMs);
  }

  /**
   * Handle text commands sent to virtual Arduino simulator
   */
  private handleSimulatorCommand(cmd: string) {
    const upper = cmd.toUpperCase();
    const now = Date.now();
    const timeStr = this.formatTimestamp(now);

    let reply = '';
    if (upper === 'PING') {
      reply = 'PONG';
    } else if (upper === 'LED_ON') {
      this.simLedState = true;
      reply = 'OK: LED_PIN_13=HIGH';
    } else if (upper === 'LED_OFF') {
      this.simLedState = false;
      reply = 'OK: LED_PIN_13=LOW';
    } else if (upper === 'STATUS') {
      reply = `ARDUINO_UNO_R3: READY | LED=${this.simLedState ? 'ON' : 'OFF'} | WAVE=${this.simWaveform} | FREQ=${this.simFrequency}Hz`;
    } else if (upper.startsWith('SET_FREQ')) {
      const parts = upper.split(' ');
      const val = parseFloat(parts[1]);
      if (!isNaN(val) && val > 0 && val <= 100) {
        this.simFrequency = val;
        reply = `OK: FRECUENCIA_AJUSTADA_A_${val}Hz`;
      } else {
        reply = 'ERROR: Uso: SET_FREQ <numero_entre_0.1_y_100>';
      }
    } else if (upper === 'HELP') {
      reply = 'COMANDOS DISPONIBLES: PING, STATUS, LED_ON, LED_OFF, SET_FREQ <hz>, HELP';
    } else {
      reply = `ECHO: "${cmd}" recibido en ATmega328P`;
    }

    const replyBytes = new TextEncoder().encode(reply + '\r\n');
    this.stats.bytesReceived += replyBytes.length;

    setTimeout(() => {
      this.onLog({
        id: `rx-sim-${now}`,
        timestamp: timeStr,
        timeMs: now,
        direction: 'rx',
        text: reply,
        rawHex: Array.from(replyBytes)
          .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
          .join(' '),
        byteCount: replyBytes.length,
      });
    }, 40);
  }

  public stopSimulator() {
    this.isSimulating = false;
    if (this.simTimer !== null) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
  }

  private logSystem(text: string) {
    const now = Date.now();
    this.onLog({
      id: `sys-${now}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: this.formatTimestamp(now),
      timeMs: now,
      direction: 'sys',
      text,
      rawHex: '',
      byteCount: text.length,
    });
  }

  private formatTimestamp(timestamp: number): string {
    const d = new Date(timestamp);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }

  public destroy() {
    this.disconnect();
    if (this.statsInterval !== null) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }
}

// Singleton instance
export const serialManager = new SerialManager();
