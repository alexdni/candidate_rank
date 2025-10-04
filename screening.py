import os
import re
import fitz  # PyMuPDF
from openai import OpenAI
import json
import csv
from datetime import datetime

# Configuration
RESUME_DIR = "/home/deepdrill/src/resumes/source"  # Update path as needed
API_BASE = "http://localhost:1234/v1"
MODEL_NAME = "mistralai/mistral-7b-instruct-v0.3"  # Recommended alternative model
TEXT_EXTRACT_LIMIT = 15000  # Increased context window

def extract_text_from_pdf(pdf_path):
    """Improved text extraction with formatting preservation and cover letter detection"""
    doc = fitz.open(pdf_path)
    text = []
    
    # Enhanced cover letter detection
    first_page_text = doc[0].get_text("text", flags=fitz.TEXT_PRESERVE_LIGATURES).lower()
    cover_keywords = {
        'cover letter', 'dear hiring', 'application for',
        'position applying', 'to whom it may concern'
    }
    
    start_page = 1 if any(kw in first_page_text for kw in cover_keywords) else 0
    
    # Extract text from remaining pages with formatting preservation
    for page in doc.pages(start_page, len(doc)):
        text.append(page.get_text("text", flags=fitz.TEXT_PRESERVE_LIGATURES | fitz.TEXT_INHIBIT_SPACES))
    
    return "\n".join(text)[:TEXT_EXTRACT_LIMIT]

def parse_json_response(response_text):
    """Robust JSON parsing with multiple fallback strategies"""
    try:
        # Try direct parse first
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Handle markdown code blocks
        json_match = re.search(r'```json\n(.*?)\n```', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        
        # Find first JSON-like structure
        json_str = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_str:
            return json.loads(json_str.group(0))
        
        raise RuntimeError("No valid JSON found in response")

def analyze_resume(text):
    """Analyze resume with enhanced prompt and validation"""
    prompt = f"""Analyze this resume and respond in JSON format. Check for:
1. React Native experience - must include explicit "React Native" mentions (not just React/JavaScript)
2. EEG/EKG/DSP processing - look for signal processing terms paired with medical applications
3. Biomedical engineering - degree, medical devices, or clinical collaborations

Important rules:
- React experience alone doesn't count as React Native
- General programming terms don't count as DSP experience
- School projects count if substantial (3+ months)
- Be conservative - only mark true if clear evidence exists

Return format:
{{
    "react_native": boolean,
    "eeg_ekg_dsp": boolean,
    "biomedical": boolean,
    "summary": "1-sentence qualification summary"
}}

Resume text:
{text}
"""

    client = OpenAI(base_url=API_BASE, api_key="lm-studio")
    
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "You are an expert technical recruiter. Be precise and conservative in your analysis."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=500
    )
    
    response_text = response.choices[0].message.content
    return parse_json_response(response_text)

def validate_analysis(text, analysis):
    """Secondary validation against raw text"""
    text_lower = text.lower()
    
    # React Native validation
    if analysis.get("react_native", False):
        if not any(term in text_lower for term in {"react native", "react-native"}):
            analysis["react_native"] = False
    
    # EEG/EKG/DSP validation
    if analysis.get("eeg_ekg_dsp", False):
        medical_terms = {"eeg", "ekg", "electrocardiogram", "electroencephalogram", "biomedical signals"}
        processing_terms = {"signal processing", "dsp", "filter design", "feature extraction"}
        
        has_medical = any(term in text_lower for term in medical_terms)
        has_processing = any(term in text_lower for term in processing_terms)
        
        if not (has_medical and has_processing):
            analysis["eeg_ekg_dsp"] = False
    
    # Biomedical validation
    if analysis.get("biomedical", False):
        bio_terms = {
            "biomedical engineering", "medical device", "fda regulations",
            "clinical trial", "physiological monitoring"
        }
        if not any(term in text_lower for term in bio_terms):
            analysis["biomedical"] = False
    
    return analysis

def main():
    if not os.path.exists(RESUME_DIR):
        raise FileNotFoundError(f"Resume directory not found: {RESUME_DIR}")
    
    all_candidates = []
    categories = {
        'react_native': [],
        'eeg_ekg_dsp': [],
        'biomedical': [],
        'two_of_three': [],
        'all_three': []
    }

    for filename in os.listdir(RESUME_DIR):
        if filename.lower().endswith(".pdf"):
            path = os.path.join(RESUME_DIR, filename)
            try:
                print(f"\nProcessing: {filename}")
                text = extract_text_from_pdf(path)
                
                if not text.strip():
                    print(f"Skipped {filename} - no text extracted")
                    continue
                
                analysis = analyze_resume(text)
                analysis = validate_analysis(text, analysis)
                
                # Create candidate record
                candidate = {
                    "name": os.path.splitext(filename)[0],
                    "react_native": analysis.get("react_native", False),
                    "eeg_ekg_dsp": analysis.get("eeg_ekg_dsp", False),
                    "biomedical": analysis.get("biomedical", False),
                    "summary": analysis.get("summary", "No summary generated")
                }
                all_candidates.append(candidate)
                
                # Print real-time summary
                print(f"Summary: {candidate['summary']}")
                print(f"React Native: {'✅' if candidate['react_native'] else '❌'}")
                print(f"EEG/EKG/DSP: {'✅' if candidate['eeg_ekg_dsp'] else '❌'}")
                print(f"Biomedical: {'✅' if candidate['biomedical'] else '❌'}")
                
                # Categorize candidates
                count = sum([candidate["react_native"], candidate["eeg_ekg_dsp"], candidate["biomedical"]])
                if candidate["react_native"]: categories['react_native'].append(candidate)
                if candidate["eeg_ekg_dsp"]: categories['eeg_ekg_dsp'].append(candidate)
                if candidate["biomedical"]: categories['biomedical'].append(candidate)
                if count >= 2: categories['two_of_three'].append(candidate)
                if count == 3: categories['all_three'].append(candidate)
                
            except Exception as e:
                print(f"\nError processing {filename}:")
                print(f"Error details: {str(e)}")

    # Generate CSV report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"candidate_report_{timestamp}.csv"
    
    with open(csv_filename, 'w', newline='') as csvfile:
        fieldnames = ['Name', 'Qualifications Count', 'React Native', 'EEG/EKG/DSP', 'Biomedical', 'Summary']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for candidate in all_candidates:
            writer.writerow({
                'Name': candidate["name"],
                'Qualifications Count': sum([candidate["react_native"], candidate["eeg_ekg_dsp"], candidate["biomedical"]]),
                'React Native': '*' if candidate["react_native"] else '',
                'EEG/EKG/DSP': '*' if candidate["eeg_ekg_dsp"] else '',
                'Biomedical': '*' if candidate["biomedical"] else '',
                'Summary': candidate["summary"]
            })

    # Print final summary
    print(f"\n{' Final Report ':=^40}")
    print(f"Total candidates processed: {len(all_candidates)}")
    print(f"React Native developers: {len(categories['react_native'])}")
    print(f"EEG/EKG/DSP experts: {len(categories['eeg_ekg_dsp'])}")
    print(f"Biomedical engineers: {len(categories['biomedical'])}")
    print(f"Candidates with 2+ qualifications: {len(categories['two_of_three'])}")
    print(f"Top candidates (all 3 qualifications): {len(categories['all_three'])}")
    print(f"\nCSV report generated: {csv_filename}")

if __name__ == "__main__":
    main()