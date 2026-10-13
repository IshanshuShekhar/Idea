import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { JourneyProvider } from './context/JourneyContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { IntroAnimation } from './components/IntroAnimation';

// Pages
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { GoalIntakePage } from './pages/journey/GoalIntakePage';
import { CandidateDetailsFormPage } from './pages/journey/CandidateDetailsFormPage';
import { VideoIntroPage } from './pages/journey/VideoIntroPage';
import { DocumentsPage } from './pages/journey/DocumentsPage';
import { QualificationPage } from './pages/journey/QualificationPage';
import { CvPage } from './pages/journey/CvPage';
import { PaymentPage } from './pages/journey/PaymentPage';
import { NextStepsPage } from './pages/journey/NextStepsPage';
import { ConsultantPage } from './pages/ConsultantPage';
import { RecommendationsDashboard } from './pages/journey/RecommendationsDashboard';
import { KnowledgeBaseAdminPage } from './pages/admin/KnowledgeBaseAdminPage';
import { CandidateDetailsPage } from './pages/CandidateDetailsPage';
import { GermanLearningPathPage } from './pages/GermanLearningPathPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ScholarshipMatchingPage } from './pages/journey/ScholarshipMatchingPage';
import { RecommendationDashboardPage } from './pages/engine/RecommendationDashboardPage';
import { ApplicationRoadmapPage } from './pages/journey/ApplicationRoadmapPage';
import { ConsultantHubPage } from './pages/journey/ConsultantHubPage';
import { AdminEnginePage } from './pages/engine/AdminEnginePage';
import { ExamPrepPage } from './pages/journey/ExamPrepPage';
import { FinancialSimulatorPage } from './pages/journey/FinancialSimulatorPage';
import { CultureEverydayLifePage } from './pages/journey/CultureEverydayLifePage';

export const App: React.FC = () => {
  const [introFinished, setIntroFinished] = useState(false);

  return (
    <BrowserRouter>
      <AnimatePresence>
        {!introFinished && <IntroAnimation onComplete={() => setIntroFinished(true)} />}
      </AnimatePresence>
      <div className={introFinished ? 'opacity-100' : 'opacity-0'}>
        <AuthProvider>
          <JourneyProvider>
          <Routes>
            {/* Homepage */}
            <Route path="/" element={<HomePage />} />

            {/* Authentication (PRD Section 8.2: dedicated sign up / login page) */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth?mode=login" replace />} />
            <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />

            {/* Step-by-Step Applicant Journey */}
            <Route
              path="/journey/goal"
              element={
                <ProtectedRoute>
                  <GoalIntakePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journey/details"
              element={
                <ProtectedRoute>
                  <CandidateDetailsFormPage />
                </ProtectedRoute>
              }
            />
            {/* Redirect legacy intake chat to comprehensive applicant profile */}
            <Route
              path="/journey/chat"
              element={<Navigate to="/journey/details" replace />}
            />
            <Route
              path="/journey/video"
              element={
                <ProtectedRoute>
                  <VideoIntroPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journey/documents"
              element={
                <ProtectedRoute>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/documents" element={<Navigate to="/journey/documents" replace />} />
            <Route
              path="/journey/qualification"
              element={
                <ProtectedRoute>
                  <QualificationPage />
                </ProtectedRoute>
              }
            />
            <Route path="/qualification" element={<Navigate to="/journey/qualification" replace />} />
            <Route
              path="/journey/scholarships"
              element={
                <ProtectedRoute>
                  <ScholarshipMatchingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/scholarships" element={<Navigate to="/journey/scholarships" replace />} />
            {/* Unified German Financial Reality Simulator */}
            <Route
              path="/journey/financial-simulator"
              element={
                <ProtectedRoute>
                  <FinancialSimulatorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financial-simulator"
              element={<Navigate to="/journey/financial-simulator" replace />}
            />
            <Route
              path="/journey/roadmap"
              element={
                <ProtectedRoute>
                  <ApplicationRoadmapPage />
                </ProtectedRoute>
              }
            />
            <Route path="/roadmap" element={<Navigate to="/journey/roadmap" replace />} />
            {/* Germany Culture & Everyday Life */}
            <Route
              path="/journey/culture"
              element={
                <ProtectedRoute>
                  <CultureEverydayLifePage />
                </ProtectedRoute>
              }
            />
            <Route path="/culture" element={<Navigate to="/journey/culture" replace />} />
            <Route
              path="/journey/exam-prep"
              element={
                <ProtectedRoute>
                  <ExamPrepPage />
                </ProtectedRoute>
              }
            />
            <Route path="/exam-prep" element={<Navigate to="/journey/exam-prep" replace />} />
            <Route
              path="/journey/cv"
              element={
                <ProtectedRoute>
                  <CvPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journey/payment"
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journey/next-steps"
              element={
                <ProtectedRoute>
                  <NextStepsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journey/recommendations"
              element={
                <ProtectedRoute>
                  <RecommendationDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/recommendations" element={<Navigate to="/journey/recommendations" replace />} />
            {/* Redirect legacy wizard route to comprehensive applicant profile */}
            <Route
              path="/engine/wizard"
              element={<Navigate to="/journey/details" replace />}
            />
            <Route
              path="/engine/dashboard"
              element={
                <ProtectedRoute>
                  <RecommendationDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/engine/admin"
              element={
                <ProtectedRoute>
                  <AdminEnginePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/knowledge-base"
              element={
                <ProtectedRoute>
                  <KnowledgeBaseAdminPage />
                </ProtectedRoute>
              }
            />

            {/* Consolidated Candidate Details (PRD Section 11) */}
            <Route
              path="/candidate-details"
              element={
                <ProtectedRoute>
                  <CandidateDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/profile" element={<Navigate to="/candidate-details" replace />} />

            {/* German Learning Path (PRD Section 8.1 & Differentiator #10) */}
            <Route
              path="/journey/german-learning-path"
              element={
                <ProtectedRoute>
                  <GermanLearningPathPage />
                </ProtectedRoute>
              }
            />

            {/* Educaro Premium Checkout (PRD Section 8.3) */}
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />

            {/* Consultant Support & Advisory Hub */}
            <Route
              path="/consultant"
              element={
                <ProtectedRoute>
                  <ConsultantHubPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultant/call"
              element={
                <ProtectedRoute>
                  <ConsultantPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </JourneyProvider>
      </AuthProvider>
      </div>
    </BrowserRouter>
  );
};

export default App;
