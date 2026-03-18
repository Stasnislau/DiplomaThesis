import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import os

sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams.update({'font.size': 12, 'figure.figsize': (12, 8)})

def generate_plots(csv_path):
    if not os.path.exists(csv_path):
        print(f"File {csv_path} not found! Run the benchmark first!")
        return

    df = pd.read_csv(csv_path)
    
    df_valid = df[(df['error'].isna()) | (df['error'] == "")].copy()
    df_valid['score'] = pd.to_numeric(df_valid['score'], errors='coerce').fillna(0)
    
    plt.figure(figsize=(12, 6))
    avg_score = df_valid.groupby('model')['score'].mean().sort_values(ascending=False).reset_index()
    sns.barplot(x='score', y='model', data=avg_score, hue='model', palette='viridis', legend=False)
    plt.title('Average Score by Model (Higher is Better)')
    plt.xlabel('Mean Score (1-10)')
    plt.ylabel('LLM Model')
    plt.tight_layout()
    plt.savefig('avg_scores.png')
    print("✅ Graph of average scores is ready: avg_scores.png")

    plt.figure(figsize=(12, 6))
    sns.boxplot(x='score', y='model', data=df_valid, palette='Set2')
    plt.title('Score Distribution and Stability')
    plt.xlabel('Score')
    plt.ylabel('Model')
    plt.tight_layout()
    plt.savefig('score_stability.png')
    print("✅ Graph of score stability is ready: score_stability.png")

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
    print("✅ Graph of performance vs. latency is ready: latency_vs_score.png")

    plt.figure(figsize=(10, 6))
    pivot_df = df_valid.pivot_table(index='model', columns='lang', values='score', aggfunc='mean')
    sns.heatmap(pivot_df, annot=True, cmap="YlGnBu", fmt=".2f")
    plt.title('Model Performance across Languages (Mean Score)')
    plt.tight_layout()
    plt.savefig('language_heatmap.png')
    print("✅ Heatmap of performance across languages is ready: language_heatmap.png")

if __name__ == "__main__":
    csv_file = "benchmark_2025_scientific_results.csv"
    generate_plots(csv_file)
    print("\nAll done. If the graphs look like shit - you didn't collect enough data.")

