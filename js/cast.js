document.addEventListener("DOMContentLoaded", function () {
  const context = cast.framework.CastReceiverContext.getInstance();
  const playerManager = context.getPlayerManager();

  let lessonId = 0;
  let userToken = "";
  let api = "https://api-verde.entregadigital.app.br/api/v1/";
  let progressStand = -1;

  document.title = "EDM CAST";

  // --- Funções auxiliares ---

  function getLessonDetails(lessonId, authUserToken, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `${api}app/lessons/${lessonId}/auth`, true);
    xhr.setRequestHeader("Authorization", "Bearer " + authUserToken);
    xhr.setRequestHeader("os", "Android");
    xhr.onload = () => {
      if (xhr.status === 200) callback(JSON.parse(xhr.responseText));
      else callback(null);
    };
    xhr.onerror = () => callback(null);
    xhr.send();
  }

  function finishLesson(lessonId, progress, time, authUserToken) {
    progressStand = progress;
    const xhr = new XMLHttpRequest();
    const seenData = { percent: progress * 100, time_seconds: Math.floor(time) };
    xhr.open("POST", `${api}app/lessons/${lessonId}/seen`);
    xhr.setRequestHeader("Authorization", "Bearer " + authUserToken);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.setRequestHeader("os", "Android");
    xhr.send(JSON.stringify(seenData));
  }

  function setClientLayout(clientNameData) {
    document.title = clientNameData.toUpperCase();
  }

  // --- Carregando vídeo antes do LOAD ---
  function loadLessonOnCast(lessonIdParam, userTokenParam) {
    getLessonDetails(lessonIdParam, userTokenParam, (lesson) => {
      if (!lesson) return console.error("Não foi possível carregar a lição");

      let videoURL = "";
      let contentType = "video";

      // Prioridade: hls > file > action.url
      if (lesson.hls) {
        videoURL = lesson.hls;
        const ext = videoURL.split(".").pop();
        if (ext === "m3u8") contentType = "application/x-mpegurl";
        else if (ext === "ts") contentType = "video/mp2t";
        else if (ext === "m4s" || ext === "mp4") contentType = "video/mp4";
      } else if (lesson.file) {
        videoURL = lesson.file;
        contentType = "video/mp4";
      } else if (lesson.action?.url) {
        videoURL = lesson.action.url;
        contentType = "video/mp4";
      }

      const loadRequestData = new cast.framework.messages.LoadRequestData();
      loadRequestData.media = {
        contentId: lesson.id,
        streamType: "BUFFERED",
        contentType: contentType,
        contentUrl: videoURL,
        metadata: {
          metadataType: 1,
          title: lesson.name,
          images: [{ url: lesson.thumb }]
        },
        customData: {
          apiURL: api,
          contentId: lesson.id,
          userToken: userTokenParam
        }
      };

      setClientLayout(api);
      playerManager.load(loadRequestData);
    });
  }

  // --- Eventos do player ---
  playerManager.addEventListener(cast.framework.events.EventType.TIME_UPDATE, (event) => {
    const currentTime = event.currentMediaTime;
    const duration = playerManager.getDurationSec();
    const progress = currentTime / duration;
    const thresholds = [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.95,1];
    thresholds.forEach(th => {
      if (progressStand < th && progress >= th) finishLesson(lessonId, th, currentTime, userToken);
    });
  });

  // --- Inicializando contexto e mensagens custom ---
  context.start({ customNamespaces: {
    "urn:x-cast:br.com.edm.cast.clientname": cast.framework.system.MessageType.STRING
  }});

  context.addCustomMessageListener("urn:x-cast:br.com.edm.cast.clientname", (msg) => {
    setClientLayout(msg.data);
  });

  // --- Exemplo de uso ---
  // loadLessonOnCast(731, "seuTokenAqui"); // chama para carregar um vídeo específico
});
