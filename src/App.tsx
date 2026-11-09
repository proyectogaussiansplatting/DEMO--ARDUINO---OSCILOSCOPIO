/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header, ActiveTab } from './components/Header';
import { ConfigPanel } from './components/ConfigPanel';
import { TextTerminalView } from './components/TextTerminalView';
import { OscilloscopeView } from './components/OscilloscopeView';
import { ArduinoSketchesView } from './components/ArduinoSketchesView';
import { WindowsGuideView } from './components/WindowsGuideView';
import { SimulatorBar } from './components/SimulatorBar';
import { PortHelperModal } from './components/PortHelperModal';
import { serialManager } from './services/serialManager';
import {
  ConnectionState,
  ScopeSample,
  SerialConfig,
  SerialLogEntry,
  SerialStats,
} from './types/serial';
import { AlertCircle, CheckCircle, Info, X, ExternalLink, ShieldAlert, Usb } from 'lucide-react';

const DEFAULT_CONFIG: SerialConfig = {
  baudRate: 115200, // 115200 default for smooth oscilloscope & high-speed telemetry
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  bufferSize: 8192,
  flowControl: 'none',
  lineEndingTx: '\r\n',
  dtr: true,
  rts: true,
  autoscroll: true,
  showTimestamps: true,
  displayMode: 'ascii',
};

interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('oscilloscope');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPortHelperOpen, setIsPortHelperOpen] = useState(false);
  const [portHelperReason, setPortHelperReason] = useState<string | undefined>(undefined);
  const [isInIframe, setIsInIframe] = useState(false);
  const [dismissIframeBanner, setDismissIframeBanner] = useState(false);

  useEffect(() => {
    setIsInIframe(serialManager.isInIframe());
  }, []);

  // Configuration (persisted in localStorage)
  const [config, setConfig] = useState<SerialConfig>(() => {
    try {
      const saved = localStorage.getItem('arduino_serial_config');
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [logs, setLogs] = useState<SerialLogEntry[]>([]);
  const [samples, setSamples] = useState<ScopeSample[]>([]);
  const [stats, setStats] = useState<SerialStats>(serialManager.getStats());

  // Toast notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((type: 'info' | 'success' | 'error', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  // Update Config
  const handleUpdateConfig = useCallback((patch: Partial<SerialConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...patch };
      try {
        localStorage.setItem('arduino_serial_config', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Connect Serial COM
  const handleConnectCOM = async () => {
    const result = await serialManager.connectSerial(config);
    if (result.success) {
      addToast('success', `Conectado al puerto COM a ${config.baudRate} baud`);
    } else {
      if (result.reason !== 'cancelled') {
        setPortHelperReason(result.message);
        setIsPortHelperOpen(true);
      }
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    await serialManager.disconnect();
    addToast('info', 'Puerto COM desconectado');
  };

  // Apply & Reconnect
  const handleApplyAndReconnect = async () => {
    await serialManager.disconnect();
    setTimeout(async () => {
      const result = await serialManager.connectSerial(config);
      if (result.success) {
        addToast('success', `Reconectado con nuevos parámetros (${config.baudRate} baud)`);
      } else if (result.reason !== 'cancelled') {
        setPortHelperReason(result.message);
        setIsPortHelperOpen(true);
      }
    }, 200);
  };

  // Simulator Toggle
  const handleToggleSimulator = () => {
    if (connectionState === 'simulated') {
      serialManager.stopSimulator();
      setConnectionState('disconnected');
      addToast('info', 'Simulador detenido');
    } else {
      serialManager.startSimulator('multichannel', config.baudRate);
      addToast('success', 'Simulador de señales Arduino Uno iniciado');
    }
  };

  // Reset Arduino (DTR)
  const handleResetArduino = async () => {
    const success = await serialManager.pulseDtrReset();
    if (success) {
      addToast('info', 'Pulso DTR de Reset enviado a Arduino Uno');
    } else {
      addToast('error', 'No se pudo conmutar la línea DTR');
    }
  };

  // Send message
  const handleSendMessage = async (text: string, lineEnding?: '\r\n' | '\n' | '\r' | 'none') => {
    await serialManager.sendData(text, lineEnding || config.lineEndingTx);
  };

  // Clear
  const handleClearLogs = () => {
    setLogs([]);
    addToast('info', 'Registro de texto limpiado');
  };

  const handleClearBuffer = () => {
    setSamples([]);
    addToast('info', 'Búfer del osciloscopio limpiado');
  };

  // Setup callbacks on mount
  useEffect(() => {
    serialManager.setCallbacks(
      (newLog) => {
        setLogs((prev) => {
          // Limit memory to last 2000 logs
          if (prev.length >= 2000) {
            return [...prev.slice(500), newLog];
          }
          return [...prev, newLog];
        });
      },
      (newSample) => {
        setSamples((prev) => {
          // Keep a circular buffer of last 3000 samples for the oscilloscope
          if (prev.length >= 3000) {
            return [...prev.slice(500), newSample];
          }
          return [...prev, newSample];
        });
      },
      (state, msg) => {
        setConnectionState(state);
        if (msg) setStatusMessage(msg);
        if (state === 'error' && msg) {
          addToast('error', msg);
        }
      },
      (newStats) => {
        setStats(newStats);
      }
    );

    return () => {
      serialManager.destroy();
    };
  }, [addToast]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Iframe Warning Banner for Windows Hardware COM access */}
      {isInIframe && !dismissIframeBanner && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-6 py-2 flex items-center justify-between gap-4 text-xs z-40 shrink-0">
          <div className="flex items-center gap-2 text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Aviso para Windows:</strong> Si el navegador no te permite seleccionar el puerto COM físico
              del Arduino, es debido a la seguridad del visor incrustado. Abre la aplicación en una pestaña independiente.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en Pestaña Completa ↗</span>
            </button>
            <button
              onClick={() => setDismissIframeBanner(true)}
              className="p-1 text-amber-400 hover:text-white"
              title="Ocultar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* App Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connectionState={connectionState}
        stats={stats}
        isSimulating={connectionState === 'simulated'}
        isInIframe={isInIframe}
        onOpenConfig={() => setIsConfigOpen(true)}
        onConnectCOM={handleConnectCOM}
        onDisconnect={handleDisconnect}
        onToggleSimulator={handleToggleSimulator}
        onResetArduino={handleResetArduino}
        onOpenPortHelper={() => setIsPortHelperOpen(true)}
        onOpenInNewTab={handleOpenInNewTab}
      />

      {/* Simulator Control Ribbon (Visible when in Simulator mode) */}
      <SimulatorBar
        isSimulating={connectionState === 'simulated'}
        onStop={() => {
          serialManager.stopSimulator();
          setConnectionState('disconnected');
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'terminal' && (
          <TextTerminalView
            logs={logs}
            stats={stats}
            config={config}
            connectionState={connectionState}
            onClearLogs={handleClearLogs}
            onSendMessage={handleSendMessage}
            onUpdateConfig={handleUpdateConfig}
          />
        )}

        {activeTab === 'oscilloscope' && (
          <OscilloscopeView
            samples={samples}
            connectionState={connectionState}
            onClearBuffer={handleClearBuffer}
          />
        )}

        {activeTab === 'sketches' && <ArduinoSketchesView />}

        {activeTab === 'windows-guide' && <WindowsGuideView />}
      </main>

      {/* Serial Communication Parameters Modal */}
      <ConfigPanel
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        isConnected={connectionState === 'connected'}
        onApplyAndReconnect={handleApplyAndReconnect}
        onPulseDtr={handleResetArduino}
      />

      {/* Port Troubleshooting & Detection Assistant Modal */}
      <PortHelperModal
        isOpen={isPortHelperOpen}
        onClose={() => setIsPortHelperOpen(false)}
        config={config}
        onConnectSuccess={() => addToast('success', 'Conectado al puerto COM')}
        initialReason={portHelperReason}
        onStartSimulator={() => {
          if (connectionState !== 'simulated') {
            serialManager.startSimulator('multichannel', config.baudRate);
          }
        }}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium animate-in slide-in-from-bottom-2 fade-in duration-150 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/95 border-cyan-500/50 text-cyan-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
