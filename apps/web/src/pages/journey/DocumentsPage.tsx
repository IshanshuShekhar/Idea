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
    <div className="min-h-screen bg-educaro-main flex flex-col text-educaro-primary">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={3}
        totalSteps={8}
        stepTitle="Document Verification"
        stepSubtitle="Review and confirm AI-extracted fields against your original documents."
        backRoute="/journey/video"
        nextRoute="/journey/qualification"
        continueLabel="Continue to Qualification →"
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Document Checklist & Verification Status */}
        <div className="bg-educaro-main rounded-3xl border border-educaro-border p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-educaro-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-educaro-icon text-educaro-accent border border-educaro-border">
                  Document Checklist & Status
                </span>
                <span className="text-xs text-educaro-muted">Step 5 of 8</span>
              </div>
              <h2 className="text-xl font-bold text-educaro-primary">
                Application Credential Verification
              </h2>
              <p className="text-xs text-educaro-muted mt-0.5">
                Every category displays real-time status. Unuploaded documents show as "Not uploaded / Missing" until an actual file is received.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-educaro-muted">
              <span>Uploaded:</span>
              <span className="px-2.5 py-1 rounded-full bg-educaro-accent text-black">
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
                      ? 'bg-educaro-main border-educaro-accent/30 shadow-xs'
                      : 'bg-educaro-main border-educaro-border'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-educaro-accent">
                        {cat.isOptional ? 'Optional' : 'Required'}
                      </span>
                      {isUploaded ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-educaro-accent">
                          <CheckCircle2 className="w-3 h-3 text-educaro-accent" />
                          <span>Extracted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-educaro-accent">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Not uploaded / Missing</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-educaro-primary leading-snug">
                        {cat.title}
                      </h4>
                      <p className="text-[11px] text-educaro-muted mt-0.5 leading-tight">
                        {cat.requirement}
                      </p>
                    </div>

                    {isUploaded && (
                      <p className="text-[11px] font-medium text-educaro-accent truncate">
                        📄 {uploadedDoc?.filename}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-educaro-border flex items-center justify-between gap-2">
                    {isUploaded ? (
                      <div className="flex w-full items-center gap-2">
                        <button
                          onClick={() => setSelectedDocId(uploadedDoc!.id)}
                          className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            selectedDoc?.id === uploadedDoc?.id
                              ? 'bg-educaro-accent text-black'
                              : 'bg-educaro-icon text-educaro-primary hover:bg-[#E5E7EB]'
                          }`}
                        >
                          {selectedDoc?.id === uploadedDoc?.id ? 'Viewing in Split View' : 'Review Side-by-Side'}
                        </button>
                        <button
                          onClick={() => setDocumentToDelete(uploadedDoc!.id)}
                          className="p-1.5 rounded-full bg-educaro-icon text-rose-600 hover:bg-rose-100 transition-colors border border-educaro-accent/20 shadow-sm flex items-center justify-center shrink-0"
                          title="Remove Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        className={`w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                          isUploading ? 'bg-educaro-icon text-educaro-accent cursor-not-allowed animate-pulse' : 'bg-educaro-accent hover:bg-educaro-accentHover text-black'
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

        {/* Conflict Alert Banner if an inconsistency is detected */}
        {activeConflict && (
          <div className="p-4 rounded-2xl bg-educaro-icon border border-educaro-accent/20 flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-educaro-accent/20 flex items-center justify-center text-educaro-accent shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-rose-900">
                  Consistency Agent Conflict Detected: {activeConflict.fieldLabel}
                </h4>
                <p className="text-xs text-educaro-accent mt-0.5">
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
            <span className="text-xs font-bold text-educaro-muted uppercase tracking-wider mr-2">
              Viewing Document:
            </span>
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  (selectedDocId === doc.id || (!selectedDocId && documents[0]?.id === doc.id))
                    ? 'bg-educaro-accent text-black border-educaro-accent shadow-xs'
                    : 'bg-educaro-main text-educaro-primary border-educaro-border hover:bg-educaro-secondary'
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
          <div className="bg-educaro-main rounded-3xl border border-educaro-border p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-educaro-icon text-educaro-accent flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-educaro-primary">No Documents Uploaded Yet</h3>
              <p className="text-xs text-educaro-muted max-w-md mx-auto mt-1">
                Upload your actual credential documents using the buttons above to begin AI extraction and verification.
              </p>
            </div>
              <p className="text-xs text-educaro-muted">
                Use the upload buttons in the checklist above to submit your actual degree certificate, language certificate, passport, or visa.
              </p>
          </div>
        )}

        {/* Bottom Navigation Prompt */}
        <div className="flex items-center justify-between pt-4 border-t border-educaro-border">
          <button
            onClick={() => navigate('/journey/chat')}
            className="text-xs text-educaro-muted hover:text-educaro-primary font-medium"
          >
            ← Back to Profile Chat
          </button>
          <button
            onClick={() => navigate('/journey/qualification')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
          >
            <span>Proceed to Qualification Assessment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
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
              <h3 className="text-lg font-bold text-educaro-primary">Remove this document?</h3>
              <p className="text-sm text-educaro-muted">
                This will delete the file and remove its extracted data from your profile. This action cannot be undone.
              </p>
              
              <div className="flex w-full gap-3 pt-4">
                <button
                  onClick={() => setDocumentToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold text-educaro-primary bg-educaro-icon hover:bg-[#E5E7EB] transition-colors"
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
