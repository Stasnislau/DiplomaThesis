#!/usr/bin/env python3
"""
Advanced Benchmark Data Analysis & Visualization
Generates comprehensive report from benchmark results
"""

import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from typing import Dict, List, Any
import warnings
warnings.filterwarnings('ignore')

# Set style for publication-quality plots
plt.style.use('seaborn-v0_8-paper')
sns.set_palette("husl")
plt.rcParams['figure.dpi'] = 300
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['font.size'] = 10
plt.rcParams['figure.figsize'] = (12, 8)

# Paths
ARCHIVE_DIR = Path("archive")
RESULTS_CSV = ARCHIVE_DIR / "benchmark_2025_scientific_results.csv"
DETAILED_LOG = ARCHIVE_DIR / "benchmark_2025_detailed_scientific_log.json"
OUTPUT_DIR = ARCHIVE_DIR / "advanced_analysis"
OUTPUT_DIR.mkdir(exist_ok=True)


def load_data() -> tuple[pd.DataFrame, Dict[str, Any]]:
    """Load CSV results and JSON detailed log"""
    print("📊 Loading benchmark data...")
    
    df = pd.read_csv(RESULTS_CSV)
    
    with open(DETAILED_LOG, 'r', encoding='utf-8') as f:
        detailed_log = json.load(f)
    
    print(f"✅ Loaded {len(df)} records from {len(df['model'].unique())} models")
    print(f"   Languages: {df['lang'].unique().tolist()}")
    print(f"   Levels: {df['level'].unique().tolist()}")
    print(f"   Task types: {df['task_type'].unique().tolist()}")
    
    return df, detailed_log


def clean_and_process_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and add computed columns"""
    print("\n🧹 Processing data...")
    
    # Parse JSON content (safe parsing)
    def safe_parse_json(x):
        if pd.isna(x) or x == '':
            return None
        try:
            return json.loads(x)
        except:
            return None
    
    df['parsed_content'] = df['content'].apply(safe_parse_json)
    
    # Extract question text
    df['question_text'] = df['parsed_content'].apply(
        lambda x: x.get('question', '') if isinstance(x, dict) else ''
    )
    
    # Categorize scores
    df['score_category'] = pd.cut(
        df['score'], 
        bins=[0, 4, 6, 8, 10], 
        labels=['Poor (0-4)', 'Fair (5-6)', 'Good (7-8)', 'Excellent (9-10)'],
        include_lowest=True
    )
    
    # Add success flag
    df['is_success'] = df['error'].isna()
    
    # Latency bins
    df['latency_category'] = pd.cut(
        df['latency'],
        bins=[0, 2, 5, 10, np.inf],
        labels=['Fast (<2s)', 'Medium (2-5s)', 'Slow (5-10s)', 'Very Slow (>10s)']
    )
    
    print(f"✅ Processed {len(df)} records with {df['is_success'].sum()} successful generations")
    
    return df


def generate_summary_statistics(df: pd.DataFrame) -> pd.DataFrame:
    """Generate comprehensive summary statistics"""
    print("\n📈 Generating summary statistics...")
    
    summary = df.groupby(['model', 'lang', 'level']).agg({
        'score': ['mean', 'std', 'min', 'max', 'count'],
        'latency': ['mean', 'median', 'std'],
        'is_success': 'sum'
    }).round(2)
    
    summary.columns = ['_'.join(col).strip() for col in summary.columns.values]
    summary = summary.reset_index()
    
    # Add score stability ranking
    summary['stability_rank'] = summary['score_std'].rank(ascending=True)
    
    # Add efficiency score (high score, low latency)
    summary['efficiency'] = (
        (summary['score_mean'] / 10) * 0.7 + 
        (1 - summary['latency_mean'] / summary['latency_mean'].max()) * 0.3
    )
    
    return summary


def plot_score_distribution_detailed(df: pd.DataFrame):
    """Detailed score distribution analysis"""
    print("\n📊 Creating score distribution plots...")
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. Score distribution by model (violin plot)
    ax1 = axes[0, 0]
    sns.violinplot(data=df, x='model', y='score', ax=ax1, inner='box')
    ax1.set_title('Score Distribution by Model (Violin Plot)', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Model', fontsize=12)
    ax1.set_ylabel('Score', fontsize=12)
    ax1.tick_params(axis='x', rotation=45)
    ax1.grid(axis='y', alpha=0.3)
    
    # 2. Score by language and level (box plot)
    ax2 = axes[0, 1]
    df_pivot = df.copy()
    df_pivot['lang_level'] = df_pivot['lang'] + ' ' + df_pivot['level']
    sns.boxplot(data=df_pivot, x='lang_level', y='score', hue='model', ax=ax2)
    ax2.set_title('Score Distribution by Language & Level', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Language - Level', fontsize=12)
    ax2.set_ylabel('Score', fontsize=12)
    ax2.tick_params(axis='x', rotation=45)
    ax2.legend(title='Model', bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=8)
    ax2.grid(axis='y', alpha=0.3)
    
    # 3. Score category distribution (stacked bar)
    ax3 = axes[1, 0]
    score_cat = pd.crosstab(df['model'], df['score_category'], normalize='index') * 100
    score_cat.plot(kind='bar', stacked=True, ax=ax3, colormap='RdYlGn')
    ax3.set_title('Score Quality Distribution by Model (%)', fontsize=14, fontweight='bold')
    ax3.set_xlabel('Model', fontsize=12)
    ax3.set_ylabel('Percentage', fontsize=12)
    ax3.tick_params(axis='x', rotation=45)
    ax3.legend(title='Score Category', bbox_to_anchor=(1.05, 1), loc='upper left')
    ax3.grid(axis='y', alpha=0.3)
    
    # 4. Task type performance comparison
    ax4 = axes[1, 1]
    task_perf = df.groupby(['model', 'task_type'])['score'].mean().unstack()
    task_perf.plot(kind='bar', ax=ax4, width=0.8)
    ax4.set_title('Average Score by Task Type', fontsize=14, fontweight='bold')
    ax4.set_xlabel('Model', fontsize=12)
    ax4.set_ylabel('Average Score', fontsize=12)
    ax4.tick_params(axis='x', rotation=45)
    ax4.legend(title='Task Type')
    ax4.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'detailed_score_distribution.png', bbox_inches='tight')
    print(f"   ✅ Saved: {OUTPUT_DIR / 'detailed_score_distribution.png'}")
    plt.close()


def plot_latency_analysis(df: pd.DataFrame):
    """Comprehensive latency analysis"""
    print("\n⚡ Creating latency analysis plots...")
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. Latency distribution by model
    ax1 = axes[0, 0]
    for model in df['model'].unique():
        model_data = df[df['model'] == model]['latency']
        ax1.hist(model_data, alpha=0.6, label=model, bins=30)
    ax1.set_title('Latency Distribution by Model', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Latency (seconds)', fontsize=12)
    ax1.set_ylabel('Frequency', fontsize=12)
    ax1.legend()
    ax1.grid(alpha=0.3)
    
    # 2. Latency vs Score scatter
    ax2 = axes[0, 1]
    for model in df['model'].unique():
        model_data = df[df['model'] == model]
        ax2.scatter(model_data['latency'], model_data['score'], 
                   alpha=0.5, label=model, s=30)
    ax2.set_title('Latency vs Score Trade-off', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Latency (seconds)', fontsize=12)
    ax2.set_ylabel('Score', fontsize=12)
    ax2.legend()
    ax2.grid(alpha=0.3)
    
    # 3. Average latency by language
    ax3 = axes[1, 0]
    latency_lang = df.groupby(['model', 'lang'])['latency'].mean().unstack()
    latency_lang.plot(kind='bar', ax=ax3, width=0.8)
    ax3.set_title('Average Latency by Language', fontsize=14, fontweight='bold')
    ax3.set_xlabel('Model', fontsize=12)
    ax3.set_ylabel('Average Latency (seconds)', fontsize=12)
    ax3.tick_params(axis='x', rotation=45)
    ax3.legend(title='Language')
    ax3.grid(axis='y', alpha=0.3)
    
    # 4. Latency category distribution
    ax4 = axes[1, 1]
    latency_cat = pd.crosstab(df['model'], df['latency_category'], normalize='index') * 100
    latency_cat.plot(kind='bar', stacked=True, ax=ax4, colormap='YlOrRd')
    ax4.set_title('Response Time Distribution by Model (%)', fontsize=14, fontweight='bold')
    ax4.set_xlabel('Model', fontsize=12)
    ax4.set_ylabel('Percentage', fontsize=12)
    ax4.tick_params(axis='x', rotation=45)
    ax4.legend(title='Latency Category', bbox_to_anchor=(1.05, 1), loc='upper left')
    ax4.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'latency_analysis.png', bbox_inches='tight')
    print(f"   ✅ Saved: {OUTPUT_DIR / 'latency_analysis.png'}")
    plt.close()


def plot_comprehensive_heatmap(df: pd.DataFrame):
    """Advanced heatmap with multiple dimensions"""
    print("\n🔥 Creating comprehensive heatmaps...")
    
    fig, axes = plt.subplots(2, 2, figsize=(18, 14))
    
    # 1. Mean Score Heatmap (Model x Language-Level)
    ax1 = axes[0, 0]
    df_pivot = df.copy()
    df_pivot['lang_level'] = df_pivot['lang'] + '\n' + df_pivot['level']
    heatmap_data = df_pivot.pivot_table(
        values='score', 
        index='model', 
        columns='lang_level', 
        aggfunc='mean'
    )
    sns.heatmap(heatmap_data, annot=True, fmt='.2f', cmap='RdYlGn', 
                vmin=0, vmax=10, ax=ax1, cbar_kws={'label': 'Mean Score'})
    ax1.set_title('Mean Score: Model × Language-Level', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Language - Level', fontsize=12)
    ax1.set_ylabel('Model', fontsize=12)
    
    # 2. Score Stability (Std) Heatmap
    ax2 = axes[0, 1]
    stability_data = df_pivot.pivot_table(
        values='score', 
        index='model', 
        columns='lang_level', 
        aggfunc='std'
    )
    sns.heatmap(stability_data, annot=True, fmt='.2f', cmap='RdYlGn_r',
                vmin=0, vmax=4, ax=ax2, cbar_kws={'label': 'Std Dev'})
    ax2.set_title('Score Stability (Lower is Better)', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Language - Level', fontsize=12)
    ax2.set_ylabel('Model', fontsize=12)
    
    # 3. Average Latency Heatmap
    ax3 = axes[1, 0]
    latency_data = df_pivot.pivot_table(
        values='latency', 
        index='model', 
        columns='lang_level', 
        aggfunc='mean'
    )
    sns.heatmap(latency_data, annot=True, fmt='.2f', cmap='YlOrRd_r',
                ax=ax3, cbar_kws={'label': 'Avg Latency (s)'})
    ax3.set_title('Average Latency: Model × Language-Level', fontsize=14, fontweight='bold')
    ax3.set_xlabel('Language - Level', fontsize=12)
    ax3.set_ylabel('Model', fontsize=12)
    
    # 4. Success Rate Heatmap
    ax4 = axes[1, 1]
    success_data = df_pivot.pivot_table(
        values='is_success', 
        index='model', 
        columns='lang_level', 
        aggfunc='mean'
    ) * 100
    sns.heatmap(success_data, annot=True, fmt='.1f', cmap='Greens',
                vmin=0, vmax=100, ax=ax4, cbar_kws={'label': 'Success Rate (%)'})
    ax4.set_title('Success Rate: Model × Language-Level', fontsize=14, fontweight='bold')
    ax4.set_xlabel('Language - Level', fontsize=12)
    ax4.set_ylabel('Model', fontsize=12)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'comprehensive_heatmaps.png', bbox_inches='tight')
    print(f"   ✅ Saved: {OUTPUT_DIR / 'comprehensive_heatmaps.png'}")
    plt.close()


def plot_model_comparison_radar(df: pd.DataFrame):
    """Radar chart for multi-dimensional model comparison"""
    print("\n🎯 Creating radar chart comparison...")
    
    from math import pi
    
    # Calculate metrics for each model
    metrics = {}
    for model in df['model'].unique():
        model_data = df[df['model'] == model]
        metrics[model] = {
            'Avg Score': model_data['score'].mean() / 10,  # Normalize to 0-1
            'Consistency': 1 - (model_data['score'].std() / 10),  # Lower std = higher consistency
            'Speed': 1 - (model_data['latency'].mean() / df['latency'].max()),  # Inverse normalized
            'Success Rate': model_data['is_success'].mean(),
            'Peak Performance': model_data['score'].max() / 10,
        }
    
    categories = list(next(iter(metrics.values())).keys())
    N = len(categories)
    
    # Create radar chart
    fig, ax = plt.subplots(figsize=(12, 10), subplot_kw=dict(projection='polar'))
    
    angles = [n / float(N) * 2 * pi for n in range(N)]
    angles += angles[:1]
    
    ax.set_theta_offset(pi / 2)
    ax.set_theta_direction(-1)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, size=11)
    
    for model, values in metrics.items():
        values_list = list(values.values())
        values_list += values_list[:1]
        ax.plot(angles, values_list, 'o-', linewidth=2, label=model)
        ax.fill(angles, values_list, alpha=0.15)
    
    ax.set_ylim(0, 1)
    ax.set_title('Multi-Dimensional Model Comparison\n(All metrics normalized 0-1)', 
                 size=16, fontweight='bold', pad=20)
    ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1))
    ax.grid(True)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'model_radar_comparison.png', bbox_inches='tight')
    print(f"   ✅ Saved: {OUTPUT_DIR / 'model_radar_comparison.png'}")
    plt.close()


def create_detailed_questions_table(df: pd.DataFrame):
    """Create filterable HTML table with all questions and scores"""
    print("\n📋 Creating detailed questions table...")
    
    # Select relevant columns and clean
    questions_df = df[[
        'model', 'lang', 'level', 'task_type', 'iteration',
        'question_text', 'score', 'reason', 'latency', 'is_success'
    ]].copy()
    
    questions_df = questions_df.sort_values(['lang', 'level', 'model', 'iteration'])
    
    # Generate HTML with DataTables for interactivity
    html_template = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Benchmark Detailed Results - All Questions & Scores</title>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <style>
        body {{ 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 20px; 
            background: #f5f5f5;
        }}
        h1 {{ 
            color: #2c3e50; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 10px;
        }}
        .stats {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .stats h2 {{ color: #34495e; margin-top: 0; }}
        .stat-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }}
        .stat-box {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }}
        .stat-box h3 {{ margin: 0; font-size: 2em; }}
        .stat-box p {{ margin: 5px 0 0 0; opacity: 0.9; }}
        table.dataTable {{ 
            width: 100% !important; 
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .score-excellent {{ background-color: #27ae60 !important; color: white; font-weight: bold; }}
        .score-good {{ background-color: #2ecc71 !important; color: white; }}
        .score-fair {{ background-color: #f39c12 !important; color: white; }}
        .score-poor {{ background-color: #e74c3c !important; color: white; }}
        .latency-fast {{ color: #27ae60; font-weight: bold; }}
        .latency-slow {{ color: #e74c3c; font-weight: bold; }}
    </style>
</head>
<body>
    <h1>🔬 Benchmark Detailed Results: All Generated Questions & Evaluations</h1>
    
    <div class="stats">
        <h2>📊 Summary Statistics</h2>
        <div class="stat-grid">
            <div class="stat-box">
                <h3>{total_questions}</h3>
                <p>Total Questions</p>
            </div>
            <div class="stat-box">
                <h3>{models_count}</h3>
                <p>Models Tested</p>
            </div>
            <div class="stat-box">
                <h3>{avg_score:.2f}</h3>
                <p>Average Score</p>
            </div>
            <div class="stat-box">
                <h3>{success_rate:.1f}%</h3>
                <p>Success Rate</p>
            </div>
            <div class="stat-box">
                <h3>{avg_latency:.2f}s</h3>
                <p>Avg Response Time</p>
            </div>
        </div>
    </div>
    
    {table_html}
    
    <script>
        $(document).ready(function() {{
            $('#results_table').DataTable({{
                pageLength: 25,
                order: [[6, 'desc']],  // Sort by score descending
                columnDefs: [
                    {{
                        targets: 6,  // Score column
                        createdCell: function(td, cellData, rowData, row, col) {{
                            if (cellData >= 9) {{
                                $(td).addClass('score-excellent');
                            }} else if (cellData >= 7) {{
                                $(td).addClass('score-good');
                            }} else if (cellData >= 5) {{
                                $(td).addClass('score-fair');
                            }} else {{
                                $(td).addClass('score-poor');
                            }}
                        }}
                    }},
                    {{
                        targets: 8,  // Latency column
                        createdCell: function(td, cellData, rowData, row, col) {{
                            if (cellData < 2) {{
                                $(td).addClass('latency-fast');
                            }} else if (cellData > 10) {{
                                $(td).addClass('latency-slow');
                            }}
                        }}
                    }}
                ]
            }});
        }});
    </script>
</body>
</html>
"""
    
    # Generate table HTML
    table_html = questions_df.to_html(
        table_id='results_table',
        classes='display compact',
        index=False,
        escape=False,
        na_rep='N/A'
    )
    
    # Fill template
    html_output = html_template.format(
        total_questions=len(questions_df),
        models_count=len(questions_df['model'].unique()),
        avg_score=questions_df['score'].mean(),
        success_rate=questions_df['is_success'].mean() * 100,
        avg_latency=questions_df['latency'].mean(),
        table_html=table_html
    )
    
    output_file = OUTPUT_DIR / 'detailed_questions_interactive.html'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_output)
    
    print(f"   ✅ Saved interactive table: {output_file}")
    print(f"   📂 Open in browser to explore all {len(questions_df)} questions with filtering!")


def export_latex_tables(summary: pd.DataFrame, df: pd.DataFrame):
    """Export publication-ready LaTeX tables"""
    print("\n📝 Exporting LaTeX tables for thesis...")
    
    # Table 1: Overall Model Ranking
    ranking = summary.groupby('model').agg({
        'score_mean': 'mean',
        'score_std': 'mean',
        'latency_mean': 'mean',
        'efficiency': 'mean'
    }).round(2)
    ranking = ranking.sort_values('efficiency', ascending=False)
    ranking.columns = ['Mean Score', 'Stability ($\\sigma$)', 'Avg Latency (s)', 'Efficiency']
    
    latex_ranking = ranking.to_latex(
        caption='Overall Model Performance Ranking',
        label='tab:model_ranking',
        escape=False,
        column_format='lcccc'
    )
    
    with open(OUTPUT_DIR / 'table_model_ranking.tex', 'w') as f:
        f.write(latex_ranking)
    
    # Table 2: Language-specific performance
    lang_perf = df.groupby(['lang', 'model']).agg({
        'score': 'mean',
        'latency': 'mean'
    }).round(2)
    lang_perf = lang_perf.reset_index().pivot(index='model', columns='lang', values='score')
    
    latex_lang = lang_perf.to_latex(
        caption='Average Score by Language',
        label='tab:lang_performance',
        column_format='l' + 'c' * len(lang_perf.columns)
    )
    
    with open(OUTPUT_DIR / 'table_language_performance.tex', 'w') as f:
        f.write(latex_lang)
    
    print(f"   ✅ Saved LaTeX tables to {OUTPUT_DIR}")


def generate_markdown_report(summary: pd.DataFrame, df: pd.DataFrame):
    """Generate comprehensive markdown report"""
    print("\n📄 Generating markdown report...")
    
    report = f"""# Benchmark Analysis Report - Detailed Results

## Executive Summary

- **Total Tests Conducted**: {len(df):,}
- **Models Evaluated**: {len(df['model'].unique())}
- **Languages Tested**: {', '.join(df['lang'].unique())}
- **Proficiency Levels**: {', '.join(df['level'].unique())}
- **Overall Success Rate**: {df['is_success'].mean() * 100:.1f}%

## Key Findings

### Top Performing Models (by Efficiency Score)

"""
    
    top_models = summary.groupby('model')['efficiency'].mean().sort_values(ascending=False).head(5)
    for i, (model, score) in enumerate(top_models.items(), 1):
        report += f"{i}. **{model}**: Efficiency Score = {score:.3f}\n"
    
    report += "\n### Performance by Language\n\n"
    lang_stats = df.groupby('lang').agg({
        'score': ['mean', 'std'],
        'latency': 'mean'
    }).round(2)
    report += lang_stats.to_markdown()
    
    report += "\n\n### Score Distribution\n\n"
    score_dist = df['score_category'].value_counts().sort_index()
    for cat, count in score_dist.items():
        pct = (count / len(df)) * 100
        report += f"- **{cat}**: {count} ({pct:.1f}%)\n"
    
    report += "\n\n## Detailed Statistics by Model\n\n"
    detailed_stats = df.groupby('model').agg({
        'score': ['mean', 'std', 'min', 'max'],
        'latency': ['mean', 'median'],
        'is_success': lambda x: f"{x.mean() * 100:.1f}%"
    }).round(2)
    report += detailed_stats.to_markdown()
    
    report += "\n\n## Recommendations\n\n"
    best_model = summary.groupby('model')['efficiency'].mean().idxmax()
    report += f"1. **Best Overall Model**: {best_model}\n"
    
    fastest_model = df.groupby('model')['latency'].mean().idxmin()
    report += f"2. **Fastest Response Time**: {fastest_model}\n"
    
    most_stable = df.groupby('model')['score'].std().idxmin()
    report += f"3. **Most Consistent**: {most_stable}\n"
    
    # Save report
    with open(OUTPUT_DIR / 'detailed_analysis_report.md', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"   ✅ Saved markdown report: {OUTPUT_DIR / 'detailed_analysis_report.md'}")


def main():
    """Main execution pipeline"""
    print("=" * 60)
    print("🚀 ADVANCED BENCHMARK ANALYSIS & VISUALIZATION")
    print("=" * 60)
    
    # Load data
    df, detailed_log = load_data()
    
    # Process
    df = clean_and_process_data(df)
    
    # Generate summary statistics
    summary = generate_summary_statistics(df)
    
    # Create visualizations
    plot_score_distribution_detailed(df)
    plot_latency_analysis(df)
    plot_comprehensive_heatmap(df)
    plot_model_comparison_radar(df)
    
    # Create detailed tables
    create_detailed_questions_table(df)
    
    # Export for thesis
    export_latex_tables(summary, df)
    generate_markdown_report(summary, df)
    
    # Save processed data
    summary.to_csv(OUTPUT_DIR / 'summary_statistics.csv', index=False)
    df.to_csv(OUTPUT_DIR / 'processed_data.csv', index=False)
    
    print("\n" + "=" * 60)
    print("✅ ANALYSIS COMPLETE!")
    print("=" * 60)
    print(f"\n📂 All outputs saved to: {OUTPUT_DIR.absolute()}")
    print("\n📊 Generated files:")
    print("   - detailed_score_distribution.png")
    print("   - latency_analysis.png")
    print("   - comprehensive_heatmaps.png")
    print("   - model_radar_comparison.png")
    print("   - detailed_questions_interactive.html  ⭐ Open this in browser!")
    print("   - table_model_ranking.tex")
    print("   - table_language_performance.tex")
    print("   - detailed_analysis_report.md")
    print("   - summary_statistics.csv")
    print("   - processed_data.csv")
    print("\n💡 Next step: Open 'detailed_questions_interactive.html' to explore all questions!")


if __name__ == "__main__":
    main()
