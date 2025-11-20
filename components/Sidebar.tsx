import React from 'react';
import { Project } from '../types';
import { Icon } from './Icon';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  onProjectSelect: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  projects, 
  activeProjectId, 
  onProjectSelect,
  isOpen,
  onClose
}) => {
  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-40 w-72 md:w-80 
        flex flex-col h-full bg-background-dark border-r border-white/10 
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}
    >
      {/* Mobile Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white md:hidden"
      >
        <Icon name="close" className="text-xl" />
      </button>

      {/* User Profile */}
      <div className="flex items-center gap-3 p-6 md:p-4 md:mb-4 border-b border-white/5 md:border-none">
        <div 
          className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-white/10"
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC8evhlOFIXRRrTXogL_dFf7uFWLnC2cib1RYlI--b9mQQKm9K-jbgd94zxsWEGt0ULirl_AuyX84bBMIsFlzxAMgq9iWvGlC5tSDdDOGOY4sQ3fNUpW-FxTcLNOSQTypWy5EnNiPUcxUEChOnEGyLR-2tGdBvum07qtisunZuBCV1p9fanfe3okgBYpDO0N1yHlV3Xrc7onSCTVAe3iDcoowD5MnSCvOJXO0bHeQ6i4AxXMJm1Cr8c1BZI5Y49QYH-In-RrLA1Q40")' }}
        />
        <div className="flex flex-col">
          <h1 className="text-white text-base font-medium">My Projects</h1>
          <p className="text-white/60 text-sm">studio_vibe_user</p>
        </div>
      </div>

      {/* Project List */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto px-4 pb-4">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => onProjectSelect(project.id)}
            className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-3 rounded-lg transition-colors group ${
              activeProjectId === project.id
                ? 'bg-primary/20 border border-primary/30'
                : 'bg-white/5 hover:bg-white/10 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <Icon 
                name="music_note" 
                filled={activeProjectId === project.id}
                className={`text-xl ${activeProjectId === project.id ? 'text-primary' : 'text-white/80'}`} 
              />
              <div className="flex flex-col overflow-hidden">
                <p className="text-white text-sm font-medium truncate">{project.name}</p>
                <p className="text-xs text-white/50">{project.duration} • {project.size}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
               {/* Status Indicator */}
               {project.status === 'completed' && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
               {project.status === 'processing' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />}
               {project.status === 'error' && <div className="w-2 h-2 rounded-full bg-red-500" />}
               
               <button className="text-white/20 hover:text-white transition-colors opacity-0 group-hover:opacity-100 md:opacity-0">
                 {/* Close/Delete icon always visible on mobile active item or group hover on desktop */}
                 <Icon name="close" className="text-lg" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Area */}
      <div className="mt-auto p-4 border-t border-white/5">
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] p-6 text-center hover:bg-white/[0.05] transition-colors cursor-pointer group">
          <Icon name="upload_file" className="text-white/40 text-4xl md:text-5xl group-hover:text-white/60 transition-colors" />
          <div>
            <p className="text-sm font-medium text-white/80">Drag & Drop Audio Files</p>
            <p className="text-xs text-white/50 mt-1">Supports .mp3, .wav, .aiff</p>
          </div>
          <button className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20">
            Browse Files
          </button>
        </div>
      </div>
    </aside>
  );
};