import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import { useJourney } from '../../context/JourneyContext';
import { ApplicantProfileForm } from '../../components/profile/ApplicantProfileForm';

export const CandidateDetailsFormPage: React.FC = () => {
  const { token } = useAuth();
  const { refreshJourney } = useJourney();

  const [isTraceOpen, setIsTraceOpen] = useState(false);

  return (
    <div className="min-h-screen bg-educaro-secondary flex flex-col text-gray-900">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={2}
        totalSteps={10}
        stepTitle="Applicant Profile"
        stepSubtitle="Comprehensive applicant profile covering academic credentials, language proficiencies, and career pathways."
        backRoute="/"
        nextRoute="/journey/documents"
        continueLabel="Continue to Documents"
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <ApplicantProfileForm
          token={token}
          onProfileUpdated={async () => {
            await refreshJourney();
          }}
          standalone={false}
        />
      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
export default CandidateDetailsFormPage;
