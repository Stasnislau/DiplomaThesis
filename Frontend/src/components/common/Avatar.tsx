import React from 'react';
import cn from '@/utils/cn';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, avatarUrl, className }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${name}'s profile`}
        className={cn("w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center bg-indigo-500 text-white",
        className
      )}
    >
      <span className="text-4xl sm:text-5xl font-bold">{initial}</span>
    </div>
  );
};

export default Avatar; 