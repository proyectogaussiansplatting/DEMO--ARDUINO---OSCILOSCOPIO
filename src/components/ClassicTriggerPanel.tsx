/**
 * Classic Benchtop Oscilloscope Trigger Panel
 * Emulates hardware controls of classic digital storage oscilloscopes (Tektronix, Rigol)
 */

import React from 'react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Sliders,
  CheckCircle,
  Clock,
  Radio,
  Crosshair,
  ShieldAlert,
} from 'lucide-react';
import { ChannelConfig, TriggerConfig, TriggerStatus } from '../types/serial';

interface ClassicTriggerPanelProps {
  trigger: TriggerConfig;
  onUpdateTrigger: (patch: Partial<TriggerConfig>) => void;
  channels: ChannelConfig[];
  triggerStatus: TriggerStatus;
  vMax: number;
  vMin: number;
  onArmSingle: () => void;
  onForceTrigger: () => void;
}

export const ClassicTriggerPanel: React.FC<ClassicTriggerPanelProps> = ({
  trigger,
  onUpdateTrigger,
  channels,
  triggerStatus,
  vMax,
  vMin,
  onArmSingle,
  onForceTrigger,
}) => {
  // Set Trigger to 50% of the peak-to-peak signal (standard feature on classic oscilloscopes)
  const handleSet50Percent = () => {
    if (isFinite(vMax) && isFinite(vMin) && vMax !== vMin) {
      const level50 = Number(((vMax + vMin) / 2).toFixed(2));
      onUpdateTrigger({ level: level50 });
    } else {
      onUpdateTrigger({ level: 2.5 });
    }
  };

  const handleStepLevel = (delta: number) => {
    const next = Number(Math.max(-5.0, Math.min(10.0, trigger.level + delta)).toFixed(2));
    onUpdateTrigger({ level: next });
  };

  const activeChannel = channels[trigger.channel] || channels[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3.5 shadow-lg select-none">
      {/* Header with Title and LED Status Indicators */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Crosshair className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold font-mono tracking-wider text-slate-100 uppercase">
            SECCIÓN DE DISPARO (TRIGGER)
          </span>
        </div>

        {/* Oscilloscope LED Status Indicators */}
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              triggerStatus === 'trig'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-sm shadow-emerald-500/30'
                : 'bg-slate-950/60 text-slate-600 border border-slate-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                triggerStatus === 'trig' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'
              }`}
            />
            <span>TRIG&apos;D</span>
          </div>

          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              triggerStatus === 'wait'
                ? 'bg-amber-950 text-amber-300 border border-amber-500 shadow-sm shadow-amber-500/30'
                : 'bg-slate-950/60 text-slate-600 border border-slate-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                triggerStatus === 'wait' ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'
              }`}
            />
            <span>WAIT</span>
          </div>

          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              triggerStatus === 'auto'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500 shadow-sm shadow-cyan-500/30'
                : 'bg-slate-950/60 text-slate-600 border border-slate-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                triggerStatus === 'auto' ? 'bg-cyan-400' : 'bg-slate-700'
              }`}
            />
            <span>AUTO</span>
          </div>

          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              triggerStatus === 'stop'
                ? 'bg-rose-950 text-rose-300 border border-rose-500 shadow-sm shadow-rose-500/30'
                : 'bg-slate-950/60 text-slate-600 border border-slate-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                triggerStatus === 'stop' ? 'bg-rose-400' : 'bg-slate-700'
              }`}
            />
            <span>STOP</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {/* Column 1: Trigger Mode (AUTO / NORM / SINGLE) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
            1. Modo (Mode)
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => onUpdateTrigger({ mode: 'auto' })}
              className={`py-1.5 px-2 rounded text-xs font-mono font-bold transition-all ${
                trigger.mode === 'auto'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Barrido libre automático cuando no hay señal"
            >
              AUTO
            </button>
            <button
              type="button"
              onClick={() => onUpdateTrigger({ mode: 'normal' })}
              className={`py-1.5 px-2 rounded text-xs font-mono font-bold transition-all ${
                trigger.mode === 'normal'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Sincroniza y barre SOLO cuando cruza el umbral de disparo"
            >
              NORM
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateTrigger({ mode: 'single', armed: true });
                onArmSingle();
              }}
              className={`py-1.5 px-2 rounded text-xs font-mono font-bold transition-all ${
                trigger.mode === 'single'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Disparo único: captura un transitorio y se detiene"
            >
              SINGLE
            </button>
          </div>

          {trigger.mode === 'single' && (
            <div className="pt-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={onArmSingle}
                className="flex-1 py-1 px-2 text-xs font-bold text-rose-300 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/60 rounded-md transition-colors font-mono"
              >
                ● RE-ARMAR DISPARO
              </button>
              <button
                type="button"
                onClick={onForceTrigger}
                className="py-1 px-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                title="Forzar disparo manual inmediato"
              >
                FORZAR
              </button>
            </div>
          )}
        </div>

        {/* Column 2: Trigger Source & Slope */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
            2. Fuente y Flanco
          </label>
          <div className="flex items-center gap-1">
            {/* Channel Sources */}
            <div className="flex-1 grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => onUpdateTrigger({ channel: ch.id })}
                  style={{
                    backgroundColor: trigger.channel === ch.id ? `${ch.color}25` : 'transparent',
                    borderColor: trigger.channel === ch.id ? ch.color : 'transparent',
                    color: trigger.channel === ch.id ? ch.color : '#64748b',
                  }}
                  className="py-1 rounded text-xs font-mono font-bold border transition-colors text-center"
                >
                  {ch.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Slope Buttons */}
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => onUpdateTrigger({ edge: 'rising' })}
                className={`p-1.5 rounded transition-colors ${
                  trigger.edge === 'rising'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Flanco Ascendente (Rising ↗)"
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateTrigger({ edge: 'falling' })}
                className={`p-1.5 rounded transition-colors ${
                  trigger.edge === 'falling'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Flanco Descendente (Falling ↘)"
              >
                <TrendingDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
            <span>Canal activo:</span>
            <span style={{ color: activeChannel.color }} className="font-bold">
              {activeChannel.name} ({trigger.edge === 'rising' ? 'Flanco ↗' : 'Flanco ↘'})
            </span>
          </div>
        </div>

        {/* Column 3: Trigger Level Controls */}
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              3. Nivel de Disparo (Trigger Level)
            </label>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-slate-500">Umbral:</span>
              <span className="font-bold text-rose-400 tabular-nums px-2 py-0.5 bg-slate-950 border border-slate-800 rounded">
                {trigger.level.toFixed(2)} V
              </span>
            </div>
          </div>

          {/* Slider and Fast Presets */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.0"
              max="5.0"
              step="0.05"
              value={trigger.level}
              onChange={(e) => onUpdateTrigger({ level: parseFloat(e.target.value) })}
              className="flex-1 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />

            {/* Set 50% Button */}
            <button
              type="button"
              onClick={handleSet50Percent}
              className="px-2.5 py-1 text-xs font-bold text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/50 rounded-lg transition-colors font-mono whitespace-nowrap"
              title="Ajusta el nivel de disparo automáticamente al 50% de la señal pico a pico"
            >
              50% SET LEVEL
            </button>

            {/* GND (0V) Button */}
            <button
              type="button"
              onClick={() => onUpdateTrigger({ level: 0.0 })}
              className="px-2 py-1 text-xs font-mono font-semibold text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            >
              0.0V
            </button>
          </div>

          {/* Fine Tuning Step Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span className="text-slate-500 text-[10px] mr-1">Paso fino:</span>
              <button
                type="button"
                onClick={() => handleStepLevel(-0.5)}
                className="px-1.5 py-0.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
              >
                -0.5V
              </button>
              <button
                type="button"
                onClick={() => handleStepLevel(-0.1)}
                className="px-1.5 py-0.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
              >
                -0.1V
              </button>
              <button
                type="button"
                onClick={() => handleStepLevel(+0.1)}
                className="px-1.5 py-0.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
              >
                +0.1V
              </button>
              <button
                type="button"
                onClick={() => handleStepLevel(+0.5)}
                className="px-1.5 py-0.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
              >
                +0.5V
              </button>
            </div>

            {/* Coupling & Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 font-mono text-[10px]">
              {(['DC', 'AC', 'HF-Reject'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdateTrigger({ coupling: c })}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                    trigger.coupling === c
                      ? 'bg-slate-800 text-cyan-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
