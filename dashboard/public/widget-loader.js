(function() {
  window.initAIChatbot = function(config) {
    var host = config.host || '';
    var projectId = config.projectId || '';
    
    var container = document.createElement('div');
    container.id = 'ai-chatbot-widget-container';
    container.style.position = 'fixed';
    container.style.bottom = '0';
    container.style.right = '0';
    container.style.width = '460px';
    container.style.height = '800px';
    container.style.maxWidth = '100vw';
    container.style.maxHeight = '100vh';
    container.style.zIndex = '999999';
    container.style.pointerEvents = 'none'; // allow clicking through transparent parts
    
    var iframe = document.createElement('iframe');
    iframe.src = host + '/widget?projectId=' + projectId;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';
    iframe.style.pointerEvents = 'auto'; // allow clicking inside iframe
    
    container.appendChild(iframe);
    document.body.appendChild(container);
  };
})();
