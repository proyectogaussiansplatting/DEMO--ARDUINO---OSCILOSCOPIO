/**
 * Arduino Uno Code Sketches (.ino) Generator and Helper
 */

import React, { useState } from 'react';
import { Copy, Check, FileCode, Cpu, Zap, Sliders, Terminal } from 'lucide-react';

interface Sketch {
  id: string;
  title: string;
  description: string;
  baudRate: number;
  channels: string;
  code: string;
}

const SKETCHES: Sketch[] = [
  {
    id: 'multichannel_scope',
    title: '1. Osciloscopio Multicanal (A0, A1, A2) - Recomendado',
    description: 'Envía 3 señales analógicas simultáneas formateadas en CSV para graficar en los canales CH1, CH2 y CH3 del osciloscopio.',
    baudRate: 115200,
    channels: '3 Canales (A0, A1, A2)',
    code: `/*
 * Arduino Uno - Osciloscopio Multicanal Serie (115200 Baud)
 * Compatible con la aplicación Arduino Uno COM Lab
 */

const int PIN_CH1 = A0; // Canal 1 (ej: potenciómetro o sensor)
const int PIN_CH2 = A1; // Canal 2 (ej: señal filtrada)
const int PIN_CH3 = A2; // Canal 3 (ej: referencia)

void setup() {
  // Inicializamos el puerto serie a alta velocidad (115200 bps)
  Serial.begin(115200);
  
  // Opcional: configurar referencia analógica (DEFAULT = 5V en Arduino Uno)
  analogReference(DEFAULT);
}

void loop() {
  // Leemos los 3 canales analógicos (ADC de 10 bits: 0 a 1023)
  int val1 = analogRead(PIN_CH1);
  int val2 = analogRead(PIN_CH2);
  int val3 = analogRead(PIN_CH3);

  // Convertimos a voltios (0.00V a 5.00V)
  float volt1 = (val1 * 5.0) / 1023.0;
  float volt2 = (val2 * 5.0) / 1023.0;
  float volt3 = (val3 * 5.0) / 1023.0;

  // Imprimimos en formato CSV separado por comas: CH1, CH2, CH3
  Serial.print(volt1, 2);
  Serial.print(", ");
  Serial.print(volt2, 2);
  Serial.print(", ");
  Serial.println(volt3, 2);

  // Retardo de muestreo (10 ms = ~100 muestras por segundo)
  delay(10);
}`,
  },
  {
    id: 'single_analog',
    title: '2. Monitor Analógico Básico Pin A0 (0 a 1023 crudo)',
    description: 'Lee el pin A0 e imprime el valor del ADC (0-1023). La aplicación lo convierte automáticamente en pantalla a señal de 0.0V a 5.0V.',
    baudRate: 9600,
    channels: '1 Canal (A0)',
    code: `/*
 * Arduino Uno - Lectura Analógica Directa en Pin A0
 * Envía valores de 0 a 1023 (la aplicación los mapea a 0-5V automáticamente)
 */

const int SENSOR_PIN = A0;

void setup() {
  Serial.begin(9600); // 9600 bps
}

void loop() {
  // Envía directamente el valor del ADC de 10 bits (0 a 1023)
  // El osciloscopio lo detecta y lo monitoriza como señal de 0.0V a 5.0V
  int adcValue = analogRead(SENSOR_PIN);
  Serial.println(adcValue);
  
  delay(25); // ~40 muestras por segundo
}`,
  },
  {
    id: 'fast_adc_prescaler',
    title: '3. Muestreo de Alta Velocidad (Prescaler ADC a 115200 Baud)',
    description: 'Optimiza el convertidor analógico-digital del ATmega328P acelerando el reloj del ADC para muestrear señales de audio o señales rápidas.',
    baudRate: 115200,
    channels: '1 Canal Rápido (A0)',
    code: `/*
 * Arduino Uno - Muestreo ADC Rápido con Prescaler a 16
 * Permite muestrear señales de hasta 8-10 kHz
 */

void setup() {
  Serial.begin(115200);

  // Configura el prescaler del ADC a 16 (por defecto Arduino usa 128)
  // ADPS2 = 1, ADPS1 = 0, ADPS0 = 0 -> reloj ADC a 1 MHz
  ADCSRA &= ~(bit(ADPS0) | bit(ADPS1) | bit(ADPS2)); // Borra bits
  ADCSRA |= bit(ADPS2); // Fija prescaler en 16 (16 MHz / 16 = 1 MHz)
}

void loop() {
  // Lectura ultrarrápida (tarda ~16 microsegundos en lugar de 104us)
  int val = analogRead(A0);
  float v = (val * 5.0) / 1023.0;
  
  Serial.println(v, 2);
  
  // Retardo mínimo para no saturar el búfer serie
  delayMicroseconds(500); 
}`,
  },
  {
    id: 'bidirectional_control',
    title: '4. Control Bidireccional con Comandos y PWM',
    description: 'Permite enviar comandos desde la terminal como "PING", "LED_ON", "LED_OFF", "PWM 128" y recibir telemetría continua.',
    baudRate: 115200,
    channels: 'Control + 1 Canal (A0)',
    code: `/*
 * Arduino Uno - Firmware de Control Bidireccional Serie
 * Responde a comandos recibidos desde la aplicación web
 */

const int PIN_LED = 13;
const int PIN_PWM = 9;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_PWM, OUTPUT);
  
  digitalWrite(PIN_LED, LOW);
  analogWrite(PIN_PWM, 0);
  
  Serial.println("ARDUINO UNO R3 ONLINE. COMANDOS: PING, LED_ON, LED_OFF, PWM <0-255>");
}

void loop() {
  // 1. Procesar comandos entrantes del puerto COM
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    
    if (cmd.equalsIgnoreCase("PING")) {
      Serial.println("PONG");
    } else if (cmd.equalsIgnoreCase("LED_ON")) {
      digitalWrite(PIN_LED, HIGH);
      Serial.println("OK: LED PIN 13 ENCENDIDO");
    } else if (cmd.equalsIgnoreCase("LED_OFF")) {
      digitalWrite(PIN_LED, LOW);
      Serial.println("OK: LED PIN 13 APAGADO");
    } else if (cmd.startsWith("PWM ")) {
      int pwmVal = cmd.substring(4).toInt();
      pwmVal = constrain(pwmVal, 0, 255);
      analogWrite(PIN_PWM, pwmVal);
      Serial.print("OK: PWM PIN 9 AJUSTADO A ");
      Serial.println(pwmVal);
    } else if (cmd.equalsIgnoreCase("STATUS")) {
      Serial.print("STATUS: LED=");
      Serial.print(digitalRead(PIN_LED));
      Serial.print(" A0=");
      Serial.println(analogRead(A0));
    } else {
      Serial.print("ERROR: Comando desconocido -> ");
      Serial.println(cmd);
    }
  }

  // 2. Enviar señal analógica de A0 periódicamente
  static unsigned long lastTime = 0;
  if (millis() - lastTime > 40) {
    lastTime = millis();
    float v = (analogRead(A0) * 5.0) / 1023.0;
    Serial.println(v, 2);
  }
}`,
  },
];

export const ArduinoSketchesView: React.FC = () => {
  const [selectedSketch, setSelectedSketch] = useState<Sketch>(SKETCHES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedSketch.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-950 overflow-hidden">
      {/* Left List of Sketches */}
      <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2 overflow-y-auto shrink-0">
        <div className="mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>Sketches de Arduino (.ino)</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Códigos listos para compilar y cargar en tu Arduino Uno desde el Arduino IDE en Windows.
          </p>
        </div>

        <div className="space-y-1.5 flex-1">
          {SKETCHES.map((sketch) => (
            <button
              key={sketch.id}
              onClick={() => setSelectedSketch(sketch)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedSketch.id === sketch.id
                  ? 'bg-cyan-950/60 border-cyan-500/80 text-white shadow-sm'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-semibold leading-tight">{sketch.title}</div>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-cyan-400">
                <span>{sketch.baudRate} baud</span>
                <span>·</span>
                <span>{sketch.channels}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Code Viewer & Copy Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
        {/* Sketch Details Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>{selectedSketch.title}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{selectedSketch.description}</p>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-all shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Código Copiado!' : 'Copiar Código'}</span>
          </button>
        </div>

        {/* Code Block */}
        <div className="flex-1 p-6 overflow-y-auto font-mono text-xs text-slate-200 bg-slate-950 selection:bg-cyan-500/30 selection:text-cyan-200">
          <pre className="leading-relaxed whitespace-pre-wrap">{selectedSketch.code}</pre>
        </div>
      </div>
    </div>
  );
};
