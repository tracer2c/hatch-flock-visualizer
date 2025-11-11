import { useEffect, useState } from "react";

export const ChickHatchingAnimation = () => {
  const [crackStage, setCrackStage] = useState(0);
  const [showChick, setShowChick] = useState(false);

  useEffect(() => {
    const sequence = async () => {
      // Stage 1: First crack
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCrackStage(1);
      
      // Stage 2: More cracks
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCrackStage(2);
      
      // Stage 3: Shell breaking
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCrackStage(3);
      
      // Stage 4: Chick starts emerging
      await new Promise(resolve => setTimeout(resolve, 500));
      setShowChick(true);
      setCrackStage(4);
      
      // Stage 5: Shell falls away
      await new Promise(resolve => setTimeout(resolve, 800));
      setCrackStage(5);
      
      // Reset and loop
      await new Promise(resolve => setTimeout(resolve, 2000));
      setCrackStage(0);
      setShowChick(false);
    };
    
    sequence();
    const interval = setInterval(sequence, 7000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-64 h-64 mx-auto">
      <svg
        viewBox="0 0 200 240"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.15))' }}
      >
        {/* Single Egg Shell */}
        {crackStage < 5 && (
          <g>
            {/* Main egg body */}
            <ellipse
              cx="100"
              cy="120"
              rx="70"
              ry="90"
              fill="white"
              stroke="#e0e0e0"
              strokeWidth="3"
              className={crackStage >= 4 ? "animate-[shake_0.3s_ease-in-out]" : ""}
            />
            
            {/* Crack lines */}
            {crackStage >= 1 && (
              <g className="animate-fade-in">
                {/* First crack - center */}
                <path
                  d="M 100 80 Q 95 100 100 120 Q 105 140 100 160"
                  stroke="#a0a0a0"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}
            
            {crackStage >= 2 && (
              <g className="animate-fade-in">
                {/* Second crack - left side */}
                <path
                  d="M 70 90 Q 80 110 75 130"
                  stroke="#a0a0a0"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Third crack - right side */}
                <path
                  d="M 130 90 Q 120 110 125 130"
                  stroke="#a0a0a0"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}
            
            {crackStage >= 3 && (
              <g className="animate-fade-in">
                {/* More cracks spreading */}
                <path
                  d="M 100 120 L 85 125 L 95 135"
                  stroke="#a0a0a0"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 100 120 L 115 125 L 105 135"
                  stroke="#a0a0a0"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}
            
            {/* Top shell piece breaking off */}
            {crackStage >= 4 && (
              <g
                className="animate-[break-top_0.8s_ease-out]"
                style={{
                  transformOrigin: '100px 80px',
                  opacity: crackStage >= 5 ? 0 : 1,
                }}
              >
                <path
                  d="M 30 100 Q 50 60 100 50 Q 150 60 170 100 L 160 110 Q 150 90 100 80 Q 50 90 40 110 Z"
                  fill="white"
                  stroke="#e0e0e0"
                  strokeWidth="3"
                />
              </g>
            )}
          </g>
        )}

        {/* Baby Chick Emerging */}
        {showChick && (
          <g 
            className="animate-[emerge_0.8s_ease-out]"
            style={{ 
              transformOrigin: '100px 140px',
            }}
          >
            {/* Chick body */}
            <ellipse
              cx="100"
              cy="140"
              rx="38"
              ry="42"
              fill="#FFD700"
              stroke="#FFC700"
              strokeWidth="2"
            />
            
            {/* Chick head */}
            <circle
              cx="100"
              cy="110"
              r="28"
              fill="#FFD700"
              stroke="#FFC700"
              strokeWidth="2"
            />
            
            {/* Eyes */}
            <circle 
              cx="92" 
              cy="108" 
              r="3" 
              fill="#000"
              className="animate-pulse"
            />
            <circle 
              cx="108" 
              cy="108" 
              r="3" 
              fill="#000"
              className="animate-pulse"
            />
            
            {/* Beak */}
            <path
              d="M 100 115 L 108 118 L 100 121 Z"
              fill="#FF8C00"
            />
            
            {/* Left wing */}
            <ellipse
              cx="75"
              cy="138"
              rx="16"
              ry="12"
              fill="#FFC700"
              className="animate-[wing-flap_0.6s_ease-in-out_infinite]"
              style={{ transformOrigin: '80px 138px' }}
            />
            
            {/* Right wing */}
            <ellipse
              cx="125"
              cy="138"
              rx="16"
              ry="12"
              fill="#FFC700"
              className="animate-[wing-flap_0.6s_ease-in-out_infinite_0.3s]"
              style={{ transformOrigin: '120px 138px' }}
            />
            
            {/* Feet */}
            <g fill="#FF8C00">
              <path d="M 90 175 L 85 185 M 90 175 L 90 185 M 90 175 L 95 185" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" />
              <path d="M 110 175 L 105 185 M 110 175 L 110 185 M 110 175 L 115 185" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        )}
        
        {/* Shell pieces on ground */}
        {crackStage >= 5 && (
          <g className="animate-fade-in">
            <ellipse cx="70" cy="185" rx="25" ry="15" fill="white" stroke="#e0e0e0" strokeWidth="2" opacity="0.7" />
            <ellipse cx="130" cy="185" rx="25" ry="15" fill="white" stroke="#e0e0e0" strokeWidth="2" opacity="0.7" />
          </g>
        )}
      </svg>

      {/* Status Text */}
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground font-medium animate-fade-in">
          {crackStage === 0 && "Watch the egg..."}
          {crackStage === 1 && "First crack appears!"}
          {crackStage === 2 && "Cracks spreading..."}
          {crackStage === 3 && "Breaking through..."}
          {crackStage === 4 && "Here comes the chick!"}
          {crackStage >= 5 && "Welcome to the world! 🐣"}
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-3px) rotate(-2deg); }
          75% { transform: translateX(3px) rotate(2deg); }
        }
        
        @keyframes break-top {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-40px) rotate(-25deg);
            opacity: 0;
          }
        }
        
        @keyframes emerge {
          0% {
            transform: translateY(30px) scale(0.7);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes wing-flap {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(-15deg);
          }
        }
      `}</style>
    </div>
  );
};
