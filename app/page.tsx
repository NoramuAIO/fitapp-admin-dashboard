'use client'

import Header from '@/components/Header'
import ProgramsPage from '@/components/ProgramsPage'
import Sidebar from '@/components/Sidebar'
import UserDashboard from '@/components/UserDashboard'
import UserSelector from '@/components/UserSelector'
import { useEffect, useState } from 'react'

export default function Home() {
  const [activeTab, setActiveTab] = useState('home')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  useEffect(() => {
    // Check if user was previously selected
    if (typeof window !== 'undefined') {
      const savedUserId = localStorage.getItem('selectedUserId')
      if (savedUserId) {
        setSelectedUserId(parseInt(savedUserId))
      }
    }
  }, [])

  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedUserId', userId.toString())
    }
  }

  const handleChangeUser = () => {
    setSelectedUserId(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedUserId')
    }
  }

  // Show user selector if no user is selected and on home tab
  if (selectedUserId === null && activeTab === 'home') {
    return <UserSelector onSelectUser={handleSelectUser} />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F0F]">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'home' && selectedUserId && (
            <UserDashboard userId={selectedUserId} onChangeUser={handleChangeUser} />
          )}
          {activeTab === 'programs' && <ProgramsPage />}
          {activeTab === 'users' && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-white mb-4">Kullanıcılar</h1>
              <p className="text-gray-400">Kullanıcı yönetimi yakında eklenecek...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
