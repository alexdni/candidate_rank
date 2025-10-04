'use client';

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native-web';
import { Criterion } from '@/lib/resumeAnalyzer';

interface CriteriaInputProps {
  criteria: Criterion[];
  onCriteriaChange: (criteria: Criterion[]) => void;
}

export default function CriteriaInput({ criteria, onCriteriaChange }: CriteriaInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const addCriterion = () => {
    if (criteria.length >= 5) return;

    const newCriterion: Criterion = {
      id: `criterion_${Date.now()}`,
      name: '',
      description: '',
      keywords: [],
    };

    onCriteriaChange([...criteria, newCriterion]);
  };

  const updateCriterion = (index: number, field: keyof Criterion, value: string | string[]) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    onCriteriaChange(updated);
  };

  const removeCriterion = (index: number) => {
    const updated = criteria.filter((_, i) => i !== index);
    onCriteriaChange(updated);
  };

  const updateKeywords = (index: number, keywordString: string) => {
    const keywords = keywordString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    updateCriterion(index, 'keywords', keywords);
  };

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? 16 : 0 }}
      >
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#1f2937' }}>
          Screening Criteria ({criteria.length}/5)
        </Text>
        <Text style={{ fontSize: 24, color: '#6b7280' }}>
          {isExpanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
            Define up to 5 criteria to evaluate candidates. Keywords are optional but help validate AI results.
          </Text>

          {criteria.map((criterion, index) => (
            <View
              key={criterion.id}
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                backgroundColor: '#f9fafb',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937' }}>
                  Criterion {index + 1}
                </Text>
                <TouchableOpacity
                  onPress={() => removeCriterion(index)}
                  style={{ backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Remove</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 4, fontWeight: '500' }}>
                Name *
              </Text>
              <TextInput
                value={criterion.name}
                onChangeText={(value) => updateCriterion(index, 'name', value)}
                placeholder="e.g., React Native"
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 12,
                  fontSize: 14,
                  backgroundColor: 'white',
                  outlineStyle: 'none',
                }}
              />

              <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 4, fontWeight: '500' }}>
                Description *
              </Text>
              <TextInput
                value={criterion.description}
                onChangeText={(value) => updateCriterion(index, 'description', value)}
                placeholder="e.g., Must have explicit React Native experience (not just React/JavaScript)"
                multiline
                numberOfLines={2}
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 12,
                  fontSize: 14,
                  backgroundColor: 'white',
                  minHeight: 60,
                  outlineStyle: 'none',
                }}
              />

              <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 4, fontWeight: '500' }}>
                Validation Keywords (optional, comma-separated)
              </Text>
              <TextInput
                value={criterion.keywords?.join(', ') || ''}
                onChangeText={(value) => updateKeywords(index, value)}
                placeholder="e.g., react native, react-native"
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 6,
                  padding: 10,
                  fontSize: 14,
                  backgroundColor: 'white',
                  outlineStyle: 'none',
                }}
              />
            </View>
          ))}

          {criteria.length < 5 && (
            <TouchableOpacity
              onPress={addCriterion}
              style={{
                backgroundColor: '#3b82f6',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                + Add Criterion
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
