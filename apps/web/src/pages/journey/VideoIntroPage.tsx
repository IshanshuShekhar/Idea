import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import { useJourney } from '../../context/JourneyContext';
import { Provenance } from '@educaro/shared';
import {
  Video,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Square,
  ArrowRight,
  FileText,
  Clock,
  Mic,
  Camera,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  sourceSnippet: string;
  confidence: number;
  provenance: Provenance;
}

export const VideoIntroPage: React.FC = () => {
  const { user, token } = useAuth();
  const { refreshJourney } = useJourney();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'transcript' | 'upload' | 'record'>('transcript');
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [transcriptInput, setTranscriptInput] = useState<string>('');

  // Webcam recording state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const timerIntervalRef = useRef<any>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Processing & result state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [modelUsed, setModelUsed] = useState<string>('');

  // Fetch latest video intro if already submitted
  useEffect(() => {
    const fetchExistingVideo = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/video/latest', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setPreviewVideoUrl(data.videoUrl);
            setTranscript(data.transcript);
            setExtractedFields(data.extractedFields || []);
            setIsCompleted(true);
          }
        }
      } catch (err) {
        console.error('Failed to load existing video intro:', err);
      }
    };

    fetchExistingVideo();
  }, [token]);

  // Attach the stream after the webcam video element mounts and release it on change/unmount.
  useEffect(() => {
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream;
    }

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      setStream(mediaStream);
    } catch (err: any) {
      console.error('Webcam access error:', err);
      setCameraError(
        'Could not access camera/microphone. Please check browser permissions or use the file upload option.',
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    setRecordTime(0);
    setRecordedBlob(null);

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        if (blob.size > 24 * 1024 * 1024) {
          setCameraError('Recording is too large (over 24MB). Please record a slightly shorter video.');
          setRecordedBlob(null);
          return;
        }
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewVideoUrl(url);
      };

      recorder.start(1000);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('MediaRecorder error:', err);
      setCameraError('Recording failed to initialize. You can also upload a video file directly.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      stopCamera();
    }
  };

  const resetRecording = () => {
    setRecordedBlob(null);
    setPreviewVideoUrl(null);
    setRecordTime(0);
    setIsRecording(false);
    startCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewVideoUrl(url);
      setRecordedBlob(null);
    }
  };

  const handleProcessVideo = async (useSample: boolean = false) => {
    setIsProcessing(true);
    setProcessingStage('Preparing video payload for processing...');

    try {
      const formData = new FormData();

      if (useSample) {
        formData.append('filename', 'sample_intro_rahul_sharma.mp4');
        formData.append('durationSeconds', '45');
      } else if (recordedBlob) {
        formData.append('video', recordedBlob, 'applicant-intro.webm');
        formData.append('durationSeconds', recordTime.toString());
      } else if (selectedFile) {
        formData.append('video', selectedFile, selectedFile.name);
        formData.append('durationSeconds', '45');
      } else {
        throw new Error('No video source provided.');
      }

      setProcessingStage('Sending to Groq for server-side AI processing...');

      const response = await fetch('/api/video/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let message = '';
        try {
          const errorData: { message?: unknown } = await response.json();
          if (typeof errorData.message === 'string') {
            message = errorData.message;
          } else if (
            Array.isArray(errorData.message) &&
            errorData.message.every((item): item is string => typeof item === 'string')
          ) {
            message = errorData.message.join(' ');
          }
        } catch {
          // Use the HTTP status below if the server did not return JSON.
        }
        throw new Error(message || `Failed to process video intro (HTTP ${response.status})`);
      }

      setProcessingStage('Running LLM Extraction for Motivation, Career Goals & Background...');
      const data = await response.json();

      setTranscript(data.transcript);
      setExtractedFields(data.extractedFields || []);
      setPreviewVideoUrl(data.videoUrl);
      setModelUsed(data.modelUsed || 'Groq Whisper + Llama');
      setIsCompleted(true);

      await refreshJourney();
    } catch (err: any) {
      console.error('Video pipeline error:', err);
      alert('Error during video transcription: ' + (err.message || 'Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const sampleRahulTranscript =
    'Hi, I am Rahul Sharma. I completed my B.Tech in Computer Science in 2021 and have 3 years of experience as a software engineer in India. My motivation for moving to Germany is to pursue advanced opportunities in software engineering and cloud systems, while learning German (currently at B1 Goethe-Zertifikat) and building my long-term career under the EU Blue Card program.';

  const handleProcessTranscript = async (textToProcess?: string) => {
    const text = textToProcess || transcriptInput;
    if (!text.trim()) {
      alert('Please enter or paste your introduction transcript first.');
      return;
    }

    setIsProcessing(true);
    setProcessingStage('Extracting motivation, goals, and background via LLM...');

    try {
      const response = await fetch('/api/video/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transcript: text }),
      });

      if (!response.ok) {
        let message = '';
        try {
          const errData = await response.json();
          message = errData.message;
        } catch {
          // fallback
        }
        throw new Error(message || `Failed to process transcript (HTTP ${response.status})`);
      }

      const data = await response.json();
      setTranscript(data.transcript);
      setExtractedFields(data.extractedFields || []);
      setPreviewVideoUrl(data.videoUrl);
      setModelUsed('OpenAI-compatible LLM');
      setIsCompleted(true);

      await refreshJourney();
    } catch (err: any) {
      console.error('Transcript processing error:', err);
      alert('Error during transcript extraction: ' + (err.message || 'Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-educaro-main flex flex-col text-educaro-primary">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={6}
        totalSteps={12}
        stepTitle="Video Introduction"
        stepSubtitle="Record a short video to extract communication skills and motivation (Optional)."
        backRoute="/journey/chat"
        nextRoute="/journey/documents"
        continueLabel={isCompleted ? 'Continue to Document Upload →' : 'Skip & Continue to Document Upload →'}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        
        {/* Top Information Card & Skip Option */}
        <div className="bg-educaro-main rounded-3xl border border-educaro-border p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-educaro-icon text-educaro-accent border border-educaro-border">
                Step 4 of 8 • Optional
              </span>
              <ProvenanceBadge provenance={Provenance.AI_EXTRACTED} sourceText="Whisper STT + LLM Extraction" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-educaro-primary">
              Spoken Candidate Introduction
            </h2>
            <p className="text-xs text-educaro-muted max-w-xl">
              Record a 45–60 second introduction or upload a video clip. Our STT engine transcribes your speech, extracts your motivation and career goals, and indexes them with strict <strong>AI-Extracted</strong> provenance.
            </p>
          </div>

          <div className="shrink-0 flex sm:flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/journey/documents')}
              className="px-4 py-2 rounded-full border border-educaro-border bg-educaro-main hover:bg-educaro-secondary text-xs font-semibold text-educaro-muted hover:text-educaro-primary transition-colors"
            >
              Skip this step for now →
            </button>
            <span className="text-[10px] text-educaro-muted">You can record anytime later</span>
          </div>
        </div>

        {/* Video Capture & Processing Section */}
        {!isCompleted ? (
          <div className="bg-educaro-main rounded-3xl border border-educaro-border p-6 sm:p-8 shadow-xs space-y-6">
            
            {/* Tab Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-educaro-border pb-4 gap-3">
              <div className="flex items-center gap-2 bg-educaro-main p-1 rounded-2xl border border-educaro-border flex-wrap">
                <button
                  type="button"
                  data-button-size="compact"
                  onClick={() => {
                    setActiveTab('transcript');
                    stopCamera();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'transcript'
                      ? 'bg-educaro-accent text-black shadow-xs'
                      : 'text-educaro-muted hover:text-educaro-primary'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Transcript (Primary)</span>
                </button>
                <button
                  type="button"
                  data-button-size="compact"
                  onClick={() => {
                    setActiveTab('upload');
                    stopCamera();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'upload'
                      ? 'bg-educaro-accent text-black shadow-xs'
                      : 'text-educaro-muted hover:text-educaro-primary'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Video</span>
                </button>
                <button
                  type="button"
                  data-button-size="compact"
                  onClick={() => {
                    setActiveTab('record');
                    if (!stream && !recordedBlob) startCamera();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'record'
                      ? 'bg-educaro-accent text-black shadow-xs'
                      : 'text-educaro-muted hover:text-educaro-primary'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Webcam</span>
                </button>
              </div>

              {/* Sample Intro Button */}
              <button
                type="button"
                onClick={() => {
                  setTranscriptInput(sampleRahulTranscript);
                  handleProcessTranscript(sampleRahulTranscript);
                }}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-educaro-icon hover:bg-[#E5E7EB] text-xs font-semibold text-educaro-accent border border-educaro-border transition-colors cursor-pointer"
                title="Runs instant pipeline on pre-packaged applicant transcript sample"
              >
                <Sparkles className="w-3.5 h-3.5 text-educaro-accent" />
                <span>Fill Rahul Sharma Transcript (1-Click)</span>
              </button>
            </div>

            {/* TAB 0: TRANSCRIPT PASTE (PRIMARY) */}
            {activeTab === 'transcript' && (
              <div className="space-y-4 max-w-3xl mx-auto">
                <div className="bg-educaro-main border border-educaro-border rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-educaro-primary flex items-center gap-2">
                      <FileText className="w-4 h-4 text-educaro-accent" />
                      <span>Applicant Spoken Transcript</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setTranscriptInput(sampleRahulTranscript)}
                      className="text-[11px] text-educaro-accent hover:underline font-semibold"
                    >
                      Use Demo Persona Sample
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={transcriptInput}
                    onChange={(e) => setTranscriptInput(e.target.value)}
                    placeholder="Paste your spoken self-introduction or speech transcript here... (e.g., Hi, I am Rahul Sharma. I have a B.Tech in CS and 3 years software engineering experience. My goal is to work in Germany...)"
                    className="w-full text-xs p-3 rounded-xl border border-educaro-border bg-white text-educaro-primary focus:outline-hidden focus:ring-2 focus:ring-educaro-accent/40 leading-relaxed font-sans"
                  />
                  <p className="text-[11px] text-educaro-muted">
                    Our AI parses your background, motivation, and career goals directly from this text and maps them with <span className="font-semibold text-educaro-accent">AI-Extracted</span> provenance.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleProcessTranscript()}
                    disabled={isProcessing || !transcriptInput.trim()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Motivation & Goals via AI →</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: WEBCAM RECORDING */}
            {activeTab === 'record' && (
              <div className="space-y-4">
                <div className="relative aspect-video max-w-2xl mx-auto rounded-2xl overflow-hidden bg-black/80 flex items-center justify-center border border-educaro-border shadow-inner">
                  {/* Live Stream View */}
                  {!previewVideoUrl && (
                    <video
                      ref={liveVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Recorded Preview View */}
                  {previewVideoUrl && (
                    <video
                      src={previewVideoUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}

                  {/* Initial Overlay if camera not started */}
                  {!stream && !previewVideoUrl && (
                    <div className="text-center p-6 space-y-3 z-10">
                      <Camera className="w-10 h-10 text-white/80 mx-auto" />
                      <p className="text-xs text-white/90 font-medium">
                        Click below to enable your camera and microphone
                      </p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-bold shadow-md transition-colors"
                      >
                        Enable Camera & Mic
                      </button>
                    </div>
                  )}

                  {/* Recording indicator & timer overlay */}
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-full text-white text-xs font-bold border border-red-500/50">
                      <span className="w-2.5 h-2.5 rounded-full bg-educaro-icon0 animate-ping" />
                      <span>REC {recordTime}s / 60s</span>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="p-3 bg-educaro-icon border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {/* Webcam Controls */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {stream && !isRecording && !recordedBlob && (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Recording</span>
                    </button>
                  )}

                  {isRecording && (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-bold shadow-sm transition-all animate-pulse"
                    >
                      <Square className="w-4 h-4 text-red-500 fill-red-500" />
                      <span>Stop Recording</span>
                    </button>
                  )}

                  {recordedBlob && (
                    <>
                      <button
                        type="button"
                        onClick={resetRecording}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-educaro-main hover:bg-educaro-secondary text-educaro-primary text-xs font-semibold border border-educaro-border transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-record</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleProcessVideo(false)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Transcribe & Extract Motivation →</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FILE UPLOAD */}
            {activeTab === 'upload' && (
              <div className="space-y-4 max-w-xl mx-auto">
                <div className="border-2 border-dashed border-educaro-border hover:border-educaro-accent rounded-2xl p-8 text-center bg-educaro-main transition-colors space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-educaro-icon text-educaro-accent flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-educaro-primary">
                      Upload your spoken intro video
                    </p>
                    <p className="text-[11px] text-educaro-muted">
                      Supported formats: .mp4, .webm, .mov (Max 25MB)
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-bold cursor-pointer transition-colors">
                    <span>Browse Video File</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {selectedFile && (
                  <div className="bg-educaro-main p-4 rounded-2xl border border-educaro-border space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-educaro-accent" />
                        <span className="font-semibold text-educaro-primary">{selectedFile.name}</span>
                        <span className="text-[10px] text-educaro-muted">
                          ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewVideoUrl(null);
                        }}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    {previewVideoUrl && (
                      <video src={previewVideoUrl} controls className="w-full rounded-xl max-h-60" />
                    )}

                    <button
                      type="button"
                      onClick={() => handleProcessVideo(false)}
                      disabled={isProcessing}
                      className="w-full py-2.5 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Upload, Transcribe & Extract Profile Fields →</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Processing Overlay / Status */}
            {isProcessing && (
              <div className="p-6 bg-educaro-secondary rounded-2xl border border-educaro-accent/40 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-educaro-accent animate-spin" />
                  <div>
                    <h4 className="text-xs font-bold text-educaro-primary">AI STT & Extraction In Progress</h4>
                    <p className="text-[11px] text-educaro-muted">{processingStage}</p>
                  </div>
                </div>
                <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-educaro-accent h-full w-2/3 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* RESULT DISPLAY: TRANSCRIPT & EXTRACTED MOTIVATION */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Success Banner */}
            <div className="bg-educaro-icon border border-educaro-accent/20 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Video Introduction Transcribed & Extracted
                  </h3>
                  <p className="text-xs text-educaro-accent">
                    Engine: {modelUsed || 'Gemini Flash'} • 3 Motivation fields verified with strict AI-Extracted provenance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompleted(false)}
                  className="px-3.5 py-1.5 rounded-full border border-educaro-border bg-white text-xs font-semibold text-educaro-muted hover:text-educaro-primary"
                >
                  Record New Video
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/journey/documents')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-bold shadow-xs transition-colors"
                >
                  <span>Continue to Documents</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Video Preview & Full Transcript */}
              <div className="lg:col-span-6 space-y-4">
                {/* Embedded Video */}
                <div className="bg-educaro-main rounded-3xl border border-educaro-border p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-educaro-border">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-educaro-accent" />
                      <h4 className="text-xs font-bold text-educaro-primary">Applicant Spoken Video</h4>
                    </div>
                    <span className="text-[10px] font-semibold text-educaro-muted">Stored in Profile</span>
                  </div>
                  {previewVideoUrl && (
                    <video
                      src={previewVideoUrl}
                      controls
                      className="w-full aspect-video rounded-2xl bg-black object-cover"
                    />
                  )}
                </div>

                {/* Spoken Transcript */}
                <div className="bg-educaro-main rounded-3xl border border-educaro-border p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-educaro-border">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-educaro-accent" />
                      <h4 className="text-xs font-bold text-educaro-primary">Full Spoken Transcript</h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Groq AI Output
                    </span>
                  </div>
                  <div className="p-4 bg-educaro-main rounded-2xl border border-educaro-border max-h-64 overflow-y-auto text-xs text-educaro-primary leading-relaxed italic">
                    &quot;{transcript}&quot;
                  </div>
                </div>
              </div>

              {/* Right Column: AI-Extracted Motivation Profile Fields */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-educaro-main rounded-3xl border border-educaro-border p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-educaro-border">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-educaro-primary">
                        Extracted Motivation & Goals
                      </h3>
                      <p className="text-[11px] text-educaro-muted">
                        Category: <strong>MOTIVATION</strong> • Seeded to applicant intake record
                      </p>
                    </div>
                    <ProvenanceBadge provenance={Provenance.AI_EXTRACTED} />
                  </div>

                  <div className="space-y-3">
                    {extractedFields.map((field) => (
                      <div
                        key={field.key}
                        className="bg-educaro-main rounded-2xl border border-educaro-border p-4 text-xs space-y-2 hover:border-educaro-accent transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-educaro-primary">{field.label}</span>
                          <ProvenanceBadge
                            provenance={field.provenance}
                            confidence={field.confidence}
                            sourceText={field.sourceSnippet}
                          />
                        </div>
                        <p className="text-educaro-primary font-medium leading-relaxed bg-white/50 p-2.5 rounded-xl border border-educaro-border/60">
                          {field.value}
                        </p>
                        {field.sourceSnippet && (
                          <p className="text-[11px] text-educaro-muted">
                            <span className="font-semibold text-educaro-accent">Source quote:</span> &quot;
                            {field.sourceSnippet}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/journey/documents')}
                      className="w-full py-3 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Step 5: Document Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
