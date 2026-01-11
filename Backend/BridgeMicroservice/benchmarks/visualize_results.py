import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import os

# Настройка стиля - чтобы в дипломе выглядело дорого
sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams.update({'font.size': 12, 'figure.figsize': (12, 8)})

def generate_plots(csv_path):
    if not os.path.exists(csv_path):
        print(f"Сука, где файл {csv_path}?! Сначала запусти бенчмарк!")
        return

    df = pd.read_csv(csv_path)
    
    # Очистка данных: убираем ошибки, если они есть
    # Фильтруем строки, где score > 0 и нет ошибок
    df_valid = df[(df['error'].isna()) | (df['error'] == "")].copy()
    df_valid['score'] = pd.to_numeric(df_valid['score'], errors='coerce').fillna(0)
    
    # 1. СРЕДНИЙ БАЛЛ ПО МОДЕЛЯМ (Bar Plot)
    plt.figure(figsize=(12, 6))
    avg_score = df_valid.groupby('model')['score'].mean().sort_values(ascending=False).reset_index()
    sns.barplot(x='score', y='model', data=avg_score, hue='model', palette='viridis', legend=False)
    plt.title('Average Score by Model (Higher is Better)')
    plt.xlabel('Mean Score (1-10)')
    plt.ylabel('LLM Model')
    plt.tight_layout()
    plt.savefig('avg_scores.png')
    print("✅ График средних баллов готов: avg_scores.png")

    # 2. СТАБИЛЬНОСТЬ МОДЕЛЕЙ (Box Plot)
    plt.figure(figsize=(12, 6))
    sns.boxplot(x='score', y='model', data=df_valid, palette='Set2')
    plt.title('Score Distribution and Stability')
    plt.xlabel('Score')
    plt.ylabel('Model')
    plt.tight_layout()
    plt.savefig('score_stability.png')
    print("✅ График стабильности готов: score_stability.png")

    # 3. ЛАТЕНТНОСТЬ VS КАЧЕСТВО (Scatter Plot)
    plt.figure(figsize=(10, 7))
    model_stats = df_valid.groupby('model').agg({'score': 'mean', 'latency': 'mean'}).reset_index()
    sns.scatterplot(x='latency', y='score', hue='model', s=300, data=model_stats, legend=False)
    for i in range(model_stats.shape[0]):
        plt.text(model_stats.latency[i]+0.1, model_stats.score[i], model_stats.model[i], 
                 horizontalalignment='left', size='small', color='black', weight='semibold')
    plt.title('Performance vs. Latency (Efficiency)')
    plt.xlabel('Average Latency (seconds)')
    plt.ylabel('Mean Score')
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.tight_layout()
    plt.savefig('latency_vs_score.png')
    print("✅ График эффективности готов: latency_vs_score.png")

    # 4. ПЕРФОРМАНС ПО ЯЗЫКАМ (Heatmap)
    plt.figure(figsize=(10, 6))
    pivot_df = df_valid.pivot_table(index='model', columns='lang', values='score', aggfunc='mean')
    sns.heatmap(pivot_df, annot=True, cmap="YlGnBu", fmt=".2f")
    plt.title('Model Performance across Languages (Mean Score)')
    plt.tight_layout()
    plt.savefig('language_heatmap.png')
    print("✅ Тепловая карта по языкам готова: language_heatmap.png")

if __name__ == "__main__":
    # Файл должен лежать в корне проекта, судя по структуре
    csv_file = "benchmark_2025_scientific_results.csv"
    generate_plots(csv_file)
    print("\nВсё готово. Если графики выглядят как говно - значит ты мало данных собрал.")

