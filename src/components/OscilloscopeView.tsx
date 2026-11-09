/**
 * Digital Storage Oscilloscope (Modo Osciloscopio Multicanal)
 * High-performance canvas-based oscilloscope with Classic Benchtop Trigger and ADC 0-1023 to 0-5V conversion.
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Play,
  Square,
  Camera,
  Download,
  Sliders,
  Activity,
  Zap,
  Sparkles,
  RotateCcw,
  Crosshair,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AdcConversionMode,
  ChannelConfig,
  ConnectionState,
  ScopeSample,
  ScopeTelemetry,
  TriggerConfig,
  TriggerStatus,
  VoltageScalePreset,
} from '../types/serial';
import { ClassicTriggerPanel } from './ClassicTriggerPanel';
import { serialManager } from '../services/serialManager';

interface OscilloscopeViewProps {
  samples: ScopeSample[];
  connectionState: ConnectionState;
  onClearBuffer: () => void;
}

const DEFAULT_CHANNELS: ChannelConfig[] = [
  { id: 0, name: 'CH1 (A0)', color: '#06b6d4', visible: true, scale: 1.0, offset: 0, inverted: false },
  { id: 1, name: 'CH2 (A1)', color: '#f59e0b', visible: true, scale: 1.0, offset: 0, inverted: false },
  { id: 2, name: 'CH3 (A2)', color: '#10b981', visible: false, scale: 1.0, offset: 0, inverted: false },
  { id: 3, name: 'CH4 (A3)', color: '#c084fc', visible: false, scale: 1.0, offset: 0, inverted: false },
];

export const OscilloscopeView: React.FC<OscilloscopeViewProps> = ({
  samples,
  connectionState,
  onClearBuffer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Oscilloscope state
  const [isRunning, setIsRunning] = useState(true);
  const [channels, setChannels] = useState<ChannelConfig[]>(DEFAULT_CHANNELS);
  const [activeMeasureChannel, setActiveMeasureChannel] = useState(0);

  // Timebase (window size in samples)
  const [bufferSize, setBufferSize] = useState<number>(300);

  // Voltage scale preset
  const [scalePreset, setScalePreset] = useState<VoltageScalePreset>('5V');

  // ADC Conversion Mode: 'auto' (converts 0..1023 to 0..5V), 'adc1023_to_5V', or 'direct_volts'
  const [adcMode, setAdcMode] = useState<AdcConversionMode>('auto');

  // Classic Trigger configuration
  const [trigger, setTrigger] = useState<TriggerConfig>({
    mode: 'auto',
    channel: 0,
    level: 2.5,
    edge: 'rising',
    coupling: 'DC',
    holdoff: 0,
    armed: true,
  });

  const [triggerStatus, setTriggerStatus] = useState<TriggerStatus>('auto');
  const [showTriggerPanel, setShowTriggerPanel] = useState(true);

  // Display options
  const [showGrid, setShowGrid] = useState(true);
  const [showPhosphorGlow, setShowPhosphorGlow] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(true);

  // Mouse hover & dragging state for Trigger Line
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; valY: number; valX: number } | null>(null);
  const [isDraggingTrigger, setIsDraggingTrigger] = useState(false);
  const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);

  // Freeze buffer when stopped or single triggered
  const frozenSamplesRef = useRef<ScopeSample[]>([]);
  const lastTriggeredBufferRef = useRef<ScopeSample[]>([]);

  // Telemetry values calculation
  const [telemetry, setTelemetry] = useState<ScopeTelemetry>({
    vMax: 0,
    vMin: 0,
    vPp: 0,
    vAvg: 0,
    vRms: 0,
    frequency: 0,
    period: 0,
  });

  // Sync ADC conversion mode with SerialManager
  const handleAdcModeChange = (mode: AdcConversionMode) => {
    setAdcMode(mode);
    serialManager.setAdcConversionMode(mode);
  };

  // Determine current active min/max voltage bounds based on preset
  const [vMinBound, vMaxBound] = useMemo(() => {
    switch (scalePreset) {
      case '3.3V':
        return [0, 3.3];
      case '1023':
        return [0, 1023];
      case 'bipolar5V':
        return [-5.0, 5.0];
      case 'auto': {
        const activeSamples = (isRunning ? samples : frozenSamplesRef.current).slice(-bufferSize);
        if (activeSamples.length === 0) return [0, 5.0];
        let min = Infinity;
        let max = -Infinity;
        for (const s of activeSamples) {
          const val = s.channels[activeMeasureChannel];
          if (val !== undefined && isFinite(val)) {
            if (val < min) min = val;
            if (val > max) max = val;
          }
        }
        if (!isFinite(min) || !isFinite(max) || min === max) return [0, 5.0];
        const padding = Math.max(0.2, (max - min) * 0.15);
        return [min - padding, max + padding];
      }
      case '5V':
      default:
        return [0, 5.0]; // Default Arduino Uno 0-5V
    }
  }, [scalePreset, isRunning, samples, bufferSize, activeMeasureChannel]);

  // Handle RUN / STOP
  const toggleRunStop = () => {
    if (isRunning) {
      frozenSamplesRef.current = [...samples.slice(-bufferSize)];
      setTriggerStatus('stop');
    } else {
      setTrigger((prev) => ({ ...prev, armed: true }));
      setTriggerStatus(trigger.mode === 'auto' ? 'auto' : 'wait');
    }
    setIsRunning(!isRunning);
  };

  // Channel config helper
  const updateChannel = (id: number, patch: Partial<ChannelConfig>) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch))
    );
  };

  // Arm Single Shot trigger
  const handleArmSingle = () => {
    setIsRunning(true);
    setTrigger((prev) => ({ ...prev, armed: true }));
    setTriggerStatus('wait');
  };

  // Force trigger immediately
  const handleForceTrigger = () => {
    const current = samples.slice(-bufferSize);
    if (current.length > 0) {
      lastTriggeredBufferRef.current = current;
      frozenSamplesRef.current = current;
      setIsRunning(false);
      setTrigger((prev) => ({ ...prev, armed: false }));
      setTriggerStatus('stop');
    }
  };

  // ==========================================
  // REAL-TIME CANVAS DRAWING & TRIGGER ENGINE
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      // 1. Dark CRT Scope Screen Background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, w, h);

      // 2. Phosphor Reticle Graticule (10 divs horizontal, 8 divs vertical)
      if (showGrid) {
        drawGraticule(ctx, w, h);
      }

      // 3. Trigger Synchronization Algorithm
      const allSamples = isRunning ? samples : frozenSamplesRef.current;
      let sweepSamples: ScopeSample[] = [];

      if (!isRunning) {
        // Paused or Single Shot frozen
        sweepSamples = frozenSamplesRef.current.length > 0
          ? frozenSamplesRef.current
          : allSamples.slice(-bufferSize);
      } else if (trigger.mode === 'single') {
        if (!trigger.armed) {
          sweepSamples = lastTriggeredBufferRef.current;
        } else {
          // Look for trigger edge crossing
          const trigIdx = findTriggerEdge(allSamples, trigger);
          if (trigIdx !== -1) {
            sweepSamples = extractSweep(allSamples, trigIdx, bufferSize);
            lastTriggeredBufferRef.current = sweepSamples;
            frozenSamplesRef.current = sweepSamples;
            setTrigger((prev) => ({ ...prev, armed: false }));
            setIsRunning(false);
            setTriggerStatus('stop');
          } else {
            setTriggerStatus('wait');
            sweepSamples = lastTriggeredBufferRef.current.length > 0
              ? lastTriggeredBufferRef.current
              : allSamples.slice(-bufferSize);
          }
        }
      } else if (trigger.mode === 'normal') {
        const trigIdx = findTriggerEdge(allSamples, trigger);
        if (trigIdx !== -1) {
          sweepSamples = extractSweep(allSamples, trigIdx, bufferSize);
          lastTriggeredBufferRef.current = sweepSamples;
          setTriggerStatus('trig');
        } else {
          setTriggerStatus('wait');
          // Hold the previous triggered sweep!
          sweepSamples = lastTriggeredBufferRef.current.length > 0
            ? lastTriggeredBufferRef.current
            : allSamples.slice(-bufferSize);
        }
      } else {
        // AUTO mode: locks if trigger found, free-runs if not
        const trigIdx = findTriggerEdge(allSamples, trigger);
        if (trigIdx !== -1) {
          sweepSamples = extractSweep(allSamples, trigIdx, bufferSize);
          lastTriggeredBufferRef.current = sweepSamples;
          setTriggerStatus('trig');
        } else {
          setTriggerStatus('auto');
          sweepSamples = allSamples.slice(-bufferSize);
        }
      }

      // 4. Draw Channel Traces
      const numPoints = sweepSamples.length;
      const spanY = vMaxBound - vMinBound || 1.0;

      if (numPoints > 1) {
        channels.forEach((ch) => {
          if (!ch.visible) return;

          ctx.beginPath();
          let hasFirstPoint = false;

          for (let i = 0; i < numPoints; i++) {
            const rawVal = sweepSamples[i]?.channels[ch.id];
            if (rawVal === undefined || isNaN(rawVal)) continue;

            // Apply channel offset & scale
            let val = rawVal;
            if (ch.inverted) val = -val;
            val = (val + ch.offset) * ch.scale;

            const x = (i / (numPoints - 1)) * w;
            const normY = (val - vMinBound) / spanY;
            const y = h - normY * h;

            if (!hasFirstPoint) {
              ctx.moveTo(x, y);
              hasFirstPoint = true;
            } else {
              ctx.lineTo(x, y);
            }
          }

          // Phosphor glow trace
          if (showPhosphorGlow) {
            ctx.shadowColor = ch.color;
            ctx.shadowBlur = 8;
            ctx.strokeStyle = ch.color;
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.shadowBlur = 0; // reset
          } else {
            ctx.strokeStyle = ch.color;
            ctx.lineWidth = 1.6;
            ctx.stroke();
          }

          // Zero Ground Reference Indicator on left axis
          const gndNormY = (ch.offset * ch.scale - vMinBound) / spanY;
          const gndY = h - gndNormY * h;
          if (gndY >= 0 && gndY <= h) {
            ctx.fillStyle = ch.color;
            ctx.beginPath();
            ctx.moveTo(0, gndY);
            ctx.lineTo(9, gndY - 4.5);
            ctx.lineTo(9, gndY + 4.5);
            ctx.closePath();
            ctx.fill();

            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.fillText(`${ch.id + 1}`, 12, gndY + 3);
          }
        });
      }

      // 5. Draw Horizontal Trigger Level Line & Draggable Indicator
      if (trigger.level >= vMinBound && trigger.level <= vMaxBound) {
        const trigNormY = (trigger.level - vMinBound) / spanY;
        const trigY = h - trigNormY * h;

        ctx.strokeStyle = isDraggingTrigger ? '#fb7185' : 'rgba(244, 63, 94, 0.75)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = isDraggingTrigger ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(0, trigY);
        ctx.lineTo(w, trigY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Right Trigger Arrow Marker [T ▶]
        ctx.fillStyle = isDraggingTrigger ? '#fb7185' : '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(w, trigY);
        ctx.lineTo(w - 10, trigY - 5);
        ctx.lineTo(w - 10, trigY + 5);
        ctx.closePath();
        ctx.fill();

        // Trigger Level Readout Tag
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        const tag = `T: ${trigger.level.toFixed(2)}V`;
        const tagWidth = ctx.measureText(tag).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(w - tagWidth - 22, trigY - 8, tagWidth + 8, 16);
        ctx.strokeStyle = '#f43f5e';
        ctx.strokeRect(w - tagWidth - 22, trigY - 8, tagWidth + 8, 16);
        ctx.fillStyle = '#fecdd3';
        ctx.fillText(tag, w - tagWidth - 18, trigY + 4);
      }

      // 6. Draw Trigger Reference Marker at 15% on Top Axis
      const trigRefX = w * 0.15;
      ctx.fillStyle = 'rgba(244, 63, 94, 0.8)';
      ctx.beginPath();
      ctx.moveTo(trigRefX, 0);
      ctx.lineTo(trigRefX - 4, 8);
      ctx.lineTo(trigRefX + 4, 8);
      ctx.closePath();
      ctx.fill();

      // 7. Interactive Crosshair Cursor
      if (showCrosshair && cursorPos && !isDraggingTrigger) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(cursorPos.x, 0);
        ctx.lineTo(cursorPos.x, h);
        ctx.moveTo(0, cursorPos.y);
        ctx.lineTo(w, cursorPos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Probe readout tag
        const tooltip = `V: ${cursorPos.valY.toFixed(3)} V`;
        ctx.font = '11px "JetBrains Mono", monospace';
        const tw = ctx.measureText(tooltip).width;
        const bx = Math.min(cursorPos.x + 12, w - tw - 20);
        const by = Math.max(cursorPos.y - 12, 22);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(bx - 4, by - 14, tw + 8, 20);
        ctx.strokeStyle = '#06b6d4';
        ctx.strokeRect(bx - 4, by - 14, tw + 8, 20);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText(tooltip, bx, by);
      }

      // 8. OSD Status Badges on Canvas Top
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.fillText(`ESCALA: 0.0V - 5.0V (ADC ARDUINO UNO)`, 12, 16);
      ctx.fillText(`DISPARO: ${trigger.mode.toUpperCase()} · CH${trigger.channel + 1} (${trigger.edge === 'rising' ? '↗' : '↘'}) @ ${trigger.level.toFixed(2)}V`, 12, 30);

      // RUN / STOP / WAIT Badge on Top Right
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      if (triggerStatus === 'stop' || !isRunning) {
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('■ STOP', w - 60, 18);
      } else if (triggerStatus === 'wait') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('● WAIT', w - 60, 18);
      } else if (triggerStatus === 'trig') {
        ctx.fillStyle = '#10b981';
        ctx.fillText('● TRIG\'D', w - 68, 18);
      } else {
        ctx.fillStyle = '#06b6d4';
        ctx.fillText('● AUTO', w - 60, 18);
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    samples,
    isRunning,
    channels,
    bufferSize,
    scalePreset,
    vMinBound,
    vMaxBound,
    trigger,
    triggerStatus,
    showGrid,
    showPhosphorGlow,
    showCrosshair,
    cursorPos,
    isDraggingTrigger,
  ]);

  // Helper function to find trigger edge in sample buffer
  function findTriggerEdge(list: ScopeSample[], trig: TriggerConfig): number {
    if (list.length < 10) return -1;
    const ch = trig.channel;
    const level = trig.level;
    const isRising = trig.edge === 'rising';

    const end = list.length - 1;
    // Search within recent samples
    const start = Math.max(1, end - 1200);

    for (let i = end - 5; i >= start; i--) {
      const prev = list[i - 1]?.channels[ch];
      const curr = list[i]?.channels[ch];
      if (prev !== undefined && curr !== undefined) {
        if (isRising && prev <= level && curr > level) {
          return i;
        }
        if (!isRising && prev >= level && curr < level) {
          return i;
        }
      }
    }
    return -1;
  }

  // Extract a fixed-size sweep centered or aligned with pre-trigger at 15%
  function extractSweep(list: ScopeSample[], trigIdx: number, size: number): ScopeSample[] {
    const preTrig = Math.floor(size * 0.15);
    const startIdx = Math.max(0, trigIdx - preTrig);
    const endIdx = Math.min(list.length, startIdx + size);
    return list.slice(startIdx, endIdx);
  }

  // Compute live measurements in Volts for active channel
  useEffect(() => {
    const activeData = (isRunning ? samples : frozenSamplesRef.current).slice(-bufferSize);
    if (activeData.length < 5) return;

    const values = activeData
      .map((s) => s.channels[activeMeasureChannel])
      .filter((v): v is number => v !== undefined && !isNaN(v));

    if (values.length < 5) return;

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let sumSq = 0;

    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      sumSq += v * v;
    }

    const n = values.length;
    const avg = sum / n;
    const rms = Math.sqrt(sumSq / n);
    const pp = max - min;

    // Estimate frequency by counting zero-crossings around avg
    let zeroCrossings = 0;
    const mid = avg;
    for (let i = 1; i < values.length; i++) {
      if ((values[i - 1] < mid && values[i] >= mid) || (values[i - 1] > mid && values[i] <= mid)) {
        zeroCrossings++;
      }
    }

    const firstTime = activeData[0].timestamp;
    const lastTime = activeData[activeData.length - 1].timestamp;
    const durationSec = (lastTime - firstTime) / 1000;

    let freq = 0;
    let period = 0;
    if (durationSec > 0 && zeroCrossings >= 2) {
      freq = zeroCrossings / (2 * durationSec);
      if (freq > 0) period = 1000 / freq;
    }

    setTelemetry({
      vMax: max,
      vMin: min,
      vPp: pp,
      vAvg: avg,
      vRms: rms,
      frequency: freq,
      period: period,
    });
  }, [samples, isRunning, bufferSize, activeMeasureChannel]);

  // Graticule drawing function
  const drawGraticule = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const numDivX = 10;
    const numDivY = 8;
    const stepX = w / numDivX;
    const stepY = h / numDivY;

    ctx.strokeStyle = 'rgba(30, 58, 100, 0.45)';
    ctx.lineWidth = 0.8;

    ctx.beginPath();
    for (let x = 0; x <= w; x += stepX) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += stepY) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Center Crosshairs
    const centerX = w / 2;
    const centerY = h / 2;

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, h);
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    // Sub-division tick marks
    ctx.beginPath();
    const tickLen = 3;
    const subStepX = stepX / 5;
    for (let x = 0; x <= w; x += subStepX) {
      ctx.moveTo(x, centerY - tickLen);
      ctx.lineTo(x, centerY + tickLen);
    }
    const subStepY = stepY / 5;
    for (let y = 0; y <= h; y += subStepY) {
      ctx.moveTo(centerX - tickLen, y);
      ctx.lineTo(centerX + tickLen, y);
    }
    ctx.stroke();
  };

  // Mouse hover & drag handlers for setting Trigger Level directly on Canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const spanY = vMaxBound - vMinBound || 1.0;
    const normY = (rect.height - y) / rect.height;
    const valY = vMinBound + normY * spanY;
    const valX = (x / rect.width) * bufferSize;

    setCursorPos({ x, y, valY, valX });

    // Check if hovering near trigger line (within 8px)
    const trigNormY = (trigger.level - vMinBound) / spanY;
    const trigY = rect.height - trigNormY * rect.height;
    const nearTrigger = Math.abs(y - trigY) < 10;
    setIsHoveringTrigger(nearTrigger);

    // If dragging trigger
    if (isDraggingTrigger) {
      const clamped = Math.max(0.0, Math.min(5.0, valY));
      setTrigger((prev) => ({ ...prev, level: parseFloat(clamped.toFixed(2)) }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const spanY = vMaxBound - vMinBound || 1.0;
    const trigNormY = (trigger.level - vMinBound) / spanY;
    const trigY = rect.height - trigNormY * rect.height;

    if (Math.abs(y - trigY) < 14 || e.clientX - rect.left > rect.width - 40) {
      setIsDraggingTrigger(true);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingTrigger(false);
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
    setIsDraggingTrigger(false);
    setIsHoveringTrigger(false);
  };

  // Double click canvas to set trigger level to clicked spot
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const spanY = vMaxBound - vMinBound || 1.0;
    const normY = (rect.height - y) / rect.height;
    const clickedVal = Math.max(0.0, Math.min(5.0, vMinBound + normY * spanY));
    setTrigger((prev) => ({ ...prev, level: parseFloat(clickedVal.toFixed(2)) }));
  };

  // Export Screenshot PNG
  const handleSnapshotPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `arduino_osciloscopio_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    a.click();
  };

  // Export active sweep to CSV
  const handleExportCsv = () => {
    const data = (isRunning ? samples : frozenSamplesRef.current).slice(-bufferSize);
    if (data.length === 0) return;

    const headers = ['Timestamp_ms', ...channels.map((c) => `${c.name}_Volts`)];
    const rows = [headers.join(',')];

    for (const s of data) {
      const line = [s.timestamp, ...channels.map((c) => (s.channels[c.id] ?? '').toString())];
      rows.push(line.join(','));
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arduino_scope_wave_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Scope Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 shrink-0">
        {/* Left: RUN/STOP, Channels, and Classic Trigger Toggle */}
        <div className="flex items-center gap-2">
          {/* RUN / STOP Button */}
          <button
            onClick={toggleRunStop}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isRunning
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900'
                : 'bg-rose-950/80 text-rose-300 border border-rose-500/50 hover:bg-rose-900'
            }`}
          >
            {isRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'PARAR (STOP)' : 'REANUDAR (RUN)'}</span>
          </button>

          {/* Channel Selectors */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => updateChannel(ch.id, { visible: !ch.visible })}
                style={{
                  color: ch.visible ? ch.color : '#64748b',
                  borderColor: ch.visible ? `${ch.color}55` : 'transparent',
                  backgroundColor: ch.visible ? `${ch.color}15` : 'transparent',
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-md border transition-all"
                title={`Mostrar u ocultar ${ch.name}`}
              >
                <span>{ch.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Toggle Trigger Panel Button */}
          <button
            onClick={() => setShowTriggerPanel(!showTriggerPanel)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
              showTriggerPanel
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-xs'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>Panel Trigger</span>
            {showTriggerPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Right: ADC Conversion Mode, Timebase, Capture Actions */}
        <div className="flex items-center gap-2">
          {/* ADC 0-1023 to 0-5V Conversion Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-cyan-500/30">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-cyan-300 font-mono font-semibold">ESCALA ADC:</span>
            <select
              value={adcMode}
              onChange={(e) => handleAdcModeChange(e.target.value as AdcConversionMode)}
              className="bg-transparent font-mono text-xs text-slate-200 outline-none"
              title="Conversión automática de lecturas analógicas Arduino (0-1023) a Voltios (0.00V - 5.00V)"
            >
              <option value="auto">Auto (0-1023 ➔ 0-5V)</option>
              <option value="adc1023_to_5V">Forzar ADC (0..1023 = 0..5V)</option>
              <option value="direct_volts">Voltios Directos (Sin conversión)</option>
            </select>
          </div>

          {/* Sweep Timebase / Window */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-500 font-mono">BARRIDO:</span>
            <select
              value={bufferSize}
              onChange={(e) => setBufferSize(parseInt(e.target.value, 10))}
              className="bg-transparent font-mono text-xs text-slate-200 outline-none"
            >
              <option value={100}>100 muestras (Rápido)</option>
              <option value={200}>200 muestras</option>
              <option value={300}>300 muestras (Estándar)</option>
              <option value={500}>500 muestras</option>
              <option value={1000}>1000 muestras (Lento)</option>
            </select>
          </div>

          {/* Glow toggle */}
          <button
            onClick={() => setShowPhosphorGlow(!showPhosphorGlow)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showPhosphorGlow
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Brillo de fósforo CRT"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Clear Buffer */}
          <button
            onClick={onClearBuffer}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg transition-colors"
            title="Limpiar trazas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Snapshot PNG */}
          <button
            onClick={handleSnapshotPng}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors"
            title="Descargar captura PNG"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PNG</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors"
            title="Descargar datos en CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Main Scope Canvas Stage */}
      <div
        ref={containerRef}
        className={`relative flex-1 bg-[#060a12] overflow-hidden ${
          isDraggingTrigger || isHoveringTrigger ? 'cursor-ns-resize' : 'cursor-crosshair'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
          className="absolute inset-0 w-full h-full"
        />

        {/* Empty state hint */}
        {samples.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none bg-slate-950/70 backdrop-blur-xs">
            <Activity className="w-12 h-12 text-cyan-500/40 animate-pulse mb-3" />
            <h3 className="text-sm font-bold text-slate-200">Esperando Señales de Arduino Uno</h3>
            <p className="text-xs text-slate-400 max-w-md mt-1">
              Envía valores analógicos desde tu Arduino (ej: <code className="text-cyan-300 font-mono">Serial.println(analogRead(A0));</code>).
              Los datos entre 0 y 1023 se grafican automáticamente como señales de 0.0V a 5.0V.
            </p>
          </div>
        )}
      </div>

      {/* Classic Trigger Control Panel (Mounted below canvas when expanded) */}
      {showTriggerPanel && (
        <div className="px-6 py-2 bg-slate-950 border-t border-slate-800 shrink-0">
          <ClassicTriggerPanel
            trigger={trigger}
            onUpdateTrigger={(patch) => setTrigger((prev) => ({ ...prev, ...patch }))}
            channels={channels}
            triggerStatus={triggerStatus}
            vMax={telemetry.vMax}
            vMin={telemetry.vMin}
            onArmSingle={handleArmSingle}
            onForceTrigger={handleForceTrigger}
          />
        </div>
      )}

      {/* Live Measurement HUD & Channel Fine Tuning */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 space-y-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Mediciones en Vivo:
            </span>
            <select
              value={activeMeasureChannel}
              onChange={(e) => setActiveMeasureChannel(parseInt(e.target.value, 10))}
              className="bg-slate-950 font-mono text-xs text-cyan-300 border border-slate-700 rounded px-2 py-0.5 outline-none"
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2.5 flex-1 max-w-4xl font-mono">
            {/* Vmax */}
            <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Vmax</div>
              <div className="text-xs font-bold text-slate-200 tabular-nums">
                {telemetry.vMax.toFixed(2)} V
              </div>
            </div>

            {/* Vmin */}
            <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Vmin</div>
              <div className="text-xs font-bold text-slate-200 tabular-nums">
                {telemetry.vMin.toFixed(2)} V
              </div>
            </div>

            {/* Vpp */}
            <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-cyan-400 uppercase font-semibold">Vpp (Pico-Pico)</div>
              <div className="text-xs font-bold text-cyan-300 tabular-nums">
                {telemetry.vPp.toFixed(2)} V
              </div>
            </div>

            {/* Vavg */}
            <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Vmedia (DC)</div>
              <div className="text-xs font-bold text-slate-200 tabular-nums">
                {telemetry.vAvg.toFixed(2)} V
              </div>
            </div>

            {/* Vrms */}
            <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Vrms</div>
              <div className="text-xs font-bold text-slate-200 tabular-nums">
                {telemetry.vRms.toFixed(2)} V
              </div>
            </div>

            {/* Freq */}
            <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-amber-400 uppercase font-semibold">Frecuencia</div>
              <div className="text-xs font-bold text-amber-300 tabular-nums">
                {telemetry.frequency > 0 ? `${telemetry.frequency.toFixed(1)} Hz` : '--'}
              </div>
            </div>

            {/* Period */}
            <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Período</div>
              <div className="text-xs font-bold text-slate-200 tabular-nums">
                {telemetry.period > 0 ? `${telemetry.period.toFixed(1)} ms` : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Channel Fine-Tuning Drawer Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 border-t border-slate-800/80">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className={`p-2 rounded-lg border transition-all ${
                ch.visible
                  ? 'bg-slate-950/80 border-slate-800'
                  : 'bg-slate-950/30 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold font-mono" style={{ color: ch.color }}>
                  {ch.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-slate-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ch.inverted}
                      onChange={(e) => updateChannel(ch.id, { inverted: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 w-3 h-3"
                    />
                    <span>Inv</span>
                  </label>
                  <label className="text-[10px] text-slate-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ch.visible}
                      onChange={(e) => updateChannel(ch.id, { visible: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 w-3 h-3"
                    />
                    <span>Act</span>
                  </label>
                </div>
              </div>

              {/* Offset & Scale Sliders */}
              <div className="space-y-1 font-mono text-[10px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Offset Y:</span>
                  <span className="text-slate-200 tabular-nums">{ch.offset.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={ch.offset}
                  onChange={(e) => updateChannel(ch.id, { offset: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />

                <div className="flex items-center justify-between pt-0.5">
                  <span>Ganancia:</span>
                  <span className="text-slate-200 tabular-nums">x{ch.scale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="5"
                  step="0.1"
                  value={ch.scale}
                  onChange={(e) => updateChannel(ch.id, { scale: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
