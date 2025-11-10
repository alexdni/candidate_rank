'use client'

/**
 * Profile Context
 * Manages job profiles for authenticated users
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import type { Profile, Resume } from '@/types/database'

interface ProfileContextType {
  profiles: Profile[]
  activeProfile: Profile | null
  resumes: Resume[]
  loading: boolean
  error: string | null

  // Profile operations
  createProfile: (data: { name: string; description?: string; criteria: any[] }) => Promise<Profile | null>
  updateProfile: (id: string, data: Partial<Profile>) => Promise<boolean>
  deleteProfile: (id: string) => Promise<boolean>
  selectProfile: (id: string | null) => void
  refreshProfiles: () => Promise<void>

  // Resume operations
  refreshResumes: () => Promise<void>
  deleteResume: (resumeId: string) => Promise<boolean>
}

const ProfileContext = createContext<ProfileContextType>({
  profiles: [],
  activeProfile: null,
  resumes: [],
  loading: false,
  error: null,
  createProfile: async () => null,
  updateProfile: async () => false,
  deleteProfile: async () => false,
  selectProfile: () => {},
  refreshProfiles: async () => {},
  refreshResumes: async () => {},
  deleteResume: async () => false,
})

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load profiles when user logs in
  useEffect(() => {
    if (user) {
      refreshProfiles()

      // Restore last selected profile from localStorage
      const lastProfileId = localStorage.getItem('lastProfileId')
      if (lastProfileId) {
        // Will be set after profiles are loaded
        setTimeout(() => {
          const profile = profiles.find(p => p.id === lastProfileId)
          if (profile) {
            selectProfile(profile.id)
          }
        }, 100)
      }
    } else {
      // Clear state when user logs out
      setProfiles([])
      setActiveProfile(null)
      setResumes([])
      localStorage.removeItem('lastProfileId')
    }
  }, [user])

  // Load resumes when active profile changes
  useEffect(() => {
    if (activeProfile) {
      refreshResumes()
    } else {
      setResumes([])
    }
  }, [activeProfile])

  const refreshProfiles = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/profiles')

      if (response.status === 401) {
        setError('Please sign in to view profiles')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to load profiles')
      }

      const data = await response.json()
      setProfiles(data.profiles || [])
    } catch (err: any) {
      console.error('Error loading profiles:', err)
      setError(err.message || 'Failed to load profiles')
    } finally {
      setLoading(false)
    }
  }, [user])

  const refreshResumes = useCallback(async () => {
    if (!activeProfile) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/profiles/${activeProfile.id}/resumes`)

      if (!response.ok) {
        throw new Error('Failed to load resumes')
      }

      const data = await response.json()
      setResumes(data.resumes || [])
    } catch (err: any) {
      console.error('Error loading resumes:', err)
      setError(err.message || 'Failed to load resumes')
    } finally {
      setLoading(false)
    }
  }, [activeProfile])

  const createProfile = async (data: { name: string; description?: string; criteria: any[] }) => {
    if (!user) {
      setError('Please sign in to create profiles')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create profile')
      }

      const result = await response.json()
      const newProfile = result.profile

      setProfiles(prev => [newProfile, ...prev])
      selectProfile(newProfile.id)

      return newProfile
    } catch (err: any) {
      console.error('Error creating profile:', err)
      setError(err.message || 'Failed to create profile')
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (id: string, data: Partial<Profile>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update profile')
      }

      const result = await response.json()
      const updatedProfile = result.profile

      setProfiles(prev => prev.map(p => p.id === id ? updatedProfile : p))

      if (activeProfile?.id === id) {
        setActiveProfile(updatedProfile)
      }

      return true
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile')
      return false
    } finally {
      setLoading(false)
    }
  }

  const deleteProfile = async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete profile')
      }

      setProfiles(prev => prev.filter(p => p.id !== id))

      if (activeProfile?.id === id) {
        setActiveProfile(null)
        localStorage.removeItem('lastProfileId')
      }

      return true
    } catch (err: any) {
      console.error('Error deleting profile:', err)
      setError(err.message || 'Failed to delete profile')
      return false
    } finally {
      setLoading(false)
    }
  }

  const selectProfile = (id: string | null) => {
    if (id === null) {
      setActiveProfile(null)
      localStorage.removeItem('lastProfileId')
      return
    }

    const profile = profiles.find(p => p.id === id)
    if (profile) {
      setActiveProfile(profile)
      localStorage.setItem('lastProfileId', id)
    }
  }

  const deleteResume = async (resumeId: string) => {
    if (!activeProfile) return false

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/profiles/${activeProfile.id}/resumes/${resumeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete resume')
      }

      setResumes(prev => prev.filter(r => r.id !== resumeId))
      return true
    } catch (err: any) {
      console.error('Error deleting resume:', err)
      setError(err.message || 'Failed to delete resume')
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        resumes,
        loading,
        error,
        createProfile,
        updateProfile,
        deleteProfile,
        selectProfile,
        refreshProfiles,
        refreshResumes,
        deleteResume,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfiles = () => {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfiles must be used within a ProfileProvider')
  }
  return context
}
