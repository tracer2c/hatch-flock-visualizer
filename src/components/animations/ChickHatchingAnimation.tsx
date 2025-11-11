import { useEffect, useState } from "react";

export const ChickHatchingAnimation = () => {
  const [crackStage, setCrackStage] = useState(0);

  useEffect(() => {
    const sequence = async () => {
      // Stage 0: Intact egg (wobbling)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Stage 1: First small crack
      setCrackStage(1);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Stage 2: Crack widens, beak pokes through
      setCrackStage(2);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Stage 3: More cracks, chick's head visible
      setCrackStage(3);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Stage 4: Shell breaking apart, chick emerging
      setCrackStage(4);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Stage 5: Fully hatched chick
      setCrackStage(5);
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Reset for loop
      setCrackStage(0);
    };
    
    sequence();
    const interval = setInterval(sequence, 9000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-72 h-72 mx-auto flex items-center justify-center">
      <svg
        viewBox="0 0 240 280"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.2))' }}
      >
        <defs>
          {/* Gradient for egg 3D effect */}
          <radialGradient id="eggGradient" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#fafafa" />
            <stop offset="100%" stopColor="#e8e8e8" />
          </radialGradient>
          
          {/* Gradient for chick body */}
          <radialGradient id="chickGradient" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#FFE55C" />
            <stop offset="60%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFC700" />
          </radialGradient>
          
          {/* Shadow gradient */}
          <radialGradient id="shadowGradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse
          cx="120"
          cy="250"
          rx="80"
          ry="15"
          fill="url(#shadowGradient)"
        />

        {/* Bottom shell half (always visible) */}
        {crackStage >= 1 && (
          <g
            className={crackStage >= 4 ? "animate-[shell-fall_0.6s_ease-out]" : ""}
            style={{
              transformOrigin: '120px 180px',
              transform: crackStage >= 4 ? 'translateY(20px) rotate(-5deg)' : 'translateY(0)',
            }}
          >
            <path
              d="M 50 140 Q 45 160 50 180 Q 60 210 120 230 Q 180 210 190 180 Q 195 160 190 140 L 120 140 Z"
              fill="url(#eggGradient)"
              stroke="#d0d0d0"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Main egg (cracks progressively) */}
        {crackStage < 4 && (
          <g className={crackStage === 0 ? "animate-[wobble_2s_ease-in-out_infinite]" : ""}>
            {/* Egg shell */}
            <ellipse
              cx="120"
              cy="120"
              rx="75"
              ry="95"
              fill="url(#eggGradient)"
              stroke="#d0d0d0"
              strokeWidth="3"
            />
            
            {/* Highlight for 3D effect */}
            <ellipse
              cx="100"
              cy="80"
              rx="30"
              ry="40"
              fill="white"
              opacity="0.4"
            />

            {/* Stage 1: First crack */}
            {crackStage >= 1 && (
              <g className="animate-fade-in">
                <path
                  d="M 120 70 Q 115 90 120 110"
                  stroke="#888888"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* Stage 2: More cracks, hole appears */}
            {crackStage >= 2 && (
              <g className="animate-fade-in">
                <path
                  d="M 120 110 L 110 120 L 115 135"
                  stroke="#888888"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 120 110 L 130 120 L 125 135"
                  stroke="#888888"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Hole where chick peeks */}
                <ellipse
                  cx="120"
                  cy="110"
                  rx="8"
                  ry="6"
                  fill="#333333"
                />
              </g>
            )}

            {/* Stage 3: Wider cracks */}
            {crackStage >= 3 && (
              <g className="animate-fade-in">
                <path
                  d="M 90 100 Q 85 120 90 140"
                  stroke="#888888"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 150 100 Q 155 120 150 140"
                  stroke="#888888"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 110 135 Q 120 140 130 135"
                  stroke="#888888"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>
        )}

        {/* Chick peeking (stage 2) */}
        {crackStage === 2 && (
          <g className="animate-[peek_0.5s_ease-out]">
            {/* Beak poking through */}
            <path
              d="M 120 110 L 125 115 L 120 118"
              fill="#FF8C00"
              stroke="#FF6600"
              strokeWidth="1"
            />
          </g>
        )}

        {/* Chick head visible (stage 3) */}
        {crackStage === 3 && (
          <g className="animate-[emerge-head_0.6s_ease-out]">
            {/* Head */}
            <circle
              cx="120"
              cy="115"
              r="18"
              fill="url(#chickGradient)"
              stroke="#FFC700"
              strokeWidth="1.5"
            />
            {/* Eye */}
            <circle cx="125" cy="112" r="2.5" fill="#000" />
            {/* Beak */}
            <path
              d="M 130 115 L 138 118 L 130 121 Z"
              fill="#FF8C00"
            />
          </g>
        )}

        {/* Chick emerging (stage 4) */}
        {crackStage >= 4 && (
          <g 
            className="animate-[emerge-full_0.8s_ease-out]"
            style={{ transformOrigin: '120px 150px' }}
          >
            {/* Body */}
            <ellipse
              cx="120"
              cy="160"
              rx="42"
              ry="48"
              fill="url(#chickGradient)"
              stroke="#FFC700"
              strokeWidth="2"
            />
            
            {/* Head */}
            <circle
              cx="120"
              cy="120"
              r="32"
              fill="url(#chickGradient)"
              stroke="#FFC700"
              strokeWidth="2"
            />
            
            {/* Eyes */}
            <circle cx="110" cy="115" r="4" fill="#000" />
            <circle cx="130" cy="115" r="4" fill="#000" />
            <circle cx="111" cy="114" r="1.5" fill="#fff" /> {/* eye shine */}
            <circle cx="131" cy="114" r="1.5" fill="#fff" />
            
            {/* Beak */}
            <path
              d="M 120 125 L 130 128 L 120 131 Z"
              fill="#FF8C00"
              stroke="#FF6600"
              strokeWidth="1"
            />
            
            {/* Left wing */}
            <ellipse
              cx="88"
              cy="155"
              rx="20"
              ry="14"
              fill="#FFC700"
              transform="rotate(-25 88 155)"
              className={crackStage >= 5 ? "animate-[wing-flap_0.8s_ease-in-out_infinite]" : ""}
            />
            
            {/* Right wing */}
            <ellipse
              cx="152"
              cy="155"
              rx="20"
              ry="14"
              fill="#FFC700"
              transform="rotate(25 152 155)"
              className={crackStage >= 5 ? "animate-[wing-flap_0.8s_ease-in-out_infinite_0.4s]" : ""}
            />
            
            {/* Feet */}
            <g stroke="#FF8C00" strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M 105 200 L 100 215 M 100 215 L 95 220 M 100 215 L 100 220 M 100 215 L 105 220" />
              <path d="M 135 200 L 140 215 M 140 215 L 135 220 M 140 215 L 140 220 M 140 215 L 145 220" />
            </g>
          </g>
        )}

        {/* Top shell pieces falling (stage 4+) */}
        {crackStage >= 4 && (
          <>
            <g
              className="animate-[shell-piece-left_0.8s_ease-out]"
              style={{ transformOrigin: '80px 100px' }}
            >
              <path
                d="M 45 120 Q 50 80 90 60 L 100 100 Q 70 110 60 120 Z"
                fill="url(#eggGradient)"
                stroke="#d0d0d0"
                strokeWidth="2"
                opacity={crackStage >= 5 ? "0.4" : "0.9"}
              />
            </g>
            
            <g
              className="animate-[shell-piece-right_0.8s_ease-out]"
              style={{ transformOrigin: '160px 100px' }}
            >
              <path
                d="M 195 120 Q 190 80 150 60 L 140 100 Q 170 110 180 120 Z"
                fill="url(#eggGradient)"
                stroke="#d0d0d0"
                strokeWidth="2"
                opacity={crackStage >= 5 ? "0.4" : "0.9"}
              />
            </g>
          </>
        )}
      </svg>

      {/* Status Text */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <p className="text-sm text-slate-600 font-medium animate-fade-in">
          {crackStage === 0 && "🥚 Getting ready to hatch..."}
          {crackStage === 1 && "Tap tap... something's happening!"}
          {crackStage === 2 && "A little beak appears!"}
          {crackStage === 3 && "Working hard to break free..."}
          {crackStage === 4 && "Almost there... pushing through!"}
          {crackStage >= 5 && "🐣 Hello world!"}
        </p>
      </div>

      <style>{`
        @keyframes wobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(3deg); }
        }
        
        @keyframes peek {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes emerge-head {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes emerge-full {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.6);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes shell-fall {
          from {
            transform: translateY(0) rotate(0deg);
          }
          to {
            transform: translateY(20px) rotate(-5deg);
          }
        }
        
        @keyframes shell-piece-left {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(-30px, 50px) rotate(-45deg);
            opacity: 0.4;
          }
        }
        
        @keyframes shell-piece-right {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(30px, 50px) rotate(45deg);
            opacity: 0.4;
          }
        }
        
        @keyframes wing-flap {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
};
