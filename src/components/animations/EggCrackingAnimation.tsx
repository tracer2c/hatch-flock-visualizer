import { useEffect, useState } from "react";

export const EggCrackingAnimation = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  
  const frames = [
    "/egg-frames/egg-intact.png",
    "/egg-frames/egg-crack1.png",
    "/egg-frames/egg-crack2.png",
    "/egg-frames/egg-crack3.png",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, 1500); // Change frame every 1.5 seconds

    return () => clearInterval(interval);
  }, [frames.length]);

  return (
    <div className="relative">
      {/* Main animated egg */}
      <img 
        src={frames[currentFrame]}
        alt="Egg cracking animation"
        className="w-[600px] h-auto transition-opacity duration-500"
        style={{ 
          background: 'transparent !important',
          backgroundColor: 'transparent !important',
          border: 'none !important',
          outline: 'none !important',
          boxShadow: 'none !important',
          margin: 0,
          padding: 0,
          animation: 'fade-in 1.2s ease-out 0.3s both, scale-in 1s ease-out 0.3s both'
        }}
      />
      
      {/* Soft reflection effect */}
      <img 
        src={frames[currentFrame]}
        alt=""
        aria-hidden="true"
        className="w-[600px] h-auto absolute left-0 pointer-events-none transition-opacity duration-500"
        style={{ 
          background: 'transparent !important',
          backgroundColor: 'transparent !important',
          border: 'none !important',
          outline: 'none !important',
          boxShadow: 'none !important',
          margin: 0,
          padding: 0,
          top: '100%',
          transform: 'scaleY(-1)',
          opacity: 0.15,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 60%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 60%)'
        }}
      />
      
      {/* Optional text overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
        <p className="text-slate-500 text-sm font-medium opacity-0 animate-fade-in" style={{ animationDelay: '2s' }}>
          {currentFrame === 1 && "First crack appears..."}
          {currentFrame === 2 && "Shell breaking..."}
          {currentFrame === 3 && "Almost there..."}
        </p>
      </div>
    </div>
  );
};
