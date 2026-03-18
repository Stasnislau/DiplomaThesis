import pandas as pd
import json
import os

def generate_full_markdown(csv_path):
    if not os.path.exists(csv_path):
        print(f"Error: File {csv_path} not found!")
        return

    df = pd.read_csv(csv_path)
    
    df['score'] = pd.to_numeric(df['score'], errors='coerce').fillna(0)
    
    report_path = "benchmark_full_report.md"

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# 🔬 Scientific LLM Benchmark Full Report (December 2025)\n\n")
        f.write("## 1. Executive Summary\n")
        f.write("This report contains a full audit of the performance of SOTA models (GPT-5.2, Llama 4, Mistral Large 3, Qwen 3 Max, Gemini 3 Flash).\n\n")
        
        f.write("## 2. Methodology & Parameters\n")
        f.write("| Parameter | Value |\n")
        f.write("| :--- | :--- |\n")
        f.write(f"| **Judge Model** | Gemini 2.5 Pro Preview (OpenRouter) |\n")
        f.write(f"| **Iterations** | 15 per each (Lang x Level x Task Type) |\n")
        f.write(f"| **Temperature** | 0.8 (Testing stability) |\n")
        f.write(f"| **Metrics** | Mean Score, Standard Deviation (Stability), Latency |\n\n")

        f.write("## 3. Global Leaderboard\n")
        leaderboard = df.groupby('model').agg({
            'score': ['mean', 'std'],
            'latency': 'mean'
        }).reset_index()
        leaderboard.columns = ['Model', 'Mean Score', 'Stability (Std Dev)', 'Avg Latency (s)']
        leaderboard = leaderboard.sort_values(by='Mean Score', ascending=False)
        f.write(leaderboard.to_markdown(index=False, floatfmt=".2f") + "\n\n")

        f.write("## 4. Performance Heatmap (Scores)\n")
        pivot = df.pivot_table(index=['lang', 'level'], columns='model', values='score', aggfunc='mean')
        f.write(pivot.to_markdown(floatfmt=".2f") + "\n\n")

        f.write("## 5. Full Audit Log\n")
        f.write("Below are the results of each individual run. Recommended for manual anomaly checking.\n\n")

        df_sorted = df.sort_values(by=['lang', 'level', 'iteration', 'model'])
        
        for (lang, level), group in df_sorted.groupby(['lang', 'level']):
            f.write(f"### 🌐 Language: {lang.upper()} | Level: {level}\n")
            
            display_cols = ['iteration', 'model', 'task_type', 'score', 'latency', 'reason']
            subset = group[display_cols].copy()
            
            subset['reason'] = subset['reason'].apply(lambda x: str(x).replace('\n', ' ').strip())
            
            f.write(subset.to_markdown(index=False) + "\n\n")

    print(f"✅ Full Markdown report created: {report_path}")
    print("Now you can open it in any MD-viewer or directly in Cursor.")

if __name__ == "__main__":
    try:
        import tabulate
    except ImportError:
        print("Library 'tabulate' not found. Installing...")
        os.system("pip install tabulate")
        
    generate_full_markdown("benchmark_2025_scientific_results.csv")
