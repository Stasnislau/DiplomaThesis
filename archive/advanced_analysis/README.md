# 🔬 Advanced Benchmark Analysis - User Guide

This directory contains comprehensive analysis of the LLM benchmark results with **750 questions** from 5 different models across 3 languages.

## 📊 Generated Files

### Visualizations (for thesis)
- **`detailed_score_distribution.png`** - 4-panel score analysis (violin plots, box plots, distributions)
- **`latency_analysis.png`** - 4-panel latency analysis (histograms, scatter plots, category breakdown)
- **`comprehensive_heatmaps.png`** - 4 heatmaps showing scores, stability, latency, and success rates
- **`model_radar_comparison.png`** - Multi-dimensional radar chart comparing all models

### Interactive Reports
- **`detailed_questions_interactive.html`** ⭐ **START HERE!**
  - Interactive table with all 750 questions
  - Sortable and filterable
  - Color-coded scores
  - Open in your browser to explore!

### Data Files
- **`processed_data.csv`** - Full dataset with all questions and evaluations
- **`summary_statistics.csv`** - Aggregated statistics by model/language/level

### LaTeX Tables (ready for thesis)
- **`table_model_ranking.tex`** - Overall model performance ranking
- **`table_language_performance.tex`** - Performance breakdown by language

### Reports
- **`detailed_analysis_report.md`** - Comprehensive markdown report with key findings

---

## 🔍 How to Explore the Data

### Method 1: Interactive HTML Table (Easiest)

1. Open `detailed_questions_interactive.html` in your browser
2. Use the search box to filter questions
3. Click column headers to sort
4. Scores are color-coded:
   - 🟢 Green (9-10): Excellent
   - 🟡 Yellow (7-8): Good
   - 🟠 Orange (5-6): Fair
   - 🔴 Red (0-4): Poor

### Method 2: Command-Line Explorer

Use the `explore_questions.py` script for advanced filtering:

#### Interactive Mode
```bash
python3 explore_questions.py --interactive
# or simply
python3 explore_questions.py -i
```

#### Quick Examples

**Show top 10 questions:**
```bash
python3 explore_questions.py --top 10
```

**Show worst 5 questions from GPT-5.2:**
```bash
python3 explore_questions.py --model "GPT-5.2" --worst 5
```

**Filter Polish A1 questions with score 9-10:**
```bash
python3 explore_questions.py --language Polish --level A1 --min-score 9
```

**Get statistics for Gemini on Russian B2:**
```bash
python3 explore_questions.py --model "Gemini 3 Flash" --language Russian --level B2 --stats
```

**Export all excellent questions (9-10) to CSV:**
```bash
python3 explore_questions.py --min-score 9 --export excellent_questions.csv
```

**Show only failed generations:**
```bash
python3 explore_questions.py --only-errors
```

**Compare Multiple Choice vs Fill Blank tasks:**
```bash
python3 explore_questions.py --task-type "Multiple Choice" --stats
python3 explore_questions.py --task-type "Fill Blank" --stats
```

---

## 📈 Key Findings (Quick Reference)

### Overall Results
- **Total Questions Analyzed**: 750
- **Success Rate**: 99.2%
- **Average Score**: 7.01/10
- **40.4% of questions rated "Excellent" (9-10)**

### Best Models by Category

| Category | Winner | Score |
|----------|--------|-------|
| **Overall Efficiency** | Gemini 3 Flash | 0.798 |
| **Highest Quality** | GPT-5.2 | 8.07 avg |
| **Most Consistent** | GPT-5.2 | σ = 1.72 |
| **Fastest Response** | Llama 4 | 1.23s avg |
| **Best Value** | Gemini 3 Flash | High score + low latency |

### Performance by Language
| Language | Avg Score | Best Model |
|----------|-----------|------------|
| **Polish** | 7.29 | Gemini 3 Flash |
| **English** | 6.84 | GPT-5.2 |
| **Russian** | 6.80 | Gemini 3 Flash |

---

## 💡 Using Results in Your Thesis

### 1. Add Visualizations
Copy the PNG files directly into your LaTeX thesis:

```latex
\begin{figure}[htbp]
    \centering
    \includegraphics[width=0.85\textwidth]{advanced_analysis/detailed_score_distribution.png}
    \caption{Comprehensive Score Distribution Analysis Across All Models}
    \label{fig:detailed_scores}
\end{figure}
```

### 2. Insert LaTeX Tables
Include the generated tables:

```latex
\input{advanced_analysis/table_model_ranking.tex}
```

### 3. Reference Specific Questions
Use the explorer to find interesting examples:

```bash
# Find best GPT-5.2 Polish questions
python3 explore_questions.py --model "GPT-5.2" --language Polish --min-score 9

# Find problematic Llama 4 questions
python3 explore_questions.py --model "Llama 4" --max-score 4
```

Then cite these in your thesis as case studies!

---

## 🔧 Advanced Analysis Ideas

### Compare Task Types
```bash
# Export Multiple Choice questions for analysis
python3 explore_questions.py --task-type "Multiple Choice" --export mc_questions.csv

# Export Fill in the Blank questions
python3 explore_questions.py --task-type "Fill Blank" --export fib_questions.csv
```

### Analyze Model Weaknesses
```bash
# Find all questions where Llama 4 scored < 5
python3 explore_questions.py --model "Llama 4" --max-score 5 --export llama_failures.html
```

### Study High-Variance Scenarios
Open `processed_data.csv` in Excel/Pandas to find scenarios where models disagreed significantly.

### Language-Specific Analysis
```bash
# Compare all models on Russian B2
python3 explore_questions.py --language Russian --level B2 --stats

# Get best Russian questions for thesis examples
python3 explore_questions.py --language Russian --min-score 9 --top 5
```

---

## 📝 Example Thesis Sections

### Section: Qualitative Analysis of Generated Questions

**Step 1**: Find representative examples
```bash
python3 explore_questions.py --model "Gemini 3 Flash" --language English --level B2 --min-score 9 --top 3
```

**Step 2**: Add to thesis:
```latex
\subsection{Representative High-Quality Questions}

The following question, generated by Gemini 3 Flash (Score: 10/10), demonstrates
excellent alignment with CEFR B2 standards:

\begin{quote}
Despite the initial setbacks, the project manager insisted that the team 
\_\_\_\_\_ the original deadline to ensure the client's satisfaction.

Options: a) adhere to, b) stay on, c) keep with, d) hold for

\textbf{Correct Answer}: adhere to
\end{quote}

\textbf{Judge's Evaluation}: "Excellent task targeting formal vocabulary (phrasal 
verb 'adhere to') in a professional context. Implicitly tests subjunctive mood, 
a key feature of B2/C1 grammar."
```

---

## 🎯 Next Steps

1. **Open the interactive HTML** to familiarize yourself with the data
2. **Use the explorer script** to find interesting cases for your thesis
3. **Add the visualizations** to your thesis Results section
4. **Include the LaTeX tables** for quantitative analysis
5. **Write qualitative analysis** using specific question examples

---

## ❓ Need Help?

The explorer script has full help:
```bash
python3 explore_questions.py --help
```

For interactive exploration:
```bash
python3 explore_questions.py -i
```

---

**Generated by**: `analyze_benchmark_detailed.py`  
**Date**: 2026-01-11  
**Total Analysis Time**: ~12 seconds for 750 questions
