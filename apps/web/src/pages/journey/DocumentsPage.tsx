import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { SideBySideReview } from '../../components/SideBySideReview';
import { InconsistencyDialog } from '../../components/InconsistencyDialog';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import { useJourney } from '../../context/JourneyContext';
import { ExtractedDocument, DiscrepancyItem, DocumentType } from '@educaro/shared';
import {
  Upload,
  FileCheck,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileText,
  Clock,
  HelpCircle,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const { user, token } = useAuth();
  const { inconsistencies, resolveDiscrepancy, refreshJourney } = useJourney();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<ExtractedDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeConflict, setActiveConflict] = useState<DiscrepancyItem | null>(null);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // APS India user-managed preparation status & checklist state
  type ApsStatus = 'NOT_STARTED' | 'PREPARING_DOCUMENTS' | 'APPLICATION_SUBMITTED' | 'AWAITING_VERIFICATION' | 'CERTIFICATE_RECEIVED';
  const [apsStatus, setApsStatus] = useState<ApsStatus>(() => {
    return (localStorage.getItem('educaro_aps_status') as ApsStatus) || 'NOT_STARTED';
  });
  const [apsChecklist, setApsChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('educaro_aps_checklist');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleUpdateApsStatus = (newStatus: ApsStatus) => {
    setApsStatus(newStatus);
    localStorage.setItem('educaro_aps_status', newStatus);
  };

  const handleToggleApsCheckItem = (id: string) => {
    setApsChecklist((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      localStorage.setItem('educaro_aps_checklist', JSON.stringify(updated));
      return updated;
    });
  };

  // Load existing documents
  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/extraction/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const docs = await res.json();
        setDocuments(docs);
        if (docs.length > 0 && !selectedDocId) {
          setSelectedDocId(docs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  useEffect(() => {
    if (token) {
      loadDocuments();
    }
  }, [token]);

  // Check inconsistencies
  useEffect(() => {
    if (inconsistencies && inconsistencies.length > 0) {
      setActiveConflict(inconsistencies[0]);
    } else {
      setActiveConflict(null);
    }
  }, [inconsistencies]);

  const handleRealUpload = async (docType: DocumentType, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);
      formData.append('filename', file.name);

      const res = await fetch('/api/extraction/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const newDoc: ExtractedDocument = await res.json();
        setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
        setSelectedDocId(newDoc.id);
        await refreshJourney();
      } else {
        const errData = await res.json();
        alert(`Upload failed: ${errData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Network error during upload');
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  const handleConfirmField = async (docId: string, fieldKey: string, confirmedValue?: string) => {
    try {
      await fetch('/api/extraction/confirm-field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ docId, fieldKey, confirmedValue }),
      });
      await refreshJourney();
    } catch (err) {
      console.error('Failed to confirm field:', err);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/extraction/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        if (selectedDocId === docId) {
          const remainingDocs = documents.filter((d) => d.id !== docId);
          setSelectedDocId(remainingDocs.length > 0 ? remainingDocs[0].id : null);
        }
        await refreshJourney();
      } else {
        const errData = await res.json();
        alert(`Delete failed: ${errData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Network error during delete');
    } finally {
      setIsDeleting(false);
      setDocumentToDelete(null);
    }
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  // Document checklist categories
  const checklistCategories = [
    {
      type: 'DEGREE_CERTIFICATE' as DocumentType,
      title: 'Degree Certificate',
      requirement: 'Required for University & APS verification',
      isOptional: false,
      sampleId: 'degree_standard' as const,
      sampleFile: 'Degree_Certificate_Sample.pdf',
    },
    {
      type: 'LANGUAGE_CERTIFICATE' as DocumentType,
      title: 'German Language Certificate',
      requirement: 'Goethe / TestDaF (Mandatory for Ausbildung, recommended for Study)',
      isOptional: false,
      sampleId: 'language_b1' as const,
      sampleFile: 'Goethe_Zertifikat_B1_Score.pdf',
    },
    {
      type: 'PASSPORT' as DocumentType,
      title: 'Passport (Identity Proof)',
      requirement: 'National Passport for German Visa Application',
      isOptional: true,
      sampleId: 'passport_standard' as const,
      sampleFile: 'Passport_India_Rahul_Sharma.pdf',
    },
    {
      type: 'VISA' as DocumentType,
      title: 'German / Schengen Visa',
      requirement: 'Previous or current visa stamp (if held)',
      isOptional: true,
      sampleId: 'visa_standard' as const,
      sampleFile: 'German_National_Visa_D.pdf',
    },
  ];
  const uploadedCategoryCount = checklistCategories.filter((category) =>
    documents.some((document) => document.documentType === category.type),
  ).length;

  return (
    <div className="min-h-screen bg-educaro-secondary flex flex-col text-gray-900">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={3}
        totalSteps={10}
        stepTitle="Document Preparation"
        stepSubtitle="Review AI-extracted fields, verify original documents, and track official APS India preparation."
        backRoute="/journey/details"
        nextRoute="/journey/qualification"
        continueLabel="Continue to Qualification"
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Document Checklist & Verification Status */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-soft text-[10px]">
                  Document Checklist & Status
                </span>
                <span className="text-xs text-gray-500">Step 5 of 8</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Application Credential Verification
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Every category displays real-time status. Unuploaded documents show as "Not uploaded / Missing" until an actual file is received.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <span>Uploaded:</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                {uploadedCategoryCount} / {checklistCategories.length}
              </span>
            </div>
          </div>

          {/* Checklist Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {checklistCategories.map((cat) => {
              const uploadedDoc = documents.find((d) => d.documentType === cat.type);
              const isUploaded = Boolean(uploadedDoc);

              return (
                <div
                  key={cat.type}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    isUploaded
                      ? 'bg-white border-emerald-300 shadow-xs'
                      : 'bg-white border-border'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        {cat.isOptional ? 'Optional' : 'Required'}
                      </span>
                      {isUploaded ? (
                        <span className="badge-soft text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Extracted</span>
                        </span>
                      ) : (
                        <span className="badge-warning text-[10px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Not uploaded / Missing</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-gray-900 leading-snug">
                        {cat.title}
                      </h4>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-tight">
                        {cat.requirement}
                      </p>
                    </div>

                    {isUploaded && (
                      <p className="text-[11px] font-medium text-emerald-700 truncate">
                        📄 {uploadedDoc?.filename}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                    {isUploaded ? (
                      <div className="flex w-full items-center gap-2">
                        <button
                          onClick={() => setSelectedDocId(uploadedDoc!.id)}
                          className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            selectedDoc?.id === uploadedDoc?.id
                              ? 'btn-brand text-white shadow-xs'
                              : 'btn-ghost-brand'
                          }`}
                        >
                          {selectedDoc?.id === uploadedDoc?.id ? 'Viewing in Split View' : 'Review Side-by-Side'}
                        </button>
                        <button
                          onClick={() => setDocumentToDelete(uploadedDoc!.id)}
                          className="p-1.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors border border-rose-200 shadow-xs flex items-center justify-center shrink-0"
                          title="Remove Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        className={`w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                          isUploading ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border' : 'btn-brand text-white'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload {cat.title.split(' ')[0]}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => handleRealUpload(cat.type, e)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* APS India — Academic Document Verification Hub */}
        <div className="bg-white rounded-3xl border border-teal-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs">
                  APS
                </span>
                <h3 className="text-lg font-bold text-gray-900">
                  APS India — Academic Document Verification
                </h3>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full uppercase">
                  Mandatory for India
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                APS India verifies academic documents and educational qualifications issued by Indian educational institutions for applicants intending to study in Germany. Check the official requirements and document checklist that apply to your academic background.
              </p>
            </div>

            {/* User-Managed Status Selector */}
            <div className="bg-slate-50 border border-gray-200 p-3.5 rounded-2xl shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Your Preparation Status:
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    apsStatus === 'CERTIFICATE_RECEIVED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : apsStatus === 'AWAITING_VERIFICATION' || apsStatus === 'APPLICATION_SUBMITTED'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : apsStatus === 'PREPARING_DOCUMENTS'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {apsStatus === 'NOT_STARTED' && 'Not started'}
                  {apsStatus === 'PREPARING_DOCUMENTS' && 'Preparing documents'}
                  {apsStatus === 'APPLICATION_SUBMITTED' && 'Application submitted'}
                  {apsStatus === 'AWAITING_VERIFICATION' && 'Awaiting verification'}
                  {apsStatus === 'CERTIFICATE_RECEIVED' && 'Certificate received'}
                </span>
              </div>

              <select
                value={apsStatus}
                onChange={(e) => handleUpdateApsStatus(e.target.value as ApsStatus)}
                className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="NOT_STARTED">1. Not started</option>
                <option value="PREPARING_DOCUMENTS">2. Preparing documents</option>
                <option value="APPLICATION_SUBMITTED">3. Application submitted</option>
                <option value="AWAITING_VERIFICATION">4. Awaiting verification</option>
                <option value="CERTIFICATE_RECEIVED">5. Certificate received</option>
              </select>
              <p className="text-[10px] text-gray-400 leading-tight">
                Self-managed progress tracking for your journey.
              </p>
            </div>
          </div>

          {/* Official APS Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://aps-india.de/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition"
            >
              <span>Visit Official APS India Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://aps-india.de/aps-process/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition"
            >
              <span>Check APS Requirements</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://aps-india.de/checklists/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition"
            >
              <span>View Document Checklists</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://aps-india.de/faqs/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-xs font-semibold transition"
            >
              <span>Official FAQs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Document Preparation Checklist & Disclaimers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span>Interactive APS Preparation Checklist</span>
              </h4>

              <div className="space-y-2">
                {[
                  { id: 'school_marks', label: '10th & 12th Board Marksheets and Certificates' },
                  { id: 'bachelor_transcripts', label: "Bachelor's / Master's Transcripts & Degree Certificate" },
                  { id: 'language_proof', label: 'Proof of English (IELTS/TOEFL) or German (Goethe/TestDaF) proficiency' },
                  { id: 'passport_bio', label: 'Copy of Passport (First and Last identity pages)' },
                  { id: 'aadhaar_consent', label: 'Aadhaar Card copy & DigiLocker verification authorization' },
                  { id: 'signed_form', label: 'Printed & Signed APS Online Application Form' },
                  { id: 'bank_receipt', label: 'Official Bank Transfer confirmation of ₹18,000 fee' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-gray-50 cursor-pointer text-xs text-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(apsChecklist[item.id])}
                      onChange={() => handleToggleApsCheckItem(item.id)}
                      className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                    />
                    <span className={apsChecklist[item.id] ? 'line-through text-gray-400' : ''}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Important Notices & Limitations</span>
                </h4>

                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Eligibility Notice</span>
                  </div>
                  <p>
                    APS requirements depend on your academic background and applicable procedure. Confirm your eligibility, required documents, and any exemptions through the official APS India website.
                  </p>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] text-gray-500 space-y-1 leading-relaxed">
                  <strong>Disclaimer:</strong> This tracking status is recorded by you for personal milestone tracking. EduRoute does not issue APS certificates, collect APS portal credentials, or guarantee admission/visa approval. Always refer to official sources at <span className="font-semibold text-gray-700">aps-india.de</span>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {activeConflict && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-rose-900">
                  Consistency Agent Conflict Detected: {activeConflict.fieldLabel}
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  {activeConflict.sourceA.sourceName} says <strong>{activeConflict.sourceA.value}</strong>, while {activeConflict.sourceB.sourceName} states <strong>{activeConflict.sourceB.value}</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveConflict(activeConflict)}
              className="px-4 py-2 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs shrink-0"
            >
              Resolve Discrepancy Live →
            </button>
          </div>
        )}

        {/* Document Selector Tabs if multiple documents uploaded */}
        {documents.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider mr-2">
              Viewing Document:
            </span>
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  (selectedDocId === doc.id || (!selectedDocId && documents[0]?.id === doc.id))
                    ? 'btn-brand text-white shadow-xs'
                    : 'bg-white text-gray-800 border-border hover:bg-gray-50'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>{doc.filename}</span>
              </button>
            ))}
          </div>
        )}

        {/* Side-by-Side Review Section (PRD Section 6 #3) */}
        {selectedDoc ? (
          <SideBySideReview
            key={selectedDoc.id}
            document={selectedDoc}
            onConfirmField={handleConfirmField}
          />
        ) : (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">No Documents Uploaded Yet</h3>
              <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
                Upload your actual credential documents using the buttons above to begin AI extraction and verification.
              </p>
            </div>
              <p className="text-xs text-gray-500">
                Use the upload buttons in the checklist above to submit your actual degree certificate, language certificate, passport, or visa.
              </p>
          </div>
        )}

        {/* Bottom Navigation Prompt */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            onClick={() => navigate('/journey/details')}
            className="text-xs text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Applicant Profile
          </button>
          <span className="text-xs text-gray-400">
            Click &quot;Continue to Qualification&quot; in the header above to evaluate eligibility.
          </span>
        </div>

      </main>

      {/* Inconsistency Clarification Modal */}
      {activeConflict && (
        <InconsistencyDialog
          discrepancy={activeConflict}
          onResolve={async (id, val) => {
            await resolveDiscrepancy(id, val);
            setActiveConflict(null);
          }}
          onClose={() => setActiveConflict(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Remove this document?</h3>
              <p className="text-sm text-gray-600">
                This will delete the file and remove its extracted data from your profile. This action cannot be undone.
              </p>
              
              <div className="flex w-full gap-3 pt-4">
                <button
                  onClick={() => setDocumentToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold text-gray-800 bg-white border border-border hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteDocument(documentToDelete)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors inline-flex justify-center items-center gap-2"
                >
                  {isDeleting ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
