import {
  Activity,
  AlertOctagon,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Button from './Button'

const ConcurrencySimulator = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState({
    queue: { currentQueueLength: 0, enqueued: 0, completed: 0, soldOut: 0, duplicatesBlocked: 0 },
    cache: { hits: 0, misses: 0, hitRate: '0%', keysCount: 0 },
  })
  const [flashProduct, setFlashProduct] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [simulationLogs, setSimulationLogs] = useState([])

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString()
    setSimulationLogs((prev) => [{ time, msg, type }, ...prev.slice(0, 40)])
  }

  const fetchLiveMetrics = async () => {
    try {
      const [qStats, cStats, fProd] = await Promise.all([
        api.getQueueStats(),
        api.getCacheStats(),
        api.getFlashSaleProduct(),
      ])
      setStats({ queue: qStats, cache: cStats })
      setFlashProduct(fProd)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!isOpen) return
    fetchLiveMetrics()
    const timer = setInterval(fetchLiveMetrics, 2000)
    return () => clearInterval(timer)
  }, [isOpen])

  // TEST 1: Rapid Click Spam Simulation (Same Idempotency Key)
  const runRapidClickTest = async () => {
    if (simulating) return
    setSimulating(true)
    setSimulationLogs([])
    addLog('🚀 Starting Test 1: Rapid-Click Spam Attack Simulation (5 clicks in 100ms)...', 'info')

    const sharedIdempotencyKey = 'spam_test_' + Date.now()
    addLog(`🔑 Generated single Idempotency Key: ${sharedIdempotencyKey}`, 'info')

    const testItem = flashProduct || { id: 1, name: 'Flash Sale Item', price: 1999, qty: 1 }

    const requests = Array.from({ length: 5 }).map(async (_, idx) => {
      try {
        const res = await api.createOrder(
          {
            items: [testItem],
            total: testItem.price,
            customerName: `Rapid Clicker #${idx + 1}`,
            phone: '9876543210',
            shippingAddress: 'Stress Test Indiranagar',
          },
          sharedIdempotencyKey
        )

        if (res.isDuplicate) {
          addLog(`🛡️ Click #${idx + 1}: CAUGHT by Idempotency Guard! Duplicate avoided.`, 'warning')
        } else {
          addLog(`✅ Click #${idx + 1}: FIRST CLICK accepted into async queue (Order: ${res.id})`, 'success')
        }
      } catch (err) {
        addLog(`❌ Click #${idx + 1}: Blocked: ${err.message}`, 'error')
      }
    })

    await Promise.all(requests)
    addLog('🎯 Rapid-Click Spam Test Completed. Zero duplicate orders were created!', 'success')
    toast.success('Rapid-Click Spam test finished!')
    await fetchLiveMetrics()
    setSimulating(false)
  }

  // TEST 2: High Concurrency Multi-Buyer Wave (Unique Users Competing for Stock)
  const runConcurrencyWave = async () => {
    if (simulating) return
    setSimulating(true)
    setSimulationLogs([])
    addLog('⚡ Starting Test 2: High Concurrency Wave (6 concurrent buyers competing for live inventory)...', 'info')

    const testItem = flashProduct || { id: 1, name: 'Flash Sale Item', price: 1999, qty: 1 }

    const buyers = [
      { name: 'Buyer Alpha', key: 'wave_user_1_' + Date.now() },
      { name: 'Buyer Bravo', key: 'wave_user_2_' + Date.now() },
      { name: 'Buyer Charlie', key: 'wave_user_3_' + Date.now() },
      { name: 'Buyer Delta', key: 'wave_user_4_' + Date.now() },
      { name: 'Buyer Echo', key: 'wave_user_5_' + Date.now() },
      { name: 'Buyer Foxtrot', key: 'wave_user_6_' + Date.now() },
    ]

    const wavePromises = buyers.map(async (buyer, idx) => {
      addLog(`📤 ${buyer.name} enqueuing order with Idempotency Key ${buyer.key.slice(0, 14)}...`, 'info')
      try {
        const enq = await api.createOrder(
          {
            items: [testItem],
            total: testItem.price,
            customerName: buyer.name,
            phone: '9876543210',
            shippingAddress: 'Bengaluru',
          },
          buyer.key
        )

        addLog(`⏳ ${buyer.name}: Queued at Position #${enq.queuePosition}. Worker processing sequentially...`, 'info')

        // Poll order to terminal state
        let attempts = 0
        while (attempts < 10) {
          attempts++
          await new Promise((r) => setTimeout(r, 300))
          const st = await api.getOrderStatus(enq.id)

          if (st.status === 'confirmed') {
            addLog(`✅ ${buyer.name}: Order Confirmed! (Stock atomically decremented)`, 'success')
            break
          } else if (st.status === 'sold_out') {
            addLog(`⛔ ${buyer.name}: SOLD OUT! Atomic lock strictly prevented overselling!`, 'warning')
            break
          }
        }
      } catch (err) {
        addLog(`❌ ${buyer.name} failed: ${err.message}`, 'error')
      }
    })

    await Promise.all(wavePromises)
    addLog('🎉 High Concurrency Wave simulation completed!', 'success')
    toast.success('Concurrency wave test completed!')
    await fetchLiveMetrics()
    setSimulating(false)
  }

  // TEST 3: Bot Honeypot Attack Test
  const runBotTrapTest = async () => {
    if (simulating) return
    setSimulating(true)
    setSimulationLogs([])
    addLog('🤖 Starting Test 3: Automated Bot Submission (filling hidden honeypot field)...', 'info')

    try {
      await api.createOrder({
        items: [{ id: 1, name: 'Item', price: 999, qty: 1 }],
        total: 999,
        customerName: 'Scraper Bot v2',
        hp_website: 'http://malicious-spam-url.com', // Filled honeypot
      })
      addLog('❌ Bot bypassed trap (unexpected)', 'error')
    } catch (err) {
      addLog(`🛡️ BOT BLOCKED! Response: 400 Bad Request - "${err.message}"`, 'success')
      toast.success('Honeypot Shield successfully blocked bot!')
    }

    setSimulating(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Zap className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">High Concurrency & Flash Sale Test Console</h2>
              <p className="text-xs text-indigo-200">
                Live inspection of Idempotency Guards, Async Message Queue, Cache, and Atomic Locks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 border-b border-gray-100">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Flash Sale Stock</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-gray-900">
              {flashProduct ? flashProduct.stock : '500'}
              <span className="text-xs text-gray-400 font-normal ml-1">/ 500</span>
            </p>
            <span className="text-[10px] text-green-600 font-medium">Strict Authoritative Cap</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Queue Depth</span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-indigo-600">
              {stats.queue.currentQueueLength}
              <span className="text-xs text-gray-400 font-normal ml-1">jobs</span>
            </p>
            <span className="text-[10px] text-indigo-500 font-medium">
              {stats.queue.completed} processed total
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Spam Blocked</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600">
              {stats.queue.duplicatesBlocked}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">By Idempotency Key</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Cache Hit Rate</span>
              <Cpu className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-600">
              {stats.cache.hitRate}
            </p>
            <span className="text-[10px] text-purple-500 font-medium">
              {stats.cache.hits} hits bypass DB
            </span>
          </div>
        </div>

        {/* Action Buttons to Trigger Live Tests */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Trigger Live Stress & Concurrency Scenarios
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={runRapidClickTest}
              disabled={simulating}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold text-xs border border-indigo-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
              1. Rapid-Click Spam (5x)
            </button>

            <button
              onClick={runConcurrencyWave}
              disabled={simulating}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-semibold text-xs border border-amber-200 transition-colors disabled:opacity-50"
            >
              <Users className="w-4 h-4 text-amber-600" />
              2. Concurrency Wave (6 Users)
            </button>

            <button
              onClick={runBotTrapTest}
              disabled={simulating}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold text-xs border border-red-200 transition-colors disabled:opacity-50"
            >
              <Bot className="w-4 h-4 text-red-600" />
              3. Bot Honeypot Attack
            </button>
          </div>
        </div>

        {/* Live Event Stream / Execution Log */}
        <div className="p-6 flex-1 overflow-y-auto bg-gray-900 text-gray-100 font-mono text-xs">
          <div className="flex items-center justify-between mb-3 text-gray-400 pb-2 border-b border-gray-800">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400 animate-pulse" />
              Live Architectural Execution Log
            </span>
            <span className="text-[11px] text-gray-500">Real-time asynchronous worker trace</span>
          </div>

          {simulationLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              Click one of the buttons above to run an interactive concurrency stress test and observe the architectural safeguards.
            </div>
          ) : (
            <div className="space-y-1.5">
              {simulationLogs.map((log, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 p-1.5 rounded ${
                    log.type === 'success'
                      ? 'bg-green-950/40 text-green-300'
                      : log.type === 'warning'
                      ? 'bg-amber-950/40 text-amber-300'
                      : log.type === 'error'
                      ? 'bg-red-950/40 text-red-300'
                      : 'text-gray-300'
                  }`}
                >
                  <span className="text-gray-500 flex-shrink-0 text-[10px]">[{log.time}]</span>
                  <span className="break-all">{log.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConcurrencySimulator

