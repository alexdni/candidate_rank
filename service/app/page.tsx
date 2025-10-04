'use client';

import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native-web';
import UploadSection from './components/UploadSection';
import CandidateRanking from './components/CandidateRanking';
import CriteriaInput from './components/CriteriaInput';
import { Criterion } from '@/lib/resumeAnalyzer';

export interface Candidate {
  name: string;
  criteria: Record<string, boolean>;
  summary: string;
  qualificationsCount: number;
}

const DEFAULT_CRITERIA: Criterion[] = [
  {
    id: 'react_native',
    name: 'React Native',
    description: 'Must have explicit React Native experience (not just React/JavaScript)',
    keywords: ['react native', 'react-native'],
  },
  {
    id: 'eeg_ekg_dsp',
    name: 'EEG/EKG/DSP',
    description: 'Signal processing experience with medical applications (EEG, EKG, biomedical signals)',
    keywords: ['eeg', 'ekg', 'electrocardiogram', 'electroencephalogram', 'signal processing', 'dsp'],
  },
  {
    id: 'biomedical',
    name: 'Biomedical Engineering',
    description: 'Biomedical engineering degree, medical device development, or clinical experience',
    keywords: ['biomedical engineering', 'medical device', 'fda regulations', 'clinical trial'],
  },
];

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULT_CRITERIA);

  const handleFilesUploaded = async (files: File[]) => {
    setIsProcessing(true);
    const newCandidates: Candidate[] = [];

    for (const file of files) {
      try {
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
          newCandidates.push(candidate);
        } else {
          console.error(`Failed to analyze ${file.name}`);
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }

    setCandidates(prev => [...prev, ...newCandidates]);
    setIsProcessing(false);
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

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ maxWidth: 1200, marginHorizontal: 'auto', width: '100%', padding: 24 }}>
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 }}>
            Resume Screening System
          </Text>
          <Text style={{ fontSize: 18, color: '#6b7280' }}>
            Define your screening criteria and upload resumes to analyze candidates
          </Text>
        </View>

        <CriteriaInput criteria={criteria} onCriteriaChange={setCriteria} />

        <UploadSection onFilesUploaded={handleFilesUploaded} isProcessing={isProcessing} disabled={criteria.length === 0 || criteria.some(c => !c.name || !c.description)} />

        {isProcessing && (
          <View style={{ marginTop: 24, alignItems: 'center', padding: 16, backgroundColor: '#eff6ff', borderRadius: 8 }}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={{ marginTop: 12, color: '#1e40af', fontSize: 16 }}>
              Processing resumes...
            </Text>
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
