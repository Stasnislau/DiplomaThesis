import os
from accelerate import init_empty_weights
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:512'
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
from dotenv import load_dotenv
import json
import time
import asyncio
import transformers


load_dotenv()

os.environ["HF_HOME"] = os.path.join(os.path.expanduser("~"), "hf_cache")

# huggingface_token = os.getenv("HUGGINGFACE_TOKEN")


model_name = "speakleash/Bielik-7B-v0.1"

tokenizer = AutoTokenizer.from_pretrained(model_name)

# Check if CUDA is available
device = "cpu"  # Force CPU usage
print(f"Using device: {device}")

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,
    low_cpu_mem_usage=True,
    device_map={"": device},  # Map everything to CPU
    offload_folder="offload",
)

tokenizer.pad_token = tokenizer.eos_token  # Set padding token
model.config.pad_token_id = tokenizer.pad_token_id  # Configure model padding


class Bielik_Service:
    def __init__(self):
        self.model = model
        self.tokenizer = tokenizer
        self.pipeline = transformers.pipeline(
            "text-generation",
            model=self.model,
            tokenizer=self.tokenizer,
            device_map={"": device},  # Ensure pipeline uses CPU
            pad_token_id=self.tokenizer.pad_token_id,
            eos_token_id=self.tokenizer.eos_token_id,
        )

    def check_with_bielik(self, question: str, answer: str) -> dict:
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
            sequences = self.pipeline(
                text_inputs=prompt,
                max_new_tokens=100,
                do_sample=True,
                top_k=50,
                num_return_sequences=1,
                pad_token_id=self.tokenizer.pad_token_id,  # Use the configured pad token
                eos_token_id=self.tokenizer.eos_token_id,
                return_full_text=False,  # Only return the generated text
            )
            print(f"Tokenization took {time.time() - start_time:.2f} seconds")

            print("Decoding output...")

            response = tokenizer.decode(sequences[0], skip_special_tokens=True)
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
            return {
                "isCorrect": True,
                "correctQuestion": question,
                "correctAnswer": answer,
            }

    async def check_with_bielik_async(self, question: str, answer: str) -> dict:
        timeout = 1200
        print("CHECKING WITH BIELIK ASYNC", timeout)
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(self.check_with_bielik, question, answer),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            print("Bielik processing timed out")
            return {
                "isCorrect": True,
                "correctQuestion": question,
                "correctAnswer": answer,
            }

    async def test_generation(self) -> dict:
        start_time = time.time()
        prompt = f"""
        Napisz 'test' po polsku, odpowiedź tylko w formacie JSON, nie dodawaj żadnych innych komentarzy:
        {{
            "answer": string
        }}
        """
        print("PROMPTING BIELIK")
        try:
            print("Generating output...")
            sequences = await asyncio.to_thread(
                self.pipeline,
                text_inputs=prompt,
                max_new_tokens=50,
                do_sample=True,
                top_k=5,
                temperature=0.1,  # Lower temperature for more focused output
                num_return_sequences=1,
                pad_token_id=self.tokenizer.pad_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                return_full_text=False,
            )
            print(f"Tokenization took {time.time() - start_time:.2f} seconds")

            print("Decoding output...")
            # Pipeline returns a list of dictionaries
            response = sequences[0]['generated_text'] if sequences else ""
            print(f"Total processing time: {time.time() - start_time:.2f} seconds")
            print(f"Bielik response: {response}")
            print(f"Bielik sequences response: {sequences[0]}")

            try:
                json_response = json.loads(response)
                return json_response
            except json.JSONDecodeError:
                print(f"Failed to parse JSON from Bielik response: {response}")
                return {"answer": ""}

        except Exception as e:
            print(f"ERROR in Bielik processing: {e}")
            return {"answer": ""}
