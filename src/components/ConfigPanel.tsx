/**
 * Serial Port Communication Parameters Configuration Panel
 */

import React, { useState } from 'react';
import { X, Sliders, Check, Zap, Info, ShieldAlert, RotateCcw } from 'lucide-react';
import { SerialConfig } from '../types/serial';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: SerialConfig;
  onUpdateConfig: (newConfig: Partial<SerialConfig>) => void;
  isConnected: boolean;
  onApplyAndReconnect: () => void;
  onPulseDtr: () => void;
}

const COMMON_BAUD_RATES = [
  { value: 300, label: '300 baud' },
  { value: 1200, label: '1200 baud' },
  { value: 2400, label: '2400 baud' },
  { value: 4800, label: '4800 baud' },
  { value: 9600, label: '9600 baud (Estándar Arduino Uno)' },
  { value: 14400, label: '14400 baud' },
  { value: 19200, label: '19200 baud' },
  { value: 38400, label: '38400 baud' },
  { value: 57600, label: '57600 baud' },
  { value: 115200, label: '115200 baud (Recomendado Osciloscopio)' },
  { value: 230400, label: '230400 baud' },
  { value: 250000, label: '250000 baud (Atmega328P 16MHz óptimo)' },
  { value: 500000, label: '500000 baud' },
  { value: 1000000, label: '1000000 baud (1 Mbps)' },
  { value: 2000000, label: '2000000 baud (2 Mbps máximo)' },
];

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  isConnected,
  onApplyAndReconnect,
  onPulseDtr,
}) => {
  const [customBaud, setCustomBaud] = useState(config.baudRate.toString());
  const [isCustomBaud, setIsCustomBaud] = useState(
    !COMMON_BAUD_RATES.some((b) => b.value === config.baudRate)
  );

  if (!isOpen) return null;

  const handleBaudSelect = (rate: number) => {
    setIsCustomBaud(false);
    onUpdateConfig({ baudRate: rate });
    setCustomBaud(rate.toString());
  };

  const handleCustomBaudChange = (val: string) => {
    setCustomBaud(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 3000000) {
      onUpdateConfig({ baudRate: parsed });
    }
  };

  const applyPreset = (preset: 'standard' | 'scope_fast' | 'high_speed' | 'industrial') => {
    if (preset === 'standard') {
      setIsCustomBaud(false);
      onUpdateConfig({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
        lineEndingTx: '\r\n',
      });
    } else if (preset === 'scope_fast') {
      setIsCustomBaud(false);
      onUpdateConfig({
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
        lineEndingTx: '\r\n',
      });
    } else if (preset === 'high_speed') {
      setIsCustomBaud(false);
      onUpdateConfig({
        baudRate: 250000,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
        lineEndingTx: '\r\n',
      });
    } else if (preset === 'industrial') {
      setIsCustomBaud(false);
      onUpdateConfig({
        baudRate: 57600,
        dataBits: 8,
        stopBits: 1,
        parity: 'even',
        flowControl: 'none',
        lineEndingTx: '\r\n',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/70 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Parámetros de Comunicación Serie</h2>
              <p className="text-xs text-slate-400">
                Ajuste fino de velocidad, tramas de bits, señales de control y búfer para Arduino Uno
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Presets Strip */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Perfiles Rápidos (Presets)
              </label>
              <span className="text-[11px] text-slate-400">Configuración común para Arduino</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  config.baudRate === 9600 && config.parity === 'none'
                    ? 'border-cyan-500/70 bg-cyan-950/40 text-cyan-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold">Arduino Estándar</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">9600 · 8-N-1</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('scope_fast')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  config.baudRate === 115200 && config.parity === 'none'
                    ? 'border-cyan-500/70 bg-cyan-950/40 text-cyan-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold">Osciloscopio Rápido</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">115200 · 8-N-1</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('high_speed')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  config.baudRate === 250000 && config.parity === 'none'
                    ? 'border-cyan-500/70 bg-cyan-950/40 text-cyan-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold">Alta Velocidad</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">250000 · 8-N-1</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('industrial')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  config.baudRate === 57600 && config.parity === 'even'
                    ? 'border-cyan-500/70 bg-cyan-950/40 text-cyan-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold">Industrial Par</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">57600 · 8-E-1</div>
              </button>
            </div>
          </div>

          {/* Section: Baud Rate / Velocidad de Recepción */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Velocidad en Baudios (Baud Rate)</span>
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Debe coincidir exactamente con el valor fijado en el sketch de Arduino:{' '}
                  <code className="text-cyan-300 font-mono font-medium">Serial.begin(velocidad);</code>
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-cyan-400 tabular-nums px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md">
                {config.baudRate} bps
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {COMMON_BAUD_RATES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleBaudSelect(item.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-colors flex items-center justify-between ${
                    config.baudRate === item.value && !isCustomBaud
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="font-mono tabular-nums">{item.value}</span>
                  {config.baudRate === item.value && !isCustomBaud && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              ))}
            </div>

            {/* Custom Baud input */}
            <div className="pt-2 flex items-center gap-3">
              <label className="text-xs text-slate-400 whitespace-nowrap">Velocidad personalizada:</label>
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={customBaud}
                  onChange={(e) => handleCustomBaudChange(e.target.value)}
                  placeholder="Ej: 500000"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-1.5 text-xs text-slate-500 font-mono">bps</span>
              </div>
            </div>
          </div>

          {/* Section: Frame Parameters (Data bits, Parity, Stop bits) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Data Bits */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-slate-200">Bits de Datos (Data Bits)</label>
              <div className="flex gap-2">
                {[8, 7].map((bits) => (
                  <button
                    key={bits}
                    type="button"
                    onClick={() => onUpdateConfig({ dataBits: bits as 7 | 8 })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      config.dataBits === bits
                        ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {bits} bits {bits === 8 && '(estándar)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Parity */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-slate-200">Paridad (Parity)</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'none', label: 'Ninguna' },
                  { id: 'even', label: 'Par' },
                  { id: 'odd', label: 'Impar' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onUpdateConfig({ parity: item.id as 'none' | 'even' | 'odd' })}
                    className={`py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                      config.parity === item.id
                        ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stop Bits */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-slate-200">Bits de Parada (Stop)</label>
              <div className="flex gap-2">
                {[1, 2].map((stop) => (
                  <button
                    key={stop}
                    type="button"
                    onClick={() => onUpdateConfig({ stopBits: stop as 1 | 2 })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      config.stopBits === stop
                        ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {stop} bit{stop > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Buffer Size & Flow Control */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Buffer Size */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-slate-200">Tamaño del Búfer de Recepción</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1024, 4096, 8192, 16384].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onUpdateConfig({ bufferSize: size })}
                    className={`py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      config.bufferSize === size
                        ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {size / 1024} KB
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Búferes de 8 KB o 16 KB previenen desbordamientos en muestreos rápidos de osciloscopio.
              </p>
            </div>

            {/* Flow Control & Line Endings */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-slate-200">Terminación de Línea al Enviar (TX)</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: '\r\n', label: 'CRLF (\\r\\n)' },
                  { id: '\n', label: 'LF (\\n)' },
                  { id: '\r', label: 'CR (\\r)' },
                  { id: 'none', label: 'Ninguno' },
                ].map((ending) => (
                  <button
                    key={ending.id}
                    type="button"
                    onClick={() => onUpdateConfig({ lineEndingTx: ending.id as '\r\n' | '\n' | '\r' | 'none' })}
                    className={`py-1.5 rounded-lg text-[10px] font-mono font-medium border transition-colors ${
                      config.lineEndingTx === ending.id
                        ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ending.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Arduino Serial.readStringUntil('\n') requiere LF o CRLF.
              </p>
            </div>
          </div>

          {/* Section: Control de Señales Hardware (DTR / RTS) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Líneas de Control Hardware (DTR / RTS)
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  En placas Arduino Uno (con chip ATmega16U2 o CH340), la línea DTR está conectada al pin RESET.
                </p>
              </div>
              <button
                type="button"
                onClick={onPulseDtr}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pulsar Reset Arduino (DTR)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">DTR (Data Terminal Ready)</span>
                  <span className="text-[11px] text-slate-400">Nivel lógico activo</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.dtr}
                  onChange={(e) => onUpdateConfig({ dtr: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-700"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">RTS (Request To Send)</span>
                  <span className="text-[11px] text-slate-400">Control de flujo auxiliar</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.rts}
                  onChange={(e) => onUpdateConfig({ rts: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-700"
                />
              </label>
            </div>
          </div>

          {isConnected && (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                El puerto COM está conectado actualmente. Si modificas la velocidad en baudios o los bits de datos,
                haz clic en &quot;Aplicar y Reconectar&quot; para que Windows reabra el puerto con la nueva configuración.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="text-xs text-slate-400 font-mono">
            {config.baudRate} bps · {config.dataBits}-
            {config.parity.toUpperCase().charAt(0)}-
            {config.stopBits}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cerrar
            </button>
            {isConnected ? (
              <button
                type="button"
                onClick={() => {
                  onApplyAndReconnect();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-colors"
              >
                Aplicar y Reconectar COM
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-colors"
              >
                Guardar Configuración
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
