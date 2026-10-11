import React, { useState } from 'react';
import { ExtractedDocument, ExtractedField, Provenance } from '@educaro/shared';
import { ProvenanceBadge } from './ProvenanceBadge';
import { Check, Edit3, ShieldAlert, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

interface SideBySideReviewProps {
  document: ExtractedDocument;
  onConfirmField: (docId: string, fieldKey: string, confirmedValue?: string) => Promise<void>;
}

export const SideBySideReview: React.FC<SideBySideReviewProps> = ({
  document,
  onConfirmField,
}) => {
  const [fields, setFields] = useState<ExtractedField[]>(document.extractedFields);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [confirmedKeys, setConfirmedKeys] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const handleEditChange = (key: string, val: string) => {
    setEditValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleConfirm = async (key: string, currentValue: string) => {
    try {
      setSavingKey(key);
      const finalVal = editValues[key] !== undefined ? editValues[key] : currentValue;
      await onConfirmField(document.id, key, finalVal);
      setConfirmedKeys((prev) => new Set(prev).add(key));
      setEditingKey(null);
      // Update field provenance to APPLICANT_PROVIDED
      setFields((prev) =>
        prev.map((f) =>
          f.key === key
            ? { ...f, value: finalVal, provenance: Provenance.APPLICANT_PROVIDED, isConfirmed: true }
            : f
        )
      );
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="bg-educaro-main rounded-2xl border border-educaro-border overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="p-4 bg-educaro-secondary border-b border-educaro-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-educaro-accent" />
          <div>
            <h3 className="text-sm font-bold text-educaro-primary">{document.filename}</h3>
            <p className="text-[11px] text-educaro-muted">
              Extracted via OCR Document Intelligence • AI Confidence: {(document.overallConfidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-educaro-icon text-educaro-accent border border-educaro-accent/20 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-educaro-accent" />
            {confirmedKeys.size} of {fields.length} Confirmed
          </span>
        </div>
      </div>

      {/* Grid: Left Document Preview | Right Extracted Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E7EB]">
        
        {/* Left Side: Document Preview (Certificate Image) */}
        <div className="lg:col-span-6 p-4 bg-educaro-main flex flex-col items-center justify-center">
          <div className="text-xs font-semibold text-educaro-muted uppercase tracking-wider mb-2 self-start flex items-center gap-1.5">
            <span>Original Document Proof</span>
            <span className="text-[10px] lowercase text-educaro-accent font-mono">(source verified)</span>
          </div>
          
          <div className="w-full max-h-[520px] overflow-auto rounded-xl border border-educaro-border shadow-inner bg-white p-2 flex items-center justify-center flex-col">
            {document.previewUrl ? (
              document.previewUrl.toLowerCase().endsWith('.pdf') || document.filename?.toLowerCase().endsWith('.pdf') ? (
                <>
                  <iframe
                    src={document.previewUrl}
                    width="100%"
                    height="600px"
                    title="Document preview"
                    className="rounded shadow-xs border-0"
                  />
                  <div className="mt-2 text-[11px] text-educaro-muted">
                    Preview unavailable or not rendering? <a href={document.previewUrl} target="_blank" rel="noopener noreferrer" className="text-educaro-accent hover:underline">Download/Open PDF</a>
                  </div>
                </>
              ) : (
                <img
                  src={document.previewUrl}
                  alt="Document preview"
                  className="max-w-full h-auto object-contain rounded shadow-xs"
                />
              )
            ) : (
              <div className="p-12 text-center text-educaro-muted text-xs">
                No visual preview available
              </div>
            )}
          </div>
          <p className="text-[11px] text-educaro-muted mt-2 italic text-center">
            Review the extracted values against the original certificate image on the left.
          </p>
        </div>

        {/* Right Side: Extracted Fields Review & Confirmation */}
        <div className="lg:col-span-6 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-semibold text-educaro-muted uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Extracted Fields & Confidence</span>
              <span className="text-[11px] text-educaro-accent font-normal">Click checkmark to confirm</span>
            </div>

            {fields.length === 0 ? (
              <div className="p-8 text-center bg-educaro-main rounded-2xl border border-dashed border-educaro-accent flex flex-col items-center">
                <ShieldAlert className="w-8 h-8 text-rose-400 mb-2" />
                <h4 className="text-sm font-bold text-educaro-primary">Extraction Failed or Pending</h4>
                <p className="text-xs text-educaro-muted mt-1 max-w-[200px]">
                  The AI could not confidently extract fields from this document.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field) => {
                  const isEditing = editingKey === field.key;
                  const isConfirmed = confirmedKeys.has(field.key) || field.provenance === Provenance.APPLICANT_PROVIDED;
                  const currentVal = editValues[field.key] !== undefined ? editValues[field.key] : field.value;

                  return (
                    <div
                      key={field.key}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isConfirmed
                          ? 'bg-educaro-main border-educaro-accent/30/80 shadow-xs'
                          : 'bg-educaro-main border-educaro-border hover:border-educaro-accent'
                      }`}
                    >
                      {/* Field Header */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-educaro-primary">{field.label}</span>
                          <ProvenanceBadge
                            provenance={field.provenance}
                            confidence={field.confidence}
                          />
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          {!isEditing && (
                            <button
                              onClick={() => {
                                setEditingKey(field.key);
                                setEditValues((prev) => ({ ...prev, [field.key]: field.value }));
                              }}
                              className="p-1 rounded text-educaro-muted hover:text-educaro-primary hover:bg-educaro-secondary transition-colors"
                              title="Edit value"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleConfirm(field.key, field.value)}
                            disabled={savingKey === field.key}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                              isConfirmed
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-educaro-accent hover:bg-educaro-accentHover text-black'
                            }`}
                            title="Confirm field"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isConfirmed ? 'Confirmed' : 'Confirm'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Field Value */}
                      {isEditing ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) => handleEditChange(field.key, e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-educaro-accent bg-white text-xs text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                          />
                          <button
                            onClick={() => handleConfirm(field.key, currentVal)}
                            className="px-2.5 py-1.5 rounded-lg bg-educaro-accent text-black text-xs font-medium"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-educaro-primary">{field.value}</p>
                      )}

                      {/* Source Snippet */}
                      {field.sourceSnippet && (
                        <p className="mt-1 text-[11px] text-educaro-muted bg-educaro-secondary/60 px-2 py-1 rounded border border-educaro-border/40 italic font-mono">
                          "{field.sourceSnippet}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 bg-educaro-icon rounded-xl border border-educaro-border text-[11px] text-educaro-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-educaro-accent shrink-0" />
            <span>
              Once confirmed, extracted fields are converted to <strong>Applicant Provided</strong> and used in the deterministic qualification calculation.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
