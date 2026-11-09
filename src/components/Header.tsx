/**
 * Application Top Bar following 3-Zone Contract
 */

import React from 'react';
import { Cpu, Terminal, Activity, Sliders, Code2, HelpCircle, Power, Play, Square, RefreshCw, ExternalLink, Usb } from 'lucide-react';
import { ConnectionState, SerialStats } from '../types/serial';

export type ActiveTab = 'terminal' | 'oscilloscope' | 'sketches' | 'windows-guide';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  connectionState: ConnectionState;
  stats: SerialStats;
  isSimulating: boolean;
  isInIframe: boolean;
  onOpenConfig: () => void;
  onConnectCOM: () => void;
  onDisconnect: () => void;
  onToggleSimulator: () => void;
  onResetArduino: () => void;
  onOpenPortHelper: () => void;
  onOpenInNewTab: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  connectionState,
  stats,
  isSimulating,
  isInIframe,
  onOpenConfig,
  onConnectCOM,
  onDisconnect,
  onToggleSimulator,
  onResetArduino,
  onOpenPortHelper,
  onOpenInNewTab,
}) => {
  const isConnected = connectionState === 'connected';
  const isSim = connectionState === 'simulated';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      {/* Zone 1: Single text element wordmark with subtle brand icon */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Cpu className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
            ARDUINO UNO <span className="text-cyan-400 font-semibold font-mono text-sm ml-1">COM LAB</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
            Windows Serial Monitor &amp; Osciloscopio
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links / Segmented Mode Selector */}
      <nav className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800/80">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'terminal'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Modo Texto (Terminal)</span>
        </button>

        <button
          onClick={() => setActiveTab('oscilloscope')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'oscilloscope'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Modo Osciloscopio</span>
        </button>

        <button
          onClick={() => setActiveTab('sketches')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'sketches'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Código Arduino (.ino)</span>
        </button>

        <button
          onClick={() => setActiveTab('windows-guide')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'windows-guide'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Guía Windows COM</span>
        </button>
      </nav>

      {/* Zone 3: Hardware Controls & Connection Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* If in iframe, button to open in independent window for direct COM access */}
        {isInIframe && (
          <button
            onClick={onOpenInNewTab}
            title="Abrir en pestaña nueva para acceder directamente a los puertos COM de Windows sin restricciones de iframe"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Pestaña Completa</span>
          </button>
        )}

        {/* Port Connection & Troubleshooting Assistant */}
        <button
          onClick={onOpenPortHelper}
          title="Asistente de detección de puertos COM, comprobación de controladores CH340 y diagnóstico"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Usb className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Asistente COM</span>
        </button>

        {/* Reset Arduino ATmega328P Button (pulsar DTR) */}
        {(isConnected || isSim) && (
          <button
            onClick={onResetArduino}
            title="Pulso de Reset hardware mediante línea DTR (reinicia la placa Arduino Uno)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset (DTR)</span>
          </button>
        )}

        {/* Configuration drawer trigger */}
        <button
          onClick={onOpenConfig}
          title="Ajustar velocidad en baudios y parámetros serie (bits, paridad, stop, buffers)"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden lg:inline">Parámetros COM</span>
        </button>

        {/* Simulator Toggle */}
        <button
          onClick={onToggleSimulator}
          title="Alternar entre simulador interno de señales Arduino Uno y puerto físico"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 border ${
            isSim
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/60'
              : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700/60 hover:text-slate-200'
          }`}
        >
          {isSim ? <Square className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-slate-400" />}
          <span>{isSim ? 'Detener Simulador' : 'Simulador'}</span>
        </button>

        {/* Main Connect / Disconnect button */}
        {isConnected ? (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-rose-200 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span>Desconectar COM</span>
          </button>
        ) : (
          <button
            onClick={onConnectCOM}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm shadow-cyan-900/30 transition-all whitespace-nowrap shrink-0"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Conectar Puerto COM</span>
          </button>
        )}
      </div>
    </header>
  );
};
