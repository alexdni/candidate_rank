'use client';

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native-web';
import UploadSection from './components/UploadSection';
import CandidateRanking from './components/CandidateRanking';
import CriteriaInput from './components/CriteriaInput';
import AuthModal from './components/AuthModal';
import ProfileSelector from './components/ProfileSelector';
import { Criterion } from '@/lib/resumeAnalyzer';
import { useAuth } from './contexts/AuthContext';
import { useProfiles } from './contexts/ProfileContext';

export interface Candidate {
  name: string;
  criteria: Record<string, boolean>;
  summary: string;
  qualificationsCount: number;
  blobUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'failed';
  verificationScore?: number;
  verificationDetails?: any; // Will be typed properly later
}

const DEFAULT_CRITERIA: Criterion[] = [
  {
    id: 'criterion_1',
    name: '',
    description: '',
    keywords: [],
  },
];

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { activeProfile, resumes, refreshResumes } = useProfiles();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string>('');
  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULT_CRITERIA);

  // Load criteria from active profile
  useEffect(() => {
    if (activeProfile && activeProfile.criteria.length > 0) {
      setCriteria(activeProfile.criteria);
    } else if (!activeProfile) {
      setCriteria(DEFAULT_CRITERIA);
    }
  }, [activeProfile]);

  // Load resumes from active profile into candidates
  useEffect(() => {
    if (resumes.length > 0) {
      const loadedCandidates = resumes.map(resume => ({
        name: resume.filename.replace('.pdf', ''),
        criteria: resume.analysis_result?.criteria || {},
        summary: resume.analysis_result?.summary || '',
        qualificationsCount: resume.analysis_result?.qualificationsCount || 0,
        blobUrl: resume.blob_url,
        linkedinUrl: resume.linkedin_url || undefined,
        githubUrl: resume.github_url || undefined,
        verificationStatus: resume.verification_result ? ('verified' as const) : ('unverified' as const),
        verificationScore: resume.verification_result?.overallScore,
        verificationDetails: resume.verification_result,
      }));
      setCandidates(loadedCandidates);
    } else if (activeProfile) {
      // Clear candidates when switching to a profile with no resumes
      setCandidates([]);
    }
  }, [resumes, activeProfile]);

  const handleFilesUploaded = async (files: File[]) => {
    setIsProcessing(true);
    const newCandidates: Candidate[] = [];

    for (const file of files) {
      try {
        setCurrentlyProcessing(file.name);

        // Convert file to base64
        const fileData = await fileToBase64(file);

        // Upload file to Vercel Blob
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileData,
          }),
        });

        if (!uploadResponse.ok) {
          console.error(`Failed to upload ${file.name}`);
          continue;
        }

        const uploadData = await uploadResponse.json();

        // Analyze resume
        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileData,
            criteria,
          }),
        });

        if (analyzeResponse.ok) {
          const candidate = await analyzeResponse.json();
          newCandidates.push({ ...candidate, blobUrl: uploadData.url });

          // Save to profile if one is selected
          if (activeProfile && user) {
            try {
              await fetch(`/api/profiles/${activeProfile.id}/resumes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  filename: file.name,
                  blob_url: uploadData.url,
                  linkedin_url: candidate.linkedinUrl,
                  github_url: candidate.githubUrl,
                  analysis_result: {
                    criteria: candidate.criteria,
                    summary: candidate.summary,
                    qualificationsCount: candidate.qualificationsCount,
                  },
                }),
              });
            } catch (err) {
              console.error(`Failed to save ${file.name} to profile:`, err);
              // Continue anyway - user still gets analysis
            }
          }
        } else {
          console.error(`Failed to analyze ${file.name}`);
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }

    // If using a profile, refresh resumes from database
    if (activeProfile && user) {
      await refreshResumes();
    } else {
      // Anonymous mode - just add to local state
      setCandidates(prev => [...prev, ...newCandidates]);
    }

    setIsProcessing(false);
    setCurrentlyProcessing('');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleClearAll = () => {
    setCandidates([]);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setCandidates([]);
    setCriteria(DEFAULT_CRITERIA);
  };

  // Show loading spinner while checking auth status
  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      {/* Auth Modal */}
      {showAuthModal && <AuthModal onSuccess={handleAuthSuccess} />}

      <View style={{ maxWidth: 1200, marginHorizontal: 'auto', width: '100%', padding: 24 }}>
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <img src="/logo.svg" alt="Logo" style={{ width: 48, height: 48, marginRight: 16 }} />
              <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#1f2937' }}>
                Resume Screening System
              </Text>
            </View>
            {/* Auth Status */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {user ? (
                <>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>{user.email}</Text>
                  <TouchableOpacity
                    onPress={handleSignOut}
                    style={{ backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}
                  >
                    <Text style={{ color: 'white', fontWeight: '600' }}>Sign Out</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowAuthModal(true)}
                  style={{ backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>Sign In</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={{ fontSize: 18, color: '#6b7280', marginBottom: 4 }}>
            Define your screening criteria and upload resumes to analyze candidates
          </Text>
          <Text style={{ fontSize: 14, color: '#9ca3af', fontStyle: 'italic' }}>
            An Alex Ni production
          </Text>
          {!user && (
            <View style={{ marginTop: 12, backgroundColor: '#dbeafe', padding: 12, borderRadius: 6 }}>
              <Text style={{ color: '#1e40af', fontSize: 14 }}>
                💡 Sign in to save your job profiles and screening results!
              </Text>
            </View>
          )}
        </View>

        {/* Profile Selector (only for authenticated users) */}
        {user && <ProfileSelector />}

        {/* Criteria Input (only in anonymous mode - authenticated users manage criteria via profiles) */}
        {!user && <CriteriaInput criteria={criteria} onCriteriaChange={setCriteria} />}

        {/* Upload Section - only show if user has criteria (either from profile or anonymous mode) */}
        {((user && activeProfile) || !user) && (
          <UploadSection onFilesUploaded={handleFilesUploaded} isProcessing={isProcessing} disabled={criteria.length === 0 || criteria.some(c => !c.name || !c.description)} />
        )}

        {isProcessing && (
          <View style={{ marginTop: 24, alignItems: 'center', padding: 16, backgroundColor: '#eff6ff', borderRadius: 8 }}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={{ marginTop: 12, color: '#1e40af', fontSize: 16, fontWeight: '600' }}>
              Analyzing resume...
            </Text>
            {currentlyProcessing && (
              <Text style={{ marginTop: 8, color: '#3b82f6', fontSize: 14 }}>
                📄 {currentlyProcessing}
              </Text>
            )}
          </View>
        )}

        {candidates.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937' }}>
                Candidate Rankings ({candidates.length})
              </Text>
              <TouchableOpacity
                onPress={handleClearAll}
                style={{
                  backgroundColor: '#ef4444',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <CandidateRanking candidates={candidates} criteria={criteria} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}
