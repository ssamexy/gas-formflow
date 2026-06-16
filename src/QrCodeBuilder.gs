var QrCodeBuilder = (function () {
  function buildClientQrPayload(url) {
    return {
      provider: 'client-placeholder',
      text: url,
      note: 'Index.html renders a local SVG placeholder with the form URL. Replace provider in v1.1 for full QR encoding if needed.'
    };
  }

  return {
    buildClientQrPayload: buildClientQrPayload
  };
})();
