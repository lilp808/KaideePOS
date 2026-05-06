import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export default function Dashboard({ userId }) {
  const [stats, setStats] = useState({
    totalSales: 0,
    orderCount: 0,
    topItem: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/orders/today?userId=${userId}`)
        const data = await response.json()
        
        setStats({
          totalSales: data.totalSales || 0,
          orderCount: data.orderCount || 0,
          topItem: data.topItem || null
        })
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        setLoading(false)
      }
    }

    fetchStats()
  }, [userId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Today's Stats Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 slide-up">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          📊 สรุปวันนี้
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Total Sales */}
          <div className="text-center p-4 bg-line-green rounded-lg">
            <div className="text-3xl font-bold text-white">
              ฿{stats.totalSales.toLocaleString()}
            </div>
            <div className="text-sm text-green-100 mt-1">
              ยอดขายรวม
            </div>
          </div>

          {/* Order Count */}
          <div className="text-center p-4 bg-line-blue rounded-lg">
            <div className="text-3xl font-bold text-white">
              {stats.orderCount}
            </div>
            <div className="text-sm text-blue-100 mt-1">
              จำนวนออเดอร์
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling Item */}
      <div className="bg-white rounded-xl shadow-sm p-6 slide-up">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          🏆 สินค้าขายดี
        </h3>
        
        {stats.topItem ? (
          <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
            <div className="text-xl font-semibold text-yellow-800">
              {stats.topItem.name}
            </div>
            <div className="text-sm text-yellow-600 mt-1">
              ขายไป {stats.topItem.qty} รายการ
            </div>
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-gray-500">
              ยังไม่มีข้อมูลการขายวันนี้
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => window.open(`line://app/${process.env.NEXT_PUBLIC_LIFF_ID}`}
          className="bg-line-green text-white py-4 px-6 rounded-lg font-medium text-lg shadow-sm hover:bg-green-600 transition-colors"
        >
          📱 เปิดร้านบน LINE
        </button>
        
        <button 
          onClick={() => window.location.reload()}
          className="bg-gray-100 text-gray-700 py-4 px-6 rounded-lg font-medium text-lg hover:bg-gray-200 transition-colors"
        >
          🔄 รีเฟรชข้อมูล
        </button>
      </div>
    </div>
  )
}
