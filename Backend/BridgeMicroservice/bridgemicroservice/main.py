from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from bridgemicroservice.service import get_mistral_response, generate_task

app = FastAPI()

# Allow all CORS requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

@app.post("/api/mistral")
async def mistral_endpoint(request: Request):
    data = await request.json()
    input_data = data.get('input')
    if not input_data:
        return {"error": "No input provided"}
    
    mistral_response = get_mistral_response(input_data)
    return {"response": mistral_response}

@app.post("/api/createtask")
async def generate_task_endpoint(request: Request):
    data = await request.json()
    user_language = data.get('language')
    user_level = data.get('level')
    task_response = generate_task(user_language, user_level)
    return task_response 