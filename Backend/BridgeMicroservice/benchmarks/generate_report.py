import pandas as pd
import json
import os

def generate_full_markdown(csv_path):
    if not os.path.exists(csv_path):
        print(f"Ошибка: Файл {csv_path} не найден!")
        return

    # Читаем CSV
    df = pd.read_csv(csv_path)
    
    # Приводим скоры к числам
    df['score'] = pd.to_numeric(df['score'], errors='coerce').fillna(0)
    
    report_path = "benchmark_full_report.md"

    with open(report_path, "w", encoding="utf-8") as f:
        # 1. ТИТУЛЬНИК
        f.write("# 🔬 Scientific LLM Benchmark Full Report (December 2025)\n\n")
        f.write("## 1. Executive Summary\n")
        f.write("Этот отчет содержит полный аудит производительности SOTA моделей (GPT-5.2, Llama 4, Mistral Large 3, Qwen 3 Max, Gemini 3 Flash).\n\n")
        
        # 2. МЕТОДОЛОГИЯ (для диплома)
        f.write("## 2. Methodology & Parameters\n")
        f.write("| Parameter | Value |\n")
        f.write("| :--- | :--- |\n")
        f.write(f"| **Judge Model** | Gemini 2.5 Pro Preview (OpenRouter) |\n")
        f.write(f"| **Iterations** | 15 per each (Lang x Level x Task Type) |\n")
        f.write(f"| **Temperature** | 0.8 (Testing stability) |\n")
        f.write(f"| **Metrics** | Mean Score, Standard Deviation (Stability), Latency |\n\n")

        # 3. GLOBAL LEADERBOARD (Агрегировано)
        f.write("## 3. Global Leaderboard\n")
        leaderboard = df.groupby('model').agg({
            'score': ['mean', 'std'],
            'latency': 'mean'
        }).reset_index()
        leaderboard.columns = ['Model', 'Mean Score', 'Stability (Std Dev)', 'Avg Latency (s)']
        leaderboard = leaderboard.sort_values(by='Mean Score', ascending=False)
        f.write(leaderboard.to_markdown(index=False, floatfmt=".2f") + "\n\n")

        # 4. PERFORMANCE BY LANGUAGE & LEVEL
        f.write("## 4. Performance Heatmap (Scores)\n")
        pivot = df.pivot_table(index=['lang', 'level'], columns='model', values='score', aggfunc='mean')
        f.write(pivot.to_markdown(floatfmt=".2f") + "\n\n")

        # 5. FULL AUDIT LOG (THE "EVERYTHING" PART)
        f.write("## 5. Full Audit Log\n")
        f.write("Ниже приведены результаты каждого отдельного запуска. Рекомендуется для ручной проверки аномалий.\n\n")

        # Сортируем для логичного чтения
        df_sorted = df.sort_values(by=['lang', 'level', 'iteration', 'model'])
        
        for (lang, level), group in df_sorted.groupby(['lang', 'level']):
            f.write(f"### 🌐 Language: {lang.upper()} | Level: {level}\n")
            
            # Оставляем только важные колонки для этой части
            display_cols = ['iteration', 'model', 'task_type', 'score', 'latency', 'reason']
            subset = group[display_cols].copy()
            
            # Форматируем причину (judge reason), чтобы MD таблица не ломалась
            subset['reason'] = subset['reason'].apply(lambda x: str(x).replace('\n', ' ').strip())
            
            f.write(subset.to_markdown(index=False) + "\n\n")

    print(f"✅ Полный Markdown-отчет создан: {report_path}")
    print("Теперь ты можешь открыть его в любом MD-вьюере или прямо в Cursor.")

if __name__ == "__main__":
    # Убеждаемся, что установлена библиотека tabulate для MD таблиц
    try:
        import tabulate
    except ImportError:
        print("Библиотека 'tabulate' не найдена. Устанавливаю...")
        os.system("pip install tabulate")
        
    generate_full_markdown("benchmark_2025_scientific_results.csv")
