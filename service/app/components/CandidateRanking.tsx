'use client';

import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native-web';
import { Candidate } from '../page';

interface CandidateRankingProps {
  candidates: Candidate[];
}

export default function CandidateRanking({ candidates }: CandidateRankingProps) {
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => b.qualificationsCount - a.qualificationsCount);
  }, [candidates]);

  const categories = useMemo(() => {
    const reactNative = candidates.filter(c => c.react_native).length;
    const eegEkgDsp = candidates.filter(c => c.eeg_ekg_dsp).length;
    const biomedical = candidates.filter(c => c.biomedical).length;
    const twoOrMore = candidates.filter(c => c.qualificationsCount >= 2).length;
    const allThree = candidates.filter(c => c.qualificationsCount === 3).length;

    return { reactNative, eegEkgDsp, biomedical, twoOrMore, allThree };
  }, [candidates]);

  const QualificationBadge = ({ label, active }: { label: string; active: boolean }) => (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: active ? '#10b981' : '#e5e7eb',
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: active ? 'white' : '#6b7280', fontSize: 13, fontWeight: '600' }}>
        {active ? '✓ ' : ''}{label}
      </Text>
    </View>
  );

  return (
    <View>
      {/* Summary Stats */}
      <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 }}>
          Summary Statistics
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          <StatCard label="React Native" count={categories.reactNative} color="#3b82f6" />
          <StatCard label="EEG/EKG/DSP" count={categories.eegEkgDsp} color="#8b5cf6" />
          <StatCard label="Biomedical" count={categories.biomedical} color="#ec4899" />
          <StatCard label="2+ Qualifications" count={categories.twoOrMore} color="#f59e0b" />
          <StatCard label="All 3 Qualifications" count={categories.allThree} color="#10b981" />
        </View>
      </View>

      {/* Candidate List */}
      <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 }}>
          Ranked Candidates
        </Text>

        {sortedCandidates.map((candidate, index) => (
          <View
            key={index}
            style={{
              borderWidth: 1,
              borderColor: candidate.qualificationsCount === 3 ? '#10b981' : candidate.qualificationsCount >= 2 ? '#f59e0b' : '#e5e7eb',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
              backgroundColor: candidate.qualificationsCount === 3 ? '#f0fdf4' : candidate.qualificationsCount >= 2 ? '#fffbeb' : 'white',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: candidate.qualificationsCount === 3 ? '#10b981' : candidate.qualificationsCount >= 2 ? '#f59e0b' : '#6b7280',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937' }}>
                  {candidate.name}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: candidate.qualificationsCount === 3 ? '#10b981' : candidate.qualificationsCount >= 2 ? '#f59e0b' : '#6b7280',
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>
                  {candidate.qualificationsCount}/3 Qualifications
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
              <QualificationBadge label="React Native" active={candidate.react_native} />
              <QualificationBadge label="EEG/EKG/DSP" active={candidate.eeg_ekg_dsp} />
              <QualificationBadge label="Biomedical" active={candidate.biomedical} />
            </View>

            <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 6 }}>
              <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
                {candidate.summary}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={{ flex: 1, minWidth: 150, backgroundColor: '#f9fafb', padding: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: color }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: color, marginBottom: 4 }}>
        {count}
      </Text>
      <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '500' }}>
        {label}
      </Text>
    </View>
  );
}
