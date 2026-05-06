import { useState, useEffect } from 'react'

export default function MenuManagement({ userId }) {
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({ name: '', price: '' })

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await fetch(`/api/menus?userId=${userId}`)
        const data = await response.json()
        setMenus(data || [])
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch menus:', error)
        setLoading(false)
      }
    }

    fetchMenus()
  }, [userId])

  const handleAdd = async () => {
    if (!formData.name || !formData.price) return

    try {
      const response = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: formData.name,
          price: parseFloat(formData.price)
        })
      })

      if (response.ok) {
        setFormData({ name: '', price: '' })
        setShowAddModal(false)
        // Refresh menus
        const refreshResponse = await fetch(`/api/menus?userId=${userId}`)
        const data = await refreshResponse.json()
        setMenus(data || [])
      }
    } catch (error) {
      console.error('Failed to add menu:', error)
    }
  }

  const handleEdit = async (item) => {
    try {
      const response = await fetch(`/api/menus/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingItem.name,
          price: parseFloat(editingItem.price)
        })
      })

      if (response.ok) {
        setEditingItem(null)
        // Refresh menus
        const refreshResponse = await fetch(`/api/menus?userId=${userId}`)
        const data = await refreshResponse.json()
        setMenus(data || [])
      }
    } catch (error) {
      console.error('Failed to edit menu:', error)
    }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('ต้องการลบเมนูนี้ใช่หรือไม่?')) return

    try {
      const response = await fetch(`/api/menus/${itemId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMenus(menus.filter(menu => menu.id !== itemId))
      }
    } catch (error) {
      console.error('Failed to delete menu:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Menu Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full bg-line-green text-white py-4 px-6 rounded-lg font-medium shadow-sm hover:bg-green-600 transition-colors"
      >
        ➕ เพิ่มเมนูใหม่
      </button>

      {/* Menu List */}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {menus.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>ยังไม่มีเมนูในระบบ</p>
            <p className="text-sm mt-2">กดปุ่มด้านบนเพื่อเพิ่มเมนูแรก</p>
          </div>
        ) : (
          menus.map((menu) => (
            <div key={menu.id} className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800">{menu.name}</h4>
                <p className="text-line-green font-bold text-lg">฿{menu.price}</p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingItem(menu)}
                  className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(menu.id)}
                  className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">เพิ่มเมนูใหม่</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อเมนู
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green focus:border-transparent"
                  placeholder="เช่น: ชาเย็น"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ราคา
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 bg-line-green text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">แก้ไขเมนู</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อเมนู
                </label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ราคา
                </label>
                <input
                  type="number"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleEdit(editingItem)}
                className="flex-1 bg-line-green text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
