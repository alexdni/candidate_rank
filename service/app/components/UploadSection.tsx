'use client';

import { useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native-web';

interface UploadSectionProps {
  onFilesUploaded: (files: File[]) => void;
  isProcessing: boolean;
}

export default function UploadSection({ onFilesUploaded, isProcessing }: UploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');

    if (pdfFiles.length > 0) {
      onFilesUploaded(pdfFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}>
      <Text style={{ fontSize: 20, fontWeight: '600', color: '#1f2937', marginBottom: 16 }}>
        Upload Resumes
      </Text>

      <View style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: '#d1d5db', borderRadius: 8, padding: 32, alignItems: 'center' }}>
        <svg
          style={{ width: 48, height: 48, color: '#9ca3af', marginBottom: 16 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 8, textAlign: 'center' }}>
          Click to upload or drag and drop
        </Text>
        <Text style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16, textAlign: 'center' }}>
          PDF files only (max 10MB each)
        </Text>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <TouchableOpacity
          onPress={handleButtonClick}
          disabled={isProcessing}
          style={{
            backgroundColor: isProcessing ? '#9ca3af' : '#3b82f6',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            {isProcessing ? 'Processing...' : 'Select Files'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 16, backgroundColor: '#f3f4f6', padding: 12, borderRadius: 6 }}>
        <Text style={{ fontSize: 14, color: '#4b5563', fontWeight: '600', marginBottom: 4 }}>
          What we look for:
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280' }}>
          • React Native development experience{'\n'}
          • EEG/EKG/DSP signal processing expertise{'\n'}
          • Biomedical engineering background
        </Text>
      </View>
    </View>
  );
}
