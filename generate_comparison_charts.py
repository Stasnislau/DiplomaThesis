#!/usr/bin/env python3
"""
Generate additional comparison charts for thesis
Focus on model-vs-model and language-specific analysis
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# Configuration
plt.style.use('seaborn-v0_8-paper')
plt.rcParams['figure.dpi'] = 300
plt.rcParams['font.size'] = 10

ARCHIVE_DIR = Path("archive/advanced_analysis")
DATA_FILE = ARCHIVE_DIR / "processed_data.csv"
OUTPUT_DIR = ARCHIVE_DIR


def load_data():
    """Load processed data"""
    df = pd.read_csv(DATA_FILE)
    print(f"✅ Loaded {len(df)} questions")
    return df


def plot_model_vs_model_comparison(df):
    """Head-to-head model comparison across all dimensions"""
    print("\n🔬 Creating model vs model comparison...")
    
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    
    # 1. Average Score by Language
    ax1 = axes[0, 0]
    pivot_lang = df.pivot_table(values='score', index='model', columns='lang', aggfunc='mean')
    pivot_lang.plot(kind='bar', ax=ax1, width=0.8)
    ax1.set_title('Average Score by Language', fontweight='bold', fontsize=12)
    ax1.set_xlabel('Model')
    ax1.set_ylabel('Average Score')
    ax1.legend(title='Language')
    ax1.tick_params(axis='x', rotation=45)
    ax1.grid(axis='y', alpha=0.3)
    ax1.set_ylim(0, 10)
    
    # 2. Average Score by Level
    ax2 = axes[0, 1]
    pivot_level = df.pivot_table(values='score', index='model', columns='level', aggfunc='mean')
    pivot_level.plot(kind='bar', ax=ax2, width=0.8, color=['#3498db', '#e74c3c'])
    ax2.set_title('Average Score by Proficiency Level', fontweight='bold', fontsize=12)
    ax2.set_xlabel('Model')
    ax2.set_ylabel('Average Score')
    ax2.legend(title='Level')
    ax2.tick_params(axis='x', rotation=45)
    ax2.grid(axis='y', alpha=0.3)
    ax2.set_ylim(0, 10)
    
    # 3. Score Consistency (Std Dev) - Lower is Better
    ax3 = axes[0, 2]
    consistency = df.groupby('model')['score'].std().sort_values()
    colors = ['#27ae60' if x < 2.5 else '#f39c12' if x < 3 else '#e74c3c' for x in consistency]
    consistency.plot(kind='barh', ax=ax3, color=colors)
    ax3.set_title('Score Consistency (Lower = Better)', fontweight='bold', fontsize=12)
    ax3.set_xlabel('Standard Deviation')
    ax3.set_ylabel('Model')
    ax3.grid(axis='x', alpha=0.3)
    ax3.axvline(x=2.5, color='green', linestyle='--', alpha=0.5, label='Good')
    ax3.axvline(x=3.0, color='orange', linestyle='--', alpha=0.5, label='Fair')
    ax3.legend()
    
    # 4. Average Latency Comparison
    ax4 = axes[1, 0]
    latency = df.groupby('model')['latency'].mean().sort_values()
    colors_lat = ['#27ae60' if x < 3 else '#f39c12' if x < 6 else '#e74c3c' for x in latency]
    latency.plot(kind='barh', ax=ax4, color=colors_lat)
    ax4.set_title('Average Response Time (Lower = Better)', fontweight='bold', fontsize=12)
    ax4.set_xlabel('Latency (seconds)')
    ax4.set_ylabel('Model')
    ax4.grid(axis='x', alpha=0.3)
    ax4.axvline(x=3, color='green', linestyle='--', alpha=0.5, label='Fast')
    ax4.axvline(x=6, color='orange', linestyle='--', alpha=0.5, label='Moderate')
    ax4.legend()
    
    # 5. Success Rate
    ax5 = axes[1, 1]
    success = df.groupby('model')['is_success'].mean() * 100
    success.plot(kind='bar', ax=ax5, color='#3498db')
    ax5.set_title('Success Rate (%)', fontweight='bold', fontsize=12)
    ax5.set_xlabel('Model')
    ax5.set_ylabel('Success Rate (%)')
    ax5.tick_params(axis='x', rotation=45)
    ax5.grid(axis='y', alpha=0.3)
    ax5.set_ylim(95, 100)
    ax5.axhline(y=99, color='green', linestyle='--', alpha=0.5, label='Target: 99%')
    ax5.legend()
    
    # 6. Quality Distribution (% of excellent scores)
    ax6 = axes[1, 2]
    excellent_pct = df[df['score'] >= 9].groupby('model').size() / df.groupby('model').size() * 100
    excellent_pct = excellent_pct.sort_values(ascending=False)
    excellent_pct.plot(kind='bar', ax=ax6, color='#27ae60')
    ax6.set_title('% of Excellent Scores (9-10)', fontweight='bold', fontsize=12)
    ax6.set_xlabel('Model')
    ax6.set_ylabel('Percentage (%)')
    ax6.tick_params(axis='x', rotation=45)
    ax6.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'model_comparison_6panel.png', bbox_inches='tight')
    print(f"   ✅ Saved: {OUTPUT_DIR / 'model_comparison_6panel.png'}")
    plt.close()


def plot_language_deep_dive(df):
    """Detailed analysis per language"""
    print("\n🌍 Creating language-specific analysis...")
    
    languages = df['lang'].unique()
    fig, axes = plt.subplots(len(languages), 3, figsize=(18, 6 * len(languages)))
    
    if len(languages) == 1:
        axes = axes.reshape(1, -1)
    
    for idx, lang in enumerate(languages):
        lang_data = df[df['lang'] == lang]
        
        # 1. Score distribution by model
        ax1 = axes[idx, 0]
        lang_data.boxplot(column='score', by='model', ax=ax1)
        ax1.set_title(f'{lang}: Score Distribution by Model', fontweight='bold')
        ax1.set_xlabel('Model')
        ax1.set_ylabel('Score')
        ax1.get_figure().suptitle('')  # Remove default title
        plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # 2. Score by level
        ax2 = axes[idx, 1]
        level_scores = lang_data.groupby(['model', 'level'])['score'].mean().unstack()
        level_scores.plot(kind='bar', ax=ax2, width=0.8)
        ax2.set_title(f'{lang}: Score by Level', fontweight='bold')
        ax2.set_xlabel('Model')
        ax2.set_ylabel('Average Score')
        ax2.legend(title='Level')
        ax2.tick_params(axis='x', rotation=45)
        ax2.grid(axis='y', alpha=0.3)
        
        # 3. Task type performance
        ax3 = axes[idx, 2]
        task_scores = lang_data.groupby(['model', 'task_type'])['score'].mean().unstack()
        task_scores.plot(kind='bar', ax=ax3, width=0.8)
        ax3.set_title(f'{lang}: Score by Task Type', fontweight='bold')
        ax3.set_xlabel('Model')
        ax3.set_ylabel('Average Score')
        ax3.legend(title='Task Type')
        ax3.tick_params(axis='x', rotation=45)
        ax3.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'language_deep_dive.png', bbox_inches='tight')
    print(f"   ✅ Saved: {OUTPUT_DIR / 'language_deep_dive.png'}")
    plt.close()


def plot_winner_matrix(df):
    """Show which model wins in each category"""
    print("\n🏆 Creating winner matrix...")
    
    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Calculate winners for each language-level combination
    combinations = df.groupby(['lang', 'level', 'model'])['score'].mean().reset_index()
    
    # Find winner for each combination
    winners = combinations.loc[combinations.groupby(['lang', 'level'])['score'].idxmax()]
    
    # Create matrix
    matrix_data = []
    categories = ['Highest Score', 'Most Consistent', 'Fastest', 'Best Efficiency']
    
    for lang in df['lang'].unique():
        for level in df['level'].unique():
            subset = df[(df['lang'] == lang) & (df['level'] == level)]
            
            if len(subset) == 0:
                continue
            
            # Highest score
            best_score = subset.groupby('model')['score'].mean().idxmax()
            
            # Most consistent (lowest std)
            most_consistent = subset.groupby('model')['score'].std().idxmin()
            
            # Fastest
            fastest = subset.groupby('model')['latency'].mean().idxmin()
            
            # Best efficiency (score/latency ratio)
            efficiency = subset.groupby('model').apply(
                lambda x: x['score'].mean() / (x['latency'].mean() + 0.1)
            ).idxmax()
            
            matrix_data.append({
                'Category': f'{lang} {level}',
                'Highest Score': best_score,
                'Most Consistent': most_consistent,
                'Fastest': fastest,
                'Best Efficiency': efficiency
            })
    
    # Create summary table
    summary_df = pd.DataFrame(matrix_data)
    
    # Count wins per model
    win_counts = {}
    for col in categories:
        counts = summary_df[col].value_counts()
        for model, count in counts.items():
            if model not in win_counts:
                win_counts[model] = {}
            win_counts[model][col] = count
    
    # Convert to DataFrame for plotting
    win_df = pd.DataFrame(win_counts).T.fillna(0)
    
    # Plot
    win_df.plot(kind='barh', stacked=False, ax=ax, width=0.8)
    ax.set_title('Model Performance: Category Wins Across All Language-Level Combinations', 
                 fontweight='bold', fontsize=14)
    ax.set_xlabel('Number of Wins', fontsize=12)
    ax.set_ylabel('Model', fontsize=12)
    ax.legend(title='Category', bbox_to_anchor=(1.05, 1), loc='upper left')
    ax.grid(axis='x', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'winner_matrix.png', bbox_inches='tight')
    print(f"   ✅ Saved: {OUTPUT_DIR / 'winner_matrix.png'}")
    plt.close()
    
    # Save detailed table
    summary_df.to_csv(OUTPUT_DIR / 'category_winners_detailed.csv', index=False)
    print(f"   ✅ Saved: {OUTPUT_DIR / 'category_winners_detailed.csv'}")


def plot_score_evolution(df):
    """Show how scores evolve across iterations (stability over time)"""
    print("\n📈 Creating score evolution analysis...")
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. Score by iteration for each model
    ax1 = axes[0, 0]
    for model in df['model'].unique():
        model_data = df[df['model'] == model].groupby('iteration')['score'].mean()
        ax1.plot(model_data.index, model_data.values, marker='o', label=model, alpha=0.7)
    ax1.set_title('Score Stability Across Iterations', fontweight='bold', fontsize=12)
    ax1.set_xlabel('Iteration')
    ax1.set_ylabel('Average Score')
    ax1.legend()
    ax1.grid(alpha=0.3)
    
    # 2. Latency by iteration
    ax2 = axes[0, 1]
    for model in df['model'].unique():
        model_data = df[df['model'] == model].groupby('iteration')['latency'].mean()
        ax2.plot(model_data.index, model_data.values, marker='o', label=model, alpha=0.7)
    ax2.set_title('Response Time Consistency', fontweight='bold', fontsize=12)
    ax2.set_xlabel('Iteration')
    ax2.set_ylabel('Average Latency (s)')
    ax2.legend()
    ax2.grid(alpha=0.3)
    
    # 3. Rolling average score (smoothed)
    ax3 = axes[1, 0]
    for model in df['model'].unique():
        model_data = df[df['model'] == model].sort_values('iteration')
        rolling = model_data['score'].rolling(window=10, min_periods=1).mean()
        ax3.plot(range(len(rolling)), rolling, label=model, linewidth=2)
    ax3.set_title('Score Trend (10-iteration Rolling Average)', fontweight='bold', fontsize=12)
    ax3.set_xlabel('Test Number')
    ax3.set_ylabel('Rolling Avg Score')
    ax3.legend()
    ax3.grid(alpha=0.3)
    
    # 4. Coefficient of variation (stability metric)
    ax4 = axes[1, 1]
    cv_data = df.groupby('model').apply(
        lambda x: (x['score'].std() / x['score'].mean()) * 100
    ).sort_values()
    colors = ['#27ae60' if x < 30 else '#f39c12' if x < 40 else '#e74c3c' for x in cv_data]
    cv_data.plot(kind='barh', ax=ax4, color=colors)
    ax4.set_title('Coefficient of Variation (Lower = More Stable)', fontweight='bold', fontsize=12)
    ax4.set_xlabel('CV (%)')
    ax4.set_ylabel('Model')
    ax4.grid(axis='x', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'score_evolution.png', bbox_inches='tight')
    print(f"   ✅ Saved: {OUTPUT_DIR / 'score_evolution.png'}")
    plt.close()


def generate_thesis_summary_table(df):
    """Generate publication-ready summary table"""
    print("\n📝 Generating thesis-ready summary...")
    
    summary = df.groupby('model').agg({
        'score': ['mean', 'std', 'min', 'max'],
        'latency': 'mean',
        'is_success': lambda x: x.mean() * 100
    }).round(2)
    
    summary.columns = ['Mean Score', 'Std Dev', 'Min Score', 'Max Score', 'Avg Latency (s)', 'Success Rate (%)']
    summary = summary.sort_values('Mean Score', ascending=False)
    
    # Add efficiency ranking
    summary['Efficiency Rank'] = (
        (summary['Mean Score'] / 10 * 0.7) + 
        (1 - summary['Avg Latency (s)'] / summary['Avg Latency (s)'].max()) * 0.3
    ).rank(ascending=False).astype(int)
    
    # Export to LaTeX
    latex_table = summary.to_latex(
        caption='Comprehensive Model Performance Summary',
        label='tab:comprehensive_summary',
        column_format='l' + 'c' * len(summary.columns),
        float_format='%.2f',
        escape=False
    )
    
    with open(OUTPUT_DIR / 'table_comprehensive_summary.tex', 'w') as f:
        f.write(latex_table)
    
    print(f"   ✅ Saved: {OUTPUT_DIR / 'table_comprehensive_summary.tex'}")
    
    # Also save as markdown
    with open(OUTPUT_DIR / 'table_comprehensive_summary.md', 'w') as f:
        f.write("# Comprehensive Model Performance Summary\n\n")
        f.write(summary.to_markdown())
    
    print(f"   ✅ Saved: {OUTPUT_DIR / 'table_comprehensive_summary.md'}")


def main():
    """Main execution"""
    print("=" * 80)
    print("🎨 GENERATING COMPARISON CHARTS FOR THESIS")
    print("=" * 80)
    
    df = load_data()
    
    # Generate all visualizations
    plot_model_vs_model_comparison(df)
    plot_language_deep_dive(df)
    plot_winner_matrix(df)
    plot_score_evolution(df)
    generate_thesis_summary_table(df)
    
    print("\n" + "=" * 80)
    print("✅ ALL COMPARISON CHARTS GENERATED!")
    print("=" * 80)
    print(f"\n📂 Output directory: {OUTPUT_DIR.absolute()}")
    print("\n📊 New files:")
    print("   - model_comparison_6panel.png")
    print("   - language_deep_dive.png")
    print("   - winner_matrix.png")
    print("   - score_evolution.png")
    print("   - table_comprehensive_summary.tex")
    print("   - table_comprehensive_summary.md")
    print("   - category_winners_detailed.csv")
    print("\n💡 These charts are ready to insert into your thesis!")


if __name__ == "__main__":
    main()
