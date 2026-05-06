import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export default function SalesHistory({ userId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`/api/orders?userId=${userId}`)
        const data = await response.json()
        setOrders(data || [])
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch orders:', error)
        setLoading(false)
      }
    }

    fetchOrders()
  }, [userId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        📋 ประวัติการขาย
      </h2>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-gray-500">ยังไม่มีประวัติการขาย</p>
          <p className="text-sm text-gray-400 mt-2">เมื่อมีการสั่งซื้อ ข้อมูลจะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y">
          {orders.map((order) => (
            <div key={order.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">
                    ออเดอร์ #{order.id}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(order.created_at), 'PPP', { locale: th })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-line-green">
                    ฿{order.total.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* View Items Button */}
              <button
                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                className="mt-3 w-full bg-gray-50 text-gray-600 py-2 px-4 rounded-lg text-sm hover:bg-gray-100 transition-colors"
              >
                {selectedOrder?.id === order.id ? 'ซ่อนรายการ' : 'ดูรายการสินค้า'}
              </button>

              {/* Order Items */}
              {selectedOrder?.id === order.id && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    รายการสินค้าในออเดอร์นี้:
                  </div>
                  {/* You would need to fetch order items here */}
                  <div className="text-sm text-gray-500">
                    กำลังดำเนินการแสดงรายการสินค้า...
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
