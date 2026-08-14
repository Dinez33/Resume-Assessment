import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure GenAI API Key
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def get_model():
    # Using gemini-3.5-flash which is the active modern model on the free tier
    return genai.GenerativeModel("gemini-3.5-flash")

def analyze_resume_for_hr(resume_text: str) -> dict:
    """
    Analyzes resume text for HR: returns ATS score, summary, tailored Q&As, and tailored MCQs.
    """
    if not api_key or not api_key.strip():
        print("GEMINI_API_KEY is not configured. Returning simulated mock data.")
        return {
            "ats_score": 75,
            "summary": "Software engineer with experience in Python and Web development (Simulated/Fallback Response - please configure your GEMINI_API_KEY in backend/.env).",
            "questions": [
                {
                    "question": "Can you describe a project where you solved a challenging technical problem using Python?",
                    "type": "Technical",
                    "suggested_answer": "Describe the context, action, and results (STAR method) of using libraries like FastAPI, pandas, or Django to optimize code."
                },
                {
                    "question": "How do you handle disagreements on technical stack choices with your team?",
                    "type": "Behavioral",
                    "suggested_answer": "Discuss active listening, comparing pros/cons objectively, and aligning with business goals."
                }
            ],
            "mcqs": [
                {
                    "question": "Which of the following is a key feature of Python's FastAPI framework?",
                    "options": [
                        "Automatic interactive API documentation (Swagger UI)",
                        "Server-side rendering only",
                        "No support for asynchronous programming",
                        "Strictly synchronous request processing"
                    ],
                    "correct_option": "A",
                    "explanation": "FastAPI automatically generates interactive Swagger UI documentation for APIs based on open standards."
                },
                {
                    "question": "What is the primary purpose of using 'git merge' in source control management?",
                    "options": [
                        "To delete a branch from remote repository",
                        "To combine development history from one branch into another",
                        "To revert the latest commit on main branch",
                        "To compile local source files into an executable"
                    ],
                    "correct_option": "B",
                    "explanation": "git merge combines changes from one Git branch into another."
                }
            ]
        }

    model = get_model()
    prompt = f"""
    You are an expert HR Manager and Technical Recruiter. Analyze the following resume.
    Provide:
    1. An ATS Score (0 to 100) indicating how well-structured and matching this resume is for general roles corresponding to the candidate's profile.
    2. A list of 5 tailored interview questions (a mix of technical and behavioral) based on the candidate's experience, along with detailed model answers for each.
    3. A list of 5 tailored multiple-choice questions (MCQs) testing candidate concepts relevant to their resume experience. Each MCQ must have exactly 4 options ("A", "B", "C", "D"), a correct option letter, and a brief explanation of the correct option.

    Format your output strictly as a JSON object with this exact structure:
    {{
        "ats_score": number,
        "summary": "Brief summary of the candidate profile",
        "questions": [
            {{
                "question": "Question text",
                "type": "Technical" or "Behavioral",
                "suggested_answer": "Model answer text"
            }}
        ],
        "mcqs": [
            {{
                "question": "Question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_option": "A" or "B" or "C" or "D",
                "explanation": "Brief explanation of why the correct option is right"
            }}
        ]
    }}
    
    Resume Text:
    {resume_text}
    """
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in analyze_resume_for_hr: {e}")
        raise e

def analyze_resume_for_candidate(resume_text: str, num_questions: int = 5) -> dict:
    """
    Analyzes resume text for Candidate: returns ATS score and improvements.
    """
    if not api_key or not api_key.strip():
        print("GEMINI_API_KEY is not configured. Returning simulated mock data.")
        return {
            "ats_score": 65,
            "improvements": [
                "Include more quantitative metrics (e.g., 'improved page load times by 40%').",
                "Ensure key technical skills listed are backed up with projects in the Experience section.",
                "Please configure GEMINI_API_KEY in the backend/.env file to receive live personalized suggestions."
            ],
            "resume_text": resume_text
        }

    model = get_model()
    prompt = f"""
    You are an expert ATS optimization consultant and Career Coach. Analyze the following resume.
    Provide:
    1. An ATS Score (0 to 100).
    2. A list of constructive suggestions for improving the resume (e.g. formatting, missing keywords, impact-driven verbs).

    Format your output strictly as a JSON object with this exact structure:
    {{
        "ats_score": number,
        "improvements": [
            "Suggestion 1",
            "Suggestion 2",
            ...
        ]
    }}

    Resume Text:
    {resume_text}
    """
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        data = json.loads(response.text)
        data["resume_text"] = resume_text
        return data
    except Exception as e:
        print(f"Error in analyze_resume_for_candidate: {e}")
        raise e

def generate_mock_test(interest: str, difficulty: str, format_type: str, num_questions: int = 5, resume_text: str = None) -> dict:
    """
    Generates a personalized mock test based on interest/topic, difficulty, format, and optionally resume text.
    """
    is_mcq = format_type.lower() == "mcq"
    difficulty_label = "simple, fundamental concept-based questions" if difficulty.lower() == "simple" else "advanced, scenario-based or deep analytical questions"
    
    if not api_key or not api_key.strip():
        print("GEMINI_API_KEY is not configured. Returning simulated mock test data.")
        mock_questions = []
        for i in range(num_questions):
            q_id = i + 1
            if is_mcq:
                mock_questions.append({
                    "id": q_id,
                    "question": f"Simulated {difficulty.capitalize()} MCQ Question {q_id} about {interest}?",
                    "topic": interest,
                    "options": [
                        f"Option A detailing first concept",
                        f"Option B detailing second concept",
                        f"Option C detailing third concept",
                        f"Option D detailing fourth concept"
                    ],
                    "correct_option": "A"
                })
            else:
                mock_questions.append({
                    "id": q_id,
                    "question": f"Simulated {difficulty.capitalize()} Text Question {q_id} about {interest}: Describe the core fundamentals and optimization techniques.",
                    "topic": interest
                })
        return {"mock_questions": mock_questions}

    resume_context = f"\nResume context to align questions with candidate's actual background:\n{resume_text}" if resume_text else ""
    
    mcq_instruction = """
    Since format is MCQ, each question must have exactly 4 options ("A", "B", "C", "D") and a "correct_option" field.
    Format your output strictly as a JSON object with this exact structure:
    {
        "mock_questions": [
            {
                "id": number (1 to N),
                "question": "Question text...",
                "topic": "Subtopic name",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_option": "A" or "B" or "C" or "D"
            }
        ]
    }
    """
    
    text_instruction = """
    Since format is Free Text, each question only needs a question and a topic.
    Format your output strictly as a JSON object with this exact structure:
    {
        "mock_questions": [
            {
                "id": number (1 to N),
                "question": "Question text...",
                "topic": "Subtopic name"
            }
        ]
    }
    """
    
    prompt = f"""
    You are an expert interviewer. Generate exactly {num_questions} mock test questions.
    Target Topic/Interest: {interest}
    Difficulty level: {difficulty_label}
    Format: {"Multiple Choice Questions (MCQ)" if is_mcq else "Free Text response"}
    {resume_context}

    Instructions:
    - Generate unique and varied questions tailored to the requested topic/interest.
    - If difficulty is "simple", keep questions straightforward, testing basic terminology, syntax, or concepts.
    - If difficulty is "advanced", use situational scenarios, design problems, or edge cases.
    {mcq_instruction if is_mcq else text_instruction}
    """
    
    model = get_model()
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in generate_mock_test: {e}")
        raise e

def evaluate_test_answers(questions_and_answers: list) -> dict:
    """
    Evaluates candidate's answers to mock test questions.
    Input format: list of dicts with keys: 'question', 'topic', 'user_answer', and optionally 'options', 'correct_option'
    Returns: question-by-question scoring, feedback, correct model answer, and overall score.
    """
    if not api_key or not api_key.strip():
        print("GEMINI_API_KEY is not configured. Returning simulated mock data.")
        evaluations = []
        overall_score = 0
        for item in questions_and_answers:
            correct_opt = item.get("correct_option")
            user_ans = item.get("user_answer", "").strip()
            
            if correct_opt:
                # MCQ simple grading logic
                is_correct = user_ans.upper() == correct_opt.upper() or (len(user_ans) == 1 and user_ans.upper() == correct_opt.upper())
                score = 10 if is_correct else 0
                feedback = "Correct choice selected!" if is_correct else f"Incorrect choice. The correct option is {correct_opt}."
                ideal = f"Option {correct_opt}"
                if "options" in item and isinstance(item["options"], list):
                    opt_map = {"A": 0, "B": 1, "C": 2, "D": 3}
                    idx = opt_map.get(correct_opt.upper(), 0)
                    if idx < len(item["options"]):
                        ideal = f"Option {correct_opt}: {item['options'][idx]}"
            else:
                ans_len = len(user_ans)
                score = min(10, max(2, ans_len // 10))  # Simple mock scoring based on length
                feedback = "This is a simulated evaluation because GEMINI_API_KEY is not configured in backend/.env."
                ideal = f"Ideal response to test topic: {item.get('topic', 'N/A')}"
                
            evaluations.append({
                "question": item.get("question", "N/A"),
                "user_answer": user_ans,
                "score": score,
                "feedback": feedback,
                "ideal_answer": ideal
            })
            overall_score += score
        
        overall_score = int((overall_score / (len(questions_and_answers) * 10)) * 100) if questions_and_answers else 0
        return {
            "overall_score": overall_score,
            "verdict": "Simulated Result" if overall_score > 50 else "Needs Work (Simulated)",
            "general_feedback": "Please configure GEMINI_API_KEY in the backend/.env to get a real AI grading assessment.",
            "evaluations": evaluations
        }

    model = get_model()
    formatted_qa = json.dumps(questions_and_answers, indent=2)
    prompt = f"""
    You are an expert interviewer. Review the following questions and the candidate's answers.
    Grade each answer on a scale from 0 to 10.
    Note: For MCQ questions, check if user's answer matches the 'correct_option' or select option description. Explain why the option is correct or incorrect.
    Provide constructive feedback and a suggested ideal answer for each question.
    Calculate an overall average score (0 to 100) and general performance feedback.

    Format your output strictly as a JSON object with this exact structure:
    {{
        "overall_score": number (0 to 100),
        "verdict": "e.g., Excellent / Good / Needs Improvement",
        "general_feedback": "Overall evaluation summary",
        "evaluations": [
            {{
                "question": "Question text",
                "user_answer": "Candidate's answer text",
                "score": number (0 to 10),
                "feedback": "Constructive feedback explaining correctness or concepts",
                "ideal_answer": "A concise model answer or correct option explanation"
            }}
        ]
    }}

    Questions and Candidate Answers:
    {formatted_qa}
    """
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in evaluate_test_answers: {e}")
        raise e
