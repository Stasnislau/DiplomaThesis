#!/usr/bin/env python3
"""
Interactive Question Explorer
Filter and examine benchmark questions by various criteria
"""

import pandas as pd
import json
from pathlib import Path
import argparse
from typing import Optional

# Paths
ARCHIVE_DIR = Path("archive/advanced_analysis")
DATA_FILE = ARCHIVE_DIR / "processed_data.csv"


def load_questions():
    """Load processed benchmark data"""
    if not DATA_FILE.exists():
        print("❌ Error: Run 'analyze_benchmark_detailed.py' first to generate data")
        exit(1)
    
    df = pd.read_csv(DATA_FILE)
    print(f"✅ Loaded {len(df)} questions from benchmark")
    return df


def filter_questions(df, **filters):
    """Apply filters to dataset"""
    filtered = df.copy()
    
    if filters.get('model'):
        filtered = filtered[filtered['model'] == filters['model']]
    
    if filters.get('language'):
        filtered = filtered[filtered['lang'] == filters['language']]
    
    if filters.get('level'):
        filtered = filtered[filtered['level'] == filters['level']]
    
    if filters.get('task_type'):
        filtered = filtered[filtered['task_type'] == filters['task_type']]
    
    if filters.get('min_score') is not None:
        filtered = filtered[filtered['score'] >= filters['min_score']]
    
    if filters.get('max_score') is not None:
        filtered = filtered[filtered['score'] <= filters['max_score']]
    
    if filters.get('only_errors'):
        filtered = filtered[~filtered['is_success']]
    
    return filtered


def display_question(row, index=None):
    """Pretty print a single question"""
    print("\n" + "=" * 80)
    if index is not None:
        print(f"Question #{index + 1}")
    print("=" * 80)
    print(f"🤖 Model:        {row['model']}")
    print(f"🌍 Language:     {row['lang']}")
    print(f"📊 Level:        {row['level']}")
    print(f"📝 Task Type:    {row['task_type']}")
    print(f"🔢 Iteration:    {row['iteration']}")
    print(f"⭐ Score:        {row['score']}/10")
    print(f"⚡ Latency:      {row['latency']:.2f}s")
    print(f"✅ Success:      {'Yes' if row['is_success'] else 'No'}")
    print("-" * 80)
    
    # Parse and display question content
    try:
        content = json.loads(row['content'])
        print("📋 Question:")
        print(f"   {content.get('question', 'N/A')}")
        
        if 'options' in content:
            print("\n📝 Options:")
            for i, opt in enumerate(content['options'], 1):
                print(f"   {i}. {opt}")
        
        if 'correctAnswer' in content:
            print(f"\n✅ Correct Answer: {content['correctAnswer']}")
    except:
        print(f"📋 Question Text: {row.get('question_text', 'N/A')}")
    
    print("\n💭 Judge's Evaluation:")
    print(f"   {row['reason']}")
    print("=" * 80)


def export_filtered(df, output_file):
    """Export filtered results to CSV/HTML"""
    if output_file.endswith('.csv'):
        df.to_csv(output_file, index=False)
        print(f"✅ Exported {len(df)} questions to {output_file}")
    elif output_file.endswith('.html'):
        html = df.to_html(index=False, escape=False)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Filtered Questions</title>
    <style>
        body {{ font-family: Arial; padding: 20px; background: #f5f5f5; }}
        table {{ width: 100%; background: white; border-collapse: collapse; }}
        th, td {{ padding: 10px; border: 1px solid #ddd; text-align: left; }}
        th {{ background: #3498db; color: white; }}
        tr:nth-child(even) {{ background: #f9f9f9; }}
    </style>
</head>
<body>
    <h1>Filtered Benchmark Questions ({len(df)} results)</h1>
    {html}
</body>
</html>
""")
        print(f"✅ Exported {len(df)} questions to {output_file}")
    else:
        print("❌ Unsupported format. Use .csv or .html")


def show_statistics(df):
    """Show statistics for filtered dataset"""
    print("\n📊 Statistics for filtered dataset:")
    print(f"   Total questions: {len(df)}")
    print(f"   Average score: {df['score'].mean():.2f}")
    print(f"   Score std dev: {df['score'].std():.2f}")
    print(f"   Average latency: {df['latency'].mean():.2f}s")
    print(f"   Success rate: {df['is_success'].mean() * 100:.1f}%")
    
    print("\n🏆 Score distribution:")
    for category in ['Poor (0-4)', 'Fair (5-6)', 'Good (7-8)', 'Excellent (9-10)']:
        count = (df['score_category'] == category).sum()
        pct = (count / len(df)) * 100
        print(f"   {category}: {count} ({pct:.1f}%)")
    
    print("\n🤖 Questions by model:")
    for model, count in df['model'].value_counts().items():
        print(f"   {model}: {count}")


def interactive_mode():
    """Interactive CLI for exploring questions"""
    df = load_questions()
    
    print("\n" + "=" * 80)
    print("🔍 INTERACTIVE QUESTION EXPLORER")
    print("=" * 80)
    
    # Get filters
    print("\n📋 Available filters (press Enter to skip):")
    
    models = [''] + df['model'].unique().tolist()
    print(f"\nModels: {', '.join(models[1:])}")
    model = input("Filter by model: ").strip()
    
    languages = [''] + df['lang'].unique().tolist()
    print(f"\nLanguages: {', '.join(languages[1:])}")
    language = input("Filter by language: ").strip()
    
    levels = [''] + df['level'].unique().tolist()
    print(f"\nLevels: {', '.join(levels[1:])}")
    level = input("Filter by level: ").strip()
    
    task_types = [''] + df['task_type'].unique().tolist()
    print(f"\nTask types: {', '.join(task_types[1:])}")
    task_type = input("Filter by task type: ").strip()
    
    min_score = input("Minimum score (0-10, default: 0): ").strip()
    min_score = float(min_score) if min_score else 0
    
    max_score = input("Maximum score (0-10, default: 10): ").strip()
    max_score = float(max_score) if max_score else 10
    
    # Apply filters
    filters = {
        'model': model if model else None,
        'language': language if language else None,
        'level': level if level else None,
        'task_type': task_type if task_type else None,
        'min_score': min_score,
        'max_score': max_score,
    }
    
    filtered = filter_questions(df, **filters)
    
    print(f"\n✅ Found {len(filtered)} questions matching your criteria")
    
    # Show statistics
    show_statistics(filtered)
    
    # Ask what to do
    print("\n" + "=" * 80)
    print("What would you like to do?")
    print("  1. Browse questions one by one")
    print("  2. Show top N questions by score")
    print("  3. Show worst N questions by score")
    print("  4. Export to CSV")
    print("  5. Export to HTML")
    print("  6. Exit")
    
    choice = input("\nChoice (1-6): ").strip()
    
    if choice == '1':
        for idx, (_, row) in enumerate(filtered.iterrows()):
            display_question(row, idx)
            cont = input("\nPress Enter for next question (or 'q' to quit): ")
            if cont.lower() == 'q':
                break
    
    elif choice == '2':
        n = int(input("How many top questions? "))
        top_n = filtered.nlargest(n, 'score')
        for idx, (_, row) in enumerate(top_n.iterrows()):
            display_question(row, idx)
    
    elif choice == '3':
        n = int(input("How many worst questions? "))
        worst_n = filtered.nsmallest(n, 'score')
        for idx, (_, row) in enumerate(worst_n.iterrows()):
            display_question(row, idx)
    
    elif choice == '4':
        filename = input("Output filename (default: filtered_questions.csv): ").strip()
        filename = filename if filename else "filtered_questions.csv"
        export_filtered(filtered, filename)
    
    elif choice == '5':
        filename = input("Output filename (default: filtered_questions.html): ").strip()
        filename = filename if filename else "filtered_questions.html"
        export_filtered(filtered, filename)
    
    elif choice == '6':
        print("👋 Goodbye!")


def main():
    """Main entry point with CLI arguments"""
    parser = argparse.ArgumentParser(description='Explore benchmark questions')
    parser.add_argument('--model', help='Filter by model name')
    parser.add_argument('--language', help='Filter by language')
    parser.add_argument('--level', help='Filter by CEFR level')
    parser.add_argument('--task-type', help='Filter by task type')
    parser.add_argument('--min-score', type=float, help='Minimum score')
    parser.add_argument('--max-score', type=float, help='Maximum score')
    parser.add_argument('--only-errors', action='store_true', help='Show only failed generations')
    parser.add_argument('--export', help='Export to file (CSV or HTML)')
    parser.add_argument('--top', type=int, help='Show top N questions by score')
    parser.add_argument('--worst', type=int, help='Show worst N questions by score')
    parser.add_argument('--stats', action='store_true', help='Show statistics only')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')
    
    args = parser.parse_args()
    
    # Interactive mode
    if args.interactive or len(vars(args)) == 0:
        interactive_mode()
        return
    
    # CLI mode
    df = load_questions()
    
    filters = {
        'model': args.model,
        'language': args.language,
        'level': args.level,
        'task_type': args.task_type,
        'min_score': args.min_score,
        'max_score': args.max_score,
        'only_errors': args.only_errors,
    }
    
    filtered = filter_questions(df, **filters)
    
    print(f"\n✅ Found {len(filtered)} questions matching your criteria")
    
    if args.stats:
        show_statistics(filtered)
        return
    
    if args.export:
        export_filtered(filtered, args.export)
        return
    
    if args.top:
        top_n = filtered.nlargest(args.top, 'score')
        for idx, (_, row) in enumerate(top_n.iterrows()):
            display_question(row, idx)
        return
    
    if args.worst:
        worst_n = filtered.nsmallest(args.worst, 'score')
        for idx, (_, row) in enumerate(worst_n.iterrows()):
            display_question(row, idx)
        return
    
    # Default: show all
    for idx, (_, row) in enumerate(filtered.iterrows()):
        display_question(row, idx)


if __name__ == "__main__":
    main()
