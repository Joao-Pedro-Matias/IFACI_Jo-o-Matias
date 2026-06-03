"use client"
import { useState, useEffect, useCallback } from "react"

const API = "http://localhost:8080"
const SENSOR_IDS = [1, 2, 3]

interface Sensor {
  id: number
  temperatura: number
  pressao: number
  umidade: number
  sensor_presenca: boolean
  trava_seguranca: boolean
}

// ── Gauge Circular SVG ────────────────────────────────────────────────────────
function CircularGauge({
  label,
  value,
  unit,
  min,
  max,
  color,
}: {
  label: string
  value: number | undefined
  unit: string
  min: number
  max: number
  color: string
}) {
  const SIZE = 88
  const STROKE = 8
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  // Arco de 270° (¾ do círculo)
  const ARC = CIRC * 0.75

  const pct =
    value !== undefined
      ? Math.min(1, Math.max(0, (value - min) / (max - min)))
      : 0

  const filled = ARC * pct

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Filtro de glow */}
        <defs>
          <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Arco de fundo */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="#1f2937"
          strokeWidth={STROKE}
          strokeDasharray={`${ARC} ${CIRC}`}
          strokeLinecap="round"
          transform={`rotate(135 ${SIZE / 2} ${SIZE / 2})`}
        />

        {/* Arco de valor */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={`${filled} ${CIRC}`}
          strokeLinecap="round"
          transform={`rotate(135 ${SIZE / 2} ${SIZE / 2})`}
          filter={pct > 0 ? `url(#glow-${label})` : undefined}
          style={{ transition: "stroke-dasharray 0.7s ease" }}
        />

        {/* Valor */}
        <text
          x={SIZE / 2}
          y={SIZE / 2 - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="14"
          fontWeight="bold"
          fontFamily="'Courier New', monospace"
        >
          {value !== undefined ? value : "—"}
        </text>

        {/* Unidade */}
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#6b7280"
          fontSize="9"
          fontFamily="'Courier New', monospace"
        >
          {unit}
        </text>
      </svg>

      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  )
}

// ── LED inline ────────────────────────────────────────────────────────────────
function LEDRow({
  label,
  active,
  onLabel,
  offLabel,
}: {
  label: string
  active: boolean | undefined
  onLabel: string
  offLabel: string
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            active ? "bg-green-400 shadow-[0_0_6px_#4ade80]" : "bg-gray-700"
          }`}
        />
        <span className={active ? "text-green-400 font-semibold" : "text-gray-600"}>
          {active === undefined ? "—" : active ? onLabel : offLabel}
        </span>
      </div>
    </div>
  )
}

// ── Painel de um sensor ───────────────────────────────────────────────────────
function SensorPanel({ id, sensor }: { id: number; sensor: Sensor | undefined }) {
  const online = sensor !== undefined

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-5 flex flex-col gap-5 transition-all duration-300 ${
        online ? "border-gray-700" : "border-gray-800 opacity-50"
      }`}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold tracking-widest text-white uppercase">
          Sensor #{id}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              online ? "bg-green-400 animate-pulse" : "bg-gray-700"
            }`}
          />
          <span className="text-xs text-gray-500">
            {online ? "online" : "aguardando"}
          </span>
        </div>
      </div>

      {/* Gauges circulares */}
      <div className="flex justify-around gap-6">
        <CircularGauge
          label="Temp"
          value={sensor?.temperatura}
          unit="°C"
          min={-10}
          max={80}
          color="#ef4444"
        />
        <CircularGauge
          label="Pressão"
          value={sensor?.pressao}
          unit="hPa"
          min={900}
          max={1100}
          color="#3b82f6"
        />
        <CircularGauge
          label="Umidade"
          value={sensor?.umidade}
          unit="%"
          min={0}
          max={100}
          color="#06b6d4"
        />
      </div>

      {/* Separador */}
      <div className="border-t border-gray-800" />

      {/* LEDs */}
      <div className="flex flex-col gap-2">
        <LEDRow
          label="Presença"
          active={sensor?.sensor_presenca}
          onLabel="Acionado"
          offLabel="Desacionado"
        />
        <LEDRow
          label="Trava"
          active={sensor?.trava_seguranca}
          onLabel="Ativada"
          offLabel="Desativada"
        />
      </div>
    </div>
  )
}

// ── Modal de Edição ───────────────────────────────────────────────────────────
function EditModal({
  sensor,
  onClose,
  onSaved,
}: {
  sensor: Sensor
  onClose: () => void
  onSaved: () => void
}) {
  const [temperatura, setTemperatura] = useState(String(sensor.temperatura))
  const [pressao, setPressao] = useState(String(sensor.pressao))
  const [umidade, setUmidade] = useState(String(sensor.umidade))
  const [presenca, setPresenca] = useState(sensor.sensor_presenca)
  const [trava, setTrava] = useState(sensor.trava_seguranca)
  const [saving, setSaving] = useState(false)

  const salvar = async () => {
    setSaving(true)
    try {
      await fetch(`${API}/sensor/${sensor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperatura: parseFloat(temperatura),
          pressao: parseFloat(pressao),
          umidade: parseFloat(umidade),
          sensor_presenca: presenca,
          trava_seguranca: trava,
        }),
      })
      onSaved()
      onClose()
    } catch (e) {
      alert("Erro ao salvar: " + e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-[420px] p-6 flex flex-col gap-4">
        <p className="text-sm tracking-widest text-gray-400 uppercase">
          Editar — Sensor #{sensor.id}
        </p>

        {(
          [
            { label: "Temperatura (°C)", value: temperatura, set: setTemperatura },
            { label: "Pressão (hPa)", value: pressao, set: setPressao },
            { label: "Umidade (%)", value: umidade, set: setUmidade },
          ] as const
        ).map(({ label, value, set }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{label}</label>
            <input
              type="number"
              value={value}
              onChange={e => set(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        ))}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={presenca}
            onChange={e => setPresenca(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-300">Sensor de Presença</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={trava}
            onChange={e => setTrava(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-300">Trava de Segurança</span>
        </label>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm transition-colors"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [sensores, setSensores] = useState<Sensor[]>([])
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null)

  const fetchSensores = useCallback(async () => {
    try {
      const res = await fetch(`${API}/iot`)
      const data: Sensor[] = await res.json()
      setSensores(data)
      setConnected(true)
      setLastUpdate(new Date())
    } catch {
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    fetchSensores()
    const interval = setInterval(fetchSensores, 3000)
    return () => clearInterval(interval)
  }, [fetchSensores])

  return (
    <div
      className="min-h-screen bg-gray-950 text-white flex flex-col"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      {/* ── Topbar ── */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-gray-400 text-xs tracking-[0.2em] uppercase">
            IoT HMI Dashboard
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-400 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-500">
            {connected
              ? `ONLINE · ${lastUpdate?.toLocaleTimeString("pt-BR")}`
              : "DESCONECTADO"}
          </span>
          <span className="text-xs text-gray-700 ml-3">
            {sensores.length} leitura{sensores.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">

        {/* Painéis dos 3 sensores */}
        <section>
          <p className="text-xs tracking-[0.2em] text-gray-500 uppercase mb-4">
            Monitoramento em Tempo Real
          </p>
          <div className="grid grid-cols-3 gap-4">
            {SENSOR_IDS.map(id => (
              <SensorPanel
                key={id}
                id={id}
                sensor={sensores.find(s => s.id === id)}
              />
            ))}
          </div>
        </section>

        {/* Tabela histórica */}
        <section>
          <p className="text-xs tracking-[0.2em] text-gray-500 uppercase mb-4">
            Histórico de Leituras
          </p>

          {sensores.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
              <p className="text-gray-600 text-sm">
                {connected
                  ? "Nenhuma leitura registrada ainda."
                  : "Aguardando conexão com a API em localhost:8080..."}
              </p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-600 text-xs">
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-right px-4 py-3">Temp °C</th>
                    <th className="text-right px-4 py-3">Pressão hPa</th>
                    <th className="text-right px-4 py-3">Umidade %</th>
                    <th className="text-center px-4 py-3">Presença</th>
                    <th className="text-center px-4 py-3">Trava</th>
                    <th className="text-center px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...sensores].reverse().map(s => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-500 tabular-nums">#{s.id}</td>
                      <td className="px-4 py-3 text-right text-red-400 font-semibold tabular-nums">
                        {s.temperatura}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-400 font-semibold tabular-nums">
                        {s.pressao}
                      </td>
                      <td className="px-4 py-3 text-right text-cyan-400 font-semibold tabular-nums">
                        {s.umidade}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            s.sensor_presenca
                              ? "bg-green-400 shadow-[0_0_8px_#4ade80]"
                              : "bg-gray-700"
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            s.trava_seguranca
                              ? "bg-green-400 shadow-[0_0_8px_#4ade80]"
                              : "bg-gray-700"
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setEditingSensor(s)}
                          className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-2 py-0.5 transition-colors"
                        >
                          editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ── Modal de Edição ── */}
      {editingSensor && (
        <EditModal
          sensor={editingSensor}
          onClose={() => setEditingSensor(null)}
          onSaved={fetchSensores}
        />
      )}
    </div>
  )
}
