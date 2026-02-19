from models.dtos.learning_path_dtos import LearningPathDto, ModuleDto, LessonDto

# ──────────────────────────────────────────────────────────────────────────────
# CEFR CURRICULUM  A1 → C2
# Schema per lesson: (topic, lesson_type, description, keywords, duration_minutes)
# lesson_type: vocabulary | grammar | theory | practice | listening | speaking
# ──────────────────────────────────────────────────────────────────────────────

CURRICULUM: dict[str, list[dict]] = {
    "A1": [
        {
            "theme": "Greetings & Introductions",
            "lessons": [
                ("Saying Hello & Goodbye",        "vocabulary", "Learn the most essential daily greetings.",
                 ["hello", "hi", "goodbye", "bye", "good morning", "good evening", "see you"], 10),
                ("Introducing Yourself",           "speaking",   "State your name, age and where you come from.",
                 ["my name is", "I am", "I'm from", "I live in", "nice to meet you", "pleased to meet you"], 15),
                ("Countries & Nationalities",      "vocabulary", "Name countries and corresponding nationality adjectives.",
                 ["Poland", "England", "Spanish", "French", "German", "Italian", "Russian", "Polish"], 10),
                ("Numbers 1–100",                 "vocabulary", "Count and use numbers in everyday contexts.",
                 ["one", "ten", "twenty", "fifty", "hundred", "how many", "how old", "phone number"], 10),
                ("The Verb 'To Be'",               "grammar",    "Master the most fundamental verb: am / is / are.",
                 ["am", "is", "are", "isn't", "aren't", "questions with be", "short answers"], 15),
                ("Basic Questions & Answers",      "practice",   "Ask and answer who, what, where questions.",
                 ["who", "what", "where", "when", "yes/no", "do you", "are you"], 15),
            ],
        },
        {
            "theme": "Family & Relationships",
            "lessons": [
                ("Family Members",                "vocabulary", "Describe your family tree and relationships.",
                 ["mother", "father", "brother", "sister", "grandmother", "grandfather", "cousin", "uncle"], 10),
                ("Describing People",              "vocabulary", "Talk about physical appearance and personality.",
                 ["tall", "short", "young", "old", "friendly", "shy", "hair", "eyes", "smile"], 10),
                ("Possessive Adjectives",          "grammar",    "Use my / your / his / her / our / their correctly.",
                 ["my", "your", "his", "her", "its", "our", "their", "whose"], 15),
                ("Have Got – Talking About Family","grammar",    "Use 'have got' to describe what you own or who you know.",
                 ["have got", "has got", "haven't got", "hasn't got", "have you got", "l have a brother"], 15),
                ("Writing About Your Family",      "practice",   "Write a short paragraph introducing your family.",
                 ["My family", "I have", "she is", "he works as", "we live in", "there are"], 20),
                ("Family Interview",               "speaking",   "Ask and answer questions about family life.",
                 ["how many brothers", "what does she do", "how old is", "do you have", "is he/she"], 15),
            ],
        },
        {
            "theme": "Everyday Objects & Places",
            "lessons": [
                ("Classroom Objects",              "vocabulary", "Name items found in learning environments.",
                 ["book", "pen", "pencil", "table", "chair", "board", "bag", "notebook", "ruler"], 10),
                ("Colors & Shapes",               "vocabulary", "Describe your surroundings with colors and shapes.",
                 ["red", "blue", "green", "yellow", "black", "white", "circle", "square", "big", "small"], 10),
                ("Articles: a / an / the",         "grammar",    "Know when to use definite and indefinite articles.",
                 ["a", "an", "the", "no article", "singular", "plural", "specific vs general"], 15),
                ("This / That / These / Those",    "grammar",    "Point to nearby and distant objects.",
                 ["this", "that", "these", "those", "here", "there", "demonstratives"], 15),
                ("In the Classroom",               "speaking",   "Describe objects around you using full sentences.",
                 ["there is", "there are", "on the table", "next to", "in front of", "behind"], 15),
                ("Spelling & the Alphabet",        "vocabulary", "Spell words aloud using the English alphabet.",
                 ["How do you spell", "capital letter", "A B C", "vowel", "consonant", "double letter"], 10),
            ],
        },
        {
            "theme": "Time & Daily Routines",
            "lessons": [
                ("Days, Months & Seasons",         "vocabulary", "Talk about the calendar: days, months and seasons.",
                 ["Monday", "January", "spring", "summer", "autumn", "winter", "week", "month", "year"], 10),
                ("Telling the Time",               "vocabulary", "Read and say what time it is.",
                 ["o'clock", "half past", "quarter to", "quarter past", "What time is it", "AM", "PM"], 10),
                ("Daily Routine Verbs",            "vocabulary", "Describe what you do from morning to night.",
                 ["wake up", "brush teeth", "have breakfast", "go to work", "cook dinner", "go to bed"], 10),
                ("Present Simple – Daily Habits",  "grammar",    "Use present simple to talk about habitual actions.",
                 ["I work", "she works", "do/does", "don't/doesn't", "every day", "usually", "always"], 20),
                ("Frequency Adverbs",              "grammar",    "Express how often things happen.",
                 ["always", "usually", "often", "sometimes", "rarely", "never", "How often do you"], 15),
                ("My Typical Day",                 "practice",   "Write or speak about your daily routine.",
                 ["first", "then", "after that", "next", "finally", "in the morning", "in the evening"], 20),
            ],
        },
    ],
    "A2": [
        {
            "theme": "Food & Restaurants",
            "lessons": [
                ("Food & Drink Vocabulary",        "vocabulary", "Name common foods and beverages.",
                 ["water", "bread", "meat", "vegetables", "fruit", "coffee", "juice", "pasta", "rice"], 10),
                ("Ordering in a Restaurant",       "speaking",   "Have a real conversation in a café or restaurant.",
                 ["I'd like", "Can I have", "the menu please", "the bill", "waiter", "starter", "main course"], 20),
                ("Countable vs Uncountable",       "grammar",    "Use 'some', 'any', 'much', 'many' correctly.",
                 ["some", "any", "much", "many", "a lot of", "a few", "a little", "countable", "uncountable"], 15),
                ("Expressing Preferences",         "practice",   "Say what you like, dislike and prefer.",
                 ["I like", "I love", "I hate", "I prefer", "my favourite is", "I don't enjoy", "would rather"], 15),
                ("Shopping for Food",              "speaking",   "Buy food in a market or supermarket.",
                 ["How much is", "How much are", "I'll take", "a kilo of", "a dozen", "cheap", "expensive"], 20),
                ("Recipes & Instructions",         "vocabulary", "Understand cooking vocabulary and follow a recipe.",
                 ["slice", "chop", "boil", "fry", "bake", "mix", "pour", "season", "tablespoon", "cup"], 15),
            ],
        },
        {
            "theme": "Transport & Travel",
            "lessons": [
                ("Means of Transport",             "vocabulary", "Name different vehicles and modes of transport.",
                 ["bus", "train", "plane", "car", "bicycle", "taxi", "subway", "ferry", "motorbike"], 10),
                ("Buying Tickets",                 "speaking",   "Book and buy transport tickets.",
                 ["a single to", "a return to", "platform", "departure", "arrival", "Which train", "seat"], 20),
                ("Asking for Directions",          "speaking",   "Find your way in a new city.",
                 ["turn left", "turn right", "go straight on", "next to", "opposite", "near", "far", "there"], 20),
                ("Past Simple – Regular Verbs",    "grammar",    "Talk about completed actions in the past.",
                 ["worked", "visited", "arrived", "stayed", "played", "-ed ending", "did", "didn't", "ago"], 20),
                ("Past Simple – Irregular Verbs",  "grammar",    "Master the most common irregular past tense forms.",
                 ["went", "saw", "ate", "took", "bought", "came", "had", "made", "said", "got"], 20),
                ("Describing a Holiday",           "practice",   "Write or tell a story about a past trip.",
                 ["last summer", "I went to", "I stayed in", "the highlight was", "it was amazing", "unfortunately"], 20),
            ],
        },
        {
            "theme": "Home & Living",
            "lessons": [
                ("Rooms & Furniture",              "vocabulary", "Describe the layout and contents of a home.",
                 ["bedroom", "kitchen", "living room", "bathroom", "sofa", "wardrobe", "shelf", "curtains"], 10),
                ("There Is / There Are",           "grammar",    "Describe what exists in a place.",
                 ["there is", "there are", "there isn't", "there aren't", "how many", "is there", "are there"], 15),
                ("Prepositions of Place",          "grammar",    "Describe where things are located.",
                 ["in", "on", "under", "behind", "in front of", "next to", "between", "above", "below"], 15),
                ("Describing Your Home",           "speaking",   "Describe your house or flat in detail.",
                 ["My flat is", "It has", "On the left", "The kitchen is", "I share with", "It's located in"], 20),
                ("Renting a Flat",                 "vocabulary", "Understand language for finding and renting property.",
                 ["rent", "landlord", "tenant", "deposit", "utilities", "furnished", "available", "lease"], 15),
                ("Making Comparisons",             "grammar",    "Compare places, objects, and people.",
                 ["bigger than", "smaller than", "the most", "as ... as", "comparative", "superlative"], 20),
            ],
        },
        {
            "theme": "Health & Body",
            "lessons": [
                ("Parts of the Body",              "vocabulary", "Name and locate parts of the human body.",
                 ["head", "shoulder", "knee", "arm", "leg", "chest", "back", "stomach", "face", "neck"], 10),
                ("Common Illnesses & Symptoms",    "vocabulary", "Describe health problems and symptoms.",
                 ["fever", "cough", "headache", "sore throat", "cold", "dizzy", "pain", "rash", "tired"], 10),
                ("At the Doctor's",                "speaking",   "Communicate with a medical professional.",
                 ["I have a pain in", "since when", "It hurts when", "prescribe", "take this medicine", "allergy"], 20),
                ("Should / Shouldn't",             "grammar",    "Give health advice using modal verbs.",
                 ["should", "shouldn't", "ought to", "had better", "If I were you", "I recommend"], 15),
                ("Healthy Lifestyle",              "practice",   "Write about habits for a healthy life.",
                 ["balanced diet", "exercise", "sleep enough", "avoid stress", "drink water", "mental health"], 20),
                ("Going to the Pharmacy",          "speaking",   "Buy medicine and understand pharmacy instructions.",
                 ["Do you have anything for", "prescription", "take three times a day", "side effects", "dosage"], 15),
            ],
        },
    ],
    "B1": [
        {
            "theme": "Work & Career",
            "lessons": [
                ("Jobs & Responsibilities",        "vocabulary", "Discuss types of work and professional duties.",
                 ["engineer", "accountant", "manager", "freelancer", "intern", "responsibilities", "duties"], 10),
                ("Present Perfect Tense",          "grammar",    "Link past experiences to the present moment.",
                 ["have/has + past participle", "already", "yet", "just", "ever", "never", "since", "for"], 25),
                ("CV & Cover Letter",              "practice",   "Write professional application documents.",
                 ["responsible for", "achieved", "managed", "collaborated", "key skills", "objective", "references"], 25),
                ("Job Interview Language",         "speaking",   "Speak confidently in a formal job interview.",
                 ["my strengths are", "I have X years experience", "my goal is", "I'm passionate about", "salary expectation"], 25),
                ("Workplace Vocabulary",           "vocabulary", "Navigate office life and business environments.",
                 ["meeting", "deadline", "colleague", "overtime", "remote work", "feedback", "performance review"], 10),
                ("Expressing Future Plans",        "grammar",    "Talk about intentions and plans for the future.",
                 ["I'm going to", "I plan to", "I'd like to", "I hope to", "will", "future continuous"], 20),
            ],
        },
        {
            "theme": "Technology & Media",
            "lessons": [
                ("Digital Life Vocabulary",        "vocabulary", "Talk about technology, apps, and the internet.",
                 ["smartphone", "social media", "app", "upload", "download", "password", "account", "notification"], 10),
                ("The Passive Voice",              "grammar",    "Shift focus from actor to action using passive constructions.",
                 ["is made", "was invented", "has been launched", "will be released", "passive voice structure"], 25),
                ("Discussing Technology",          "speaking",   "Share opinions about technology's role in society.",
                 ["in my opinion", "I think that", "on the other hand", "it's clear that", "advantages", "drawbacks"], 20),
                ("Reading Online Articles",        "vocabulary", "Understand complex digital content and media.",
                 ["headline", "click-bait", "source", "credibility", "fake news", "opinion piece", "evidence"], 20),
                ("Social Media & Communication",   "practice",   "Write posts, comments and messages appropriately.",
                 ["hashtag", "mention", "thread", "reply", "formal vs informal", "tone", "emoji", "abbreviation"], 20),
                ("Technology Problems",            "speaking",   "Describe and troubleshoot tech issues.",
                 ["it crashed", "it's not working", "reset", "update", "reboot", "tech support", "error message"], 15),
            ],
        },
        {
            "theme": "Environment & Nature",
            "lessons": [
                ("Nature & Landscape",             "vocabulary", "Describe natural environments and geographical features.",
                 ["forest", "mountain", "river", "coast", "desert", "valley", "glacier", "wildlife", "species"], 10),
                ("Environmental Problems",         "vocabulary", "Discuss climate change and ecological issues.",
                 ["pollution", "deforestation", "global warming", "carbon emission", "endangered", "drought", "flood"], 10),
                ("Modal Verbs for Obligation",     "grammar",    "Express duty, permission and prohibition.",
                 ["must", "mustn't", "have to", "don't have to", "should", "may", "might", "can"], 20),
                ("Solutions & Actions",            "speaking",   "Propose and debate environmental solutions.",
                 ["we should", "if we don't", "one solution is", "the government must", "individuals can"], 20),
                ("Writing a Report",               "practice",   "Structure a clear written report on an issue.",
                 ["Introduction", "main findings", "conclusion", "recommend", "therefore", "in contrast", "however"], 25),
                ("Recycling & Sustainability",     "vocabulary", "Understand language around sustainable living.",
                 ["recycle", "reuse", "compost", "carbon footprint", "solar energy", "organic", "single-use plastic"], 15),
            ],
        },
        {
            "theme": "Leisure & Entertainment",
            "lessons": [
                ("Hobbies & Interests",            "vocabulary", "Talk about free-time activities and pastimes.",
                 ["painting", "hiking", "gaming", "cooking", "photography", "reading", "volunteering", "sport"], 10),
                ("Gerunds & Infinitives",          "grammar",    "Use -ing forms and 'to + verb' in the right contexts.",
                 ["enjoy doing", "want to do", "stop doing", "try to do", "avoid", "manage to", "gerund vs infinitive"], 25),
                ("Talking About Films & Books",    "speaking",   "Summarize plots and express opinions on culture.",
                 ["It's about", "the main character", "the plot", "directed by", "I'd recommend", "in my view"], 20),
                ("Making Plans",                   "grammar",    "Arrange events using future forms.",
                 ["shall we", "how about", "let's", "what if we", "are you free", "I was thinking we could"], 15),
                ("Music & Art",                    "vocabulary", "Discuss artistic works, genres and performances.",
                 ["genre", "lyrics", "melody", "exhibition", "gallery", "sculpture", "performance", "album"], 10),
                ("Review Writing",                 "practice",   "Write an engaging review of a film, book or place.",
                 ["overall", "in my opinion", "one strength", "one weakness", "I would recommend", "rating"], 25),
            ],
        },
    ],
    "B2": [
        {
            "theme": "Society & Global Issues",
            "lessons": [
                ("Social Issues Vocabulary",       "vocabulary", "Discuss complex topics affecting modern society.",
                 ["inequality", "discrimination", "poverty line", "diversity", "migration", "protest", "civil rights"], 10),
                ("Conditional Sentences (All Types)","grammar",  "Master all conditionals for real and hypothetical events.",
                 ["zero conditional", "first conditional", "second conditional", "third conditional", "mixed conditional", "were to"], 30),
                ("Debating & Argumentation",       "speaking",   "Express, develop and defend complex opinions.",
                 ["it could be argued", "contrary to popular belief", "one must consider", "undeniably", "that said"], 25),
                ("Opinion Essay",                  "practice",   "Write a well-structured, persuasive opinion essay.",
                 ["thesis statement", "topic sentence", "counterargument", "linking words", "conclusion", "formal register"], 30),
                ("Understanding Statistics",       "vocabulary", "Read and discuss graphs, data and trends.",
                 ["according to", "the data shows", "a significant rise", "a sharp decline", "in comparison", "overall trend"], 20),
                ("Discourse Connectors",           "grammar",    "Improve flow using sophisticated linking expressions.",
                 ["furthermore", "nevertheless", "in contrast", "as a result", "consequently", "by contrast", "to illustrate"], 20),
            ],
        },
        {
            "theme": "Science & Innovation",
            "lessons": [
                ("Scientific Vocabulary",          "vocabulary", "Understand language used in science and research.",
                 ["hypothesis", "experiment", "observation", "theory", "discovery", "breakthrough", "data analysis"], 10),
                ("Future Tenses – Advanced",       "grammar",    "Express future probability, plans and predictions.",
                 ["will", "going to", "future perfect", "future continuous", "bound to", "likely to", "predicted to"], 25),
                ("Passive Voice – Advanced",       "grammar",    "Use complex passive structures in academic writing.",
                 ["is believed to be", "it is reported that", "was said to have", "has been shown to", "passive infinitive"], 25),
                ("Science Report",                 "practice",   "Write a formal scientific report with findings.",
                 ["abstract", "methodology", "results indicate", "in conclusion", "significantly", "as a corollary"], 30),
                ("Discussing AI & The Future",     "speaking",   "Debate the impact of technology and artificial intelligence.",
                 ["automation", "machine learning", "ethical implications", "job displacement", "human-machine", "I would argue"], 25),
                ("Cause & Effect Language",        "grammar",    "Explain relationships between events and outcomes.",
                 ["due to", "as a consequence of", "this leads to", "therefore", "as a result of", "stem from"], 20),
            ],
        },
        {
            "theme": "Art & Literature",
            "lessons": [
                ("Literary Terms",                 "vocabulary", "Understand the language of literary analysis.",
                 ["metaphor", "simile", "irony", "foreshadowing", "narrator", "theme", "symbolism", "protagonist"], 10),
                ("Reported Speech",                "grammar",    "Accurately report what others said or thought.",
                 ["said that", "told me that", "asked whether", "tense backshift", "reporting verbs", "time expression changes"], 25),
                ("Analysing a Text",               "practice",   "Write a nuanced literary analysis.",
                 ["the author conveys", "the use of", "this suggests", "implicit meaning", "the tone here is", "contrasts with"], 30),
                ("Cultural Comparison",            "speaking",   "Compare cultural practices across different countries.",
                 ["whereas", "in contrast to", "it is common in", "similarly", "one cultural difference", "coming from"], 25),
                ("Film Studies",                   "vocabulary", "Discuss cinematographic techniques and genres.",
                 ["close-up", "soundtrack", "mise-en-scène", "narrative arc", "character development", "genre conventions"], 15),
                ("Writing a Critical Review",      "practice",   "Produce a formal critical review of an artistic work.",
                 ["masterfully", "a notable flaw", "nonetheless", "the work succeeds in", "one might argue", "fails to"], 30),
            ],
        },
        {
            "theme": "Psychology & the Human Mind",
            "lessons": [
                ("Psychological Vocabulary",       "vocabulary", "Discuss human behaviour, emotions and mental processes.",
                 ["perception", "cognitive bias", "motivation", "behaviour", "subconscious", "emotional intelligence"], 10),
                ("Wish & Regret Structures",       "grammar",    "Express wishes about the present and regrets about the past.",
                 ["I wish I had", "If only", "I should have", "I could have", "I regret not", "I wish I were"], 20),
                ("Describing Personality",         "vocabulary", "Use precise vocabulary to discuss character traits.",
                 ["introverted", "resilient", "empathetic", "ambitious", "impulsive", "methodical", "assertive"], 10),
                ("Human Behaviour Discussion",     "speaking",   "Discuss and explain human actions and decisions.",
                 ["It could be explained by", "from a psychological standpoint", "one theory suggests", "social influence"], 25),
                ("Formal Essay – Psychology",      "practice",   "Write an analytical essay on a psychological topic.",
                 ["it has been suggested", "research indicates", "the evidence points to", "it follows that"], 30),
                ("Emotional Intelligence",         "vocabulary", "Understand concepts in modern psychology and wellness.",
                 ["self-awareness", "empathy", "regulation", "resilience", "mindfulness", "growth mindset", "well-being"], 15),
            ],
        },
    ],
    "C1": [
        {
            "theme": "Academic Language",
            "lessons": [
                ("Academic Vocabulary in Use",     "vocabulary", "Build the lexical range needed for university study.",
                 ["albeit", "notwithstanding", "substantiate", "corroborate", "premise", "articulate", "infer", "extrapolate"], 15),
                ("Complex Sentence Structures",    "grammar",    "Write with precision using advanced grammatical forms.",
                 ["cleft sentences", "inversion", "nominal clauses", "reduced relative clauses", "participle clauses", "ellipsis"], 30),
                ("Argumentative Essay",            "practice",   "Write a sophisticated, well-referenced academic argument.",
                 ["critically evaluate", "it is contended that", "warrants consideration", "signposting", "scholarly sources"], 35),
                ("Seminar & Lecture Skills",       "speaking",   "Participate actively in academic discussions.",
                 ["to elaborate on", "turning to", "as I mentioned", "could you clarify", "building on that point"], 30),
                ("Hedging Language",               "grammar",    "Soften claims and express uncertainty academically.",
                 ["it appears that", "this may suggest", "seemingly", "there is reason to believe", "tentatively"], 20),
                ("Citation & Referencing",         "vocabulary", "Use evidence correctly in academic writing.",
                 ["according to", "as cited in", "supports the view", "contradicts the notion", "it is argued that"], 20),
            ],
        },
        {
            "theme": "Professional Communication",
            "lessons": [
                ("Business & Finance",             "vocabulary", "Command the language of business and economics.",
                 ["revenue", "profit margin", "stakeholder", "merger", "acquisition", "cash flow", "leverage", "yield"], 15),
                ("Register & Tone",                "grammar",    "Switch between formal and informal registers fluently.",
                 ["formal vs informal", "hedging", "diplomatic phrasing", "nominalization", "tone shift", "euphemism"], 25),
                ("Negotiation Language",           "speaking",   "Lead and respond in sophisticated business negotiations.",
                 ["I'd like to propose", "we could consider", "that seems fair", "non-negotiable", "counter-offer", "compromise"], 30),
                ("Business Email & Reports",       "practice",   "Write impeccable professional correspondence.",
                 ["further to our conversation", "I am writing with regard to", "please find enclosed", "I would appreciate"], 25),
                ("Presentations – Advanced",       "speaking",   "Deliver a complex, structured business presentation.",
                 ["I shall now turn to", "as you can see from", "in essence", "to summarise", "any questions"], 30),
                ("Leadership & Management",        "vocabulary", "Discuss organizational structures and leadership styles.",
                 ["delegation", "KPI", "strategy", "bottom-up", "cross-functional", "accountable", "empower", "agile"], 15),
            ],
        },
        {
            "theme": "Philosophy & Critical Thinking",
            "lessons": [
                ("Philosophy Vocabulary",          "vocabulary", "Engage with abstract concepts and philosophical terms.",
                 ["paradox", "intrinsic value", "epistemology", "ontology", "empirical", "axiomatic", "subjective", "objective"], 15),
                ("Advanced Discourse Markers",     "grammar",    "Connect complex ideas seamlessly in writing and speech.",
                 ["in light of", "by the same token", "as a corollary", "that being said", "with this in mind", "notwithstanding"], 20),
                ("Critical Thinking Essay",        "practice",   "Challenge and reconstruct arguments with precision.",
                 ["it presupposes that", "this premise is flawed because", "one might counter-argue", "upon reflection"], 35),
                ("Philosophical Debate",           "speaking",   "Engage in deep intellectual discussion.",
                 ["I would posit that", "this is predicated on", "it follows logically that", "conversely", "one implication"], 30),
                ("Logical Fallacies",              "vocabulary", "Identify and name common reasoning errors.",
                 ["ad hominem", "straw man", "false dichotomy", "slippery slope", "circular reasoning", "appeal to authority"], 15),
                ("Research Synthesis",             "practice",   "Synthesize multiple sources into a coherent argument.",
                 ["whilst X argues", "this aligns with", "in contrast to", "the consensus among scholars is", "importantly"], 35),
            ],
        },
        {
            "theme": "Culture & Society – Advanced",
            "lessons": [
                ("Media & Journalism",             "vocabulary", "Analyse how language is used in media and press.",
                 ["bias", "agenda", "framing", "spin", "investigative journalism", "editorial", "impartiality"], 15),
                ("Inversion & Emphasis",           "grammar",    "Use grammatical inversion for dramatic or formal effect.",
                 ["not only...but also", "rarely do", "little did", "under no circumstances", "had I known"], 30),
                ("Sociolinguistics",               "vocabulary", "Understand dialect, sociolect, idiolect and language change.",
                 ["dialect", "register", "code switching", "colloquialism", "jargon", "pidgin", "lingua franca"], 15),
                ("Advanced Speaking – Opinion",    "speaking",   "Sustain long, complex monologues expressing nuanced views.",
                 ["broadly speaking", "with certain caveats", "it is premature to", "this merits further discussion"], 30),
                ("Language & Power",               "practice",   "Write analytically about how language is used to influence.",
                 ["propaganda", "rhetoric", "persuasive technique", "ideological stance", "implied meaning", "connotation"], 35),
                ("Intercultural Competence",       "speaking",   "Navigate cultural differences in professional contexts.",
                 ["cultural sensitivity", "face-saving", "directness vs indirectness", "hierarchical culture", "rapport building"], 25),
            ],
        },
    ],
    "C2": [
        {
            "theme": "Mastery of Style",
            "lessons": [
                ("Idiomatic & Colloquial English", "vocabulary", "Use native-level idioms and vivid colloquial language.",
                 ["hit the nail on the head", "the tip of the iceberg", "bite off more than you can chew", "cost an arm and a leg"], 15),
                ("Rhetorical Devices",             "grammar",    "Write and speak with masterful rhetorical technique.",
                 ["chiasmus", "anaphora", "litotes", "alliteration", "parallelism", "antithesis", "hyperbole", "understatement"], 30),
                ("Literary Analysis",              "practice",   "Produce a sophisticated, publishable literary critique.",
                 ["the author alludes to", "implicit in this passage", "the subtext reveals", "a subtle irony pervades", "juxtaposed against"], 40),
                ("Translating Nuance",             "practice",   "Carry cultural and linguistic nuance across contexts.",
                 ["culture-specific reference", "register mismatch", "semantic fields", "pragmatic implication", "connotative meaning"], 35),
                ("Native-Level Debate",            "speaking",   "Lead debates effortlessly at a fully native level.",
                 ["the crux of the matter", "I would beg to differ", "it stands to reason", "as it were", "strictly speaking"], 30),
                ("Voice & Style in Writing",       "practice",   "Develop a distinct, recognizable personal writing voice.",
                 ["sentence variation", "rhythm", "register consistency", "word choice", "hedging vs asserting", "authorial intent"], 40),
            ],
        },
        {
            "theme": "Culture & Civilisation",
            "lessons": [
                ("Historical & Political Vocabulary","vocabulary","Discuss history, politics and civilisation with depth.",
                 ["renaissance", "totalitarianism", "enlightenment", "sovereignty", "hegemony", "constitution", "diaspora"], 15),
                ("Advanced Inversion & Structures","grammar",    "Command the most sophisticated grammatical structures.",
                 ["inverted conditionals", "so + adj + that", "no sooner...than", "not until", "fronting for emphasis"], 30),
                ("Research Paper Writing",         "practice",   "Write a polished academic research paper.",
                 ["abstract", "literature review", "methodology", "limitations", "further research", "contribution to the field"], 45),
                ("Philosophical Position Paper",   "practice",   "Argue a philosophical position with academic rigour.",
                 ["this paper contends", "the argument hinges on", "I shall demonstrate", "the implications are", "to conclude"], 40),
                ("Cultural Commentary",            "speaking",   "Deliver complex cultural, political or social commentary.",
                 ["from a Marxist lens", "post-colonial reading", "cultural hegemony", "the dominant narrative", "historically contextualised"], 30),
                ("Satire & Irony",                 "vocabulary", "Understand and produce satirical and ironic text.",
                 ["understatement", "double meaning", "parody", "mock-heroic", "deadpan", "ironic detachment", "satirical target"], 20),
            ],
        },
        {
            "theme": "Specialised Domains",
            "lessons": [
                ("Legal English",                  "vocabulary", "Master formal language used in legal contexts.",
                 ["jurisdiction", "plaintiff", "defendant", "indemnity", "liability", "statute", "due diligence", "precedent"], 15),
                ("Medical English",                "vocabulary", "Use precise medical terminology with confidence.",
                 ["prognosis", "chronic", "acute", "diagnosis", "contraindication", "pathology", "aetiology", "comorbidity"], 15),
                ("Technical & Scientific Writing", "practice",   "Write flawless, unambiguous technical documentation.",
                 ["specification", "constraint", "implementation", "deprecated", "schema", "iteration", "scalability", "regression"], 30),
                ("Financial English",              "vocabulary", "Navigate the vocabulary of banking and investment.",
                 ["compound interest", "yield", "portfolio diversification", "liquidity", "hedge fund", "equity", "bond market"], 15),
                ("C2 Mock Examination",            "practice",   "Complete a full C2 proficiency exam simulation.",
                 ["reading comprehension", "use of English", "text transformation", "writing at length", "speaking at length", "exam strategy"], 60),
                ("Full Immersion – Open Discussion","speaking",  "Sustain any topic at a completely native level indefinitely.",
                 ["improvisation", "cultural reference", "wit", "ambiguity", "register shifting", "inference", "spontaneity"], 30),
            ],
        },
    ],
}




class LearningPathService:
    # In-memory store: { user_id: set of lesson_ids }
    _completed: dict[str, set[str]] = {}

    def _user_completed(self, user_id: str) -> set[str]:
        return self._completed.setdefault(user_id, set())

    def complete_lesson(self, lesson_id: str, user_id: str) -> dict:
        """Mark a lesson COMPLETED and unlock the next one in the same module."""
        completed = self._user_completed(user_id)
        completed.add(lesson_id)

        levels = ["A1", "A2", "B1", "B2", "C1", "C2"]
        lesson_id_counter = 1
        module_completed = False
        next_lesson_unlocked: str | None = None

        for level in levels:
            for unit_data in CURRICULUM.get(level, []):
                lesson_ids_in_module: list[str] = []
                for _ in unit_data["lessons"]:
                    lesson_ids_in_module.append(f"l{lesson_id_counter}")
                    lesson_id_counter += 1

                if lesson_id in lesson_ids_in_module:
                    module_completed = all(lid in completed for lid in lesson_ids_in_module)
                    idx = lesson_ids_in_module.index(lesson_id)
                    if idx + 1 < len(lesson_ids_in_module):
                        next_lesson_unlocked = lesson_ids_in_module[idx + 1]

        return {
            "completed_lesson_id": lesson_id,
            "module_completed": module_completed,
            "next_lesson_unlocked": next_lesson_unlocked,
        }

    def bulk_complete_levels(self, up_to_level: str, user_id: str) -> dict:
        """
        Mark every lesson in all levels BELOW up_to_level as completed.
        Called right after placement test saves the user's level.
        e.g. up_to_level="B1" → marks all A1 + A2 lessons as COMPLETED.
        """
        levels = ["A1", "A2", "B1", "B2", "C1", "C2"]
        if up_to_level not in levels or up_to_level == "A1":
            return {"completed_lesson_ids": [], "levels_completed": []}

        target_index = levels.index(up_to_level)
        completed = self._user_completed(user_id)
        lesson_id_counter = 1
        completed_ids: list[str] = []
        levels_done: list[str] = []

        for level in levels:
            level_index = levels.index(level)
            if level_index >= target_index:
                break  # stop before the user's actual level
            levels_done.append(level)
            for unit_data in CURRICULUM.get(level, []):
                for _ in unit_data["lessons"]:
                    lid = f"l{lesson_id_counter}"
                    completed.add(lid)
                    completed_ids.append(lid)
                    lesson_id_counter += 1
        else:
            # Keep the counter accurate even for levels we skipped
            pass

        return {
            "completed_lesson_ids": completed_ids,
            "levels_completed": levels_done,
            "total": len(completed_ids),
        }



    def get_learning_path(self, language: str, user_level: str, user_id: str = "") -> LearningPathDto:
        levels = ["A1", "A2", "B1", "B2", "C1", "C2"]
        user_level_index = levels.index(user_level) if user_level in levels else 0
        completed = self._user_completed(user_id)

        modules: list[ModuleDto] = []
        module_id_counter = 1
        lesson_id_counter = 1

        for level in levels:
            level_index = levels.index(level)
            level_curriculum = CURRICULUM.get(level, [])

            for unit_index, unit_data in enumerate(level_curriculum):
                module_lessons: list[LessonDto] = []
                completed_count = 0
                lesson_ids_in_module: list[str] = []

                for (topic, l_type, description, keywords, duration) in unit_data["lessons"]:
                    lid = f"l{lesson_id_counter}"
                    lesson_ids_in_module.append(lid)
                    lesson_id_counter += 1

                for i, (topic, l_type, description, keywords, duration) in enumerate(unit_data["lessons"]):
                    lid = lesson_ids_in_module[i]
                    if lid in completed:
                        status = "COMPLETED"
                        completed_count += 1
                    elif level_index < user_level_index:
                        # Past levels: default COMPLETED
                        status = "COMPLETED"
                        completed_count += 1
                    elif level_index == user_level_index and unit_index == 0 and i == 0:
                        # Always unlock the very first lesson of the current level
                        status = "UNLOCKED"
                    elif i > 0 and lesson_ids_in_module[i - 1] in completed:
                        # Previous lesson completed → unlock this one
                        status = "UNLOCKED"
                    elif level_index == user_level_index and unit_index == 0:
                        # First module of current level: unlock all (legacy behaviour)
                        status = "UNLOCKED"
                    else:
                        status = "LOCKED"

                    module_lessons.append(LessonDto(
                        id=lid,
                        title=topic,
                        topic=topic,
                        description=description,
                        status=status,
                        type=l_type,
                        keywords=keywords,
                        duration_minutes=duration,
                    ))

                total = len(module_lessons)
                progress = int((completed_count / total) * 100) if total > 0 else 0

                modules.append(ModuleDto(
                    id=f"m{module_id_counter}",
                    title=f"Unit {module_id_counter}: {unit_data['theme']}",
                    description=f"Explore {unit_data['theme'].lower()} and build solid {level} competency.",
                    level=level,
                    theme=unit_data["theme"],
                    lessons=module_lessons,
                    progress=progress,
                ))
                module_id_counter += 1

        return LearningPathDto(
            language=language,
            user_level=user_level,
            modules=modules,
        )

