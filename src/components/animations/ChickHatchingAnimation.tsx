import { useEffect, useState } from "react";

export const ChickHatchingAnimation = () => {
  const [crackStage, setCrackStage] = useState(0);
  const [showChick, setShowChick] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setCrackStage(1), 1000);
    const timer2 = setTimeout(() => setCrackStage(2), 2000);
    const timer3 = setTimeout(() => setCrackStage(3), 3000);
    const timer4 = setTimeout(() => {
      setShowChick(true);
      setCrackStage(4);
    }, 4000);
    
    // Loop animation
    const timer5 = setTimeout(() => {
      setCrackStage(0);
      setShowChick(false);
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [crackStage]);

  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Egg Shell */}
      <svg
        viewBox="0 0 200 240"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }}
      >
        {/* Bottom half of shell */}
        <ellipse
          cx="100"
          cy="140"
          rx="70"
          ry="90"
          fill="#f5e6d3"
          stroke="#d4c5b0"
          strokeWidth="3"
          className={crackStage >= 3 ? "animate-[slide-down_0.5s_ease-out]" : ""}
          style={{
            transform: crackStage >= 3 ? 'translateY(20px)' : 'translateY(0)',
            transition: 'transform 0.5s ease-out'
          }}
        />

        {/* Top half of shell with cracks */}
        <g
          className={crackStage >= 4 ? "opacity-0" : "opacity-100"}
          style={{ transition: 'opacity 0.3s ease-out' }}
        >
          <ellipse
            cx="100"
            cy="100"
            rx="70"
            ry="90"
            fill="#f5e6d3"
            stroke="#d4c5b0"
            strokeWidth="3"
          />
          
          {/* Crack lines */}
          {crackStage >= 1 && (
            <g className="animate-fade-in">
              <path
                d="M 85 80 L 90 100 L 85 120"
                stroke="#8b7355"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          )}
          
          {crackStage >= 2 && (
            <g className="animate-fade-in">
              <path
                d="M 115 80 L 110 100 L 115 120"
                stroke="#8b7355"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 90 100 L 100 105 L 110 100"
                stroke="#8b7355"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          )}
          
          {crackStage >= 3 && (
            <g className="animate-fade-in">
              <path
                d="M 85 120 L 100 125 L 115 120"
                stroke="#8b7355"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          )}
        </g>

        {/* Baby chick emerging */}
        {showChick && (
          <g className="animate-[scale-in_0.5s_ease-out]" style={{ transformOrigin: '100px 120px' }}>
            {/* Chick body */}
            <ellipse
              cx="100"
              cy="130"
              rx="35"
              ry="40"
              fill="#ffd700"
              stroke="#f4c430"
              strokeWidth="2"
            />
            
            {/* Chick head */}
            <circle
              cx="100"
              cy="100"
              r="25"
              fill="#ffd700"
              stroke="#f4c430"
              strokeWidth="2"
            />
            
            {/* Eyes */}
            <circle cx="92" cy="95" r="3" fill="#000" className="animate-pulse" />
            <circle cx="108" cy="95" r="3" fill="#000" className="animate-pulse" />
            
            {/* Beak */}
            <path
              d="M 100 102 L 105 105 L 100 108 Z"
              fill="#ff8c00"
            />
            
            {/* Wing */}
            <ellipse
              cx="115"
              cy="125"
              rx="15"
              ry="10"
              fill="#f4c430"
              className="animate-[wiggle_1s_ease-in-out_infinite]"
              style={{
                transformOrigin: '110px 125px'
              }}
            />
          </g>
        )}
      </svg>

      {/* Text */}
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground animate-fade-in">
          {crackStage === 0 && "Getting ready..."}
          {crackStage === 1 && "First crack appears..."}
          {crackStage === 2 && "Breaking through..."}
          {crackStage === 3 && "Almost there..."}
          {crackStage >= 4 && "Welcome to the world! 🐣"}
        </p>
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(20px);
          }
        }
        
        @keyframes wiggle {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-5deg);
          }
          75% {
            transform: rotate(5deg);
          }
        }
      `}</style>
    </div>
  );
};
