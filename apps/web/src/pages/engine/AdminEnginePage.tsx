import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import {
  Building2,
  Award,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { UniversityRecord, ProgrammeRecord, ScholarshipRecord } from '@educaro/shared';

export const AdminEnginePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<any>(null);
  const [universities, setUniversities] = useState<UniversityRecord[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeRecord[]>([]);
  const [scholarships, setScholarships] = useState<ScholarshipRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'universities' | 'programmes' | 'scholarships' | 'csv' | 'audit'>('universities');

  // CSV Import State
  const [csvEntity, setCsvEntity] = useState<'UNIVERSITIES' | 'PROGRAMMES' | 'SCHOLARSHIPS'>('UNIVERSITIES');
  const [csvText, setCsvText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // URL Audit State
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditing, setAuditing] = useState<boolean>(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Overview
      const ovRes = await fetch('/api/engine/admin/overview', { headers });
      if (ovRes.ok) {
        const json = await ovRes.json();
        setOverview(json.data);
      }

      // Public/Applicant catalog lists
      const [uRes, pRes, sRes] = await Promise.all([
        fetch('/api/engine/universities'),
        fetch('/api/engine/programmes'),
        fetch('/api/engine/scholarships'),
      ]);

      if (uRes.ok) {
        const j = await uRes.json();
        setUniversities(j.data || []);
      }
      if (pRes.ok) {
        const j = await pRes.json();
        setProgrammes(j.data || []);
      }
      if (sRes.ok) {
        const j = await sRes.json();
        setScholarships(j.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    setImportStatus('Importing CSV records...');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/engine/admin/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entityType: csvEntity,
          csvData: csvText,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setImportStatus(`Successfully imported ${json.data.importedCount} records.`);
        setCsvText('');
        fetchAdminData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setImportStatus(`Error importing CSV: ${errJson.message || 'Validation failed'}`);
      }
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message}`);
    }
  };

  const handleValidateUrls = async () => {
    setAuditing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/engine/admin/validate-urls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setAuditResult(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Administrative & Curated Data Portal
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                German University & Scholarship Engine Admin
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Manage verified higher education institutions, degree programmes, scholarship funding schemes, and official URL validation.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 uppercase block">Universities</span>
                <span className="text-sm font-bold text-slate-900">{overview?.totalUniversities || universities.length}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 uppercase block">Programmes</span>
                <span className="text-sm font-bold text-slate-900">{overview?.totalProgrammes || programmes.length}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 uppercase block">Scholarships</span>
                <span className="text-sm font-bold text-slate-900">{overview?.totalScholarships || scholarships.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-4 border-b border-slate-200 mb-6">
          {[
            { id: 'universities', label: 'Universities', icon: Building2 },
            { id: 'programmes', label: 'Programmes', icon: Award },
            { id: 'scholarships', label: 'Scholarships', icon: Award },
            { id: 'csv', label: 'CSV Bulk Import', icon: Upload },
            { id: 'audit', label: 'URL Validation Audit', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                  isActive
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Universities */}
        {activeTab === 'universities' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Verified Universities Database</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">University Name</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Semester Fee</th>
                    <th className="p-3">Last Verified</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {universities.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-500">{u.id}</td>
                      <td className="p-3 font-bold text-slate-900">{u.name}</td>
                      <td className="p-3">{u.city}, {u.federalState}</td>
                      <td className="p-3">{u.institutionType}</td>
                      <td className="p-3">€{u.semesterContributionEUR}</td>
                      <td className="p-3 text-[11px] text-slate-500">{new Date(u.lastVerifiedAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <a
                          href={u.officialWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                        >
                          Visit <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Programmes */}
        {activeTab === 'programmes' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Curated Degree Programmes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Programme</th>
                    <th className="p-3">University</th>
                    <th className="p-3">Language</th>
                    <th className="p-3">Grade Cutoff</th>
                    <th className="p-3">Winter Deadline</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {programmes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{p.programmeName}</td>
                      <td className="p-3">{p.universityName || p.universityId}</td>
                      <td className="p-3">{p.teachingLanguage}</td>
                      <td className="p-3 font-semibold text-emerald-800">&lt;= {p.minimumAcademicGradeGerman}</td>
                      <td className="p-3 font-medium text-slate-800">{p.applicationDeadlineWinter}</td>
                      <td className="p-3">
                        <a
                          href={p.officialProgrammeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                        >
                          Portal <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Scholarships */}
        {activeTab === 'scholarships' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Verified Scholarships</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Scholarship</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Deadline</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scholarships.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{s.scholarshipName}</td>
                      <td className="p-3">{s.providerName}</td>
                      <td className="p-3 font-bold text-emerald-800">€{s.fundingAmount}</td>
                      <td className="p-3">{s.paymentFrequency}</td>
                      <td className="p-3">{s.applicationDeadline}</td>
                      <td className="p-3">
                        <a
                          href={s.officialApplicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                        >
                          Apply <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: CSV Import */}
        {activeTab === 'csv' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Bulk Import via CSV</h3>
            <p className="text-xs text-slate-600">
              Paste standard CSV rows with matching header keys to bulk import universities, programmes, or scholarships.
            </p>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="csvEntity"
                  checked={csvEntity === 'UNIVERSITIES'}
                  onChange={() => setCsvEntity('UNIVERSITIES')}
                />
                Universities
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="csvEntity"
                  checked={csvEntity === 'PROGRAMMES'}
                  onChange={() => setCsvEntity('PROGRAMMES')}
                />
                Programmes
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="csvEntity"
                  checked={csvEntity === 'SCHOLARSHIPS'}
                  onChange={() => setCsvEntity('SCHOLARSHIPS')}
                />
                Scholarships
              </label>
            </div>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="id,name,officialWebsite,city,federalState,institutionType,publicOrPrivate..."
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
            />

            {importStatus && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs">
                {importStatus}
              </div>
            )}

            <button
              onClick={handleImportCsv}
              className="px-5 py-2.5 rounded-xl btn-brand text-white text-xs font-bold flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Import CSV Records
            </button>
          </div>
        )}

        {/* Tab 5: URL Audit */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Official URL Validation Audit</h3>
            <p className="text-xs text-slate-600">
              Verify that all external admission and scholarship portal URLs are formatted and reachable.
            </p>

            <button
              onClick={handleValidateUrls}
              disabled={auditing}
              className="px-4 py-2.5 rounded-xl btn-brand text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditing ? 'animate-spin' : ''}`} />
              Run URL Audit
            </button>

            {auditResult && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Total Checked</span>
                  <span className="text-base font-bold text-slate-900">{auditResult.totalChecked}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reachable URLs</span>
                  <span className="text-base font-bold text-emerald-700">{auditResult.activeAndReachable}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Broken Links</span>
                  <span className="text-base font-bold text-slate-900">{auditResult.brokenUrls}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
