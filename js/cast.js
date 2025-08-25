document.addEventListener("DOMContentLoaded", function (event) {
  // Setting initial BG Image
  //document.body.style.backgroundImage = 'url(/assets/images/bg01.jpg)';
// Dentro de cast.js, no evento 'DOMContentLoaded'

// No seu cast.js, dentro de `document.addEventListener("DOMContentLoaded", ...)`

window.addEventListener('message', function(event) {
    if (event.data === 'playerIsReadyToPlay') {
        const currentTime = event.detail.plyr.currentTime;
        const duration = event.detail.plyr.duration;
        const mediaInformation = new cast.framework.messages.MediaInformation({
            contentId: 'youtube_video_' + lessonId, // Use um ID único
            contentType: 'video/mp4', // Ou 'video/youtube' se houver um tipo específico
            duration: duration,
            contentUrl: document.getElementById("iframe-player").src,
            streamType: cast.framework.messages.StreamType.BUFFERED,
            media: new cast.framework.messages.MediaMetadata(
                cast.framework.messages.MediaMetadata.MediaMetadataType.GENERIC
            )
        });

        // Cria uma nova sessão de mídia
        const mediaSession = playerManager.createMediaSession(mediaInformation);
        // Atualiza o estado para PLAYING
        mediaSession.playerState = cast.framework.messages.PlayerState.PLAYING;
        // Atualiza o tempo de reprodução
        mediaSession.currentTime = currentTime;

        playerManager.broadcastStatus(true);
        console.log("Nova sessão de mídia iniciada para o iframe.");
    }

    
    if (typeof event.data === 'string' && event.data.startsWith('currentTime:')) {
        const currentTime = parseFloat(event.data.split(':')[1]);
        const mediaSession = playerManager.getMediaSession();
        if (mediaSession) {
            mediaSession.currentTime = currentTime;
            playerManager.broadcastStatus(false);
        }
    }
    if (event.data === 'playing_video') {
        const mediaSession = playerManager.getMediaSession();
        if (mediaSession) {
            mediaSession.playerState = cast.framework.messages.PlayerState.PLAYING;
            playerManager.broadcastStatus(false);
        }
    }
    if (event.data === 'paused_video') {
        const mediaSession = playerManager.getMediaSession();
        if (mediaSession) {
            mediaSession.playerState = cast.framework.messages.PlayerState.PAUSED;
            playerManager.broadcastStatus(false);
        }
    }
});
  // Main cast variables
  const context = cast.framework.CastReceiverContext.getInstance();
  const playerManager = context.getPlayerManager();

  // Browse content
  document.title = "EDM CAST";

  // HTML elements and variables
  const video = document.getElementById("video");
  var videoURL = "_blank";
  var contentType = "";

  // Client variables
  var lessonId = 0;
  var userToken = "";
  var progressStand = -1;
  var isPost = false;

  // API variables
  var api = "https://api-verde.entregadigital.app.br/api/v1/";
  const apiExt = ".entregadigital.app.br/api/v1/app/";
  var clientName = "verde";

  // Player custom message interceptor
  playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    (request) => {
      video.removeAttribute("class");
      // Debbuging
      console.log("windowmessage: setMessageInterceptor on LOAD", request);
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
          if (post.hls != null && post.hls != undefined && post.hls !== "") {
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
          if (
            lesson.hls != null &&
            lesson.hls != undefined &&
            lesson.hls !== ""
          ) {
            showCastPlayer();
            videoURL = lesson.hls;
            contentType = "video";
            const fileExtension = videoURL.split(".").pop();
            if (fileExtension == "m3u8") contentType = "application/x-mpegurl";
            else if (fileExtension == "ts") contentType = "video/mp2t";
            else if (fileExtension == "m4s") contentType = "video/mp4";
            else if (
              lesson.file != null &&
              lesson.file != undefined &&
              lesson.file !== "" &&
              (api.includes("vermelho") ||
                api.includes("demo") ||
                api.includes("rqxsystem"))
            ) {
              showCastPlayer();
              videoURL = lesson.file;
              contentType = "video";
              const fileExtension = videoURL.split(".").pop();
              if (fileExtension == "mp4") contentType = "video/mp4";
            }
          } else if (lesson.action && lesson.action.url) {
            // Aqui você decide exibir no iframe
            showIframePlayer(lesson.action.url);
            // Não precisa setar request.media!
            return null; // impede que o CAF tente tocar algo
          }
          if (videoURL != "") {
            request.media.contentUrl = videoURL;
            clientName = api;
            setClientLayout(clientName);
          }

          console.log("LOAD request final:", request);
          console.log("URL escolhida:", videoURL, "tipo:", contentType);
        });
      }
      return request;
    }
  );

  // Substitua o trecho de código em cast.js por este:
  // NOVO: Intercepta o comando de PAUSE e envia para o iframe
  playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.PAUSE,
    (request) => {
      const isIframeMode =
        document.getElementById("iframe-wrapper").style.display === "block";
      const iframe = document.getElementById("iframe-player");
      const isYouTube = iframe && iframe.src.includes("youtube");

      if (isIframeMode && isYouTube) {
        // Envia a mensagem de "pause" para o iframe
        iframe.contentWindow.postMessage("pause_video", "*");
        console.log("Comando de PAUSE repassado para o iframe.");
        return null;
      }
      return request;
    }
  );

  // NOVO: Intercepta o comando de PLAY e envia para o iframe
  playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.PLAY,
    (request) => {
      const isIframeMode =
        document.getElementById("iframe-wrapper").style.display === "block";
      const iframe = document.getElementById("iframe-player");
      const isYouTube = iframe && iframe.src.includes("youtube");

      if (isIframeMode && isYouTube) {
        // Envia a mensagem de "begin_video" para o iframe
        iframe.contentWindow.postMessage("begin_video", "*");
        console.log("Comando de PLAY repassado para o iframe.");
        return null;
      }
      return request;
    }
  );

  playerManager.addEventListener(
    cast.framework.events.EventType.PLAYER_LOAD_COMPLETE,
    (event) => {
      console.log("PLAYER_LOAD_COMPLETE");
      const castMediaElement = document.getElementById("castMediaElement");
      console.log(castMediaElement);
    }
  );

  // Player: lesson seen
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

  /* CONTEXT CUSTOM MESSAGES RECEIVERS */

  // Initialize context with custom messages
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

  // Suponha que seu namespace seja 'urn:x-cast:br.com.edm.cast.controls'
  context.addCustomMessageListener(
    "urn:x-cast:br.com.edm.cast.controls",
    function (event) {
      console.log("Comando RECEBIDO no Chromecast:", event.data);
      var iframe = document.getElementById("iframe-player");
      if (iframe) {
        console.log("-> Repassando para o player via postMessage");
        iframe.contentWindow.postMessage(event.data, "*");
      }
    }
  );

  // Client name switch
  context.addCustomMessageListener(
    "urn:x-cast:br.com.edm.cast.clientname",
    function (clientName) {
      api = clientName.data;
      setClientLayout(api);
    }
  );

  function setClientLocalLayout(clientNameData) {
    clientName = clientNameData;
    const initial = document.getElementById("player");
    const logo = document.getElementById("logo");
    initial.className = "show " + clientName;
    logo.style.backgroundImage = "url(/assets/logos/" + clientName + ".png)";
    document.title = clientName.toUpperCase();
    api = "https://api-" + clientNameData + apiExt;
  }

  //logo.style.backgroundImage = Deixa a url, por exemplo, https://ln.entregadigital.app.br/assets/images/img-logo-horiz.webp
  function setClientLayout(clientNameData) {
    clientName = clientNameData
      .replace("https://api-", "https://")
      .replace("entregadigital.app.br/", "")
      .replace("api/v1/", "");
    // const initial = document.getElementById("player");
    // const logo = document.getElementById("logo");
    // initial.className = "show spotlight";
    const clientPWA =
      typeof api == "string"
        ? api.replace("https://api-", "https://").replace("api/v1/", "")
        : "";
    // logo.style.backgroundImage = "url(" + clientPWA + "assets/images/img-logo-horiz.webp)";
    // let link = document.getElementById("pwa-css");
    // if (link == null || link == undefined || typeof link == "undefined") {
    //   link = document.createElement("link");
    //   link.id = "pwa-css";
    //   link.rel = "stylesheet";
    //   document.head.appendChild(link);
    // }
    // console.log("Setting client layout for: " + clientName);
    // link.href = clientPWA + "smartv/smartv.css";
    document.title = clientName.toUpperCase();
  }

  // Ready to cast message
  context.addCustomMessageListener(
    "urn:x-cast:br.com.edm.cast.readytocast",
    function (readyToCast) {
      const readyToCastHTMLElement = document.getElementById("ready-to-cast");
      readyToCastHTMLElement.innerHTML = readyToCast.data;
    }
  );

  // Video custom data
  context.addCustomMessageListener(
    "urn:x-cast:br.com.edm.cast.loadvideo",
    function (customData) {
      lessonId = customData.data.nameValuePairs.contentId;
      api = customData.data.nameValuePairs.apiURL;
      userToken = customData.data.nameValuePairs.userToken;
    }
  );

  // HTTP functions
  function getLessonDetails(lessonId, authUserToken, callback) {
    var xmlHttp = new XMLHttpRequest();
    if (typeof lessonId == "undefined") reject(JSON.parse([]));
    xmlHttp.open("GET", api + "app/lessons/" + lessonId + "/auth", false);
    xmlHttp.setRequestHeader("Authorization", "Bearer " + authUserToken);
    xmlHttp.setRequestHeader("os", "Android");
    xmlHttp.onload = () => {
      if (xmlHttp.status == 200) {
        callback(JSON.parse(xmlHttp.responseText));
      } else {
        callback(JSON.parse([]));
      }
    };
    xmlHttp.onerror = () => {
      callback(JSON.parse([]));
    };
    xmlHttp.send(null);
  }

  function finishLesson(lessonId, progress, time, authUserToken) {
    progressStand = progress;
    var xmlHttp = new XMLHttpRequest();
    if (typeof lessonId == "undefined") return false;
    const progressPercent = progress * 100;
    const seenData = {
      percent: progressPercent,
      time_seconds: Math.floor(time),
    };
    xmlHttp.open("POST", api + "app/lessons/" + lessonId + "/seen");
    xmlHttp.setRequestHeader("Authorization", "Bearer " + authUserToken);
    xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlHttp.setRequestHeader("os", "Android");
    xmlHttp.send(JSON.stringify(seenData));
  }

  function getPostDetails(lessonId, authUserToken, callback) {
    var xmlHttp = new XMLHttpRequest();
    if (typeof lessonId == "undefined") reject(JSON.parse([]));
    xmlHttp.open("GET", api + "app/posts/" + lessonId, false);
    xmlHttp.setRequestHeader("Authorization", "Bearer " + authUserToken);
    xmlHttp.setRequestHeader("os", "Android");
    xmlHttp.onload = () => {
      if (xmlHttp.status == 200) {
        callback(JSON.parse(xmlHttp.responseText));
      } else {
        callback(JSON.parse([]));
      }
    };
    xmlHttp.onerror = () => {
      callback(JSON.parse([]));
    };
    xmlHttp.send(null);
  }

  function showIframePlayer(url) {
    document.getElementById("video").style.display = "none";
    document.getElementById("iframe-wrapper").style.display = "block";
    document.getElementById("iframe-player").src = url;
  }

  function showCastPlayer() {
    document.getElementById("iframe-wrapper").style.display = "none";
    document.getElementById("video").style.display = "block";
  }
});
