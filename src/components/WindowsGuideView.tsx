/**
 * Windows COM Port & Arduino Uno Connection Guide
 */

import React from 'react';
import { HelpCircle, Monitor, Cpu, AlertTriangle, CheckCircle2, Usb, Zap } from 'lucide-react';

export const WindowsGuideView: React.FC = () => {
  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-800 flex items-start gap-4">
          <div className="p-3 bg-cyan-950/80 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Guía de Conexión de Arduino Uno en Windows</h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Esta aplicación web se ejecuta en Windows a través de navegadores con soporte de{' '}
              <strong className="text-cyan-300">Web Serial API</strong> (Google Chrome, Microsoft Edge, Opera)
              para comunicarse de forma directa y nativa con los puertos serie COM virtuales asignados por Windows.
            </p>
          </div>
        </div>

        {/* 4 Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Conectar Cable USB</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Enchufa el Arduino Uno al PC Windows</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Conecta el cable USB tipo A a tipo B de la placa Arduino Uno a cualquier puerto USB de tu ordenador.
              El LED verde &quot;ON&quot; de la placa se encenderá.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Comprobar el Puerto COM en Windows</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Administrador de Dispositivos</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pulsa <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-[10px] font-mono">Win + X</kbd>{' '}
              y selecciona <strong>Administrador de dispositivos</strong>. Despliega la categoría{' '}
              <span className="text-cyan-300 font-mono">Puertos (COM y LPT)</span>. Verás tu placa asignada como{' '}
              <span className="text-amber-300 font-mono">COM3</span>, <span className="text-amber-300 font-mono">COM4</span>, etc.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Controladores / Drivers de Windows</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-200">ATmega16U2 vs CH340</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Las placas Arduino Uno originales usan chip ATmega16U2 (driver instalado con Arduino IDE). Los clones
              económicos usan el chip <strong>CH340</strong>; si Windows muestra un triángulo amarillo, instala el
              driver <span className="text-cyan-300 font-mono">CH341SER.EXE</span>.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center text-[10px]">
                4
              </span>
              <span>Conectar en esta Aplicación</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Un Clic y Listo</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Haz clic en el botón superior <strong className="text-cyan-400">&quot;Conectar Puerto COM&quot;</strong>.
              El diálogo nativo de Windows te mostrará la lista de puertos serie detectados. Selecciona tu Arduino y pulsa
              Conectar.
            </p>
          </div>
        </div>

        {/* Common Troubleshooting */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Resolución de Problemas Frecuentes en Windows</span>
          </h2>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <h4 className="font-semibold text-amber-300 mb-1">
                &quot;Error: Acceso denegado al puerto COM&quot; (Access Denied)
              </h4>
              <p className="text-slate-400 leading-relaxed">
                En Windows, los puertos COM son de <strong>acceso exclusivo</strong>. Si tienes abierto el Monitor Serie de
                Arduino IDE, Cura, Pronterface u otra terminal, ciérralos antes de conectar en esta aplicación.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <h4 className="font-semibold text-amber-300 mb-1">
                Aparecen caracteres extraños o símbolos ilegibles (⸮⸮⸮)
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Esto ocurre cuando la velocidad en baudios de la aplicación no coincide con el sketch cargado en el
                Arduino. Ve a <strong>&quot;Parámetros COM&quot;</strong> y selecciona exactamente la velocidad que
                tengas en tu código (ej: 9600 o 115200).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <h4 className="font-semibold text-emerald-400 mb-1">
                ¿Puedo probar sin conectar un Arduino físico ahora mismo?
              </h4>
              <p className="text-slate-400 leading-relaxed">
                ¡Sí! Haz clic en el botón superior <strong>&quot;Simulador Arduino&quot;</strong>. La aplicación simulará
                un microcontrolador ATmega328P generando señales analógicas multicanal (senoidales, cuadradas PWM,
                potenciómetro y pulso cardíaco) con respuesta interactiva a comandos de texto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
