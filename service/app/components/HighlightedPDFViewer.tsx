'use client';

import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native-web';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface HighlightedPDFViewerProps {
  pdfUrl: string;
  keywords: string[];
}

export default function HighlightedPDFViewer({ pdfUrl, keywords }: HighlightedPDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(600);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setPageWidth(containerRef.current.offsetWidth - 32);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Custom text renderer to highlight keywords
  const customTextRenderer = (textItem: any) => {
    const text = textItem.str;
    const lowerText = text.toLowerCase();

    // Check if any keyword is in this text
    const matchedKeywords = keywords.filter(keyword =>
      lowerText.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      // Highlight the text by wrapping it in a span with yellow background
      return `<mark style="background-color: #fef08a; padding: 2px 0;">${text}</mark>`;
    }

    return text;
  };

  return (
    <View
      ref={containerRef as any}
      style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 16,
      }}
    >
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading PDF...</Text>
          </View>
        }
        error={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#ef4444', fontSize: 16 }}>Failed to load PDF</Text>
          </View>
        }
      >
        {Array.from(new Array(numPages), (el, index) => (
          <View
            key={`page_${index + 1}`}
            style={{
              marginBottom: 16,
              backgroundColor: 'white',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Page
              pageNumber={index + 1}
              width={pageWidth}
              customTextRenderer={customTextRenderer}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </View>
        ))}
      </Document>
    </View>
  );
}
