import { useState, useEffect } from 'react';

export default function FullscreenButton() {
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const handler = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <button className="fullscreen-btn" onClick={toggle} title={isFull ? '退出全屏' : '全屏'}>
      {isFull ? '⛶' : '⛶'}
    </button>
  );
}
