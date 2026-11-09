/**
 * Floating Bar for the Arduino Uno Virtual Signal Generator Simulator
 */

import React, { useState } from 'react';
import { Play, Square, Activity, Radio, Cpu, Sliders, Waves, Zap } from 'lucide-react';
import { serialManager, SimulatorWaveform } from '../services/serialManager';

interface SimulatorBarProps {
  isSimulating: boolean;
  onStop: () => void;
}

export const SimulatorBar: React.FC<SimulatorBarProps> = ({ isSimulating, onStop }) => {
  const [waveform, setWaveform] = useState<SimulatorWaveform>('multichannel');
  const [frequency, setFrequency] = useState(2.0);

  if (!isSimulating) return null;

  const handleWaveformChange = (type: SimulatorWaveform) => {
    setWaveform(type);
    serialManager.setSimWaveform(type, frequency);
  };

  const handleFreqChange = (f: number) => {
    setFrequency(f);
    serialManager.setSimWaveform(waveform, f);
  };

  return (
    <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
      {/* Left: Waveform Selector */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 font-bold text-emerald-300 font-mono">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>SIMULADOR ATmega328P:</span>
        </span>

        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          {[
            { id: 'multichannel', label: 'Multicanal (4 Canales)' },
            { id: 'sine', label: 'Senoidal 0-5V' },
            { id: 'square', label: 'Cuadrada PWM' },
            { id: 'triangle', label: 'Triangular' },
            { id: 'potentiometer', label: 'Potenciómetro A0' },
            { id: 'ecg', label: 'Pulso ECG' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleWaveformChange(item.id as SimulatorWaveform)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                waveform === item.id
                  ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Frequency Scrubber & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 font-mono">Frecuencia:</span>
          <span className="text-xs font-bold text-emerald-400 font-mono tabular-nums w-12 text-right">
            {frequency.toFixed(1)} Hz
          </span>
          <input
            type="range"
            min="0.2"
            max="10.0"
            step="0.1"
            value={frequency}
            onChange={(e) => handleFreqChange(parseFloat(e.target.value))}
            className="w-24 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        <button
          onClick={onStop}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 rounded-md transition-colors"
        >
          <Square className="w-3 h-3 text-emerald-400" />
          <span>Detener</span>
        </button>
      </div>
    </div>
  );
};
