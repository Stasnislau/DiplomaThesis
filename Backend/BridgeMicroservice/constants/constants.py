from typing import Any, Dict


LEVEL_EMBEDDINGS: Dict[str, Dict[str, Any]] = {
    "A1": {
        "Listening": "I can recognize familiar words and very basic phrases concerning myself, my family and immediate concrete surroundings when people speak slowly and clearly.",
        "Reading": "I can understand familiar names, words and very simple sentences, for example on notices and posters or in catalogues.",
        "Spoken Interaction": "I can interact in a simple way provided the other person is prepared to repeat or rephrase things at a slower rate of speech and help me formulate what I'm trying to say. I can ask and answer simple questions in areas of immediate need or on very familiar topics.",
        "Spoken Production": "I can use simple phrases and sentences to describe where I live and people I know.",
        "Writing": "I can write a short, simple postcard, for example sending holiday greetings. I can fill in forms with personal details",
    },
    "A2": {
        "Listening": "I can understand phrases and the highest frequency vocabulary related to areas of most immediate personal relevance (e.g. very basic personal and family information, shopping, local area, employment). I can catch the main point in short, clear, simple messages and announcements.",
        "Reading": "I can read very short, simple texts. I can find specific, predictable information in simple everyday material such as advertisements, prospectuses, menus and timetables and I can understand short simple personal letters.",
        "Spoken Interaction": "I can communicate in simple and routine tasks requiring a simple and direct exchange of information on familiar topics and activities. I can handle very short social exchanges, even though I can't usually understand enough to keep the conversation going myself.",
        "Spoken Production": "I can use a series of phrases and sentences to describe in simple terms my family and other people, living conditions, my educational background and my present or most recent job.",
        "Writing": "I can write short, simple notes and messages relating to matters in areas of immediate needs. I can write a very simple personal letter.",
    },
    "B1": {
        "Listening": "I can understand the main points of clear standard speech on familiar matters regularly encountered in work, school, leisure, etc. I can understand the main point of many radio or TV programmes on current affairs or topics of personal or professional interest when the delivery is relatively slow and clear.",
        "Reading": "I can understand texts that consist mainly of high frequency everyday or job-related language. I can understand the description of events, feelings and wishes in personal letters.",
        "Spoken Interaction": "I can deal with most situations likely to arise whilst traveling in an area where the language is spoken. I can enter unprepared into conversation on topics that are familiar, of personal interest or pertinent to everyday life (e.g. family, hobbies, work, travel and current events).",
        "Spoken Production": "I can connect phrases in a simple way in order to describe experiences and events, my dreams, hopes and ambitions. I can briefly give reasons and explanations for opinions and plans. I can narrate a story or relate the plot of a book or film and describe my reactions.",
        "Writing": "I can write simple connected text on topics which are familiar or of personal interest. I can write personal letters describing experiences and impressions.",
    },
    "B2": {
        "Listening": "I can understand extended speech and lectures and follow even complex lines of argument provided the topic is reasonably familiar. I can understand most TV news and current affairs programmes. I can understand the majority of films in standard dialect.",
        "Reading": "I can read articles and reports concerned with contemporary problems in which the writers adopt particular attitudes or viewpoints. I can understand contemporary literary prose.",
        "Spoken Interaction": "I can interact with a degree of fluency and spontaneity that makes regular interaction with native speakers quite possible. I can take an active part in discussion in familiar contexts, accounting for and sustaining my views.",
        "Spoken Production": "I can present clear, detailed descriptions on a wide range of subjects related to my field of interest. I can explain a viewpoint on a topical issue giving the advantages and disadvantages of various options.",
        "Writing": "I can write clear, detailed text on a wide range of subjects related to my interests. I can write an essay or report, passing on information or giving reasons in support of or against a particular point of view. I can write letters highlighting the personal significance of events and experiences.",
    },
    "C1": {
        "Listening": "I can understand extended speech even when it is not clearly structured and when relationships are only implied and not signalled explicitly. I can understand television programmes and films without too much effort.",
        "Reading": "I can understand long and complex factual and literary texts, appreciating distinctions of style. I can understand specialized articles and longer technical instructions, even when they do not relate to my field.",
        "Spoken Interaction": "I can express myself fluently and spontaneously without much obvious searching for expressions. I can use language flexibly and effectively for social and professional purposes. I can formulate ideas and opinions with precision and relate my contribution skilfully to those of other speakers.",
        "Spoken Production": "I can present clear, detailed descriptions of complex subjects integrating sub-themes, developing particular points and rounding off with an appropriate conclusion.",
        "Writing": "I can express myself in clear, well-structured text, expressing points of view at some length. I can write about complex subjects in a letter, an essay or a report, underlining what I consider to be the salient issues. I can select style appropriate to the reader in mind.",
    },
    "C2": {
        "Listening": "I have no difficulty in understanding any kind of spoken language, whether live or broadcast, even when delivered at fast native speed, provided I have some time to get familiar with the accent",
        "Reading": "I can read with ease virtually all forms of the written language, including abstract, structurally or linguistically complex texts such as manuals, specialized articles and literary works.",
        "Spoken Interaction": "I can take part effortlessly in any conversation or discussion and have a good familiarity with idiomatic expressions and colloquialisms. I can express myself fluently and convey finer shades of meaning precisely. If I do have a problem I can backtrack and restructure around the difficulty so smoothly that other people are hardly aware of it.",
        "Spoken Production": "I can present a clear, smoothly-flowing description or argument in a style appropriate to the context and with an effective logical structure which helps the recipient to notice and remember significant points.",
        "Writing": "I can write clear, smoothly-flowing text in an appropriate style. I can write complex letters, reports or articles which present a case with an effective logical structure which helps the recipient to notice and remember significant points. I can write summaries and reviews of professional or literary works.",
    },
}


def get_level_embedding(user_level: str) -> Dict[str, Any]:
    return LEVEL_EMBEDDINGS.get(user_level.upper(), {})


AVAILABLE_LANGUAGES = [
    "polish",
    "english",
    "german",
    "french",
    "spanish",
    "italian",
    "russian",
]

AVAILABLE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

AVAILABLE_MODELS = [
    {"name": "Mistral", "model": "mistral-7b-instruct"},
    {"name": "OpenAI", "model": "gpt-4o-mini"},
]

AVAILABLE_LANGUAGES_CODES = {
    "polish": "pl",
    "english": "en",
    "german": "de",
    "french": "fr",
    "spanish": "es",
    "italian": "it",
    "russian": "ru",
}
