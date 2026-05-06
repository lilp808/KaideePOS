export default function BottomNav({ currentPage, setCurrentPage }) {
  const navItems = [
    { id: 'dashboard', label: '🏠', name: 'หน้าแรก' },
    { id: 'menu', label: '📋', name: 'เมนู' },
    { id: 'history', label: '📊', name: 'ประวัติ' }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              currentPage === item.id
                ? 'text-line-green bg-green-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <span className="text-2xl mb-1">{item.label}</span>
            <span className="text-xs">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
