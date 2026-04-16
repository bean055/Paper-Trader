'use client';
import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import "../../styles/pages/learn.css";

export default function Learn() {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [subSectionOpen, setSubSectionOpen] = useState(false);
  const [sidebarItems, setSidebarItems] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [loading, setLoading] = useState(false);


  const [glossary, setGlossary] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [glossaryIndex, setGlossaryIndex] = useState(0);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  
  const [moduleCompleted, setModuleCompleted] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState(null);
  const [progress, setProgress] = useState({
    attempts: [],
    moduleProgress: []
  });

useEffect(() => {
  async function fetchProgress() {
    const res = await fetch("/api/learn/progress", {
      credentials: "include" 
    });
    if (!res.ok) return;
    const data = await res.json();
    setProgress(data);
  }

  fetchProgress();
}, []);

  useEffect(() => {
    async function fetchGlossary() {
      const res = await fetch('/api/learn?category=glossary');
      const data = await res.json();
      setGlossary(data);
    }
    fetchGlossary();
  }, []);

  useEffect(() => {
    if (!selectedContent || category !== "learning modules") return;

    const completed = progress.moduleProgress?.some(
      m => m.module_id === selectedContent.module_id && m.completed
    );

    setModuleCompleted(completed);
  }, [selectedContent, progress]);

  useEffect(() => {
    setActiveTutorial(null);
  }, [selectedContent, category]);

  const filteredGlossary = useMemo(() => {
    return glossary.filter(item =>
      item.term.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, glossary]);

  const handleCategoryClick = async (cat) => {
    setCategory(cat);
    setCategoryOpen(true);
    setSubSectionOpen(true);
    setLoading(true);
    try {
      const response = await fetch(`/api/learn?category=${cat}`);
      const data = await response.json();
      setSidebarItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally { setLoading(false); }
  };

  const handleItemClick = async (id) => {
    try {
      const response = await fetch(`/api/learn?category=${category}&id=${id}`);
      const data = await response.json();
      setSelectedContent(data);
      setCurrentQuestionIndex(0); 
      setUserAnswers({}); 
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmitQuiz = async () => {
    let correctCount = 0;

    selectedContent.questions.forEach(q => {
      const userAnswer = userAnswers[q.question_id];
      const correctAnswer = q.options.find(opt => opt.is_correct)?.option_text;

      if (userAnswer?.toString().toLowerCase() === correctAnswer?.toString().toLowerCase()) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / selectedContent.questions.length) * 100);
    setScore(finalScore);
    setShowResults(true);

  await fetch("/api/learn/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type: "quiz",
        quizId: selectedContent.quiz_id,
        score: finalScore,
        passed: finalScore >= selectedContent.passing_score
      })
    });

    const res = await fetch("/api/learn/progress", {
      credentials: "include"
    });

    if (res.ok) {
      setProgress(await res.json());
    }
  };

  const markModuleComplete = async (checked) => {
  setModuleCompleted(checked);

  await fetch("/api/learn/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      type: "module",
      moduleId: selectedContent.module_id,
      completed: checked
    })
  });

  const res = await fetch("/api/learn/progress", {
    credentials: "include"
  });

  if (res.ok) setProgress(await res.json());
};

  const handleSelectAnswer = (questionId, value) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const nextTerm = () => setGlossaryIndex((prev) => (prev + 1) % filteredGlossary.length);
  const prevTerm = () => setGlossaryIndex((prev) => (prev - 1 + filteredGlossary.length) % filteredGlossary.length);

  const isModuleCompleted = (id) => progress.moduleProgress?.some(m => m.module_id === id && m.completed);
  const isQuizPassed = (id) => progress.quizzes?.[String(id)]?.passed === true;
  const getQuizAttempts = (quizId) => progress.attempts?.filter(a => a.quiz_id === quizId).length || 0;

  const renderMainContent = () => {
    if (!category || !selectedContent) {
      return (
        <div className="empty-state">
          <h1>Learning Environment</h1>
          <p>Select a category from the sidebar.</p>
        </div>
      );
    }

    if (category === "quizzes") {
      if (!selectedContent.questions || selectedContent.questions.length === 0) {
        return <p>No questions found.</p>;
      }

      const currentQuestion = selectedContent.questions[currentQuestionIndex];

      return (
        <div className="content-render">
          <div className="quiz-container">
            <div className="quiz-header">
              <h1>{selectedContent.title}</h1>
              <div className="quiz-details">
                <span className="passing-tag">Passing Grade: {selectedContent.passing_score}%</span>
                <span className="attempt-tag"> Attempts: {getQuizAttempts(selectedContent.quiz_id)}</span>
              </div>
            </div>

            {currentQuestion ? (
              <div className="question-card">
                <div className="question-meta">
                  <span>Question {currentQuestionIndex + 1} of {selectedContent.questions.length}</span>
                </div>
                <h2 className="question-text">{currentQuestion.question_text}</h2>
                
                <div className="answer-section">
                  {currentQuestion.question_type === 'NUMERIC' ? (
                    <input 
                      type="number"
                      className="numeric-input"
                      placeholder="Enter number..."
                      value={userAnswers[currentQuestion.question_id] || ""}
                      onChange={(e) => handleSelectAnswer(currentQuestion.question_id, e.target.value)}
                    />
                  ) : (
                    <div className="options-grid">
                      {currentQuestion.options.map((opt) => (
                        <button
                          key={opt.option_id}
                          className={`option-btn ${userAnswers[currentQuestion.question_id] === opt.option_text ? 'selected' : ''}`}
                          onClick={() => handleSelectAnswer(currentQuestion.question_id, opt.option_text)}
                        >
                          {opt.option_text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="quiz-nav">
                  <button className="nav-btn" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)}>
                    Previous
                  </button>
                  {currentQuestionIndex === selectedContent.questions.length - 1 ? (
                    <button className="submit-btn" onClick={handleSubmitQuiz}>Submit Quiz</button>
                  ) : (
                    <button className="nav-btn" onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>Next</button>
                  )}
                </div>
              </div>
            ) : (
              <p>Question not found.</p>
            )}

            {showResults && (
              <div className="quiz-overlay">
                <div className="score-popup">
                  <h2>Quiz Results</h2>
                  <div className="score-circle">
                    <span>{score}%</span>
                  </div>
                  <p className="result-msg">
                    {score >= selectedContent.passing_score ? "You Passed!" : "Try Again!"}
                  </p>
                  <button className="close-btn" onClick={() => {setShowResults(false); setSelectedContent(null);}}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (category === "learning modules") {
      return (
        <div className="content-render">
          <div className="module-render">
            {!activeTutorial ? (
             
              <div className="module-overview">
                <div className="module-header">
                  <h1>{selectedContent.module_title}</h1>
                  <div className="module-complete-box">
                    <label>
                      <input
                        type="checkbox"
                        checked={moduleCompleted}
                        onChange={(e) => markModuleComplete(e.target.checked)}
                      />
                       completed
                    </label>
                  </div>
                  <div className="module-meta">
                    <span className="duration-tag"> {selectedContent.estimated_duration} mins</span>
                  </div>
                </div>
                
                <p className="module-description">{selectedContent.description}</p>
                
                <div className="tutorial-section">
                  <h3>Available Tutorials</h3>
                  <div className="tutorial-grid">
                    {selectedContent.tutorials?.map((tut) => (
                      <div 
                        key={tut.tutorial_id} 
                        className="tutorial-card"
                        onClick={() => setActiveTutorial(tut)}
                      >
                        <div className="tut-details">
                          <h4>{tut.title}</h4>
                          <p>{tut.content_type === 'VIDEO'  ? "Video Lesson" : "Reading Material"}</p>

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (

              <div className="tutorial-player-view">
                <button className="back-btn" onClick={() => setActiveTutorial(null)}>
                  ← Back to {selectedContent.module_title}
                </button>

                <div className="tutorial-header">
                  <h1>{activeTutorial.title}</h1>
                </div>

                {activeTutorial.video_url && (
                  <div className="video-wrapper">
                    <iframe 
                      src={`https://www.youtube.com/embed/${activeTutorial.video_url}`}
                      title="Tutorial Video" 
                      frameBorder="0" 
                      allowFullScreen
                    ></iframe>
                  </div>
                )}

                <div className="tutorial-body">
                  <h3>Description</h3>
                  <div className="content-text">
                    {activeTutorial.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Navbar />
      <div className={`learn-page ${categoryOpen ? "sidebar-open" : ""} ${subSectionOpen ? "sub-open" : ""}`}>

        <button className="menu-btn" onClick={() => setCategoryOpen(!categoryOpen)}>
          {categoryOpen ? "✕" : "☰ "}
        </button>

        <aside className={`category-panel ${categoryOpen ? "open" : ""}`}>
          <div className="panel-inner">
            <h3>Categories</h3>
            <ul>
              <li onClick={() => handleCategoryClick("learning modules")}>Learning modules</li>
              <li onClick={() => handleCategoryClick("quizzes")}>Quizzes</li>
            </ul>
          </div>
        </aside>

        <aside className={`sub-panel ${subSectionOpen ? "open" : ""}`}>
          <div className="panel-inner">
            <button className="back-btn" onClick={() => setSubSectionOpen(false)}>← Back</button>
            <h3>{category ? category.toUpperCase() : "SELECT CATEGORY"}</h3>
            <ul>
            {loading ? (
              <li>Loading...</li>
            ) : sidebarItems?.map((item) => (
              <li
                key={item.id}
                className={
                  category === "quizzes" && isQuizPassed(item.id)
                    ? "passed"
                    : category === "learning modules" && isModuleCompleted(item.id)
                    ? "completed"
                    : ""
                }
                onClick={() => handleItemClick(item.id)}
              >
                {item.title}

                {category === "quizzes" && isQuizPassed(item.id) && (<span className="passed"> - Passed</span>)}
                {category === "learning modules" && isModuleCompleted(item.id) && " ✓"}
              </li>
            ))}
          </ul>
          </div>
        </aside>

        <main className="content-container">
          <section className="main-content">
            {renderMainContent()}
          </section>

          <section className="glossary">
            <div className="glossary-header">
              <span>GLOSSARY</span>
              <input
                type="text"
                placeholder="Search..."
                className="search-bar"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setGlossaryIndex(0); }}
              />
            </div>

            {filteredGlossary?.length > 0 ? (
              <div className="glossary-viewer">
                <div className="glossary-card">
                  <b>{filteredGlossary[glossaryIndex].term}</b>
                  <p>{filteredGlossary[glossaryIndex].definition}</p>
                </div>
                <div className="glossary-nav">
                  <button onClick={prevTerm}>prev</button>
                  <span>{glossaryIndex + 1} / {filteredGlossary.length}</span>
                  <button onClick={nextTerm}>next</button>
                </div>
              </div>
            ) : <p>No terms found.</p>}
          </section>
        </main>
      </div>
    </>
  );
}