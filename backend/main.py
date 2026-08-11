from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import uvicorn

from parser import extract_text_from_pdf
from analyzer import analyze_resume_for_hr, analyze_resume_for_candidate, evaluate_test_answers, generate_mock_test

app = FastAPI(title="Resume Assessment & Mock Test API")

# Add CORS Middleware to allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development; in production, configure specifically
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request validation
class QuestionAnswerItem(BaseModel):
    question: str
    topic: str
    user_answer: str
    options: Optional[List[str]] = None
    correct_option: Optional[str] = None

class TestEvaluationRequest(BaseModel):
    answers: List[QuestionAnswerItem]

class MockTestGenerateRequest(BaseModel):
    interest: str
    difficulty: str
    format_type: str
    num_questions: int
    resume_text: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "Resume Assessment and Mock Test API is running"}

def handle_api_exception(e: Exception):
    err_str = str(e)
    # Check for quota or rate limit error indicators
    if "429" in err_str or "ResourceExhausted" in err_str or "quota" in err_str.lower():
        raise HTTPException(
            status_code=429,
            detail="Gemini AI Quota Exceeded. You have hit the Google AI Studio free-tier rate limit. Please wait 30 seconds and try again, or configure a new API key."
        )
    # Check for invalid API key
    if "APIKeyInvalid" in err_str or "API key not valid" in err_str.lower() or "400" in err_str:
        raise HTTPException(
            status_code=400,
            detail="Invalid Gemini API Key. Please verify the GEMINI_API_KEY in your backend/.env file."
        )
    raise HTTPException(status_code=500, detail=f"AI Assessment Error: {err_str}")

@app.post("/api/analyze/hr")
async def analyze_hr_endpoint(file: UploadFile = File(...)):
    """
    Endpoint for HR view. Extracts resume text and returns ATS score + generated Q&As.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resume uploads are supported currently.")
    
    try:
        file_bytes = await file.read()
        resume_text = extract_text_from_pdf(file_bytes)
        
        if not resume_text:
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF. It may be scanned or empty.")
            
        analysis_result = analyze_resume_for_hr(resume_text)
        return analysis_result
    except HTTPException as he:
        raise he
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/analyze/candidate")
async def analyze_candidate_endpoint(
    file: UploadFile = File(...), 
    num_questions: int = Form(5)
):
    """
    Endpoint for Candidate view. Extracts resume text and returns ATS score, improvements, and mock test questions.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resume uploads are supported currently.")
    
    try:
        file_bytes = await file.read()
        resume_text = extract_text_from_pdf(file_bytes)
        
        if not resume_text:
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF. It may be scanned or empty.")
            
        analysis_result = analyze_resume_for_candidate(resume_text, num_questions)
        return analysis_result
    except HTTPException as he:
        raise he
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/evaluate/test")
async def evaluate_test_endpoint(request: TestEvaluationRequest):
    """
    Endpoint to grade/evaluate mock test answers submitted by the candidate.
    """
    try:
        items = [item.dict() for item in request.answers]
        evaluation_result = evaluate_test_answers(items)
        return evaluation_result
    except HTTPException as he:
        raise he
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/generate/mocktest")
async def generate_mock_test_endpoint(request: MockTestGenerateRequest):
    """
    Endpoint to generate custom mock test questions based on user interest, difficulty, format, and optional resume context.
    """
    try:
        result = generate_mock_test(
            interest=request.interest,
            difficulty=request.difficulty,
            format_type=request.format_type,
            num_questions=request.num_questions,
            resume_text=request.resume_text
        )
        return result
    except Exception as e:
        handle_api_exception(e)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
