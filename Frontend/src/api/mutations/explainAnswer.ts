export interface ExplainAnswerRequest {
    language: string;
    level: string;
    task: string;
    correct_answer: string;
    user_answer: string;
}

export interface ExplainAnswerResponse {
    is_correct: boolean;
    explanation: string;
    topics_to_review?: string[];
}

export async function explainAnswer(data: ExplainAnswerRequest): Promise<ExplainAnswerResponse> {
    const response = await fetch(`http://localhost:3001/api/explainanswer`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        console.log(response);
        throw new Error('An error occurred while explaining the answer');
    }

    const responseData = await response.json();
    console.log(responseData, "explain answer");

    return responseData;
}


