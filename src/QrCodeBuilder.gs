var QrCodeBuilder = (function () {
  function buildClientQrPayload(url) {
    return {
      provider: 'nayuki-qrcodegen-v1.8.0',
      text: url,
      note: 'Index.html encodes the form URL locally as a scannable SVG QR code.'
    };
  }

  return {
    buildClientQrPayload: buildClientQrPayload
  };
})();
