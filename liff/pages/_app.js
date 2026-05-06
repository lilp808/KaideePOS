import '../styles/globals.css'
import { liff } from '@line/liff'
import { useState, useEffect } from 'react'
import Dashboard from '../components/Dashboard'
import MenuManagement from '../components/MenuManagement'
import SalesHistory from '../components/SalesHistory'
import BottomNav from '../components/BottomNav'
import Loading from '../components/Loading'

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID })
        
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }

        const profile = await liff.getProfile()
        setUserProfile(profile)
        setUserId(profile.userId)
        setLoading(false)
        
        // Send userId to backend for user sync
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.userId })
        })
      } catch (error) {
        console.error('LIFF initialization failed:', error)
        setLoading(false)
      }
    }

    initLiff()
  }, [])

  if (loading) {
    return <Loading />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard userId={userId} />
      case 'menu':
        return <MenuManagement userId={userId} />
      case 'history':
        return <SalesHistory userId={userId} />
      default:
        return <Dashboard userId={userId} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-20">
        <div className="p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-center text-line-green">
              🏪 ระบบขายหน้าร้าน
            </h1>
            {userProfile && (
              <p className="text-center text-gray-600 text-sm mt-2">
                สวัสดี, {profile.displayName}
              </p>
            )}
          </div>
          
          {renderPage()}
        </div>
      </div>
      
      <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </div>
  )
}
