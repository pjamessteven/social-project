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

      <title>🏳️‍⚧️: transgender flag (U+1F3F3 FE0F 200D 26A7 FE0F) - emojiall.com</title>
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
      <path fill="#5BCEFA" d="M0 27c0 2.209 1.791 4 4 4h28c2.209 0 4-1.791 4-4v-1.3H0V27z"/>
      <path fill="#F5A9B8" d="M.026 20.5L0 25.8h36v-5.3z"/>
      <path fill="#EEE" d="M0 15.3h36v5.3H0z"/>
      <path fill="#F5A9B8" d="M0 9.902h36V15.4H0z"/>
      <path fill="#5BCEFA" d="M36 9c0-2.209-1.791-4-4-4H4C1.791 5 0 6.791 0 9v1.2h36V9z"/>
    </svg>
  );
}
