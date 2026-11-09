/**
 * Text Mode Interface (Terminal Serie / Monitor COM)
 * Features dual ASCII/HEX Dump, search, smart autoscroll, command history, and custom macro buttons.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Copy,
  Download,
  Search,
  ArrowDown,
  Clock,
  Binary,
  Type,
  Plus,
  X,
  Check,
  Terminal as TerminalIcon,
  CornerDownLeft,
} from 'lucide-react';
import { ConnectionState, SerialConfig, SerialLogEntry, SerialStats } from '../types/serial';

interface TextTerminalViewProps {
  logs: SerialLogEntry[];
  stats: SerialStats;
  config: SerialConfig;
  connectionState: ConnectionState;
  onClearLogs: () => void;
  onSendMessage: (text: string, lineEnding?: '\r\n' | '\n' | '\r' | 'none') => void;
  onUpdateConfig: (newConfig: Partial<SerialConfig>) => void;
}

export const TextTerminalView: React.FC<TextTerminalViewProps> = ({
  logs,
  stats,
  config,
  connectionState,
  onClearLogs,
  onSendMessage,
  onUpdateConfig,
}) => {
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('arduino_cmd_history');
      return saved ? JSON.parse(saved) : ['PING', 'STATUS', 'LED_ON', 'LED_OFF'];
    } catch {
      return ['PING', 'STATUS', 'LED_ON', 'LED_OFF'];
    }
  });

  const [quickMacros, setQuickMacros] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('arduino_quick_macros');
      return saved ? JSON.parse(saved) : ['PING', 'STATUS', 'LED_ON', 'LED_OFF', 'READ_A0', 'HELP'];
    } catch {
      return ['PING', 'STATUS', 'LED_ON', 'LED_OFF', 'READ_A0', 'HELP'];
    }
  });
  const [showAddMacro, setShowAddMacro] = useState(false);
  const [newMacroText, setNewMacroText] = useState('');

  const [copied, setCopied] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rock-solid Auto-scroll handler: always scrolls to the very latest line when autoscroll is enabled
  useEffect(() => {
    if (config.autoscroll) {
      // Use requestAnimationFrame to ensure DOM layout has rendered the new line
      requestAnimationFrame(() => {
        if (bottomSentinelRef.current) {
          bottomSentinelRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        } else if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      });
    }
  }, [logs, config.autoscroll]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Consider scrolled up if more than 100px away from bottom
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsScrolledToBottom(atBottom);

    // If user explicitly scrolls up by a noticeable amount, we pause autoscroll so they can read
    if (!atBottom && config.autoscroll) {
      // Keep tracking position
    }
  };

  const scrollToBottom = () => {
    onUpdateConfig({ autoscroll: true });
    if (bottomSentinelRef.current) {
      bottomSentinelRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    setIsScrolledToBottom(true);
  };

  // Transmit command
  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    onSendMessage(trimmed, config.lineEndingTx);

    // Save into history
    setCommandHistory((prev) => {
      const filtered = prev.filter((cmd) => cmd !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, 50);
      try {
        localStorage.setItem('arduino_cmd_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    setInputText('');
    setHistoryIndex(null);
  };

  // Keyboard navigation for command history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === null ? 0 : Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(nextIndex);
      setInputText(commandHistory[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex - 1;
      if (nextIndex < 0) {
        setHistoryIndex(null);
        setInputText('');
      } else {
        setHistoryIndex(nextIndex);
        setInputText(commandHistory[nextIndex] || '');
      }
    }
  };

  // Quick Macros
  const handleAddMacro = () => {
    const trimmed = newMacroText.trim();
    if (trimmed && !quickMacros.includes(trimmed)) {
      const updated = [...quickMacros, trimmed];
      setQuickMacros(updated);
      try {
        localStorage.setItem('arduino_quick_macros', JSON.stringify(updated));
      } catch {
        // ignore
      }
      setNewMacroText('');
      setShowAddMacro(false);
    }
  };

  const handleRemoveMacro = (macroToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = quickMacros.filter((m) => m !== macroToRemove);
    setQuickMacros(updated);
    try {
      localStorage.setItem('arduino_quick_macros', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Copy logs
  const handleCopyLogs = () => {
    const content = filteredLogs
      .map((l) => `${config.showTimestamps ? `[${l.timestamp}] ` : ''}[${l.direction.toUpperCase()}] ${l.text}`)
      .join('\n');
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export logs
  const handleExportTxt = () => {
    const content = filteredLogs
      .map((l) => `${l.timestamp} [${l.direction.toUpperCase()}] ${l.text}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arduino_serial_log_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const rows = [['Timestamp', 'Direction', 'LengthBytes', 'Data']];
    for (const log of filteredLogs) {
      rows.push([
        log.timestamp,
        log.direction,
        log.byteCount.toString(),
        `"${log.text.replace(/"/g, '""')}"`,
      ]);
    }
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arduino_serial_data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter logs by search term
  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.text.toLowerCase().includes(term) ||
      log.rawHex.toLowerCase().includes(term) ||
      log.timestamp.includes(term)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Console Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-900/80 border-b border-slate-800 shrink-0">
        {/* Left: Search & Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar texto, bytes HEX o hora..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchTerm && (
            <span className="text-[11px] font-mono text-cyan-400 whitespace-nowrap">
              {filteredLogs.length} coincidencias
            </span>
          )}
        </div>

        {/* Right: View & Export Toggles */}
        <div className="flex items-center gap-2">
          {/* Display Mode: ASCII vs HEX */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => onUpdateConfig({ displayMode: 'ascii' })}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                config.displayMode === 'ascii'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista de texto ASCII convencional"
            >
              <Type className="w-3 h-3" />
              <span>ASCII</span>
            </button>
            <button
              onClick={() => onUpdateConfig({ displayMode: 'hex' })}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                config.displayMode === 'hex'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista de volcado hexadecimal de bytes"
            >
              <Binary className="w-3 h-3" />
              <span>HEX Dump</span>
            </button>
          </div>

          {/* Timestamps toggle */}
          <button
            onClick={() => onUpdateConfig({ showTimestamps: !config.showTimestamps })}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              config.showTimestamps
                ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Mostrar marcas de tiempo con precisión de milisegundos"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hora</span>
          </button>

          {/* Autoscroll toggle */}
          <button
            onClick={() => {
              const nextState = !config.autoscroll;
              onUpdateConfig({ autoscroll: nextState });
              if (nextState) scrollToBottom();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              config.autoscroll
                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-xs'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
            }`}
            title={
              config.autoscroll
                ? 'Auto-scroll activado: siempre visible el último dato recibido'
                : 'Auto-scroll pausado: haz clic para reanudar el seguimiento'
            }
          >
            <ArrowDown className={`w-3.5 h-3.5 ${config.autoscroll ? 'animate-bounce' : ''}`} />
            <span>{config.autoscroll ? 'Auto-Scroll: ACTIVO' : 'Auto-Scroll: PAUSADO'}</span>
          </button>

          {/* Copy */}
          <button
            onClick={handleCopyLogs}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors disabled:opacity-40"
            title="Copiar texto de la consola al portapapeles"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          {/* Export CSV / TXT */}
          <button
            onClick={handleExportTxt}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors disabled:opacity-40"
            title="Exportar archivo de registro .TXT"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">TXT</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors disabled:opacity-40"
            title="Exportar registros a CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CSV</span>
          </button>

          {/* Clear console */}
          <button
            onClick={onClearLogs}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 rounded-lg transition-colors"
            title="Limpiar consola"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Output Viewport */}
      <div className="relative flex-1 bg-slate-950 font-mono text-xs overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto px-6 py-4 space-y-1 select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <TerminalIcon className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-400">Terminal Serie Preparada</p>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Conecta tu Arduino Uno a un puerto COM en Windows o inicia el &quot;Simulador Arduino&quot; para comenzar
                a recibir tramas de texto y mediciones en tiempo real.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <span>Velocidad actual:</span>
                <span className="font-mono text-cyan-400 font-bold">{config.baudRate} baud</span>
                <span>·</span>
                <span>Formato:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {config.dataBits}-{config.parity.toUpperCase().charAt(0)}-{config.stopBits}
                </span>
              </div>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isRx = log.direction === 'rx';
              const isTx = log.direction === 'tx';
              const isSys = log.direction === 'sys';

              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-2.5 py-0.5 leading-relaxed rounded px-1.5 transition-colors hover:bg-slate-900/60 ${
                    isSys
                      ? 'text-slate-400 bg-slate-900/30'
                      : isTx
                      ? 'text-amber-300 bg-amber-950/10'
                      : 'text-slate-200'
                  }`}
                >
                  {/* Timestamp */}
                  {config.showTimestamps && (
                    <span className="text-slate-600 select-none text-[11px] tabular-nums shrink-0">
                      [{log.timestamp}]
                    </span>
                  )}

                  {/* Direction Badge */}
                  <span
                    className={`text-[10px] uppercase font-bold px-1 rounded select-none shrink-0 ${
                      isRx
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40'
                        : isTx
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {log.direction}
                  </span>

                  {/* Content (ASCII or HEX Dump) */}
                  {config.displayMode === 'hex' ? (
                    <div className="flex-1 flex flex-wrap items-baseline gap-x-4">
                      <span className="text-cyan-300 tracking-wider font-semibold tabular-nums">
                        {log.rawHex || '--'}
                      </span>
                      <span className="text-slate-500 text-[11px]">| {log.text}</span>
                    </div>
                  ) : (
                    <span className="flex-1 break-all whitespace-pre-wrap">{log.text}</span>
                  )}
                </div>
              );
            })
          )}
          {/* Bottom sentinel ensures scroll reaches the very end of the list */}
          <div ref={bottomSentinelRef} className="h-6 w-full pointer-events-none" />
        </div>

        {/* Floating Scroll-to-Bottom Indicator if user scrolled up or autoscroll is paused */}
        {(!isScrolledToBottom || !config.autoscroll) && filteredLogs.length > 0 && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-6 flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-cyan-600 text-white rounded-full shadow-xl shadow-cyan-950/80 hover:bg-cyan-500 transition-all animate-bounce border border-cyan-400/40"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Último dato recibido (Reanudar Auto-Scroll)</span>
          </button>
        )}
      </div>

      {/* Quick Macros Ribbon */}
      <div className="px-6 py-2 bg-slate-900/60 border-t border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
          Macros:
        </span>
        <div className="flex items-center gap-1.5">
          {quickMacros.map((macro) => (
            <div
              key={macro}
              className="group flex items-center gap-1 px-2.5 py-1 bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-xs font-mono border border-slate-700/60 transition-colors whitespace-nowrap cursor-pointer"
              onClick={() => onSendMessage(macro, config.lineEndingTx)}
            >
              <span>{macro}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveMacro(macro, e)}
                title="Eliminar macro"
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition-opacity ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {showAddMacro ? (
            <div className="flex items-center gap-1 bg-slate-950 border border-cyan-500 rounded-md px-1.5 py-0.5">
              <input
                type="text"
                value={newMacroText}
                onChange={(e) => setNewMacroText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMacro()}
                placeholder="Comando (ej: GET_VOLT)"
                autoFocus
                className="w-36 bg-transparent text-xs font-mono text-cyan-200 outline-none placeholder-slate-600"
              />
              <button
                type="button"
                onClick={handleAddMacro}
                className="p-1 text-cyan-400 hover:text-cyan-300"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setShowAddMacro(false)}
                className="p-1 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddMacro(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-cyan-400 bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 rounded-md transition-colors whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>Añadir Macro</span>
            </button>
          )}
        </div>
      </div>

      {/* Command Sender Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3 shrink-0">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              connectionState === 'connected' || connectionState === 'simulated'
                ? 'Escribe un comando para Arduino (ej: PING, SET_PWM 128, LED_ON)... [Enter para enviar, ↑/↓ historial]'
                : 'Conecta un puerto COM o inicia el simulador para enviar comandos'
            }
            className="w-full pl-4 pr-12 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
          />
          <span className="absolute right-3.5 top-3 text-[11px] text-slate-600 font-mono flex items-center gap-1 pointer-events-none">
            <CornerDownLeft className="w-3 h-3" />
            <span>Enter</span>
          </span>
        </div>

        {/* Line Ending dropdown for transmission */}
        <select
          value={config.lineEndingTx}
          onChange={(e) => onUpdateConfig({ lineEndingTx: e.target.value as '\r\n' | '\n' | '\r' | 'none' })}
          className="px-2.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
          title="Fin de línea transmitido al final del comando"
        >
          <option value="\r\n">CRLF (\r\n)</option>
          <option value="\n">LF (\n)</option>
          <option value="\r">CR (\r)</option>
          <option value="none">Sin fin de línea</option>
        </select>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Enviar</span>
        </button>
      </div>

      {/* Telemetry Status Strip */}
      <div className="px-6 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">RX:</span>
            <span className="text-cyan-400 tabular-nums font-semibold">
              {(stats.bytesReceived / 1024).toFixed(1)} KB
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">TX:</span>
            <span className="text-amber-400 tabular-nums font-semibold">
              {(stats.bytesSent / 1024).toFixed(1)} KB
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Tasa:</span>
            <span className="text-slate-300 tabular-nums font-semibold">
              {stats.packetsPerSec} paq/s
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            {config.baudRate} baud · {config.dataBits}{config.parity.toUpperCase().charAt(0)}{config.stopBits}
          </span>
          <span className="text-slate-600">·</span>
          <span
            className={`font-semibold ${
              connectionState === 'connected'
                ? 'text-emerald-400'
                : connectionState === 'simulated'
                ? 'text-cyan-400'
                : 'text-slate-500'
            }`}
          >
            {connectionState === 'connected'
              ? 'COM CONECTADO'
              : connectionState === 'simulated'
              ? 'SIMULADOR ACTIVO'
              : 'DESCONECTADO'}
          </span>
        </div>
      </div>
    </div>
  );
};
