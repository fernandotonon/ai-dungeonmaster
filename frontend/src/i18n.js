import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation files
const resources = {
  en: {
    translation: {
      welcome: "Welcome, {{username}}!",
      logout: "Logout",
      yourGames: "Your Games:",
      startNewGame: "Start a new game:",
      newGameDM: "New Game as Dungeon Master",
      newGame: "New Game",
      asPlayer: "as Player",
      imageStyle: "Image Style",
      voice: "Voice",
      language: "Language",
      aiModel: "AI Model",
      theme: "Theme",
      enchantedforestadventures: "Enchanted Forest Adventures",
      spaceexploration: "Space Exploration",
      piratetreasurehunt: "Pirate Treasure Hunt",
      knightanddragonfriend: "Knight and Dragon Friend",
      fairytalekingdom: "Fairy Tale Kingdom",
      untitled_story: "Untitled Story",
      your_role: "Your Role",
      ai_role: "AI Role",
      ai_model: "AI Model",
      players: "Players",
      player_name: "Player Name",
      add_player: "Add Player",
      image_style: "Image Style",
      back_to_game_list: "Back to Game List",
      error_submit_action: "Failed to submit action. Please try again.",
      generated_scene: "Generated scene",
      enter_action: "Enter your action or narrative", 
      submit_action: "Submit", 
      record: "Record",
      stop: "Stop",
      time_left: "Time Left",
      error_access_microphone: "Failed to access microphone. Please check your permissions.",
      error_speech_to_text: "Failed to convert speech to text. Please try again.",
    }
  },
  ptbr: {
    translation: {
      welcome: "Bem-vindo, {{username}}!",
      logout: "Sair",
      yourGames: "Seus Jogos:",
      startNewGame: "Iniciar um novo jogo:",
      newGameDM: "Novo Jogo como Mestre",
      newGame: "Novo Jogo",
      asPlayer: "como Jogador",
      imageStyle: "Estilo de Imagem",
      voice: "Voz",
      language: "Idioma",
      aiModel: "Modelo de IA",
      theme: "Tema",
      enchantedforestadventures: "Aventuras na Floresta Encantada",
      spaceexploration: "Exploração Espacial",
      piratetreasurehunt: "Caça ao Tesouro Pirata",
      knightanddragonfriend: "Cavaleiro e Dragão Amigo",
      fairytalekingdom: "Reino de Contos de Fadas",
      untitled_story: "História Sem Título",
      your_role: "Seu Papel",
      ai_role: "Papel da IA",
      ai_model: "Modelo de IA",
      players: "Jogadores",
      player_name: "Nome do Jogador",
      add_player: "Adicionar Jogador",
      image_style: "Estilo de Imagem",
      back_to_game_list: "Voltar à Lista de Jogos",
      error_submit_action: "Falha ao enviar a ação. Por favor, tente novamente.",
      generated_scene: "Cena Gerada",
      enter_action: "Digite sua ação ou narrativa", 
      submit_action: "Enviar", 
      record: "Gravar",
      stop: "Parar",
      time_left: "Tempo Restante",
      error_access_microphone: "Falha ao acessar o microfone. Verifique suas permissões.",
      error_speech_to_text: "Falha ao converter fala para texto. Por favor, tente novamente.",
    }
  },
  es: {
    translation: {
      welcome: "¡Bienvenido, {{username}}!",
      logout: "Cerrar sesión",
      yourGames: "Tus Juegos:",
      startNewGame: "Iniciar un nuevo juego:",
      newGameDM: "Nuevo Juego como Maestro",
      newGame: "Nuevo Juego",
      asPlayer: "como Jugador",
      imageStyle: "Estilo de Imagen",
      voice: "Voz",
      language: "Idioma",
      aiModel: "Modelo de IA",
      theme: "Tema",
      enchantedforestadventures: "Aventuras en el Bosque Encantado",
      spaceexploration: "Exploración Espacial",
      piratetreasurehunt: "Caza del Tesoro Pirata",
      knightanddragonfriend: "Caballero y Amigo Dragón",
      fairytalekingdom: "Reino de Cuentos de Hadas",
      untitled_story: "Historia Sin Título",
      your_role: "Tu Papel",
      ai_role: "Papel de IA",
      ai_model: "Modelo de IA",
      players: "Jugadores",
      player_name: "Nombre del Jugador",
      add_player: "Añadir Jugador",
      image_style: "Estilo de Imagen",
      back_to_game_list: "Volver a la Lista de Juegos",
      error_submit_action: "No se pudo enviar la acción. Por favor, inténtelo de nuevo.",
      generated_scene: "Escena Generada",
      enter_action: "Ingresa tu acción o narrativa", 
      submit_action: "Enviar", 
      record: "Grabar",
      stop: "Detener",
      time_left: "Tiempo Restante",
      error_access_microphone: "No se pudo acceder al micrófono. Verifique sus permisos.",
      error_speech_to_text: "No se pudo convertir el discurso en texto. Por favor, inténtelo de nuevo.",
    }
  }
  // Add translations for other languages here (de-de, it-it, fr-fr)
};

i18n
  .use(initReactI18next) // Connects i18n with React
  .init({
    resources,
    lng: "ptbr", // Default language
    fallbackLng: "ptbr",
    interpolation: {
      escapeValue: false // React already escapes by default
    }
  });

export default i18n;
