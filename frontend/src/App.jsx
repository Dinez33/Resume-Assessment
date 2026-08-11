import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  User, 
  Briefcase, 
  AlertCircle, 
  Award, 
  BookOpen, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle, 
  RefreshCw, 
  Play, 
  FileText,
  HelpCircle,
  TrendingUp,
  Compass,
  Download
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [role, setRole] = useState('candidate'); // 'candidate' | 'hr'
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom mock test settings
  const [practiceMode, setPracticeMode] = useState('resume'); // 'resume' | 'direct'
  const [interest, setInterest] = useState('Python Backend Developer');
  const [difficulty, setDifficulty] = useState('simple'); // 'simple' | 'advanced'
  const [formatType, setFormatType] = useState('mcq'); // 'mcq' | 'text'
  const [resumeText, setResumeText] = useState('');

  // Analysis States
  const [atsScore, setAtsScore] = useState(null);
  const [summary, setSummary] = useState('');
  const [qaList, setQaList] = useState([]);
  const [improvements, setImprovements] = useState([]);
  
  // Mock Test States
  const [mockQuestions, setMockQuestions] = useState([]);
  const [testState, setTestState] = useState('setup'); // 'setup' | 'active' | 'evaluating' | 'result'
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionIndex: answerText }
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [openQaIndex, setOpenQaIndex] = useState(null);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError('');
      } else {
        setError("Only PDF files are supported.");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError('');
      } else {
        setError("Only PDF files are supported.");
      }
    }
  };

  const resetUpload = () => {
    setFile(null);
    setAtsScore(null);
    setSummary('');
    setQaList([]);
    setImprovements([]);
    setMockQuestions([]);
    setResumeText('');
    setTestState('setup');
    setAnswers({});
    setEvaluationResult(null);
    setError('');
  };

  const startAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    
    let endpoint = `${API_BASE_URL}/api/analyze/candidate`;
    if (role === 'hr') {
      endpoint = `${API_BASE_URL}/api/analyze/hr`;
    } else {
      formData.append('num_questions', numQuestions);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errMessage = 'Analysis failed. Please check your backend connection.';
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errMessage = errData.detail;
          }
        } catch (_) {}
        throw new Error(errMessage);
      }

      const data = await response.json();
      setAtsScore(data.ats_score);
      
      if (role === 'hr') {
        setSummary(data.summary || '');
        setQaList(data.questions || []);
      } else {
        setImprovements(data.improvements || []);
        setResumeText(data.resume_text || '');
        setMockQuestions([]); // Clear questions to let them customize mock test!
        setTestState('setup');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during resume analysis.');
    } finally {
      setLoading(false);
    }
  };

  const generateMockTest = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate/mocktest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interest: interest,
          difficulty: difficulty,
          format_type: formatType,
          num_questions: numQuestions,
          resume_text: practiceMode === 'resume' ? resumeText : null
        })
      });

      if (!response.ok) {
        let errMessage = 'Mock test generation failed.';
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errMessage = errData.detail;
          }
        } catch (_) {}
        throw new Error(errMessage);
      }

      const data = await response.json();
      setMockQuestions(data.mock_questions || []);
      setAnswers({});
      setCurrentQuestionIdx(0);
      setTestState('active');
    } catch (err) {
      setError(err.message || 'An error occurred during mock test generation.');
    } finally {
      setLoading(false);
    }
  };

  const startMockTest = () => {
    setTestState('active');
    setCurrentQuestionIdx(0);
    setAnswers({});
  };

  const handleAnswerChange = (e) => {
    setAnswers({
      ...answers,
      [currentQuestionIdx]: e.target.value
    });
  };

  const selectMcqOption = (optionLetter) => {
    setAnswers({
      ...answers,
      [currentQuestionIdx]: optionLetter
    });
  };

  const submitTest = async () => {
    setTestState('evaluating');
    setError('');

    // Prepare questions and user responses
    const submissionData = mockQuestions.map((q, idx) => ({
      question: q.question,
      topic: q.topic,
      user_answer: answers[idx] || '',
      options: q.options || null,
      correct_option: q.correct_option || null
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/evaluate/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: submissionData }),
      });

      if (!response.ok) {
        let errMessage = 'Test evaluation failed.';
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errMessage = errData.detail;
          }
        } catch (_) {}
        throw new Error(errMessage);
      }

      const data = await response.json();
      setEvaluationResult(data);
      setTestState('result');
    } catch (err) {
      setError(err.message || 'An error occurred while evaluating the test.');
      setTestState('active');
    }
  };

  const exportToCSV = (questions) => {
    if (!questions || questions.length === 0) return;
    
    // Column headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Question,Suggested Model Answer\n";
    
    questions.forEach((item) => {
      const type = `"${(item.type || 'Technical').replace(/"/g, '""')}"`;
      const question = `"${item.question.replace(/"/g, '""')}"`;
      const suggested = `"${(item.suggested_answer || '').replace(/"/g, '""')}"`;
      csvContent += `${type},${question},${suggested}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "interview_questions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToWord = (questions) => {
    if (!questions || questions.length === 0) return;
    
    // Create simple formatted HTML string that MS Word natively parses as a rich document
    let htmlString = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Interview Questions & Model Answers</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333333; }
          h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 5px; font-size: 24px; }
          .question-card { margin-bottom: 25px; padding: 15px; border-left: 4px solid #7c3aed; background-color: #f9fafb; }
          .question-title { font-weight: bold; font-size: 16px; color: #111111; margin-bottom: 8px; }
          .badge { display: inline-block; padding: 3px 8px; background-color: #e0e7ff; color: #4f46e5; font-size: 11px; font-weight: bold; border-radius: 3px; text-transform: uppercase; margin-bottom: 8px; }
          .answer-label { font-weight: bold; color: #475569; margin-top: 10px; }
          .answer-text { color: #374151; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>Tailored Interview Questions & Answers</h1>
        <p>Generated via TalentAI Assessment matching candidate resume details.</p>
        <hr/>
    `;
    
    questions.forEach((item, index) => {
      htmlString += `
        <div class="question-card">
          <span class="badge">${item.type || 'Technical'}</span>
          <div class="question-title">Q${index + 1}: ${item.question}</div>
          <div class="answer-label">Suggested Model Answer:</div>
          <div class="answer-text">${item.suggested_answer || 'N/A'}</div>
        </div>
      `;
    });
    
    htmlString += `</body></html>`;
    
    const blob = new Blob(['\ufeff' + htmlString], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'interview_questions.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleQa = (index) => {
    if (openQaIndex === index) {
      setOpenQaIndex(null);
    } else {
      setOpenQaIndex(index);
    }
  };

  const renderMockTestFlow = () => {
    return (
      <>
        {/* Test State: Setup */}
        {testState === 'setup' && (
          <div className="test-layout">
            <div style={{ textAlign: 'center' }}>
              <Compass size={48} color="var(--accent-primary)" style={{ margin: '0 auto 8px auto' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Personalized Mock Test</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '450px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
                {practiceMode === 'resume' 
                  ? 'Test your knowledge based on your resume. Set up your interest topic and practice preferences below:'
                  : 'Configure and start your direct practice mock test:'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {practiceMode === 'resume' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="resume-interest">Focus Role / Target Topic</label>
                  <input 
                    id="resume-interest"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Python Developer, React Specialist, Data Analyst"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="resume-difficulty">Difficulty Level</label>
                <select 
                  id="resume-difficulty"
                  className="form-input"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="simple">Simple Questions (Fundamental Concepts)</option>
                  <option value="advanced">Standard / Advanced (Scenario-based)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="resume-format">Question Style</label>
                <select 
                  id="resume-format"
                  className="form-input"
                  value={formatType}
                  onChange={(e) => setFormatType(e.target.value)}
                >
                  <option value="mcq">Multiple Choice Questions (MCQ)</option>
                  <option value="text">Free Text Answer</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="resume-num-questions">Number of Questions</label>
                <select 
                  id="resume-num-questions"
                  className="form-input" 
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={8}>8 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>

              {error && (
                <div style={{ color: 'var(--color-danger)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}
            </div>

            <button className="btn" style={{ alignSelf: 'center', marginTop: '12px' }} onClick={generateMockTest}>
              <Play size={16} /> Generate Mock Test
            </button>
          </div>
        )}

        {/* Test State: Active Questionnaire */}
        {testState === 'active' && mockQuestions.length > 0 && (
          <div className="test-layout">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Question {currentQuestionIdx + 1} of {mockQuestions.length}
              </span>
              <span className="qa-badge technical">
                {mockQuestions[currentQuestionIdx].topic}
              </span>
            </div>

            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentQuestionIdx + 1) / mockQuestions.length) * 100}%` }}
              ></div>
            </div>

            <div style={{ margin: '12px 0' }}>
              <h4 style={{ fontSize: '18px', fontWeight: '600', lineHeight: '1.5' }}>
                {mockQuestions[currentQuestionIdx].question}
              </h4>
            </div>

            {mockQuestions[currentQuestionIdx].options ? (
              <div className="mcq-options-grid">
                {mockQuestions[currentQuestionIdx].options.map((opt, oIdx) => {
                  const letter = String.fromCharCode(65 + oIdx); // A, B, C, D
                  const isSelected = answers[currentQuestionIdx] === letter;
                  return (
                    <button 
                      key={oIdx} 
                      className={`mcq-option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => selectMcqOption(letter)}
                    >
                      <span className="mcq-option-letter">{letter}</span>
                      <span className="mcq-option-text">{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="user-answer">Your Answer</label>
                <textarea
                  id="user-answer"
                  rows={6}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                  placeholder="Write your explanation or code here..."
                  value={answers[currentQuestionIdx] || ''}
                  onChange={handleAnswerChange}
                />
              </div>
            )}

            <div className="test-nav">
              <button 
                className="btn btn-secondary" 
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
              >
                Back
              </button>
              
              {currentQuestionIdx < mockQuestions.length - 1 ? (
                <button 
                  className="btn" 
                  onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                >
                  Next Question
                </button>
              ) : (
                <button 
                  className="btn" 
                  style={{ background: 'linear-gradient(135deg, var(--color-success) 0%, #059669 100%)', boxShadow: 'none' }}
                  onClick={submitTest}
                >
                  Submit Assessment
                </button>
              )}
            </div>
          </div>
        )}

        {/* Test State: Evaluating */}
        {testState === 'evaluating' && (
          <div className="pulse-loader" style={{ padding: '80px 20px' }}>
            <div className="pulse-ring"></div>
            <h3 style={{ fontWeight: '600' }}>Evaluating Your Test...</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
              Gemini AI is analyzing each response, calculating scores, and writing custom feedback.
            </p>
          </div>
        )}

        {/* Test State: Evaluation Result */}
        {testState === 'result' && evaluationResult && (
          <div className="test-layout">
            <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Test Results</h3>
              
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', border: '2px solid var(--accent-primary)', margin: '12px 0' }}>
                <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {evaluationResult.overall_score}%
                </span>
              </div>

              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent-secondary)' }}>
                Verdict: {evaluationResult.verdict}
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '500px', margin: '12px auto 0 auto', lineHeight: '1.6' }}>
                {evaluationResult.general_feedback}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Detailed Questions Review</h4>
              {evaluationResult.evaluations?.map((item, idx) => {
                const isGood = item.score >= 8;
                const isWarn = item.score >= 5 && item.score < 8;
                const originalQuestion = mockQuestions[idx];
                
                return (
                  <div key={idx} className="evaluation-item">
                    <div className="eval-header">
                      <span style={{ fontWeight: '600', fontSize: '15px' }}>
                        Q{idx + 1}: {item.question}
                      </span>
                      <span className={`eval-score ${isGood ? 'good' : isWarn ? 'warning' : 'danger'}`}>
                        Score: {item.score}/10
                      </span>
                    </div>

                    <div className="eval-section-title">Your Answer</div>
                    <p className="eval-content">{item.user_answer || '(No answer provided)'}</p>

                    {originalQuestion && originalQuestion.options && (
                      <div className="mcq-options-grid" style={{ pointerEvents: 'none', margin: '12px 0' }}>
                        {originalQuestion.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isUserChoice = item.user_answer === letter;
                          const isCorrectChoice = originalQuestion.correct_option === letter;
                          
                          let stateClass = '';
                          if (isCorrectChoice) stateClass = 'correct';
                          else if (isUserChoice) stateClass = 'incorrect';
                          
                          return (
                            <div key={oIdx} className={`mcq-option-card ${stateClass}`}>
                              <span className="mcq-option-letter">{letter}</span>
                              <span className="mcq-option-text">{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="eval-section-title">AI Feedback</div>
                    <p className="eval-content" style={{ color: 'var(--text-primary)' }}>{item.feedback}</p>

                    <div className="eval-section-title">Ideal Model Answer</div>
                    <p className="eval-content" style={{ fontStyle: 'italic', background: 'rgba(99, 102, 241, 0.05)', padding: '10px', borderRadius: '6px', marginTop: '4px' }}>
                      {item.ideal_answer}
                    </p>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button className="btn" style={{ flex: 1 }} onClick={generateMockTest}>
                <RefreshCw size={16} /> Retake Test
              </button>
              <button className="btn btn-secondary" onClick={() => setTestState('setup')}>
                Back to Setup
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <Award size={32} color="#6366f1" />
          <h1 className="logo-text">TalentAI Assessment</h1>
        </div>
        <div className="role-switcher">
          <button 
            className={`role-btn ${role === 'candidate' ? 'active' : ''}`}
            onClick={() => { setRole('candidate'); resetUpload(); }}
          >
            <User size={16} /> Candidate Portal
          </button>
          <button 
            className={`role-btn ${role === 'hr' ? 'active' : ''}`}
            onClick={() => { setRole('hr'); resetUpload(); }}
          >
            <Briefcase size={16} /> HR Portal
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {!atsScore && !loading && testState === 'setup' && (
          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            {role === 'candidate' && (
              <div className="practice-tab-container">
                <button 
                  className={`practice-tab-btn ${practiceMode === 'resume' ? 'active' : ''}`}
                  onClick={() => { setPracticeMode('resume'); setAtsScore(null); }}
                >
                  Analyze Resume & Mock Test
                </button>
                <button 
                  className={`practice-tab-btn ${practiceMode === 'direct' ? 'active' : ''}`}
                  onClick={() => { setPracticeMode('direct'); setAtsScore(null); }}
                >
                  Direct Practice Hub
                </button>
              </div>
            )}

            <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '700' }}>
              {role === 'hr' 
                ? 'Analyze Candidate Resume for Interviewing' 
                : practiceMode === 'resume' 
                  ? 'Assess Your Resume & Try Mock Test' 
                  : 'Start Direct Practice Mock Test'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
              {role === 'hr'
                ? 'Upload a candidate\'s resume in PDF format. Generate an ATS structure match score and custom technical/behavioral interview questions with model answers.'
                : practiceMode === 'resume'
                  ? 'Upload your resume in PDF format. We will score your resume, provide ATS optimization recommendations, and construct a personalized interactive mock test based on your experience.'
                  : 'Choose your desired topic/interest, difficulty level, and format to immediately perform a simulated interactive mock test.'}
            </p>

            {(role === 'hr' || practiceMode === 'resume') ? (
              <>
                {/* Drag & Drop Zone */}
                <div 
                  className={`upload-zone ${dragActive ? 'dragover' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="upload-icon-container">
                    <UploadCloud size={32} />
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {file ? file.name : 'Drag & drop resume PDF here'}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : 'or click to browse from device'}
                    </p>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    style={{ display: 'none' }} 
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                </div>

                {error && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '14px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                {file && (
                  <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <button className="btn" style={{ flex: 1 }} onClick={startAnalysis}>
                      <Play size={16} /> Run AI Assessment
                    </button>
                    <button className="btn btn-secondary" onClick={resetUpload}>
                      Cancel
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Direct Practice Customizer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="direct-interest">Target Role / Interview Topic</label>
                    <select 
                      id="direct-interest"
                      className="form-input"
                      value={interest}
                      onChange={(e) => setInterest(e.target.value)}
                    >
                      <option value="Python Backend Developer">Python Backend Developer</option>
                      <option value="React Frontend Developer">React Frontend Developer</option>
                      <option value="SQL & Database Developer">SQL & Database Developer</option>
                      <option value="Fullstack Web Developer">Fullstack Web Developer</option>
                      <option value="Data Scientist / ML Engineer">Data Scientist / ML Engineer</option>
                      <option value="Behavioral & Leadership (HR) Prep">Behavioral & Leadership (HR) Prep</option>
                      <option value="General Software Engineering (Coding Problems)">General Software Engineering (Coding Problems)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="direct-difficulty">Difficulty Level</label>
                    <select 
                      id="direct-difficulty"
                      className="form-input"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option value="simple">Simple Questions (Fundamental Concepts)</option>
                      <option value="advanced">Standard / Advanced (Scenario-based)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="direct-format">Question Format</label>
                    <select 
                      id="direct-format"
                      className="form-input"
                      value={formatType}
                      onChange={(e) => setFormatType(e.target.value)}
                    >
                      <option value="mcq">Multiple Choice (MCQ)</option>
                      <option value="text">Free Text Answer</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="direct-num-questions">Number of Questions</label>
                    <select 
                      id="direct-num-questions"
                      className="form-input" 
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(Number(e.target.value))}
                    >
                      <option value={3}>3 Questions</option>
                      <option value={5}>5 Questions</option>
                      <option value={8}>8 Questions</option>
                      <option value={10}>10 Questions</option>
                    </select>
                  </div>

                  {error && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  <button className="btn" style={{ width: '100%', marginTop: '8px' }} onClick={generateMockTest}>
                    <Play size={16} /> Generate Mock Test
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="glass-card pulse-loader" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="pulse-ring"></div>
            <h3 style={{ fontWeight: '600' }}>Processing Request...</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
              Gemini AI is parsing details, grading structure and generating mock evaluations. This will take a moment.
            </p>
          </div>
        )}

        {/* Results Screen - HR View */}
        {atsScore !== null && role === 'hr' && (
          <div className="dashboard-grid">
            {/* Left Side: Score card */}
            <div className="glass-card ats-container">
              <h3 style={{ fontSize: '18px', fontWeight: '700', alignSelf: 'flex-start' }}>Resume Analytics</h3>
              
              <div className="ats-circle-wrapper" style={{ margin: '20px 0' }}>
                <svg className="ats-svg">
                  <defs>
                    <linearGradient id="ats-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent-primary)" />
                      <stop offset="100%" stopColor="var(--accent-secondary)" />
                    </linearGradient>
                  </defs>
                  <circle className="ats-circle-bg" cx="75" cy="75" r="60" />
                  <circle 
                    className="ats-circle-value" 
                    cx="75" 
                    cy="75" 
                    r="60" 
                    strokeDasharray={377}
                    strokeDashoffset={377 - (377 * atsScore) / 100}
                  />
                </svg>
                <div className="ats-text">
                  <span className="ats-score-num">{atsScore}</span>
                  <div className="ats-score-lbl">ATS Match</div>
                </div>
              </div>

              {summary && (
                <div style={{ textAlign: 'left', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-secondary)' }}>Summary</h4>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-muted)' }}>{summary}</p>
                </div>
              )}

              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '16px' }} onClick={resetUpload}>
                <RefreshCw size={16} /> Analyze Another Resume
              </button>
            </div>

            {/* Right Side: Questions Accordion */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <FileText size={20} color="var(--accent-primary)" /> Custom Interview Questions ({qaList.length})
                </h3>
                <div className="export-actions-row" style={{ margin: 0 }}>
                  <button className="btn-export btn-export-csv" onClick={() => exportToCSV(qaList)}>
                    <Download size={14} /> CSV (Excel)
                  </button>
                  <button className="btn-export btn-export-word" onClick={() => exportToWord(qaList)}>
                    <Download size={14} /> Word (Doc)
                  </button>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                Tailored interview questions generated by Gemini AI matching candidate's resume history. Expand to read suggested ideal responses.
              </p>

              <div>
                {qaList.map((item, idx) => (
                  <div key={idx} className="qa-card">
                    <div className="qa-header" onClick={() => toggleQa(idx)}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className={`qa-badge ${item.type?.toLowerCase()}`}>
                          {item.type || 'Technical'}
                        </span>
                        <h4 className="qa-title">{item.question}</h4>
                      </div>
                      <div style={{ color: 'var(--text-muted)', paddingTop: '4px' }}>
                        {openQaIndex === idx ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>
                    
                    {openQaIndex === idx && (
                      <div className="qa-body">
                        <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>Suggested Ideal Answer:</strong>
                        {item.suggested_answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Screen - Candidate View */}
        {atsScore !== null && role === 'candidate' && (
          <div className="dashboard-grid">
            {/* Left Side: Score & Recommendations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card ats-container">
                <h3 style={{ fontSize: '18px', fontWeight: '700', alignSelf: 'flex-start' }}>Resume Analytics</h3>
                
                <div className="ats-circle-wrapper" style={{ margin: '10px 0' }}>
                  <svg className="ats-svg">
                    <circle className="ats-circle-bg" cx="75" cy="75" r="60" />
                    <circle 
                      className="ats-circle-value" 
                      cx="75" 
                      cy="75" 
                      r="60" 
                      strokeDasharray={377}
                      strokeDashoffset={377 - (377 * atsScore) / 100}
                    />
                  </svg>
                  <div className="ats-text">
                    <span className="ats-score-num">{atsScore}</span>
                    <div className="ats-score-lbl">ATS Score</div>
                  </div>
                </div>

                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={resetUpload}>
                  <RefreshCw size={16} /> Upload New Resume
                </button>
              </div>

              <div className="glass-card">
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} color="var(--color-warning)" /> Improvement Suggestions
                </h3>
                {improvements.length > 0 ? (
                  <div className="tips-list">
                    {improvements.map((tip, idx) => (
                      <div key={idx} className="tip-item">
                        <AlertCircle className="tip-icon" size={16} />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No direct improvement suggestions found. Good job!</p>
                )}
              </div>
            </div>

            {/* Right Side: Mock Test flow */}
            <div className="glass-card">
              {renderMockTestFlow()}
            </div>
          </div>
        )}

        {/* Direct Practice Mock Test flow */}
        {practiceMode === 'direct' && testState !== 'setup' && !loading && (
          <div className="glass-card" style={{ maxWidth: '800px', margin: '20px auto 0 auto' }}>
            {renderMockTestFlow()}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
