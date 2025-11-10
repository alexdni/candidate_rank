'use client'

/**
 * ProfileFormModal Component
 * Modal for creating and editing job profiles
 */

import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native-web'
import { useProfiles } from '../contexts/ProfileContext'
import CriteriaInput from './CriteriaInput'
import type { Criterion } from '@/lib/resumeAnalyzer'
import type { Profile } from '@/types/database'

interface ProfileFormModalProps {
  mode: 'create' | 'edit'
  profile?: Profile
  onClose: () => void
  onSuccess: () => void
}

export default function ProfileFormModal({ mode, profile, onClose, onSuccess }: ProfileFormModalProps) {
  const { createProfile, updateProfile, loading, error } = useProfiles()

  const [name, setName] = useState(profile?.name || '')
  const [description, setDescription] = useState(profile?.description || '')
  const [criteria, setCriteria] = useState<Criterion[]>(
    profile?.criteria || [
      {
        id: 'criterion_1',
        name: '',
        description: '',
        keywords: [],
      },
    ]
  )

  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setFormError('Profile name is required')
      return
    }

    if (criteria.length === 0) {
      setFormError('At least one criterion is required')
      return
    }

    const incompleteCriteria = criteria.filter(c => !c.name || !c.description)
    if (incompleteCriteria.length > 0) {
      setFormError('All criteria must have a name and description')
      return
    }

    setFormError(null)

    let success = false

    if (mode === 'create') {
      const result = await createProfile({
        name: name.trim(),
        description: description.trim() || undefined,
        criteria,
      })
      success = result !== null
    } else if (mode === 'edit' && profile) {
      success = await updateProfile(profile.id, {
        name: name.trim(),
        description: description.trim() || null,
        criteria,
      })
    }

    if (success) {
      onSuccess()
    }
  }

  return (
    <View style={styles.overlay}>
      <ScrollView style={styles.modalScroll} contentContainerStyle={{ alignItems: 'center', padding: 20 }}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'create' ? 'Create New Profile' : 'Edit Profile'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {(formError || error) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{formError || error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profile Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Senior React Native Developer"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., Looking for 5+ years of React Native experience with strong TypeScript skills"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            <View style={styles.criteriaSection}>
              <Text style={styles.label}>Screening Criteria *</Text>
              <Text style={styles.hint}>
                Define the criteria you'll use to evaluate candidates for this role
              </Text>
              <CriteriaInput criteria={criteria} onCriteriaChange={setCriteria} />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'create' ? 'Create Profile' : 'Save Changes'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = {
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
  },
  modalScroll: {
    flex: 1,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 700,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    flexDirection: 'row' as any,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as any,
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    padding: 12,
    margin: 24,
    marginBottom: 0,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as any,
    color: '#374151',
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    outlineStyle: 'none' as any,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as any,
  },
  criteriaSection: {
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row' as any,
    justifyContent: 'flex-end',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600' as any,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as any,
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed' as any,
  },
}
