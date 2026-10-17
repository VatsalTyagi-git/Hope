import React from 'react';
import { Heart, Lock, Check } from 'lucide-react';

export function ValuePropsStrip() {
  return (
    <div className="relative z-10 w-full bg-[#5244E3] text-white py-4 px-6 shadow-inner">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-8 text-xs sm:text-sm font-medium">
        <div className="flex items-center space-x-2 text-white/95">
          <Heart className="w-4 h-4 text-purple-200" />
          <span>Made for real feelings</span>
        </div>

        <div className="flex items-center space-x-2 text-white/95">
          <Lock className="w-4 h-4 text-purple-200" />
          <span>A space that's yours</span>
        </div>

        <div className="flex items-center space-x-2 text-white/95">
          <Check className="w-4 h-4 text-purple-200" />
          <span>At your own pace</span>
        </div>
      </div>
    </div>
  );
}
