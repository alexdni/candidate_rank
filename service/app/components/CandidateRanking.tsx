'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native-web';
import { Candidate } from '../page';
import { Criterion } from '@/lib/resumeAnalyzer';
import PDFModal from './PDFModal';

// Import PDF viewer dynamically to avoid SSR issues
const HighlightedPDFViewer = dynamic(() => import('./HighlightedPDFViewer'), {
  ssr: false,
  loading: () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <Text style={{ color: '#6b7280' }}>Loading PDF viewer...</Text>
    </View>
  ),
});

interface CandidateRankingProps {
  candidates: Candidate[];
  criteria: Criterion[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

function getScoreColor(score: number | undefined): string {
  if (!score) return '#6b7280';
  if (score >= 75) return '#10b981'; // green
  if (score >= 50) return '#f59e0b'; // yellow
  return '#6b7280'; // gray
}

export default function CandidateRanking({ candidates, criteria }: CandidateRankingProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [localCandidates, setLocalCandidates] = useState<Candidate[]>(candidates);

  // Update local candidates when props change
  useMemo(() => {
    setLocalCandidates(candidates);
  }, [candidates]);

  const sortedCandidates = useMemo(() => {
    return [...localCandidates].sort((a, b) => b.qualificationsCount - a.qualificationsCount);
  }, [localCandidates]);

  const handleVerify = async (candidate: Candidate) => {
    // Set status to pending
    setLocalCandidates(prev =>
      prev.map(c =>
        c.name === candidate.name
          ? { ...c, verificationStatus: 'pending' as const }
          : c
      )
    );

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedinUrl: candidate.linkedinUrl,
          githubUrl: candidate.githubUrl,
          keywords: criteria.flatMap(c => c.keywords || []),
        }),
      });

      const result = await response.json();

      if (response.ok && result.verificationStatus === 'verified') {
        // Update with verification results
        setLocalCandidates(prev =>
          prev.map(c =>
            c.name === candidate.name
              ? {
                  ...c,
                  verificationStatus: 'verified' as const,
                  verificationScore: result.verificationScore,
                  verificationDetails: result.verificationDetails,
                }
              : c
          )
        );
      } else {
        // Verification failed
        setLocalCandidates(prev =>
          prev.map(c =>
            c.name === candidate.name
              ? {
                  ...c,
                  verificationStatus: 'failed' as const,
                  verificationDetails: { errors: [result.error || 'Verification failed'] },
                }
              : c
          )
        );
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      // Update with error status
      setLocalCandidates(prev =>
        prev.map(c =>
          c.name === candidate.name
            ? {
                ...c,
                verificationStatus: 'failed' as const,
                verificationDetails: { errors: [error.message || 'Network error'] },
              }
            : c
        )
      );
    }
  };

  const criteriaStats = useMemo(() => {
    return criteria.map(criterion => ({
      id: criterion.id,
      name: criterion.name,
      count: candidates.filter(c => c.criteria[criterion.id]).length,
      color: COLORS[criteria.indexOf(criterion) % COLORS.length],
    }));
  }, [candidates, criteria]);

  const multiQualStats = useMemo(() => {
    const totalCriteria = criteria.length;
    const stats: { label: string; count: number; threshold: number }[] = [];

    if (totalCriteria >= 2) {
      stats.push({
        label: `${Math.ceil(totalCriteria / 2)}+ Criteria`,
        count: candidates.filter(c => c.qualificationsCount >= Math.ceil(totalCriteria / 2)).length,
        threshold: Math.ceil(totalCriteria / 2),
      });
    }

    if (totalCriteria >= 3) {
      stats.push({
        label: `All ${totalCriteria} Criteria`,
        count: candidates.filter(c => c.qualificationsCount === totalCriteria).length,
        threshold: totalCriteria,
      });
    }

    return stats;
  }, [candidates, criteria]);

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
          {criteriaStats.map(stat => (
            <StatCard key={stat.id} label={stat.name} count={stat.count} color={stat.color} />
          ))}
          {multiQualStats.map(stat => (
            <StatCard key={stat.label} label={stat.label} count={stat.count} color="#f59e0b" />
          ))}
        </View>
      </View>

      {/* Main Content: Candidate List + Resume Viewer */}
      <View style={{ flexDirection: 'row', gap: 24 }}>
        {/* Candidate List */}
        <View style={{ flex: selectedCandidate ? 1 : 1, backgroundColor: 'white', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 }}>
            Ranked Candidates
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {sortedCandidates.map((candidate, index) => {
          const totalCriteria = criteria.length;
          const isTopCandidate = candidate.qualificationsCount === totalCriteria;
          const isStrongCandidate = candidate.qualificationsCount >= Math.ceil(totalCriteria / 2);

          return (
            <View
              key={index}
              style={{
                flex: 1,
                minWidth: 400,
                maxWidth: '50%',
                borderWidth: 1,
                borderColor: isTopCandidate ? '#10b981' : isStrongCandidate ? '#f59e0b' : '#e5e7eb',
                borderRadius: 8,
                padding: 16,
                backgroundColor: isTopCandidate ? '#f0fdf4' : isStrongCandidate ? '#fffbeb' : 'white',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: isTopCandidate ? '#10b981' : isStrongCandidate ? '#f59e0b' : '#6b7280',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                      {index + 1}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedCandidate(candidate)}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#3b82f6', textDecorationLine: 'underline', cursor: 'pointer' }}>
                      {candidate.name}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: isTopCandidate ? '#10b981' : isStrongCandidate ? '#f59e0b' : '#6b7280',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>
                    {candidate.qualificationsCount}/{totalCriteria} Criteria
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {criteria.map(criterion => (
                  <QualificationBadge
                    key={criterion.id}
                    label={criterion.name}
                    active={candidate.criteria[criterion.id] || false}
                  />
                ))}
              </View>

              <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 6, marginBottom: 12 }}>
                <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
                  {candidate.summary}
                </Text>
              </View>

              {/* Verification Section */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                {/* Verify Button */}
                {(candidate.linkedinUrl || candidate.githubUrl) && (
                  <TouchableOpacity
                    onPress={() => handleVerify(candidate)}
                    disabled={candidate.verificationStatus === 'pending'}
                    style={{
                      backgroundColor: candidate.verificationStatus === 'pending' ? '#9ca3af' : '#3b82f6',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      opacity: candidate.verificationStatus === 'pending' ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                      {candidate.verificationStatus === 'pending' ? 'Verifying...' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Verification Badge */}
                {candidate.verificationStatus === 'verified' && candidate.verificationScore !== undefined && (
                  <View
                    style={{
                      backgroundColor: getScoreColor(candidate.verificationScore),
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                      ✓ Verified {candidate.verificationScore}/100
                    </Text>
                  </View>
                )}

                {/* Error Message */}
                {candidate.verificationStatus === 'failed' && (
                  <Text style={{ color: '#ef4444', fontSize: 13 }}>
                    Unable to verify{candidate.verificationDetails?.errors?.[0] ? `: ${candidate.verificationDetails.errors[0]}` : ''}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
          </View>
        </View>

        {/* Resume Viewer Panel */}
        {selectedCandidate && (
          <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937' }}>
                {selectedCandidate.name}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedCandidate(null)}
                style={{
                  backgroundColor: '#f3f4f6',
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18, color: '#6b7280', fontWeight: 'bold' }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* PDF Viewer with Keyword Highlighting */}
            <HighlightedPDFViewer
              pdfUrl={selectedCandidate.blobUrl || ''}
              keywords={criteria.flatMap(c => c.keywords || [])}
            />
          </View>
        )}
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
