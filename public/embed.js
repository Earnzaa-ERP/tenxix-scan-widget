(function () {
  var script = document.currentScript;
  if (!script) return;

  var ref = script.getAttribute('data-ref');
  var product = script.getAttribute('data-product') || '';
  var buttonText = script.getAttribute('data-button-text') || 'Analyze Your Skin';
  var position = script.getAttribute('data-button-position') || 'bottom-right';
  var buttonColor = script.getAttribute('data-button-color') || '#e94560';

  if (!ref) {
    console.warn('TenxixScan: data-ref attribute is required');
    return;
  }

  // Build iframe URL
  var baseUrl = 'https://scan.tenxix.com/';
  var iframeSrc = baseUrl + '?ref=' + encodeURIComponent(ref);
  if (product) iframeSrc += '&product=' + encodeURIComponent(product);

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '.tenxix-btn{',
      'position:fixed;z-index:999998;',
      'padding:12px 24px;',
      'background:' + buttonColor + ';',
      'color:#fff;',
      'border:none;border-radius:50px;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
      'font-size:14px;font-weight:600;',
      'cursor:pointer;',
      'box-shadow:0 4px 20px rgba(0,0,0,0.15);',
      'transition:transform 0.2s,box-shadow 0.2s;',
      'max-width:calc(100vw - 40px);',
      'text-align:center;',
      'line-height:1.4;',
    '}',
    '.tenxix-btn:hover{transform:scale(1.03);box-shadow:0 6px 24px rgba(0,0,0,0.2);}',
    '.tenxix-btn:active{transform:scale(0.98);}',
    '.tenxix-btn-bottom-right{bottom:20px;right:20px;}',
    '.tenxix-btn-bottom-left{bottom:20px;left:20px;}',
    '.tenxix-btn-bottom-center{bottom:20px;left:50%;transform:translateX(-50%);}',
    '.tenxix-btn-bottom-center:hover{transform:translateX(-50%) scale(1.03);}',
    '.tenxix-overlay{',
      'position:fixed;top:0;left:0;right:0;bottom:0;',
      'z-index:999999;',
      'background:rgba(0,0,0,0.6);',
      'display:none;',
      'align-items:center;justify-content:center;',
      'padding:16px;',
    '}',
    '.tenxix-modal{',
      'position:relative;',
      'width:100%;max-width:440px;',
      'height:90vh;max-height:800px;',
      'border-radius:16px;',
      'overflow:hidden;',
      'background:#fff;',
      'box-shadow:0 24px 48px rgba(0,0,0,0.2);',
    '}',
    '.tenxix-close{',
      'position:absolute;top:8px;right:8px;z-index:10;',
      'width:32px;height:32px;',
      'border-radius:50%;',
      'background:rgba(0,0,0,0.5);',
      'color:#fff;',
      'border:none;cursor:pointer;',
      'font-size:18px;line-height:32px;text-align:center;',
      'transition:background 0.2s;',
    '}',
    '.tenxix-close:hover{background:rgba(0,0,0,0.7);}',
    '.tenxix-iframe{width:100%;height:100%;border:none;}',
    '@media(max-width:480px){',
      '.tenxix-modal{max-width:100vw;height:100vh;max-height:none;border-radius:0;}',
      '.tenxix-overlay{padding:0;}',
    '}',
  ].join('');
  document.head.appendChild(style);

  // Create button
  var btn = document.createElement('button');
  btn.className = 'tenxix-btn tenxix-btn-' + position;
  btn.textContent = buttonText;
  document.body.appendChild(btn);

  // Create overlay + modal
  var overlay = document.createElement('div');
  overlay.className = 'tenxix-overlay';

  var modal = document.createElement('div');
  modal.className = 'tenxix-modal';

  var closeBtn = document.createElement('button');
  closeBtn.className = 'tenxix-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close');

  var iframe = document.createElement('iframe');
  iframe.className = 'tenxix-iframe';
  iframe.setAttribute('allow', 'camera');
  iframe.setAttribute('allowfullscreen', '');

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Open modal
  btn.addEventListener('click', function () {
    if (!iframe.src) iframe.src = iframeSrc;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  // Close modal
  function close() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  // ESC key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.style.display === 'flex') close();
  });
})();
