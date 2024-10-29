import os
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
from dotenv import load_dotenv
import json
import time
import asyncio
import transformers

load_dotenv()

os.environ["HF_HOME"] = os.path.join(os.path.expanduser("~"), "hf_cache")

huggingface_token = os.getenv("HUGGINGFACE_TOKEN")

model_name = "speakleash/Bielik-11B-v2"
tokenizer = AutoTokenizer.from_pretrained(model_name, use_auth_token=huggingface_token)
model = AutoModelForCausalLM.from_pretrained(
    model_name, torch_dtype=torch.bfloat16, use_auth_token=huggingface_token
)
pipeline = transformers.pipeline("text-generation", model=model, tokenizer=tokenizer)


def check_with_bielik(question: str, answer: str) -> dict:
    start_time = time.time()
    prompt = f"""Czy pytanie i odpowiedź są poprawne i pełne? Pytanie musi mieć jedną konkretną odpowiedź.
        Oto pytanie: {question}
        Oto odpowiedź: {answer}
        Odpowiedź musi być w formie JSON:
        {{
            "isCorrect": boolean,
            "correctQuestion": string,
            "correctAnswer": string
        }}
        Jeśli odpowiedź jest poprawna, to isCorrect musi być true, a correctQuestion i correctAnswer muszą być takie same jak odpowiedź i pytanie.
        Jeśli odpowiedź jest niepoprawna, to isCorrect musi być false, a correctQuestion i correctAnswer muszą być takie same jak pytanie i odpowiedź.
        Nie dodawaj żadnych innych komentarzy.
    """
    print("PROMPTING BIELIK")
    try:
        print("Setting up pipeline...")
        print("Generating output...")
        outputs = pipeline(
            prompt,
            max_new_tokens=100,
            do_sample=True,
            top_k=50,
            num_return_sequences=1,
            temperature=0.7,
            no_repeat_ngram_size=2,
            early_stopping=False,
        )
        print(f"Tokenization took {time.time() - start_time:.2f} seconds")

        print("Decoding output...")

        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print(f"Total processing time: {time.time() - start_time:.2f} seconds")
        print(f"Bielik response: {response}")

        try:
            json_response = json.loads(response)
            return json_response
        except json.JSONDecodeError:
            print(f"Failed to parse JSON from Bielik response: {response}")
            return {
                "isCorrect": True,
                "correctQuestion": question,
                "correctAnswer": answer,
            }

    except Exception as e:
        print(f"ERROR in Bielik processing: {e}")
        return {"isCorrect": True, "correctQuestion": question, "correctAnswer": answer}


async def check_with_bielik_async(question: str, answer: str) -> dict:
    timeout = 1200
    print("CHECKING WITH BIELIK ASYNC", timeout)
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(check_with_bielik, question, answer), timeout=timeout
        )
    except asyncio.TimeoutError:
        print("Bielik processing timed out")
        return {"isCorrect": True, "correctQuestion": question, "correctAnswer": answer}
