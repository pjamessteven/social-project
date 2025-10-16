import React from 'react';

interface LizardAnimationProps {
  className?: string;
}

export default function LizardAnimation({ className }: LizardAnimationProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      xmlnsXlink="http://www.w3.org/1999/xlink" 
      viewBox="0 0 36 36"
      className={`lizard-animation ${className || ''}`}
      style={{
        stroke: '#edf2f6',
        animation: 'lizard-dashoffset 2s ease both, lizard-fill-opacity 2s ease both, lizard-stroke-opacity 2s ease both',
        strokeDasharray: '500%',
        strokeDashoffset: '500%',
        fillOpacity: 0,
        strokeOpacity: 0
      }}
    >

      <title>↔: left-right arrow (U+2194) - emojiall.com</title>
      <style>{`
        .lizard-animation{
          stroke:#edf2f6;
          stroke-dasharray:500%;
          stroke-dashoffset:500%
        }
        @keyframes lizard-stroke-opacity{
          0%{stroke-opacity:0;stroke-width:0}
          10%{stroke-opacity:.75;stroke-width:2%}
          30%{stroke-opacity:.75;stroke-width:2%}
          100%{stroke-opacity:0;stroke-width:0}
          100%{stroke-opacity:0;stroke-width:0}
        }
        @keyframes lizard-fill-opacity{
          0%{fill-opacity:0}
          38%{fill-opacity:0}
          58%{fill-opacity:1}
          100%{fill-opacity:1}
        }
        @keyframes lizard-dashoffset{
          0%{stroke-dashoffset:500%}
          10%{stroke-dashoffset:500%}
          60%{stroke-dashoffset:0%}
          100%{stroke-dashoffset:0%}
        }
      `}</style>
      <path fill="#3B88C3" d="M36 32c0 2.209-1.791 4-4 4H4c-2.209 0-4-1.791-4-4V4c0-2.209 1.791-4 4-4h28c2.209 0 4 1.791 4 4v28z"/>
      <path fill="#FFF" d="M13 9L3 18l10 9zm20 9L23 9v18z"/>
      <path fill="#FFF" d="M12 14h12v8H12z"/>
    </svg>
  );
}
