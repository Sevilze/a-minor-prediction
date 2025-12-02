import React, { useRef, useState, useCallback } from 'react';
import { Project } from '../types';
import { Icon } from './Icon';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onProjectDelete: (id: string) => void;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  uploadProgress?: number;
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated?: boolean;
  onLoginClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  projects, 
  activeProjectId, 
  onProjectSelect,
  onProjectDelete,
  onFileUpload,
  isUploading,
  uploadProgress,
  isOpen,
  onClose,
  isAuthenticated = true,
  onLoginClick,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/aiff', 'audio/flac', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
      const allowedExtensions = ['.mp3', '.wav', '.aiff', '.flac', '.ogg', '.m4a'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (allowedTypes.includes(file.type) || allowedExtensions.includes(ext)) {
        onFileUpload(file);
      }
    }
  }, [onFileUpload]);

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    onProjectDelete(projectId);
  };

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
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white md:hidden"
      >
        <Icon name="close" className="text-xl" />
      </button>

      <div className="flex items-center gap-3 p-6 md:p-4 md:mb-4 border-b border-white/5 md:border-none">
        <div 
          className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-white/10"
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC8evhlOFIXRRrTXogL_dFf7uFWLnC2cib1RYlI--b9mQQKm9K-jbgd94zxsWEGt0ULirl_AuyX84bBMIsFlzxAMgq9iWvGlC5tSDdDOGOY4sQ3fNUpW-FxTcLNOSQTypWy5EnNiPUcxUEChOnEGyLR-2tGdBvum07qtisunZuBCV1p9fanfe3okgBYpDO0N1yHlV3Xrc7onSCTVAe3iDcoowD5MnSCvOJXO0bHeQ6i4AxXMJm1Cr8c1BZI5Y49QYH-In-RrLA1Q40")' }}
        />
        <div className="flex flex-col">
          <h1 className="text-white text-base font-medium">My Projects</h1>
          <p className="text-white/60 text-sm">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-y-auto px-4 pb-4">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icon name="library_music" className="text-4xl text-white/20 mb-2" />
            <p className="text-white/40 text-sm">No projects yet</p>
            <p className="text-white/30 text-xs">Upload an audio file to get started</p>
          </div>
        ) : (
          projects.map((project) => (
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
                  <p className="text-xs text-white/50">{project.duration} - {project.size}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {project.status === 'completed' && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                {project.status === 'processing' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />}
                {project.status === 'error' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                
                <button 
                  onClick={(e) => handleDeleteClick(e, project.id)}
                  className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto p-4 border-t border-white/5">
        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
            <Icon name="lock" className="text-4xl md:text-5xl text-white/40" />
            <div>
              <p className="text-sm font-medium text-white/80">Sign in required</p>
              <p className="text-xs text-white/50 mt-1">Sign in to upload and analyze audio files</p>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full rounded-md bg-primary hover:bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-6 text-center transition-all cursor-pointer group
              ${isDragging 
                ? 'border-primary bg-primary/10' 
                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'}
              ${isUploading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.aiff,.flac,.ogg,.m4a,audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {isUploading ? (
              <>
                <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
                <div className="w-full">
                  <p className="text-sm font-medium text-white/80">Processing audio...</p>
                  <p className="text-xs text-white/50 mt-1">Analyzing chords with AI</p>
                  {uploadProgress !== undefined && (
                    <div className="mt-2 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Icon 
                  name={isDragging ? "file_download" : "upload_file"} 
                  className={`text-4xl md:text-5xl transition-colors ${isDragging ? 'text-primary' : 'text-white/40 group-hover:text-white/60'}`} 
                />
                <div>
                  <p className="text-sm font-medium text-white/80">
                    {isDragging ? 'Drop to upload' : 'Drag & Drop Audio Files'}
                  </p>
                  <p className="text-xs text-white/50 mt-1">Supports .mp3, .wav, .flac, .aiff, .ogg, .m4a</p>
                </div>
                <button className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20">
                  Browse Files
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};