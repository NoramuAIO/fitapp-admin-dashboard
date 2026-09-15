'use client'

import { useEffect, useState } from 'react'

interface Stats {
  date: string
  steps: number
  calories: number
}

export default function ActivityChart() {
  const [stats, setStats] = useState<Stats[]>([])
  const [period, setPeriod] = useState('weekly')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
  const maxValue = Math.max(...stats.map(d => d.steps), 10000)

  // Find the highest value for tooltip
  const maxSteps = Math.max(...stats.map(d => d.steps), 0)
  const maxStepIndex = stats.findIndex(d => d.steps === maxSteps)

  return (
    <div className="bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48"></div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <h2 className="text-2xl font-bold text-white">Aktivite</h2>
        <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 border border-white/10">
          <span>Haftalık</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Chart */}
      <div className="relative h-64 mb-4">
        {/* Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-20">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-t border-white/30" />
          ))}
        </div>

        {/* Bars and Line */}
        <div className="relative h-full flex items-end justify-between px-2 gap-4">
          {stats.map((item, index) => {
            const height = (item.steps / maxValue) * 100
            const prevHeight = index > 0 ? (stats[index - 1].steps / maxValue) * 100 : height
            const date = new Date(item.date)
            const dayIndex = date.getDay()
            const isMax = index === maxStepIndex

            return (
              <div key={item.date} className="flex-1 flex flex-col items-center relative group">
                {/* Vertical Line */}
                <div
                  className="absolute bottom-0 w-0.5 bg-white/20 transition-all duration-300"
                  style={{ height: `${height}%` }}
                />

                {/* Data Point */}
                <div
                  className="absolute w-4 h-4 bg-white rounded-full border-4 border-[#FF6B6B] shadow-lg z-10 cursor-pointer transition-all duration-300 group-hover:scale-150"
                  style={{ bottom: `${height}%` }}
                  title={`${item.steps} adım`}
                >
                  {/* Tooltip */}
                  {isMax && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-[#FF6B6B] text-white px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap shadow-xl animate-bounce">
                      {item.steps}
                      <div className="text-xs font-normal opacity-90">Adım</div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#FF6B6B]"></div>
                    </div>
                  )}
                </div>

                {/* Connecting Line */}
                {index > 0 && (
                  <svg
                    className="absolute pointer-events-none"
                    style={{
                      left: '-50%',
                      bottom: `${Math.min(prevHeight, height)}%`,
                      width: '100%',
                      height: `${Math.abs(height - prevHeight) + 4}%`,
                    }}
                  >
                    <line
                      x1="50%"
                      y1={prevHeight > height ? '0%' : '100%'}
                      x2="50%"
                      y2={prevHeight > height ? '100%' : '0%'}
                      stroke="#FF6B6B"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
            )
          })}
        </div>

        {/* X-axis Labels */}
        <div className="absolute -bottom-10 left-0 right-0 flex justify-between px-2">
          {stats.map((item) => {
            const date = new Date(item.date)
            const dayIndex = date.getDay()
            return (
              <div key={item.date} className="flex-1 text-center">
                <span className="text-white/90 text-sm font-semibold">{days[dayIndex]}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
