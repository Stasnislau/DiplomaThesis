def writing_fill_in_the_blank_task_prompt(
    language: str, level: str, level_context: str
) -> str:
    return f"""
        Generate a **fill-in-the-blank task** for language learners in {language} at {level} level. FOLLOW STRICTLY ALL THE GUIDELINES BELOW.

        Level proficiency description:
        {level_context}

        *GUIDELINES:*
        1. Create one sentence with in the {language} language.
        2. Since this is a writing task, the question could be a grammar question or a vocabulary question.
        3. First create the task in the targeted language and then translate the necessary parts to English.
        4. The sentence must test a key skill for the level, such as vocabulary, grammar, or sentence structure.
        5. Choose the word/phrase that is most likely to be used in a sentence in the {language} language.
        6. Remove the word/phrase from the sentence and leave a blank in its place like this: "I ____ to the park every morning."
        7. Avoid ambiguity: the missing word/phrase must have **only one correct answer**.
        8. Pay a lot of attention to the context of the task and the forms of the words.
        9. Avoid similar-sounding or overly ambiguous options. The answer should be **deterministic**. If there are multiple correct answers, return them in an array.
        8. Include *the English translation* of the missing word/phrase (in parentheses).
        9. Use diverse contexts that reflect everyday use or topics relevant to the level (e.g., greetings, work, or daily routines)
        10. The example in the level context should be used as a reference for the task, but it should not be exactly the same.
        11. Do not include any instructions for the task.
        12. Return the result in JSON format with these fields:
        
        {{
            "task": "The sentence with ____ (MISSING WORD/PHRASE IN ENGLISH)",
            "correct_answer": array of correct answers
        }}

        Examples:
        - For vocabulary: "Я ____ в парк каждый день. (go)"
        - For grammar: "Она ____ в течение трех часов. (has been studying)"

        Ensure the task is concise and matches the level's key skills.
        """


def writing_multiple_choice_task_prompt(
    language: str, level: str, level_context: str
) -> str:
    return f"""
        Generate a language learning task in {language} at {level} level. FOLLOW STRICTLY ALL THE GUIDELINES BELOW.

        Level proficiency description:
        {level_context}
        *GUIDELINES:*
        Create a **multiple-choice task** that matches the level's requirements without using the example in the level context:
        1. The task must consist of a single sentence with one clear objective.
        2. Since this is a writing task, the question could be a grammar question or a vocabulary question.
        3. First create the task in the targeted language and then translate the necessary parts to English.
        4. Use a mix of familiar and level-appropriate contexts (e.g., daily life, work, or hobbies).
        5. Pay a lot of attention to the context of the task and the forms of the words.
        6. Provide **exactly four options**, with only one correct answer.
        7. Do not translate any parts of the sentence in English.
        8. Avoid similar-sounding or overly ambiguous options. The answer should be **deterministic** and not allow for multiple correct interpretations.
        9. Do not include any instructions for the task.
        10. The example in the level context should be used as a reference for the task, but it should not be exactly the same.
        11. Return the task in JSON format, including these fields:
        
        {{
            "task": "The sentence and question for the user",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "The correct option in array"
        }}

        Examples of task contexts include:
        - Choosing the correct verb or adjective in context.
        - Identifying the most appropriate word for a blank.
        - Selecting a sentence that best fits the grammar rules.

        Ensure the task tests a specific, meaningful skill aligned with the level.
        """


def explain_answer_prompt(
    language: str, level: str, task: str, correct_answer: str, user_answer: str
) -> str:
    return f"""
        Analyze the following task in {language} at {level} level. FOLLOW STRICTLY ALL THE GUIDELINES BELOW.

        Task: {task}
        Correct answer: {correct_answer}
        User's answer: {user_answer}

        *GUIDELINES:*
        1. Determine if the user's answer is correct.
        2. If the answer is incorrect, provide a short explanation and suggest 1-2 topics to review.
        3. Keep explanations clear, specific, and tailored to the level.
        4. Avoid overloading the user with complex terminology.
        5. The explanation should be in English.

        Return the response in JSON format:
        {{
            "is_correct": boolean,
            "explanation": "A brief explanation of the user's performance",
            "topics_to_review": ["Topic 1", "Topic 2"] // Optional, only for incorrect answers
        }}
        """
