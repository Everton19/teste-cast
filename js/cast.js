document.addEventListener("DOMContentLoaded", function (event) {
  // Main cast variables
  const context = cast.framework.CastReceiverContext.getInstance();
  const playerManager = context.getPlayerManager();

  // HTML elements and variables
  const media = document.getElementById("media"); // use 'media', não "video"
  const progressBar = document.getElementById("progress-bar"); // barra custom, se tiver
  
  // LIGA O ELEMENTO <video> COM O PLAYER CAF:
  playerManager.setMediaElement(media);

  // Restante das variáveis...
  document.title = "EDM CAST";
  var videoURL = "_blank";
  var contentType = "";
  var lessonId = 0;
  var userToken = "";
  var progressStand = -1;
  var isPost = false;
  var api = "https://api-verde.entregadigital.app.br/api/v1/";
  const apiExt = ".entregadigital.app.br/api/v1/app/";
  var clientName = "verde";

  // Player custom message interceptor
  playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    (request) => {
      // Não é necessário "removeAttribute('class')" no <video>, só se você quer garantir .hidden
      // Map contentId to entity
      if (typeof request.media.customData != "undefined") {
        lessonId = request.media.customData.contentId;
        api = request.media.customData.apiURL;
        userToken = request.media.customData.userToken;
        isPost = request.media.customData.currentMediaType == "post";
      }
      if (isPost) {
        getPostDetails(lessonId, userToken, (data) => {
          const post = data;
          if (typeof post.id == "undefined") return request;
          if (post.hls) {
            videoURL = post.hls;
            contentType = "video";
            const fileExtension = videoURL.split(".").pop();
            if (fileExtension == "m3u8") contentType = "application/x-mpegurl";
            else if (fileExtension == "ts") contentType = "video/mp2t";
            else if (fileExtension == "m4s") contentType = "video/mp4";
          }
          if (videoURL != "") {
            request.media.contentUrl = videoURL;
            clientName = api;
            setClientLayout(clientName);
          }
        });
      } else {
        getLessonDetails(lessonId, userToken, (data) => {
          const lesson = data;
          if (typeof lesson.id == "undefined") return request;
          if (lesson.hls) {
            videoURL = lesson.hls;
            contentType = "video";
            const fileExtension = videoURL.split(".").pop();
            if (fileExtension == "m3u8") contentType = "application/x-mpegurl";
            else if (fileExtension == "ts") contentType = "video/mp2t";
            else if (fileExtension == "m4s") contentType = "video/mp4";
          } else if (
            lesson.file && (api.includes("vermelho") ||
              api.includes("demo") ||
              api.includes("rqxsystem"))
          ) {
            videoURL = lesson.file;
            contentType = "video";
            const fileExtension = videoURL.split(".").pop();
            if (fileExtension == "mp4") contentType = "video/mp4";
          }
          if (videoURL != "") {
            request.media.contentUrl = videoURL;
            clientName = api;
            setClientLayout(clientName);
          }
        });
      }
      return request;
    }
  );

  playerManager.addEventListener(
    cast.framework.events.EventType.PLAYER_LOAD_COMPLETE,
    (event) => {
      console.log("PLAYER_LOAD_COMPLETE");
    }
  );

  // Atualiza sua barra de progresso custom
  if (progressBar) {
    media.ontimeupdate = function() {
      if (media.duration) {
        progressBar.style.width = (media.currentTime / media.duration * 100) + "%";
      }
    };
  }

  // Player: lesson seen (tudo igual)
  playerManager.addEventListener(
    cast.framework.events.EventType.TIME_UPDATE,
    (event) => {
      if (!isPost) {
        const currentTime = event.currentMediaTime;
        const duration = playerManager.getDurationSec();
        const progress = currentTime / duration;
        if (progressStand != 1 && progress > 0.95) {
          finishLesson(lessonId, 1.0, currentTime, userToken);
        } else if (progressStand != 0.9 && progress > 0.9 && progress < 0.95) {
          finishLesson(lessonId, 0.9, currentTime, userToken);
        } else if (progressStand != 0.8 && progress > 0.8 && progress < 0.9) {
          finishLesson(lessonId, 0.8, currentTime, userToken);
        } else if (progressStand != 0.7 && progress > 0.7 && progress < 0.8) {
          finishLesson(lessonId, 0.7, currentTime, userToken);
        } else if (progressStand != 0.6 && progress > 0.6 && progress < 0.7) {
          finishLesson(lessonId, 0.6, currentTime, userToken);
        } else if (progressStand != 0.5 && progress > 0.5 && progress < 0.6) {
          finishLesson(lessonId, 0.5, currentTime, userToken);
        } else if (progressStand != 0.4 && progress > 0.4 && progress < 0.5) {
          finishLesson(lessonId, 0.4, currentTime, userToken);
        } else if (progressStand != 0.3 && progress > 0.3 && progress < 0.4) {
          finishLesson(lessonId, 0.3, currentTime, userToken);
        } else if (progressStand != 0.2 && progress > 0.2 && progress < 0.3) {
          finishLesson(lessonId, 0.2, currentTime, userToken);
        } else if (progressStand != 0.1 && progress > 0.1 && progress < 0.2) {
          finishLesson(lessonId, 0.1, currentTime, userToken);
        } else if (progressStand == -1 && progress > 0 && progress < 0.1) {
          finishLesson(lessonId, 0.0, currentTime, userToken);
        }
      }
    }
  );

  // CONTEXT CUSTOM MESSAGES RECEIVERS
  var options = {
    customNamespaces: {
      "urn:x-cast:br.com.edm.cast.clientname":
        cast.framework.system.MessageType.STRING,
      "urn:x-cast:br.com.edm.cast.readytocast":
        cast.framework.system.MessageType.STRING,
      "urn:x-cast:br.com.edm.cast.loadvideo":
        cast.framework.system.MessageType.JSON,
    },
  };
  context.start(options);

  // Resto dos listeners/custom functions seguem iguais...

  // ...getLessonDetails, getPostDetails, finishLesson, etc
});