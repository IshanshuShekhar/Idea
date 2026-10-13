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
    <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="p-4 bg-gray-50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">{document.filename}</h3>
            <p className="text-[11px] text-gray-600">
              Extracted via OCR Document Intelligence • AI Confidence: {(document.overallConfidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-soft text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {confirmedKeys.size} of {fields.length} Confirmed
          </span>
        </div>
      </div>

      {/* Grid: Left Document Preview | Right Extracted Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E7EB]">
        
        {/* Left Side: Document Preview (Certificate Image) */}
        <div className="lg:col-span-6 p-4 bg-gray-50 flex flex-col items-center justify-center">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 self-start flex items-center gap-1.5">
            <span>Original Document Proof</span>
            <span className="text-[10px] lowercase text-emerald-700 font-mono">(source verified)</span>
          </div>
          
          <div className="w-full max-h-[520px] overflow-auto rounded-xl border border-border shadow-inner bg-white p-2 flex items-center justify-center flex-col">
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
                  <div className="mt-2 text-[11px] text-gray-600">
                    Preview unavailable or not rendering? <a href={document.previewUrl} target="_blank" rel="noopener noreferrer" className="text-brand font-semibold hover:underline">Download/Open PDF</a>
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
              <div className="p-12 text-center text-gray-500 text-xs">
                No visual preview available
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-600 mt-2 italic text-center">
            Review the extracted values against the original certificate image on the left.
          </p>
        </div>

        {/* Right Side: Extracted Fields Review & Confirmation */}
        <div className="lg:col-span-6 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Extracted Fields & Confidence</span>
              <span className="text-[11px] text-emerald-800 font-semibold">Click checkmark to confirm</span>
            </div>

            {fields.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center">
                <ShieldAlert className="w-8 h-8 text-rose-500 mb-2" />
                <h4 className="text-sm font-bold text-gray-900">Extraction Failed or Pending</h4>
                <p className="text-xs text-gray-600 mt-1 max-w-[200px]">
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
                          ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                          : 'bg-white border-border hover:border-brand/40'
                      }`}
                    >
                      {/* Field Header */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-900">{field.label}</span>
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
                              className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
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
                                : 'btn-brand text-white'
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
                            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-white text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand"
                          />
                          <button
                            onClick={() => handleConfirm(field.key, currentVal)}
                            className="btn-brand text-white px-2.5 py-1.5 rounded-lg text-xs font-medium"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-gray-900">{field.value}</p>
                      )}

                      {/* Source Snippet */}
                      {field.sourceSnippet && (
                        <p className="mt-1 text-[11px] text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200 italic font-mono">
                          "{field.sourceSnippet}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Once confirmed, extracted fields are converted to <strong>Applicant Provided</strong> and used in the deterministic qualification calculation.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
