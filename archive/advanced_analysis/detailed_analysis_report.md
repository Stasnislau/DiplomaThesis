# Benchmark Analysis Report - Detailed Results

## Executive Summary

- **Total Tests Conducted**: 750
- **Models Evaluated**: 5
- **Languages Tested**: English, Polish, Russian
- **Proficiency Levels**: B2, A1
- **Overall Success Rate**: 99.2%

## Key Findings

### Top Performing Models (by Efficiency Score)

1. **Gemini 3 Flash**: Efficiency Score = 0.798
2. **Qwen 3 Max**: Efficiency Score = 0.709
3. **Mistral Large 3**: Efficiency Score = 0.677
4. **Llama 4**: Efficiency Score = 0.646
5. **GPT-5.2**: Efficiency Score = 0.641

### Performance by Language

| lang    |   ('score', 'mean') |   ('score', 'std') |   ('latency', 'mean') |
|:--------|--------------------:|-------------------:|----------------------:|
| English |                6.84 |               2.58 |                  4.18 |
| Polish  |                7.29 |               2.59 |                  3.77 |
| Russian |                6.8  |               3.18 |                  4.61 |

### Score Distribution

- **Poor (0-4)**: 141 (18.8%)
- **Fair (5-6)**: 139 (18.5%)
- **Good (7-8)**: 167 (22.3%)
- **Excellent (9-10)**: 303 (40.4%)


## Detailed Statistics by Model

| model           |   ('score', 'mean') |   ('score', 'std') |   ('score', 'min') |   ('score', 'max') |   ('latency', 'mean') |   ('latency', 'median') | ('is_success', '<lambda>')   |
|:----------------|--------------------:|-------------------:|-------------------:|-------------------:|----------------------:|------------------------:|:-----------------------------|
| GPT-5.2         |                8.07 |               2.03 |                  0 |                 10 |                  9.75 |                    8    | 99.3%                        |
| Gemini 3 Flash  |                8.33 |               2.36 |                  0 |                 10 |                  3.68 |                    1.34 | 99.3%                        |
| Llama 4         |                5.35 |               3.22 |                  0 |                 10 |                  1.23 |                    1.16 | 100.0%                       |
| Mistral Large 3 |                6.09 |               2.57 |                  0 |                 10 |                  2.18 |                    2.02 | 99.3%                        |
| Qwen 3 Max      |                7.18 |               2.75 |                  0 |                 10 |                  4.09 |                    3.96 | 98.0%                        |

## Recommendations

1. **Best Overall Model**: Gemini 3 Flash
2. **Fastest Response Time**: Llama 4
3. **Most Consistent**: GPT-5.2
