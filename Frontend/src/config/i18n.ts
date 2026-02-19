import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// English translations
const en = {
  translation: {
    // Common
    common: {
      loading: "Loading...",
      error: "An error occurred",
      retry: "Retry",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      close: "Close",
      submit: "Submit",
      next: "Next",
      previous: "Previous",
      back: "Back",
      confirm: "Confirm",
    },

    // Navigation
    nav: {
      home: "Home",
      dashboard: "Dashboard",
      profile: "Profile",
      settings: "Settings",
      logout: "Log out",
      login: "Log in",
      register: "Register",
      tasks: "Tasks",
      quiz: "Quiz",
      speechAnalysis: "Speech Analysis",
      leaderboard: "Leaderboard",
    },

    // Dashboard
    dashboard: {
      welcome: "Welcome back, {{name}}! 👋",
      subtitle: "Ready to continue your language learning journey?",
      learning: "Learning",
      languagesCount: "languages",
      quickActions: "Quick Actions",
      yourLanguages: "Your Languages",
      available: "available",
      aiSettings: "AI Settings",
      configureAI: "Configure your AI tokens",
      practice: "Practice writing and speaking",
      testKnowledge: "Test your knowledge",
      analyzePronunciation: "Analyze your pronunciation",
      achievements: "Achievements",
      streak: "Streak",
      totalXp: "Total XP",
      languages: "Languages",
    },

    // Landing
    landing: {
      heroTitle: "Master Any Language",
      heroSubtitle:
        "Interactive lessons, AI-powered feedback, and personalized learning paths.",
      getStarted: "Get Started",
      learnMore: "Learn More",
      availableLanguages: "Available Languages",
      features: "Features",
      readyToStart: "Ready to start learning?",
      createFreeAccount: "Create Free Account",
      alreadyHaveAccount: "Already have an account?",
      login: "Log in",
      stats: {
        languages: "Languages Available",
        questions: "Practice Questions",
        support: "Learning Support",
      },
    },

    // Auth
    auth: {
      email: "Email",
      name: "Name",
      surname: "Surname",
      password: "Password",
      confirmPassword: "Confirm Password",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      signUp: "Sign up",
      signIn: "Sign in",
      loginSuccess: "Successfully logged in",
      logoutSuccess: "Successfully logged out",
      registerSuccess: "Account created successfully",
    },

    // Tasks
    tasks: {
      generateTask: "Generate Task",
      multipleChoice: "Multiple Choice",
      fillInBlank: "Fill in the Blank",
      listening: "Listening",
      speaking: "Speaking",
      writing: "Writing",
      checkAnswer: "Check Answer",
      showExplanation: "Show Explanation",
      correct: "Correct!",
      incorrect: "Incorrect",
      tryAgain: "Try Again",
    },

    // Placement Test
    placementTest: {
      title: "Placement Test",
      description: "Take this test to determine your language level",
      start: "Start Test",
      question: "Question {{current}} of {{total}}",
      complete: "Test Complete",
      yourLevel: "Your Level",
      saveLevel: "Save Level",
    },

    // Levels
    levels: {
      A0: "Beginner",
      A1: "Elementary",
      A2: "Pre-Intermediate",
      B1: "Intermediate",
      B2: "Upper-Intermediate",
      C1: "Advanced",
      C2: "Proficient",
      NATIVE: "Native",
    },

    // Languages
    languages: {
      chooseLanguage: "Choose Language",
      proficiencyLevel: "Proficiency Level",
      nativeLanguage: "Native Language",
      targetLanguage: "Target Language",
      spanish: "Spanish",
      french: "French",
      german: "German",
      italian: "Italian",
      polish: "Polish",
      russian: "Russian",
      english: "English",
    },

    // Settings
    settings: {
      title: "Settings",
      theme: "Theme",
      language: "Language",
      notifications: "Notifications",
      privacy: "Privacy",
      account: "Account",
    },

    // Accessibility
    a11y: {
      skipToContent: "Skip to main content",
      loading: "Content is loading",
      menuOpen: "Open menu",
      menuClose: "Close menu",
      darkMode: "Switch to dark mode",
      lightMode: "Switch to light mode",
    },

    // Errors
    errors: {
      required: "This field is required",
      invalidEmail: "Invalid email address",
      passwordMismatch: "Passwords do not match",
      networkError: "Network error. Please try again.",
      unauthorized: "You are not authorized",
      notFound: "Resource not found",
    },
  },
};

// Polish translations
const pl = {
  translation: {
    common: {
      loading: "Ładowanie...",
      error: "Wystąpił błąd",
      retry: "Ponów",
      cancel: "Anuluj",
      save: "Zapisz",
      delete: "Usuń",
      edit: "Edytuj",
      close: "Zamknij",
      submit: "Wyślij",
      next: "Dalej",
      previous: "Wstecz",
      back: "Powrót",
      confirm: "Potwierdź",
    },

    nav: {
      home: "Strona główna",
      dashboard: "Panel",
      profile: "Profil",
      settings: "Ustawienia",
      logout: "Wyloguj",
      login: "Zaloguj",
      register: "Zarejestruj",
      tasks: "Zadania",
      quiz: "Quiz",
      speechAnalysis: "Analiza Mowy",
      leaderboard: "Ranking",
      achievements: "Osiągnięcia",
      streak: "Streak",
      totalXp: "Total XP",
      languages: "Języki",
    },

    dashboard: {
      welcome: "Witaj ponownie, {{name}}! 👋",
      subtitle: "Gotowy na kontynuację nauki języków?",
      learning: "Nauka",
      languagesCount: "języków",
      quickActions: "Szybkie akcje",
      yourLanguages: "Twoje języki",
      available: "dostępne",
      aiSettings: "Ustawienia AI",
      configureAI: "Konfiguruj tokeny AI",
      practice: "Ćwicz pisanie i mówienie",
      testKnowledge: "Sprawdź swoją wiedzę",
      analyzePronunciation: "Analizuj wymowę",
      achievements: "Osiągnięcia",
      streak: "Streak",
      totalXp: "Total XP",
      languages: "Języki",
    },

    landing: {
      heroTitle: "Opanuj każdy język",
      heroSubtitle:
        "Interaktywne lekcje, wsparcie AI i spersonalizowane ścieżki nauki.",
      getStarted: "Rozpocznij",
      learnMore: "Dowiedz się więcej",
      availableLanguages: "Dostępne języki",
      features: "Funkcje",
      readyToStart: "Gotowy do nauki?",
      createFreeAccount: "Utwórz darmowe konto",
      alreadyHaveAccount: "Masz już konto?",
      login: "Zaloguj się",
      stats: {
        languages: "Dostępne języki",
        questions: "Pytania ćwiczeniowe",
        support: "Wsparcie w nauce",
      },
    },

    auth: {
      email: "Email",
      name: "Imię",
      surname: "Nazwisko",
      password: "Hasło",
      confirmPassword: "Potwierdź hasło",
      forgotPassword: "Zapomniałeś hasła?",
      noAccount: "Nie masz konta?",
      hasAccount: "Masz już konto?",
      signUp: "Zarejestruj się",
      signIn: "Zaloguj się",
      loginSuccess: "Zalogowano pomyślnie",
      logoutSuccess: "Wylogowano pomyślnie",
      registerSuccess: "Konto utworzone pomyślnie",
    },

    tasks: {
      generateTask: "Wygeneruj zadanie",
      multipleChoice: "Wybór wielokrotny",
      fillInBlank: "Uzupełnij lukę",
      listening: "Słuchanie",
      speaking: "Mówienie",
      writing: "Pisanie",
      checkAnswer: "Sprawdź odpowiedź",
      showExplanation: "Pokaż wyjaśnienie",
      correct: "Poprawnie!",
      incorrect: "Niepoprawnie",
      tryAgain: "Spróbuj ponownie",
    },

    placementTest: {
      title: "Test poziomujący",
      description: "Wykonaj test, aby określić swój poziom języka",
      start: "Rozpocznij test",
      question: "Pytanie {{current}} z {{total}}",
      complete: "Test zakończony",
      yourLevel: "Twój poziom",
      saveLevel: "Zapisz poziom",
    },

    levels: {
      A0: "Początkujący",
      A1: "Podstawowy",
      A2: "Pre-średniozaawansowany",
      B1: "Średniozaawansowany",
      B2: "Wyższy średniozaawansowany",
      C1: "Zaawansowany",
      C2: "Biegły",
      NATIVE: "Ojczysty",
    },

    languages: {
      chooseLanguage: "Wybierz język",
      proficiencyLevel: "Poziom biegłości",
      nativeLanguage: "Język ojczysty",
      targetLanguage: "Język docelowy",
      spanish: "Hiszpański",
      french: "Francuski",
      german: "Niemiecki",
      italian: "Włoski",
      polish: "Polski",
      russian: "Rosyjski",
      english: "Angielski",
    },

    settings: {
      title: "Ustawienia",
      theme: "Motyw",
      language: "Język",
      notifications: "Powiadomienia",
      privacy: "Prywatność",
      account: "Konto",
    },

    a11y: {
      skipToContent: "Przejdź do głównej treści",
      loading: "Treść się ładuje",
      menuOpen: "Otwórz menu",
      menuClose: "Zamknij menu",
      darkMode: "Przełącz na tryb ciemny",
      lightMode: "Przełącz na tryb jasny",
    },

    errors: {
      required: "To pole jest wymagane",
      invalidEmail: "Nieprawidłowy adres email",
      passwordMismatch: "Hasła nie są zgodne",
      networkError: "Błąd sieci. Spróbuj ponownie.",
      unauthorized: "Brak autoryzacji",
      notFound: "Nie znaleziono zasobu",
    },
  },
};

// Spanish translations
const es = {
  translation: {
    common: {
      loading: "Cargando...",
      error: "Ocurrió un error",
      retry: "Reintentar",
      cancel: "Cancelar",
      save: "Guardar",
      delete: "Eliminar",
      edit: "Editar",
      close: "Cerrar",
      submit: "Enviar",
      next: "Siguiente",
      previous: "Anterior",
      back: "Volver",
      confirm: "Confirmar",
    },

    nav: {
      home: "Inicio",
      dashboard: "Panel",
      profile: "Perfil",
      settings: "Configuración",
      logout: "Cerrar sesión",
      login: "Iniciar sesión",
      register: "Registrarse",
      tasks: "Tareas",
      quiz: "Cuestionario",
      speechAnalysis: "Análisis del habla",
      leaderboard: "Clasificación",
      achievements: "Logros",
      streak: "Racha",
      totalXp: "XP Total",
      languages: "Idiomas",
    },

    dashboard: {
      welcome: "¡Bienvenido de nuevo, {{name}}! 👋",
      subtitle: "¿Listo para continuar tu viaje de aprendizaje de idiomas?",
      learning: "Aprendiendo",
      languagesCount: "idiomas",
      quickActions: "Acciones rápidas",
      yourLanguages: "Tus idiomas",
      available: "disponibles",
      aiSettings: "Configuración de IA",
      configureAI: "Configura tus tokens de IA",
      practice: "Practica escritura y habla",
      testKnowledge: "Pon a prueba tus conocimientos",
      analyzePronunciation: "Analiza tu pronunciación",
      achievements: "Logros",
      streak: "Racha",
      totalXp: "XP Total",
      languages: "Idiomas",
    },

    landing: {
      heroTitle: "Domina cualquier idioma",
      heroSubtitle:
        "Lecciones interactivas, comentarios impulsados por IA y rutas de aprendizaje personalizadas.",
      getStarted: "Empezar",
      learnMore: "Saber más",
      availableLanguages: "Idiomas disponibles",
      features: "Características",
      readyToStart: "¿Listo para empezar a aprender?",
      createFreeAccount: "Crear cuenta gratuita",
      alreadyHaveAccount: "¿Ya tienes una cuenta?",
      login: "Iniciar sesión",
      stats: {
        languages: "Idiomas disponibles",
        questions: "Preguntas de práctica",
        support: "Soporte de aprendizaje",
      },
    },

    auth: {
      email: "Correo electrónico",
      name: "Nombre",
      surname: "Apellido",
      password: "Contraseña",
      confirmPassword: "Confirmar contraseña",
      forgotPassword: "¿Olvidaste tu contraseña?",
      noAccount: "¿No tienes cuenta?",
      hasAccount: "¿Ya tienes cuenta?",
      signUp: "Registrarse",
      signIn: "Iniciar sesión",
      loginSuccess: "Sesión iniciada correctamente",
      logoutSuccess: "Sesión cerrada correctamente",
      registerSuccess: "Cuenta creada correctamente",
    },

    tasks: {
      generateTask: "Generar tarea",
      multipleChoice: "Opción múltiple",
      fillInBlank: "Completar el espacio",
      listening: "Escucha",
      speaking: "Habla",
      writing: "Escritura",
      checkAnswer: "Verificar respuesta",
      showExplanation: "Mostrar explicación",
      correct: "¡Correcto!",
      incorrect: "Incorrecto",
      tryAgain: "Inténtalo de nuevo",
    },

    levels: {
      A0: "Principiante",
      A1: "Elemental",
      A2: "Pre-intermedio",
      B1: "Intermedio",
      B2: "Intermedio alto",
      C1: "Avanzado",
      C2: "Competente",
      NATIVE: "Nativo",
    },

    languages: {
      chooseLanguage: "Elegir idioma",
      proficiencyLevel: "Nivel de competencia",
      spanish: "Español",
      french: "Francés",
      german: "Alemán",
      italian: "Italiano",
      polish: "Polaco",
      russian: "Ruso",
      english: "Inglés",
    },

    settings: {
      title: "Configuración",
      theme: "Tema",
      language: "Idioma",
      notifications: "Notificaciones",
      privacy: "Privacidad",
      account: "Cuenta",
    },

    a11y: {
      skipToContent: "Saltar al contenido principal",
      loading: "El contenido se está cargando",
      menuOpen: "Abrir menú",
      menuClose: "Cerrar menú",
      darkMode: "Cambiar a modo oscuro",
      lightMode: "Cambiar a modo claro",
    },

    errors: {
      required: "Este campo es obligatorio",
      invalidEmail: "Dirección de correo electrónico no válida",
      passwordMismatch: "Las contraseñas no coinciden",
      networkError: "Error de red. Por favor, inténtelo de nuevo.",
      unauthorized: "No estás autorizado",
      notFound: "Recurso no encontrado",
    },
  },
};

i18n.use(initReactI18next).init({
  resources: {
    en,
    pl,
    es,
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ["localStorage", "navigator"],
    caches: ["localStorage"],
  },
});

export default i18n;
