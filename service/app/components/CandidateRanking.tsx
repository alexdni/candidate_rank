'use client';

import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native-web';
import { Candidate } from '../page';
import { Criterion } from '@/lib/resumeAnalyzer';

interface CandidateRankingProps {
  candidates: Candidate[];
  criteria: Criterion[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function CandidateRanking({ candidates, criteria }: CandidateRankingProps) {
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => b.qualificationsCount - a.qualificationsCount);
  }, [candidates]);

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

      {/* Candidate List */}
      <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 }}>
          Ranked Candidates
        </Text>

        {sortedCandidates.map((candidate, index) => {
          const totalCriteria = criteria.length;
          const isTopCandidate = candidate.qualificationsCount === totalCriteria;
          const isStrongCandidate = candidate.qualificationsCount >= Math.ceil(totalCriteria / 2);

          return (
            <View
              key={index}
              style={{
                borderWidth: 1,
                borderColor: isTopCandidate ? '#10b981' : isStrongCandidate ? '#f59e0b' : '#e5e7eb',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
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
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937' }}>
                    {candidate.name}
                  </Text>
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

              <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 6 }}>
                <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
                  {candidate.summary}
                </Text>
              </View>
            </View>
          );
        })}
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
