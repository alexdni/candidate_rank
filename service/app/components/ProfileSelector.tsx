'use client'

/**
 * ProfileSelector Component
 * Dropdown to select and manage job profiles
 */

import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native-web'
import { useProfiles } from '../contexts/ProfileContext'
import ProfileFormModal from './ProfileFormModal'

export default function ProfileSelector() {
  const { profiles, activeProfile, selectProfile, loading } = useProfiles()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleSelectProfile = (id: string | null) => {
    selectProfile(id)
    setShowDropdown(false)
  }

  const handleCreateNew = () => {
    setShowDropdown(false)
    setShowCreateModal(true)
  }

  const handleEditProfile = () => {
    setShowEditModal(true)
  }

  return (
    <>
      {showCreateModal && (
        <ProfileFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}

      {showEditModal && activeProfile && (
        <ProfileFormModal
          mode="edit"
          profile={activeProfile}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => setShowEditModal(false)}
        />
      )}

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Select Job Profile</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateNew}>
            <Text style={styles.createButtonText}>+ New Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Cards Grid */}
        <View style={styles.profileGrid}>
          {/* Anonymous Mode Card */}
          <TouchableOpacity
            style={[styles.profileCard, !activeProfile && styles.profileCardActive]}
            onPress={() => handleSelectProfile(null)}
          >
            <View style={styles.profileCardHeader}>
              <Text style={styles.profileCardTitle}>Anonymous Mode</Text>
              {!activeProfile && <Text style={styles.activeIndicator}>✓</Text>}
            </View>
            <Text style={styles.profileCardDesc}>Use custom criteria without saving</Text>
          </TouchableOpacity>

          {/* User Profiles */}
          {profiles.map(profile => (
            <TouchableOpacity
              key={profile.id}
              style={[
                styles.profileCard,
                activeProfile?.id === profile.id && styles.profileCardActive,
              ]}
              onPress={() => handleSelectProfile(profile.id)}
            >
              <View style={styles.profileCardHeader}>
                <Text style={styles.profileCardTitle}>{profile.name}</Text>
                {activeProfile?.id === profile.id && (
                  <Text style={styles.activeIndicator}>✓</Text>
                )}
              </View>
              {profile.description && (
                <Text style={styles.profileCardDesc}>{profile.description}</Text>
              )}
              <Text style={styles.profileCardCriteria}>
                {profile.criteria.length} {profile.criteria.length === 1 ? 'criterion' : 'criteria'}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Empty State */}
          {profiles.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No profiles yet</Text>
              <Text style={styles.emptySubtext}>Click "+ New Profile" to create your first one</Text>
            </View>
          )}
        </View>

        {/* Active Profile Details */}
        {activeProfile && (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>
                📋 Screening Criteria for "{activeProfile.name}"
              </Text>
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.criteriaGrid}>
              {activeProfile.criteria.map((criterion, index) => (
                <View key={criterion.id} style={styles.criterionCard}>
                  <Text style={styles.criterionNumber}>{index + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.criterionName}>{criterion.name}</Text>
                    <Text style={styles.criterionDesc}>{criterion.description}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.hint}>
              💾 Uploaded resumes will be saved to this profile
            </Text>
          </View>
        )}
      </View>
    </>
  )
}

const styles = {
  container: {
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: 'row' as any,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as any,
    color: '#1f2937',
  },
  createButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600' as any,
  },
  profileGrid: {
    flexDirection: 'row' as any,
    flexWrap: 'wrap' as any,
    gap: 16,
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 16,
    minWidth: 220,
    flex: 1,
    maxWidth: 300,
    cursor: 'pointer' as any,
    transition: 'all 0.2s ease',
  },
  profileCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
  },
  profileCardHeader: {
    flexDirection: 'row' as any,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  profileCardTitle: {
    fontSize: 16,
    fontWeight: '600' as any,
    color: '#1f2937',
    flex: 1,
  },
  activeIndicator: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: 'bold' as any,
    marginLeft: 8,
  },
  profileCardDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  profileCardCriteria: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500' as any,
  },
  emptyCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed' as any,
    padding: 24,
    minWidth: 220,
    flex: 1,
    maxWidth: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500' as any,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center' as any,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  },
  detailsHeader: {
    flexDirection: 'row' as any,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600' as any,
    color: '#1f2937',
  },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600' as any,
  },
  criteriaGrid: {
    gap: 12,
  },
  criterionCard: {
    flexDirection: 'row' as any,
    gap: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  criterionNumber: {
    fontSize: 14,
    fontWeight: '700' as any,
    color: '#3b82f6',
    minWidth: 24,
  },
  criterionName: {
    fontSize: 14,
    fontWeight: '600' as any,
    color: '#1f2937',
    marginBottom: 4,
  },
  criterionDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 12,
    fontStyle: 'italic' as any,
    textAlign: 'center' as any,
  },
}
