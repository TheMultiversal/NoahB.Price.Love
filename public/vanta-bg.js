if (typeof VANTA !== 'undefined') {
  const vantaEffect = VANTA.NET({
    el: '#vanta-bg',
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 2.00,
    scaleMobile: 1.00,
    color: 0xff0000,
    backgroundColor: 0x000000
  });
  console.log('Vanta effect initialized');
} else {
  console.log('VANTA is not defined');
}