/**
 * Diagnostic & Port Connection Assistant Modal
 * Solves "No puedo seleccionar el puerto COM" issues on Windows
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  ExternalLink,
  Cpu,
  Usb,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Play,
  ArrowRight,
} from 'lucide-react';
import { serialManager } from '../services/serialManager';
import { SerialConfig, SerialPort } from '../types/serial';

interface PortHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SerialConfig;
  onConnectSuccess: () => void;
  initialReason?: string;
  onStartSimulator: () => void;
}

export const PortHelperModal: React.FC<PortHelperModalProps> = ({
  isOpen,
  onClose,
  config,
  onConnectSuccess,
  initialReason,
  onStartSimulator,
}) => {
  const [isInIframe, setIsInIframe] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [authorizedPorts, setAuthorizedPorts] = useState<SerialPort[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsInIframe(serialManager.isInIframe());
      setIsSupported(serialManager.isWebSerialSupported());
      loadAuthorizedPorts();
    }
  }, [isOpen]);

  const loadAuthorizedPorts = async () => {
    const ports = await serialManager.getAuthorizedPorts();
    setAuthorizedPorts(ports);
  };

  const handleOpenInNewTab = () => {
    const url = window.location.href;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRetryConnect = async () => {
    setIsLoading(true);
    setStatusFeedback(null);
    const result = await serialManager.connectSerial(config);
    setIsLoading(false);

    if (result.success) {
      onConnectSuccess();
      onClose();
    } else {
      setStatusFeedback(result.message);
      loadAuthorizedPorts();
    }
  };

  const handleConnectExistingPort = async (port: SerialPort) => {
    setIsLoading(true);
    setStatusFeedback(null);
    const result = await serialManager.connectToPort(port, config);
    setIsLoading(false);

    if (result.success) {
      onConnectSuccess();
      onClose();
    } else {
      setStatusFeedback(result.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-950/70 border border-amber-500/40 rounded-xl text-amber-400">
              <Usb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Asistente de Detección de Puerto COM (Arduino Uno)
              </h2>
              <p className="text-xs text-slate-400">
                Diagnóstico y solución para conectar tu placa física en Windows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Diagnostic 1: IFRAME RESTRICTION (Most common in web previews!) */}
          {isInIframe && (
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/50 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-cyan-200">
                    Estás ejecutando la aplicación dentro de un visor embebido (iframe)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Por seguridad, los navegadores en Windows (Google Chrome, Microsoft Edge) bloquean el cuadro de
                    diálogo para seleccionar puertos USB/COM si la página está dentro de un marco secundario (iframe).
                  </p>
                  <p className="text-xs text-cyan-300 font-semibold pt-1">
                    👉 Solución: Abre la aplicación en una pestaña completa independiente. El navegador te mostrará
                    directamente el selector con todos los puertos COM disponibles.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en Pestaña Independiente ↗</span>
                </button>
              </div>
            </div>
          )}

          {/* Diagnostic 2: BROWSER SUPPORT */}
          {!isSupported && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Navegador No Compatible con Web Serial</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Estás usando un navegador que no soporta la API de comunicación serie (por ejemplo, Firefox o Safari).
                Abre esta misma dirección URL en <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong> u{' '}
                <strong>Opera</strong> en tu ordenador Windows.
              </p>
            </div>
          )}

          {/* Feedback from last try */}
          {statusFeedback && (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{statusFeedback}</span>
            </div>
          )}

          {/* Diagnostic 3: ALREADY AUTHORIZED PORTS */}
          {authorizedPorts.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Puertos COM Ya Autorizados en tu Navegador ({authorizedPorts.length})
                </span>
                <button
                  onClick={loadAuthorizedPorts}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Actualizar</span>
                </button>
              </div>

              <div className="space-y-2">
                {authorizedPorts.map((port, idx) => {
                  const info = port.getInfo ? port.getInfo() : {};
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700/80"
                    >
                      <div>
                        <div className="text-xs font-bold text-cyan-300 font-mono">
                          Dispositivo Serial #{idx + 1}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          USB VID:{' '}
                          {info.usbVendorId ? `0x${info.usbVendorId.toString(16).toUpperCase()}` : 'Desconocido'}{' '}
                          | PID:{' '}
                          {info.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase()}` : 'Desconocido'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleConnectExistingPort(port)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Conectar a este puerto</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Diagnostic 4: HARDWARE & WINDOWS CHECKLIST */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Lista de Comprobación Hardware en Windows</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Check 1 */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500 text-[10px] flex items-center justify-center text-cyan-300">
                    1
                  </span>
                  <span>Driver CH340 vs ATmega16U2</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Muchos clones de Arduino Uno llevan el chip conversor USB <strong>CH340</strong>. Si Windows 10/11
                  no tiene instalado el controlador <code>CH341SER.EXE</code>, la placa no aparecerá en la lista de
                  puertos.
                </p>
              </div>

              {/* Check 2 */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500 text-[10px] flex items-center justify-center text-cyan-300">
                    2
                  </span>
                  <span>Cable USB con Líneas de Datos</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Cables tipo cargador de móvil solo llevan alimentación (5V/GND) y no transmiten datos (D+/D-). Al
                  enchufar el Arduino, Windows debe reproducir el sonido característico de conexión USB.
                </p>
              </div>

              {/* Check 3 */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500 text-[10px] flex items-center justify-center text-cyan-300">
                    3
                  </span>
                  <span>Monitor Serie de Arduino IDE</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  En Windows, los puertos COM son de uso exclusivo. Si el Monitor Serie de Arduino IDE está abierto,
                  ciérralo para liberar el puerto COM.
                </p>
              </div>

              {/* Check 4 */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500 text-[10px] flex items-center justify-center text-cyan-300">
                    4
                  </span>
                  <span>Administrador de Dispositivos</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Pulsa <kbd className="font-mono bg-slate-950 px-1 rounded text-[10px]">Win+X</kbd> &gt; Administrador
                  de Dispositivos &gt; <strong>Puertos (COM y LPT)</strong> para comprobar si Windows le ha asignado
                  un número (ej: <code>COM3</code> o <code>COM4</code>).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={() => {
              onStartSimulator();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Probar con el Simulador de Señales (Sin Hardware)</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleRetryConnect}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Abriendo selector...' : 'Seleccionar Puerto COM Ahora'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
