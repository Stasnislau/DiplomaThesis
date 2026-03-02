# Bridge Microservice Documentation

## Overview

The Bridge Microservice acts as an intermediary for handling AI-related tasks evaluations, content generation, and specialized learning services.

## API Reference

All endpoints return a standardized `BaseResponse` structure unless otherwise noted for raw streaming or specific file uploads if applicable.

**BaseResponse Structure:**

```json
{
  "success": true,
  "payload": { ... }
}
```

_Note: The `payload` field contains the actual data. Do not use `detail` for successful responses._

### 1. Materials

**Controller:** `MaterialController`
**Prefix:** `/materials`

#### Upload PDF

- **Endpoint:** `POST /materials/upload`
- **Description:** Uploads a PDF file, splits it into chunks, stores them in the Vector DB, and analyzes question types.
- **Input:** `multipart/form-data` with file field.
- **Output:**
  ```json
  {
    "success": true,
    "payload": {
      "filename": "string",
      "chunks_count": 10,
      "status": "success",
      "analyzed_types": ["Multiple Choice", "Open Question"]
    }
  }
  ```

#### Generate Quiz

- **Endpoint:** `POST /materials/quiz`
- **Description:** Generates a quiz based on uploaded materials and selected question types.
- **Input (JSON):**
  ```json
  {
    "selected_types": ["Multiple Choice", "True/False"] // Optional
  }
  ```
- **Output:**
  ```json
  {
    "success": true,
    "payload": {
      "quiz": {
        "questions": [
          {
            "question": "string",
            "options": ["string"],
            "correct_answer": "string",
            "type": "string"
          }
        ]
      }
    }
  }
  ```

### 2. Placement

**Controller:** `PlacementController`
**Prefix:** `/placement`

#### Create Task

- **Endpoint:** `POST /placement/task`
- **Description:** Generates the next question for a placement test based on the previous answer.
- **Input (JSON):**
  ```json
  {
    "language": "English",
    "previousAnswer": "string" // Optional, for adaptive flow
  }
  ```
- **Output:**
  ```json
  {
    "success": true,
    "payload": {
      "type": "multiple_choice" | "fill_in_the_blank",
      "question": "string",
      "options": ["string"], // for multiple_choice
      "userAnswer": null
    }
  }
  ```

#### Evaluate Test

- **Endpoint:** `POST /placement/evaluate`
- **Description:** Evaluates the entire placement test and assigns a CEFR level.
- **Input (JSON):**
  ```json
  {
    "language": "English",
    "answers": [
      {
        "question": "string",
        "userAnswer": "string",
        "isCorrect": boolean
      }
    ]
  }
  ```
- **Output:**
  ```json
  {
    "success": true,
    "payload": {
      "level": "B2",
      "score": 85,
      "feedback": "string"
    }
  }
  ```

### 3. Speaking

**Controller:** `SpeakingController`
**Prefix:** `/speaking`

#### Analyze Audio

- **Endpoint:** `POST /speaking/analyze`
- **Description:** Transcribes and evaluates a user's spoken audio.
- **Input:** Query param `language` + `multipart/form-data` with `audio_file`.
- **Output:**
  ```json
  {
    "success": true,
    "payload": "Analysis result string..."
  }
  ```

### 4. Listening

**Controller:** `ListeningController`
**Prefix:** `/tasks`

#### Create Listening Task

- **Endpoint:** `POST /tasks/listening`
- **Description:** specific logic for generating listening exercises.
- **Input (JSON):** `ListeningTaskRequest` (exact fields depend on DTO, typically topic/level).
- **Output:**
  ```json
  {
    "success": true,
    "payload": {
      "type": "listening",
      "audioUrl": "string",
      "transcript": "string",
      "questions": [...]
    }
  }
  ```

### 5. Writing

**Controller:** `WritingController`
**Prefix:** `/writing`

#### Multiple Choice

- **Endpoint:** `POST /writing/multiplechoice`
- **Description:** Generates a writing-focused multiple choice task.
- **Input (JSON):**
  ```json
  {
    "language": "English",
    "level": "B2"
  }
  ```
- **Output:**
  ```json
  {
    "success": true,
    "payload": {
      "type": "multiple_choice",
      "question": "string",
      "options": ["string"],
      "correctAnswer": "string"
    }
  }
  ```

#### Fill in the Blank

- **Endpoint:** `POST /writing/blank`
- **Input (JSON):** `{ "language": "...", "level": "..." }`
- **Output:**
  ```json
  {
    "success": true,
    "payload": {
      "type": "fill_in_the_blank",
      "question": "string",
      "correctAnswer": "string"
    }
  }
  ```

#### Explain Answer

- **Endpoint:** `POST /writing/explainanswer`
- **Input (JSON):**
  ```json
  {
    "task": { ... }, // Task object
    "userAnswer": "string",
    "language": "English"
  }
  ```
- **Output:**
  ```json
  {
    "success": true,
    "payload": {
      "explanation": "string",
      "isCorrect": boolean
    }
  }
  ```

## Dependencies & Tools

- **Language:** Python 3.10
- **Framework:** FastAPI
- **Package Manager:** Poetry
- **AI/ML:** OpenAI, Mistral, LangChain, SentenceTransformers, Whisper
- **DB:** LanceDB (Vector)

## How to Run

1. `poetry install`
2. `poetry run poe start`
3. `poetry run mypy .`
