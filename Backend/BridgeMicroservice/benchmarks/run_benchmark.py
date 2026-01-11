import asyncio
import json
import os
import time
import pandas as pd
import requests
from typing import List, Dict, Any
from dotenv import load_dotenv
from tqdm import tqdm

# Import YOUR project prompts
import sys
from pathlib import Path

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from constants.prompts import writing_multiple_choice_task_prompt, writing_fill_in_the_blank_task_prompt
from constants.constants import LEVEL_EMBEDDINGS

# --- CONFIG ---
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "benchmark.env"
load_dotenv(dotenv_path=ENV_PATH)

OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_KEY:
    raise ValueError("OPENROUTER_API_KEY is not set in benchmark.env")

MODELS_TO_TEST = {
    "GPT-5.2": "openai/gpt-5.2",
    "Mistral Large 3": "mistralai/mistral-large-2512",
    "Qwen 3 Max": "qwen/qwen3-max",
    "Llama 4": "meta-llama/llama-4-maverick",
    "Gemini 3 Flash": "google/gemini-3-flash-preview",
}

JUDGE_MODEL = "google/gemini-2.5-pro-preview"

LANGUAGES = ["English", "Polish", "Russian"]
TEST_LEVELS = ["A1", "B2"]
ITERATIONS_PER_SCENARIO = 15  # For statistical significance

ERROR_LOG_FILE = "benchmark_errors.log"
if not os.path.exists(ERROR_LOG_FILE):
    with open(ERROR_LOG_FILE, "w", encoding="utf-8") as f:
        f.write(f"Scientific Benchmark Log - Started at {time.ctime()}\n" + "=" * 50 + "\n")


def log_error(model_name: str, error_msg: str):
    with open(ERROR_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%H:%M:%S')}] ERROR {model_name}: {error_msg}\n")


async def call_openrouter(model_id: str, prompt: str) -> Dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://diploma-thesis-wut.edu",
    }
    data = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.8,
        "response_format": {"type": "json_object"},
    }

    loop = asyncio.get_event_loop()
    try:
        response = await loop.run_in_executor(
            None, lambda: requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data, timeout=60)
        )
        if response.status_code != 200:
            return {"error": f"HTTP {response.status_code}: {response.text}", "content": None}

        json_resp = response.json()
        if "error" in json_resp:
            return {"error": str(json_resp["error"]), "content": None}

        return {
            "content": json_resp["choices"][0]["message"]["content"],
            "input_tokens": json_resp.get("usage", {}).get("prompt_tokens", 0),
            "output_tokens": json_resp.get("usage", {}).get("completion_tokens", 0),
            "error": None,
        }
    except Exception as e:
        return {"error": str(e), "content": None}


async def run_single_test(model_name: str, model_id: str, prompt: str, task_type: str) -> Dict[str, Any]:
    start_time = time.time()
    res = await call_openrouter(model_id, prompt)
    latency = round(time.time() - start_time, 2)

    if res["error"]:
        log_error(model_name, res["error"])

    return {
        "model": model_name,
        "task_type": task_type,
        "latency": latency if not res["error"] else 0,
        "content": res["content"],
        "error": res["error"],
    }


async def judge_results(original_prompt: str, outputs: List[Dict]) -> Dict[str, Any]:
    candidates_text = ""
    valid_outputs = [o for o in outputs if o["content"]]
    if not valid_outputs:
        return {"evaluations": []}

    for i, out in enumerate(valid_outputs):
        candidates_text += f"\n--- Candidate {i + 1} ({out['model']}) ---\n{out['content']}\n"

    judge_prompt = f"""
    You are a Senior Linguistic Examiner. Evaluate these AI-generated language tasks.
    [ORIGINAL INSTRUCTION]: {original_prompt}
    [CANDIDATE OUTPUTS]: {candidates_text}
    Evaluate each candidate on a scale of 1-10 based on:
    1. Format (JSON validity)
    2. Accuracy (Grammar/Naturalness)
    3. Level (Does it match CEFR standards?)
    Return JSON ONLY: {{ "evaluations": [ {{ "candidate_index": 1, "score": 8, "reason": "..." }} ] }}
    """
    res = await call_openrouter(JUDGE_MODEL, judge_prompt)
    if res["content"]:
        try:
            clean_content = res["content"].replace("```json", "").replace("```", "").strip()
            return json.loads(clean_content)
        except:
            log_error("JUDGE_PARSE", f"Failed to parse judge response: {res['content']}")
    return {"evaluations": []}


async def main():
    results_file = "benchmark_2025_scientific_results.csv"
    log_file = "benchmark_2025_detailed_scientific_log.json"

    if os.path.exists(log_file):
        with open(log_file, "r", encoding="utf-8") as f:
            detailed_log = json.load(f)
    else:
        detailed_log = {
            "methodology": {
                "description": "Scientific comparison of SOTA LLMs (Dec 2025)",
                "plan": f"{ITERATIONS_PER_SCENARIO} iterations per scenario for statistical significance.",
                "judge": JUDGE_MODEL,
                "metrics": ["Mean Score", "Latency", "Stability", "Instruction Following"],
            },
            "scenarios": [],
        }

    print(f"🚀 Resuming SCIENTIFIC BENCHMARK: {len(LANGUAGES)} langs, {ITERATIONS_PER_SCENARIO} iterations each.")

    for lang in LANGUAGES:
        for level in TEST_LEVELS:
            # MANUAL SKIP: English A1 is already done
            if lang == "English" and level == "A1":
                print(f"⏩ Skipping {lang} {level} (Already Completed)")
                continue

            for task_type in ["Multiple Choice", "Fill Blank"]:
                level_data = LEVEL_EMBEDDINGS.get(level, {})
                context_str = f"Writing skill: {level_data.get('Writing', 'Standard level requirements')}"

                if task_type == "Multiple Choice":
                    prompt = writing_multiple_choice_task_prompt(lang, level, {"description": context_str})
                else:
                    prompt = writing_fill_in_the_blank_task_prompt(lang, level, {"description": context_str})

                print(f"📊 Testing: {lang} {level} {task_type}...")

                for i in tqdm(range(ITERATIONS_PER_SCENARIO), desc=f"{lang}-{level}"):
                    scenario_outputs = []
                    iteration_results = []

                    for name, mid in MODELS_TO_TEST.items():
                        await asyncio.sleep(0.2)  # Slight network throttle
                        res = await run_single_test(name, mid, prompt, task_type)
                        scenario_outputs.append(res)

                    judgement = await judge_results(prompt, scenario_outputs)
                    evals = judgement.get("evaluations", [])
                    valid_indices = [idx for idx, o in enumerate(scenario_outputs) if o["content"]]

                    scenario_entry = {"lang": lang, "level": level, "task_type": task_type, "iteration": i + 1, "model_results": []}

                    for idx, task in enumerate(scenario_outputs):
                        score = 0
                        reason = "N/A"
                        if task["content"] and idx in valid_indices:
                            judge_idx = valid_indices.index(idx) + 1
                            eval_data = next((e for e in evals if e.get("candidate_index") == judge_idx), None)
                            score = eval_data["score"] if eval_data else 0
                            reason = eval_data["reason"] if eval_data else "Judge failed"

                        task_row = task.copy()
                        task_row.update({"lang": lang, "level": level, "iteration": i + 1, "score": score, "reason": reason})
                        iteration_results.append(task_row)

                        scenario_entry["model_results"].append(
                            {"model": task["model"], "score": score, "reason": reason, "latency": task["latency"]}
                        )

                    detailed_log["scenarios"].append(scenario_entry)

                    # APPEND MODE SAVING
                    df_step = pd.DataFrame(iteration_results)
                    df_step.to_csv(results_file, mode="a", header=not os.path.exists(results_file), index=False)
                    with open(log_file, "w", encoding="utf-8") as f:
                        json.dump(detailed_log, f, indent=2, ensure_ascii=False)

    print("\n✅ BENCHMARK PROGRESS SAVED!")


if __name__ == "__main__":
    asyncio.run(main())
