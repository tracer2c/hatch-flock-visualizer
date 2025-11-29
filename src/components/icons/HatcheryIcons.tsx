import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const EggsIcon = ({ size = 40, className = "" }: IconProps) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/3143/3143643.png"
    alt="Eggs"
    style={{ width: size, height: size }}
    className={`object-contain ${className}`}
  />
);

export const ChicksIcon = ({ size = 40, className = "" }: IconProps) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/2632/2632839.png"
    alt="Chicks"
    style={{ width: size, height: size }}
    className={`object-contain ${className}`}
  />
);

export const HatcheryIcon = ({ size = 40, className = "" }: IconProps) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/2138/2138440.png"
    alt="Hatchery"
    style={{ width: size, height: size }}
    className={`object-contain ${className}`}
  />
);

export const IncubatorIcon = ({ size = 40, className = "" }: IconProps) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/3143/3143607.png"
    alt="Incubator"
    style={{ width: size, height: size }}
    className={`object-contain ${className}`}
  />
);

export const HenLogo = ({ size = 64, className = "" }: IconProps) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/3143/3143614.png"
    alt="Hatchery Pro"
    style={{ width: size, height: size }}
    className={`object-contain ${className}`}
  />
);

export const NestIcon = ({ size = 40, className = "" }: IconProps) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/3069/3069172.png"
    alt="Nest"
    style={{ width: size, height: size }}
    className={`object-contain ${className}`}
  />
);

export const FlockIcon = ({ size = 40, className = "" }: IconProps) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/9456/9456201.png"
    alt="Flock"
    style={{ width: size, height: size }}
    className={`object-contain ${className}`}
  />
);

export const HatchingChickIcon = ({ size = 40, className = "" }: IconProps) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/3143/3143626.png"
    alt="Hatching"
    style={{ width: size, height: size }}
    className={`object-contain ${className}`}
  />
);
