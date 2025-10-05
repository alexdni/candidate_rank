'use client';

import { View, Text, TouchableOpacity } from 'react-native-web';

interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  candidateName: string;
}

export default function PDFModal({ isOpen, onClose, pdfUrl, candidateName }: PDFModalProps) {
  if (!isOpen) return null;

  return (
    <View
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <View
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          maxWidth: 1000,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e: any) => e.stopPropagation()}
      >
        {/* Header */}
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937' }}>
            {candidateName}
          </Text>
          <TouchableOpacity
            onPress={onClose}
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

        {/* PDF Viewer */}
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title={`Resume - ${candidateName}`}
          />
        </View>
      </View>
    </View>
  );
}
