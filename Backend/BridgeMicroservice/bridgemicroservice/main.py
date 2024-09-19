from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from bridgemicroservice.service import explain_answer, get_openai_response, generate_task

app = FastAPI()

# Allow all CORS requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/askAi")
async def ask_ai(request: Request):
    data = await request.json()
    input_data = data.get("input")
    if not input_data:
        return {"error": "No input provided"}

    response = get_openai_response(input_data)
    return {"response": response}


@app.post("/api/createtask")
async def generate_task_endpoint(request: Request):
    data = await request.json()
    user_language = data.get("language")
    user_level = data.get("level")
    task_response = generate_task(user_language, user_level)
    return task_response

@app.post("/api/explainanswer")
async def explain_answer_endpoint(request: Request):
    data = await request.json()
    user_language = data.get("language")
    user_level = data.get("level")
    task = data.get("task")
    correct_answer = data.get("correct_answer")
    user_answer = data.get("user_answer")
    explanation_response = explain_answer(user_language, user_level, task, correct_answer, user_answer)
    return explanation_response